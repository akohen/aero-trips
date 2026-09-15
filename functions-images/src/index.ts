/**
 * In-place image downscaling for user uploads.
 *
 * This replaces the `storage-resize-images` extension, which wrote its output
 * under a NEW name (`<path>_1000x1000`) and deleted the original. That made the
 * URL recorded in Firestore at upload time a guess about which of two files
 * would end up existing — wrong for ~24% of our images — and forced every
 * consumer (React components, the MCP server, the prerendered HTML) to carry
 * its own try-one-then-the-other fallback. Static consumers cannot do that.
 *
 * Here the resized bytes are written back to the SAME object, so the URL the
 * client records at upload time is correct immediately and permanently. The
 * only observable window is one where the URL still serves the full-size
 * original, which is harmless and self-heals once this function runs.
 */
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { initializeApp } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { info, warn } from 'firebase-functions/logger'
import { isManaged, resizeInPlace } from './resize.ts'

initializeApp()

export const resizeImageInPlace = onObjectFinalized(
  {
    region: 'europe-west1',
    // sharp decodes the whole image into memory; an 8MB JPEG (the client-side
    // upload cap) can expand well past 256MiB as raw pixels.
    memory: '1GiB',
    timeoutSeconds: 120,
    // Cloud Run defaults to 80 concurrent requests per instance. sharp holds a
    // whole decoded image in memory, so 80 overlapping 8MB uploads would OOM a
    // 1GiB instance; a handful at a time is plenty for our upload rate.
    concurrency: 4,
    // A failure here is cosmetic: the original stays in place and keeps
    // serving. Retrying a poison image forever is the worse outcome.
    retry: false,
    maxInstances: 3,
  },
  async (event) => {
    const { bucket, name, contentType, generation, metageneration } = event.data
    if (!isManaged(name, contentType)) return

    const outcome = await resizeInPlace(
      getStorage().bucket(bucket),
      name,
      contentType!,
      generation,
      metageneration,
    )

    if (outcome.status === 'failed') warn('resize skipped; original left in place', { name, ...outcome })
    else info(`image ${outcome.status}`, { name, ...outcome })
  },
)
