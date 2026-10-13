/**
 * Guest contributions waiting in the `changes` collection (React/SDK-free).
 *
 * Signed-out visitors and Anonymous Auth guests can't write the collections: their edits and the
 * contact form land in `changes` (`{targetDocument, ...fields}`), which anyone can create. Reviewing
 * one means diffing it against its target and applying it, from the CLI (`npm run manage`) or the
 * admin callable (`functions/admin/`). Both go through these helpers so they accept the same changes.
 *
 * The documents are written by anyone: `parseChange` is what keeps an applied change inside the
 * collections guests may edit, and out of the fields only Cloud Functions own.
 */

/** Collections a guest change may write, once an admin applies it. */
export const CHANGE_COLLECTIONS = ['airfields', 'activities', 'events'] as const
export type ChangeCollection = typeof CHANGE_COLLECTIONS[number]

/** Function-owned or server-stamped fields a change never writes. */
const PROTECTED_FIELDS: Record<ChangeCollection, string[]> = {
  airfields: ['landingFee', 'reportStats', 'updated_at'],
  activities: ['updated_at'],
  events: ['updated_at'],
}

export type ParsedChange =
  | { kind: 'edit', collection: ChangeCollection, docId: string, targetDocument: string, fields: Record<string, unknown> }
  | { kind: 'contact', email: string, message: string, fields: Record<string, unknown> }
  | { kind: 'invalid', reason: string, fields: Record<string, unknown> }

/** A Firestore document id: one segment, not `.`/`..`, not reserved (`__x__`). */
const validDocId = (id: string) =>
  id.length > 0 && id.length <= 1500 && !id.includes('/') && id !== '.' && id !== '..' && !/^__.*__$/.test(id)

export const parseChange = (data: Record<string, unknown>): ParsedChange => {
  const { targetDocument, ...rest } = data
  if (typeof targetDocument !== 'string') return { kind: 'invalid', reason: 'no targetDocument', fields: rest }

  const slash = targetDocument.indexOf('/')
  const collection = targetDocument.slice(0, slash)
  const docId = targetDocument.slice(slash + 1)
  if (slash < 0 || !validDocId(docId)) return { kind: 'invalid', reason: `bad target ${targetDocument}`, fields: rest }

  // Contact form: a message to read, never something to apply
  if (collection === 'contacts') {
    return {
      kind: 'contact',
      email: typeof rest.email === 'string' ? rest.email : docId,
      message: typeof rest.message === 'string' ? rest.message : '',
      fields: rest,
    }
  }

  if (!(CHANGE_COLLECTIONS as readonly string[]).includes(collection)) {
    return { kind: 'invalid', reason: `collection ${collection} is not editable by guests`, fields: rest }
  }
  const fields = Object.fromEntries(Object.entries(rest)
    .filter(([key]) => !PROTECTED_FIELDS[collection as ChangeCollection].includes(key)))
  return { kind: 'edit', collection: collection as ChangeCollection, docId, targetDocument, fields }
}

/** A guest's change to an airfield must not create one: airfields come from the SIA import. */
export const mayCreate = (collection: ChangeCollection) => collection !== 'airfields'

/**
 * Firestore values compared by content: GeoPoints (client or Admin SDK) as `lat,lng`, trip steps by id,
 * Timestamps by instant, objects with sorted keys.
 */
const normalizeValue = (value: unknown): unknown => {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(normalizeValue)
  const v = value as Record<string, unknown>
  if (typeof v.latitude === 'number' && typeof v.longitude === 'number') return `${v.latitude},${v.longitude}`
  if (typeof v.seconds === 'number' && typeof v.nanoseconds === 'number') return new Date(v.seconds * 1000 + v.nanoseconds / 1e6).toISOString()
  if (typeof v.toDate === 'function') return (v.toDate() as Date).toISOString()
  return Object.fromEntries(Object.keys(v).sort().map((key) => [key, normalizeValue(v[key])]))
}

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(normalizeValue(a)) === JSON.stringify(normalizeValue(b))

export type FieldDiff = { field: string, current: unknown, proposed: unknown }

/** The fields a change would modify (all of them for a new document), in the change's order. */
export const diffChange = (fields: Record<string, unknown>, current?: Record<string, unknown>): FieldDiff[] =>
  Object.entries(fields)
    .filter(([field, proposed]) => !current || !sameValue(current[field], proposed))
    .map(([field, proposed]) => ({ field, current: current?.[field], proposed }))

// Guests can't upload to Storage: their description images are inlined as data URLs (src/utils/image.ts)
const DATA_IMAGE = /^data:image\/(png|jpeg|webp);base64,(.*)$/s
const EXTENSIONS: Record<string, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' }

export type DataImage = { contentType: string, extension: string, bytes: Uint8Array }

export const parseDataImage = (src: unknown): DataImage | undefined => {
  if (typeof src !== 'string') return undefined
  const match = DATA_IMAGE.exec(src)
  if (!match) return undefined
  return {
    contentType: `image/${match[1]}`,
    extension: EXTENSIONS[match[1]],
    bytes: Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0)),
  }
}

type Node = { type?: string, attrs?: Record<string, unknown>, content?: Node[] }

/**
 * Uploads the data-URL images of a tiptap description (at any depth) and returns a copy pointing at
 * the uploaded URLs. Uploads run one after the other, and all are done when the promise resolves.
 */
export const uploadDataImages = async (
  description: unknown,
  upload: (image: DataImage) => Promise<string>,
): Promise<unknown> => {
  const walk = async (node: Node): Promise<Node> => {
    const image = node.type === 'image' ? parseDataImage(node.attrs?.src) : undefined
    const attrs = image ? { ...node.attrs, src: await upload(image) } : node.attrs
    const content = node.content ? [] as Node[] : undefined
    for (const child of node.content ?? []) content!.push(await walk(child))
    return { ...node, ...(attrs && { attrs }), ...(content && { content }) }
  }
  return description && typeof description === 'object' ? walk(description as Node) : description
}
