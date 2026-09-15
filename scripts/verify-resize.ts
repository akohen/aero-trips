/**
 * Integration check for the in-place resizer.
 *
 * Drives `functions-images/src/resize.ts` against the real STAGING bucket,
 * which covers everything except the Eventarc trigger wiring: the round trip
 * through Cloud Storage is what the interesting behaviour depends on (download
 * token survival, generation preconditions, metadata-only writes), and none of
 * that is observable in a unit test. Test objects are uploaded under a random
 * `img/_fntest_*` prefix and deleted at the end.
 *
 * Needs credentials for aero-trips-staging:
 *   npm run verify:resize
 */
import admin from 'firebase-admin'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { resizeInPlace, isManaged } from '../functions-images/src/resize.ts'

const BUCKET = 'aero-trips-staging.appspot.com'
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'aero-trips-staging', storageBucket: BUCKET })
const bucket = admin.storage().bucket() as unknown as Parameters<typeof resizeInPlace>[0]

const url = (path: string, token: string) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`

let failures = 0
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failures++
}

/** Uploads a synthetic image the way the client does, returning its URL. */
const upload = async (path: string, body: Buffer, contentType: string) => {
  const token = randomUUID()
  await admin.storage().bucket().file(path).save(body, {
    contentType, resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  })
  const [meta] = await admin.storage().bucket().file(path).getMetadata()
  return { token, url: url(path, token), generation: meta.generation, metageneration: meta.metageneration }
}

const main = async () => {
  // Deliberately NOT under `img/`: once resizeImageInPlace is deployed to
  // staging it would race this script for the same objects, resize them first,
  // and every direct call here would fail its generation precondition. The
  // prefix gate itself is covered separately by the isManaged checks below.
  const prefix = `_verify/${randomUUID().slice(0, 8)}`
  const created: string[] = []
  const big = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: { r: 30, g: 90, b: 160 } } })
    .jpeg({ quality: 95 }).toBuffer()
  const small = await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .jpeg({ quality: 95 }).toBuffer()

  console.log('\n1. oversized JPEG is downscaled in place')
  const p1 = `${prefix}/oversized`; created.push(p1)
  const u1 = await upload(p1, big, 'image/jpeg')
  const before = await fetch(u1.url, { method: 'HEAD' }).then((r) => r.status)
  const r1 = await resizeInPlace(bucket, p1, 'image/jpeg', u1.generation, u1.metageneration)
  check('URL worked before the resize', before === 200, `HTTP ${before}`)
  check('outcome is "resized"', r1.status === 'resized', JSON.stringify(r1))
  const [m1] = await admin.storage().bucket().file(p1).getMetadata()
  const dims = await sharp(await admin.storage().bucket().file(p1).download().then(([b]) => b)).metadata()
  check('longest edge is now 1000px', Math.max(dims.width!, dims.height!) === 1000, `${dims.width}x${dims.height}`)
  check('bytes shrank', Number(m1.size) < big.length, `${big.length} → ${m1.size}`)
  check('same object name (no variant created)', m1.name === p1)
  check('download token preserved', m1.metadata?.firebaseStorageDownloadTokens === u1.token)
  check('resizedAt marker set', !!m1.metadata?.resizedAt)
  check('cache-control set', m1.cacheControl === 'public, max-age=31536000, immutable', String(m1.cacheControl))
  const after = await fetch(u1.url, { method: 'HEAD' }).then((r) => r.status)
  check('THE ORIGINAL URL STILL RESOLVES', after === 200, `HTTP ${after}`)

  console.log('\n2. loop guard: a second delivery is a no-op')
  const r2 = await resizeInPlace(bucket, p1, 'image/jpeg', m1.generation, m1.metageneration)
  check('outcome is "skipped"', r2.status === 'skipped', JSON.stringify(r2))
  const [m2] = await admin.storage().bucket().file(p1).getMetadata()
  check('generation unchanged (no rewrite)', m2.generation === m1.generation, `${m1.generation} vs ${m2.generation}`)

  console.log('\n3. image already within bounds is marked, not re-encoded')
  const p3 = `${prefix}/small`; created.push(p3)
  const u3 = await upload(p3, small, 'image/jpeg')
  const r3 = await resizeInPlace(bucket, p3, 'image/jpeg', u3.generation, u3.metageneration)
  const [m3] = await admin.storage().bucket().file(p3).getMetadata()
  check('outcome is "marked"', r3.status === 'marked', JSON.stringify(r3))
  check('bytes untouched', Number(m3.size) === small.length, `${small.length} vs ${m3.size}`)
  check('generation unchanged', m3.generation === u3.generation)
  check('token preserved', m3.metadata?.firebaseStorageDownloadTokens === u3.token)

  console.log('\n4. small dimensions but over the byte budget is still re-encoded')
  const p3b = `${prefix}/heavy`; created.push(p3b)
  // 640x465 of noise, deliberately stored far heavier than it needs to be —
  // the shape of several real contributed images.
  const heavy = await sharp({ create: { width: 640, height: 465, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 70 } } })
    .png({ compressionLevel: 0 }).toBuffer()
  const u3b = await upload(p3b, heavy, 'image/png')
  const r3b = await resizeInPlace(bucket, p3b, 'image/png', u3b.generation, u3b.metageneration)
  const [m3b] = await admin.storage().bucket().file(p3b).getMetadata()
  check('over the byte budget', heavy.length > 200 * 1024, `${(heavy.length / 1024).toFixed(0)}KB`)
  check('outcome is "resized"', r3b.status === 'resized', JSON.stringify(r3b))
  check('bytes shrank', Number(m3b.size) < heavy.length, `${heavy.length} → ${m3b.size}`)
  check('token preserved', m3b.metadata?.firebaseStorageDownloadTokens === u3b.token)

  console.log('\n5. stale generation is refused (concurrent re-upload)')
  const p4 = `${prefix}/raced`; created.push(p4)
  const u4 = await upload(p4, big, 'image/jpeg')
  const r4 = await resizeInPlace(bucket, p4, 'image/jpeg', Number(u4.generation) - 1, u4.metageneration)
  const [m4] = await admin.storage().bucket().file(p4).getMetadata()
  check('outcome is "failed" (precondition)', r4.status === 'failed', JSON.stringify(r4))
  check('object left untouched', Number(m4.size) === big.length, `${big.length} vs ${m4.size}`)

  console.log('\n6. isManaged gate')
  check('rejects a legacy _1000x1000 variant', !isManaged('img/a/b_1000x1000', 'image/jpeg'))
  check('rejects the legacy images/ prefix', !isManaged('images/a.jpeg', 'image/jpeg'))
  check('rejects a non-image', !isManaged('img/a/b', 'application/pdf'))
  check('rejects a folder placeholder', !isManaged('img/a/', 'image/jpeg'))
  check('accepts a normal upload', isManaged('img/uid/abc', 'image/webp'))

  await Promise.all(created.map((p) => admin.storage().bucket().file(p).delete()))
  console.log(`\ncleaned up ${created.length} test objects`)
  console.log(failures ? `\n${failures} FAILURE(S)\n` : '\nall checks passed\n')
  process.exit(failures ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
