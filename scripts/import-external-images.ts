/**
 * Copies externally hosted description images into our own bucket and points
 * the descriptions at the copies.
 *
 * Hotlinked images rot: signed CDN links expire, sites move or disappear, some
 * start refusing hotlinks. Once the bytes live in our bucket the stored `src`
 * is permanent, like any user upload.
 *
 * Each image is uploaded under `img/imported/<hash of the source URL>` with a
 * fresh download token. The `img/` prefix hands it to `resizeImageInPlace`
 * (functions/images), which downscales it in place and keeps the token. The
 * name is derived from the URL, so a re-run reuses what is already uploaded
 * instead of duplicating it.
 *
 * Images that cannot be downloaded (dead links, expired signatures, hotlink
 * protection, unsupported formats) are reported and left untouched.
 *
 * Every document change is recorded in tmp/ with its previous description,
 * so the rewrite can be undone.
 *
 * Usage:
 *   npm run import-images              # staging, dry run
 *   npm run import-images -- --apply
 *   npm run import-images:prod -- --apply
 */
import { firebaseConfig } from '../src/data/firebase.ts'
import admin from 'firebase-admin'
import chalk from 'chalk'
import sharp from 'sharp'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const args = process.argv.slice(2)
const has = (flag: string) => args.includes(flag)
const env = has('--production') ? 'production' : 'staging'
const apply = has('--apply')

const COLLECTIONS = ['airfields', 'activities', 'trips', 'events']
const PREFIX = 'img/imported/'
/** Same set the resizer and the upload UI accept. */
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
/**
 * Upload cap for signed-in users (`src/utils/image.ts`), which is what the
 * resizer's memory is sized for. Heavier sources are downscaled here first.
 */
const MAX_BYTES = 2 ** 23
/** Same bound as the resizer (`MAX_EDGE` in functions/images). */
const MAX_EDGE = 1000
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36'
/** Wikimedia rejects browser-like UAs from scripts and asks for a contact. */
const BOT_UA = 'AeroTripsImageImport/1.0 (https://aerotrips.fr)'

const config = firebaseConfig[env]
const bucketName = config.storageBucket

// Same credential logic as heal-image-urls.ts: the key on disk is production's.
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

const OWN_HOSTS = new Set(['firebasestorage.googleapis.com', 'storage.googleapis.com'])

const isExternal = (src: string) => {
  let url: URL
  try { url = new URL(src) } catch { return false } // data: URIs, relative paths
  return (url.protocol === 'http:' || url.protocol === 'https:') && !OWN_HOSTS.has(url.host)
}

type ImageNode = { attrs: { src: string } }

/** Every tiptap image node anywhere in a document, however deeply nested. */
const imageNodes = (value: unknown, found: ImageNode[] = []): ImageNode[] => {
  if (Array.isArray(value)) { value.forEach((v) => imageNodes(v, found)); return found }
  if (!value || typeof value !== 'object') return found
  const node = value as { type?: unknown; attrs?: { src?: unknown } }
  if (node.type === 'image' && typeof node.attrs?.src === 'string') found.push(node as ImageNode)
  Object.values(value).forEach((v) => imageNodes(v, found))
  return found
}

const objectName = (src: string) => PREFIX + createHash('sha256').update(src).digest('hex').slice(0, 24)

const downloadUrl = (name: string, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(name)}?alt=media&token=${token}`

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const shrink = (bytes: Buffer, contentType: string) => {
  const pipeline = sharp(bytes).rotate().resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
  if (contentType === 'image/png') return pipeline.png({ compressionLevel: 9 }).toBuffer()
  if (contentType === 'image/webp') return pipeline.webp({ quality: 82 }).toBuffer()
  return pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer()
}

type Fetched = { ok: true; bytes: Buffer; contentType: string } | { ok: false; reason: string }

const download = async (src: string): Promise<Fetched> => {
  const ua = new URL(src).host.endsWith('wikimedia.org') ? BOT_UA : BROWSER_UA
  for (let attempt = 0; ; attempt++) {
    let res: Response
    try {
      res = await fetch(src, { headers: { 'User-Agent': ua, Accept: 'image/*' }, signal: AbortSignal.timeout(30_000) })
    } catch (e) {
      return { ok: false, reason: String((e as { cause?: { code?: string } }).cause?.code ?? e) }
    }
    if (res.status === 429 && attempt < 4) { await res.body?.cancel(); await sleep(5000 * (attempt + 1)); continue }
    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!res.ok) { await res.body?.cancel(); return { ok: false, reason: `HTTP ${res.status}` } }
    if (!ALLOWED_TYPES.has(contentType)) { await res.body?.cancel(); return { ok: false, reason: `unsupported type ${contentType || '(none)'}` } }
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length <= MAX_BYTES) return { ok: true, bytes, contentType }
    const shrunk = await shrink(bytes, contentType).catch(() => undefined)
    if (!shrunk) return { ok: false, reason: `too large (${bytes.length} bytes) and could not be downscaled` }
    return { ok: true, bytes: shrunk, contentType }
  }
}

/** Uploads (or reuses) the copy of `src`, returning its download URL. */
const store = async (src: string, fetched: Extract<Fetched, { ok: true }>): Promise<string> => {
  const file = bucket.file(objectName(src))
  const [exists] = await file.exists()
  if (exists) {
    const [meta] = await file.getMetadata()
    const token = String(meta.metadata?.firebaseStorageDownloadTokens ?? '').split(',')[0]
    if (token) return downloadUrl(file.name, token)
  }
  const token = randomUUID()
  await file.save(fetched.bytes, {
    contentType: fetched.contentType,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: token, importedFrom: src } },
  })
  return downloadUrl(file.name, token)
}

const main = async () => {
  console.log(chalk.bold(`\nImporting external images — ${env} (${config.projectId}) — ${apply ? chalk.red('APPLY') : chalk.green('dry run')}\n`))

  // --- Plan: every external image node, grouped by source URL ---
  type Doc = { ref: FirebaseFirestore.DocumentReference; description: unknown; nodes: ImageNode[] }
  const docs: Doc[] = []
  const sources = new Set<string>()
  for (const collection of COLLECTIONS) {
    const snapshot = await db.collection(collection).get()
    for (const doc of snapshot.docs) {
      const description = doc.data().description
      const nodes = imageNodes(description).filter((n) => isExternal(n.attrs.src))
      if (!nodes.length) continue
      docs.push({ ref: doc.ref, description, nodes })
      nodes.forEach((n) => sources.add(n.attrs.src))
    }
  }
  console.log(`${sources.size} external image URL(s) in ${docs.length} document(s)\n`)

  // --- Fetch (and on --apply, upload) each source once ---
  const replacements = new Map<string, string>()
  const failures: { src: string; reason: string }[] = []
  for (const src of sources) {
    const fetched = await download(src)
    if (!fetched.ok) {
      failures.push({ src, reason: fetched.reason })
      console.log(chalk.red(`  ✗ ${fetched.reason}  ${src}`))
      continue
    }
    const target = apply ? await store(src, fetched) : downloadUrl(objectName(src), '<token>')
    replacements.set(src, target)
    console.log(chalk.green(`  ✓ ${fetched.contentType} ${Math.round(fetched.bytes.length / 1024)}KB  ${src}`))
  }

  console.log(chalk.bold(`\n${replacements.size} importable, ${failures.length} left as is`))

  const updates = docs.filter((d) => d.nodes.some((n) => replacements.has(n.attrs.src)))
  console.log(`${updates.length} document(s) to rewrite`)
  if (!apply) {
    console.log(chalk.green('\nDry run — nothing written. Re-run with --apply.\n'))
    return
  }

  // --- Apply: objects are already uploaded, so no ref ever points at nothing ---
  const log: { doc: string; before: unknown; replaced: Record<string, string> }[] = []
  for (const { ref, description, nodes } of updates) {
    const before = structuredClone(description)
    const replaced: Record<string, string> = {}
    for (const node of nodes) {
      const target = replacements.get(node.attrs.src)
      if (!target) continue
      replaced[node.attrs.src] = target
      node.attrs.src = target
    }
    // Only the description changes. `updated_at` is left alone: the old URLs
    // still resolve, and the next export + deploy ships the new ones.
    await ref.update({ description })
    log.push({ doc: ref.path, before, replaced })
    console.log(chalk.green(`  updated ${ref.path} (${Object.keys(replaced).length} image(s))`))
  }
  mkdirSync('tmp', { recursive: true })
  const logPath = `tmp/import-external-images-${env}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  writeFileSync(logPath, JSON.stringify(log, null, 2))
  console.log(chalk.gray(`\nRollback log: ${logPath}`))

  // --- Verify: every new URL serves an image ---
  let ok = 0
  for (const url of new Set(replacements.values())) {
    const res = await fetch(url).catch(() => undefined)
    await res?.body?.cancel()
    if (res?.ok && res.headers.get('content-type')?.startsWith('image/')) ok++
    else console.log(chalk.red(`  ${res?.status ?? 'ERR'} ${url}`))
  }
  console.log(chalk.bold(`\nVerified ${replacements.size} imported URL(s): ${ok} ok, ${replacements.size - ok} broken\n`))
}

main().catch((e) => { console.error(e); process.exit(1) })
