/**
 * Downscaling of a stored image, written back to the SAME object.
 *
 * Kept free of `firebase-functions` so it can be driven directly against a real
 * bucket (see `tmp/` scripts) without an Eventarc trigger in the loop.
 */
import type { Bucket } from '@google-cloud/storage'
import sharp, { type Sharp } from 'sharp'

/** Longest edge, in pixels, kept for a stored image. */
export const MAX_EDGE = 1000

/**
 * Re-encode anything heavier than this even when its dimensions are already in
 * bounds. Plenty of contributed images are small but badly encoded — a 640x465
 * JPEG weighing 468KB is real production data — and re-encoding those wins far
 * more than downscaling does. Safe to be aggressive: the result is discarded
 * unless it is actually smaller.
 */
export const BYTE_BUDGET = 200 * 1024

/**
 * Only signed-in users' uploads (`src/utils/image.ts`). The legacy `images/`
 * prefix — written by `scripts/manage-edits.js` — is deliberately excluded:
 * those objects are served through `publicUrl()` and are readable because of a
 * per-object ACL set by `makePublic()`. Overwriting an object creates a new
 * generation with the bucket's default ACL, which would silently drop that
 * public access. Handling them means re-applying `makePublic()` after the
 * write; until that is needed, staying out is the safe default.
 */
export const MANAGED_PREFIXES = ['img/']

export const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Presence of this custom-metadata key means "this function is done with this
 * object". It is the loop guard: writing the resized bytes re-fires
 * `finalize`, and the second invocation must stop here.
 */
export const MARKER = 'resizedAt'

/** Content is immutable once downscaled — the object is never rewritten again. */
export const CACHE_CONTROL = 'public, max-age=31536000, immutable'

/** Output of the old extension. Left strictly alone; the healer deals with it. */
export const LEGACY_VARIANT = /_\d+x\d+$/

export type Outcome =
  | { status: 'skipped'; reason: string }
  | { status: 'marked'; reason: string; width: number; height: number }
  | {
      status: 'resized'
      width: number
      height: number
      bytesBefore: number
      bytesAfter: number
    }
  | { status: 'failed'; reason: string }

/** True for objects this function is willing to touch, on name/type alone. */
export const isManaged = (name: string, contentType?: string) =>
  MANAGED_PREFIXES.some((prefix) => name.startsWith(prefix)) &&
  !name.endsWith('/') &&
  !LEGACY_VARIANT.test(name) &&
  !!contentType &&
  ALLOWED_TYPES.has(contentType)

const encode = (pipeline: Sharp, contentType: string) => {
  if (contentType === 'image/png') return pipeline.png({ compressionLevel: 9 })
  if (contentType === 'image/webp') return pipeline.webp({ quality: 82 })
  return pipeline.jpeg({ quality: 82, mozjpeg: true })
}

export const resizeInPlace = async (
  bucket: Bucket,
  name: string,
  contentType: string,
  /** Generation the caller observed; the write is refused if it moved on. */
  expectedGeneration?: string | number,
  /** Metageneration the caller observed, same idea for metadata-only changes. */
  expectedMetageneration?: string | number,
): Promise<Outcome> => {
  const file = bucket.file(name)

  // Read metadata from the object rather than trusting the event payload:
  // events can be delivered more than once and out of order, and the marker
  // may have been written by a delivery we are racing.
  const [current] = await file.getMetadata()
  if (current.metadata?.[MARKER]) return { status: 'skipped', reason: 'already handled' }
  if (expectedMetageneration && Number(current.metageneration) !== Number(expectedMetageneration)) {
    return { status: 'skipped', reason: 'object changed since the event' }
  }

  const [buffer] = await file.download()
  const pipeline = sharp(buffer, { failOn: 'none' })
  const { width, height } = await pipeline.metadata()
  if (!width || !height) return { status: 'failed', reason: 'unreadable image' }

  // Custom metadata must be carried over verbatim — it holds
  // `firebaseStorageDownloadTokens`, the secret in every download URL we have
  // already handed out. Losing it turns every stored `src` into a 403.
  const keepMetadata = { ...current.metadata, [MARKER]: new Date().toISOString() }

  /** Marks the object handled without rewriting its bytes. */
  const markOnly = async (reason: string): Promise<Outcome> => {
    // A metadata patch fires `metadataUpdate`, not `finalize`, so this cannot
    // re-enter the trigger.
    await file.setMetadata({ cacheControl: CACHE_CONTROL, metadata: keepMetadata })
    return { status: 'marked', reason, width, height }
  }

  if (width <= MAX_EDGE && height <= MAX_EDGE && buffer.length <= BYTE_BUDGET) {
    return markOnly('already within bounds')
  }

  let resized: Buffer
  try {
    resized = await encode(
      // `rotate()` with no argument bakes in EXIF orientation, which is dropped
      // by the re-encode and would otherwise leave phone photos sideways.
      pipeline.rotate().resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true }),
      contentType,
    ).toBuffer()
  } catch (err) {
    return { status: 'failed', reason: `resize threw: ${err}` }
  }

  // Re-encoding can inflate a well-optimised file. Serving more bytes than we
  // received would defeat the point.
  if (resized.length >= buffer.length) return markOnly('re-encode was not smaller')

  try {
    await file.save(resized, {
      contentType,
      resumable: false,
      metadata: { cacheControl: CACHE_CONTROL, metadata: keepMetadata },
      // Refuse to clobber a newer upload to the same path.
      ...(expectedGeneration ? { preconditionOpts: { ifGenerationMatch: Number(expectedGeneration) } } : {}),
    })
  } catch (err) {
    return { status: 'failed', reason: `write-back failed: ${err}` }
  }

  return { status: 'resized', width, height, bytesBefore: buffer.length, bytesAfter: resized.length }
}
