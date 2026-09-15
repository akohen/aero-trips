/**
 * Repairs image URLs left dangling by the `storage-resize-images` extension.
 *
 * That extension wrote its output under a new name (`<path>_1000x1000` in
 * production, `_800x800` in staging) and deleted the original, while Firestore
 * kept pointing at the original name. This script puts the bytes back where the
 * stored URL says they are, rather than teaching yet another client to guess:
 *
 *   1. every `<path>_WxH` object whose `<path>` is missing is copied back to
 *      `<path>` — custom metadata, and therefore the download token embedded in
 *      every URL we have already handed out, comes along with the copy;
 *   2. the few Firestore refs that name a `_WxH` object directly are rewritten
 *      to the plain path, so nothing depends on the variant surviving.
 *
 * The variants themselves are kept unless --delete-variants is passed, which
 * makes the whole operation reversible.
 *
 * Usage:
 *   npm run heal              # staging, dry run
 *   npm run heal -- --apply
 *   npm run heal:prod -- --apply
 */
import { firebaseConfig } from '../src/data/firebase.ts'
import admin from 'firebase-admin'
import chalk from 'chalk'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const args = process.argv.slice(2)
const has = (flag: string) => args.includes(flag)
const env = has('--production') ? 'production' : 'staging'
const apply = has('--apply')
const deleteVariants = has('--delete-variants')

/** Output of the resize extension: `<base>_<width>x<height>`. */
const VARIANT = /^(?<base>.+)_(?<w>\d+)x(?<h>\d+)$/
/** Where the resize extension wrote, and the only place variants are restored. */
const MANAGED_PREFIX = 'img/'
/**
 * Every prefix a stored `src` may legitimately point at. `images/` holds the
 * older, `publicUrl()`-served uploads from `scripts/manage-edits.js`; the
 * extension never touched them, but they must be in the existence set or every
 * ref to one is reported as broken.
 */
const SCAN_PREFIXES = [MANAGED_PREFIX, 'images/']
const MARKER = 'resizedAt'
const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const COLLECTIONS = ['airfields', 'activities', 'trips', 'events', 'changes']

const config = firebaseConfig[env]
const bucketName = config.storageBucket

// The checked-in service-account key belongs to production only, so staging
// runs fall back to application-default credentials (`gcloud auth
// application-default login`).
const credential = (() => {
  try {
    const creds = require('../serviceAccountKey.json')
    if (creds.project_id === config.projectId) return admin.credential.cert(creds)
  } catch { /* no key on disk */ }
  return admin.credential.applicationDefault()
})()

admin.initializeApp({ credential, projectId: config.projectId, storageBucket: bucketName })
const db = admin.firestore()
const bucket = admin.storage().bucket()

/** Both URL shapes we have ever stored, mapped back to an object path. */
const objectPath = (src: string): string | undefined => {
  let url: URL
  try { url = new URL(src) } catch { return undefined }
  if (url.host === 'firebasestorage.googleapis.com') {
    const [, path] = url.pathname.split(`/v0/b/${bucketName}/o/`)
    return path ? decodeURIComponent(path) : undefined
  }
  if (url.host === 'storage.googleapis.com') {
    const prefix = `/${bucketName}/`
    if (!url.pathname.startsWith(prefix)) return undefined
    return decodeURIComponent(url.pathname.slice(prefix.length))
  }
  return undefined
}

const withPath = (src: string, path: string): string => {
  const url = new URL(src)
  if (url.host === 'firebasestorage.googleapis.com') {
    url.pathname = `/v0/b/${bucketName}/o/${encodeURIComponent(path)}`
  } else {
    url.pathname = `/${bucketName}/${path.split('/').map(encodeURIComponent).join('/')}`
  }
  return url.toString()
}

type ImageRef = { node: { attrs: { src: string } }; path: string }

/** Every tiptap image node anywhere in a document, however deeply nested. */
const imageRefs = (value: unknown, found: ImageRef[] = []): ImageRef[] => {
  if (Array.isArray(value)) { value.forEach((v) => imageRefs(v, found)); return found }
  if (!value || typeof value !== 'object') return found
  const node = value as { type?: unknown; attrs?: { src?: unknown } }
  if (node.type === 'image' && typeof node.attrs?.src === 'string') {
    const path = objectPath(node.attrs.src)
    if (path) found.push({ node: node as ImageRef['node'], path })
  }
  Object.values(value).forEach((v) => imageRefs(v, found))
  return found
}

const main = async () => {
  console.log(chalk.bold(`\nHealing ${env} (${config.projectId}) — ${apply ? chalk.red('APPLY') : chalk.green('dry run')}\n`))

  // --- Plan: which objects are missing, and which variant can replace them ---
  const listings = await Promise.all(
    SCAN_PREFIXES.map(async (prefix) => (await bucket.getFiles({ prefix }))[0]),
  )
  const objects = listings.flat()
  const names = new Set(objects.map((f) => f.name))
  const restores: { variant: string; base: string }[] = []
  const occupied: string[] = []

  for (const name of names) {
    if (!name.startsWith(MANAGED_PREFIX)) continue
    const base = name.match(VARIANT)?.groups?.base
    if (!base) continue
    if (names.has(base)) occupied.push(name)
    else restores.push({ variant: name, base })
  }

  const restoredBases = new Set(restores.map((r) => r.base))

  console.log(`${objects.length} objects under ${SCAN_PREFIXES.join(' + ')}, ${restores.length + occupied.length} resize variants`)
  console.log(chalk.cyan(`  ${restores.length} variant(s) whose original is missing → restore`))
  if (occupied.length) console.log(chalk.yellow(`  ${occupied.length} variant(s) whose original still exists → left alone`))

  // --- Plan: Firestore refs that name a variant directly, or point nowhere ---
  const rewrites: { doc: string; from: string; to: string }[] = []
  const broken: { doc: string; src: string }[] = []
  const pending = new Map<string, { ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }>()

  let scannedDocs = 0
  let scannedRefs = 0

  for (const collection of COLLECTIONS) {
    const snapshot = await db.collection(collection).get()
    scannedDocs += snapshot.size
    for (const doc of snapshot.docs) {
      const data = doc.data()
      let touched = false
      for (const { node, path } of imageRefs(data)) {
        scannedRefs++
        const base = path.match(VARIANT)?.groups?.base
        if (base && (names.has(base) || restoredBases.has(base))) {
          rewrites.push({ doc: doc.ref.path, from: path, to: base })
          node.attrs.src = withPath(node.attrs.src, base)
          touched = true
        } else if (!names.has(path) && !restoredBases.has(path)) {
          broken.push({ doc: doc.ref.path, src: path })
        }
      }
      if (touched) pending.set(doc.ref.path, { ref: doc.ref, data })
    }
  }

  console.log(`\n${scannedDocs} Firestore doc(s) scanned across ${COLLECTIONS.join(', ')} — ${scannedRefs} own-bucket image ref(s)`)
  console.log(`${rewrites.length} Firestore ref(s) pointing straight at a variant → rewrite to the plain path`)
  rewrites.forEach((r) => console.log(chalk.cyan(`  ${r.doc}: …/${r.from} → …/${r.to}`)))

  if (broken.length) {
    console.log(chalk.red(`\n${broken.length} ref(s) this script cannot fix (no object, no variant):`))
    broken.forEach((b) => console.log(chalk.red(`  ${b.doc}: ${b.src}`)))
  }

  restores.forEach((r) => console.log(chalk.gray(`  restore ${r.variant} → ${r.base}`)))

  if (!apply) {
    console.log(chalk.green('\nDry run — nothing written. Re-run with --apply.\n'))
    return
  }

  // --- Apply: objects first, so no ref is ever left pointing at nothing ---
  for (const { variant, base } of restores) {
    const source = bucket.file(variant)
    await source.copy(bucket.file(base))
    const target = bucket.file(base)
    const [meta] = await target.getMetadata()
    // The restored object is already at or under the resize bound, so mark it
    // handled: resizeImageInPlace must not re-encode it a second time.
    await target.setMetadata({
      cacheControl: CACHE_CONTROL,
      metadata: { ...meta.metadata, [MARKER]: new Date().toISOString() },
    })
    if (deleteVariants) await source.delete()
    console.log(chalk.green(`  restored ${base}${deleteVariants ? ' (variant deleted)' : ''}`))
  }

  for (const { ref, data } of pending.values()) {
    await ref.set(data)
    console.log(chalk.green(`  updated ${ref.path}`))
  }

  // --- Verify: every healed URL actually resolves now ---
  const checked = new Set<string>()
  let ok = 0
  let failed = 0
  for (const collection of COLLECTIONS) {
    const snapshot = await db.collection(collection).get()
    for (const doc of snapshot.docs) {
      for (const { node, path } of imageRefs(doc.data())) {
        if (checked.has(node.attrs.src)) continue
        checked.add(node.attrs.src)
        const status = await fetch(node.attrs.src, { method: 'HEAD' }).then((r) => r.status).catch(() => 0)
        if (status === 200) ok++
        else { failed++; console.log(chalk.red(`  ${status} ${doc.ref.path} ${path}`)) }
      }
    }
  }
  console.log(chalk.bold(`\nVerified ${ok + failed} own-bucket refs: ${chalk.green(`${ok} ok`)}, ${failed ? chalk.red(`${failed} broken`) : '0 broken'}`))
  if (!deleteVariants && restores.length) {
    console.log(chalk.gray(`\n${restores.length} variant(s) kept. Re-run with --delete-variants once you are happy.\n`))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
