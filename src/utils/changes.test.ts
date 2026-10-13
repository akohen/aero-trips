import { describe, expect, it } from 'vitest'
import { diffChange, mayCreate, parseChange, parseDataImage, uploadDataImages } from './changes'

describe('parseChange', () => {
  it('parses an edit and drops the protected fields', () => {
    expect(parseChange({
      targetDocument: 'airfields/LFOV', website: 'https://laval.test', landingFee: { amount: 0 },
      reportStats: { count: 9 }, updated_at: 'then', updated_by: 'anonymous',
    })).toEqual({
      kind: 'edit', collection: 'airfields', docId: 'LFOV', targetDocument: 'airfields/LFOV',
      fields: { website: 'https://laval.test', updated_by: 'anonymous' },
    })
  })

  it('reads contact messages as messages', () => {
    expect(parseChange({ targetDocument: 'contacts/a@b.fr', email: 'a@b.fr', message: 'Bonjour' }))
      .toMatchObject({ kind: 'contact', email: 'a@b.fr', message: 'Bonjour' })
  })

  it.each([
    [{}],
    [{ targetDocument: 42 }],
    [{ targetDocument: 'airfields' }],
    [{ targetDocument: 'airfields/' }],
    [{ targetDocument: 'airfields/LFOV/photos/x' }],
    [{ targetDocument: 'activities/__id__' }],
    [{ targetDocument: 'profiles/alice' }],
    [{ targetDocument: 'passports/alice' }],
    [{ targetDocument: 'reports/r1' }],
    [{ targetDocument: 'changes/c1' }],
  ])('rejects %o', (data) => {
    expect(parseChange(data).kind).toBe('invalid')
  })

  it('never lets a guest create an airfield', () => {
    expect(mayCreate('airfields')).toBe(false)
    expect(mayCreate('activities')).toBe(true)
  })
})

describe('diffChange', () => {
  const geo = (latitude: number, longitude: number) => ({ latitude, longitude })

  it('keeps only modified fields, comparing Firestore values by content', () => {
    const current = {
      name: 'Resto', position: geo(48, -0.7), description: { type: 'doc', content: [{ type: 'paragraph' }] },
      tags: ['a'],
    }
    expect(diffChange({
      name: 'Resto', position: geo(48, -0.7), description: { content: [{ type: 'paragraph' }], type: 'doc' },
      tags: ['a', 'b'],
    }, current)).toEqual([{ field: 'tags', current: ['a'], proposed: ['a', 'b'] }])
  })

  it('lists every field of a new document', () => {
    expect(diffChange({ name: 'Resto' })).toEqual([{ field: 'name', current: undefined, proposed: 'Resto' }])
  })

  it('compares timestamps by instant', () => {
    const ts = { seconds: 10, nanoseconds: 0 }
    expect(diffChange({ date: { ...ts } }, { date: { toDate: () => new Date(10_000) } })).toEqual([])
  })
})

describe('data images', () => {
  const png = `data:image/png;base64,${btoa('png!')}`

  it('decodes png, jpeg and webp data URLs only', () => {
    expect(parseDataImage(png)).toEqual({ contentType: 'image/png', extension: 'png', bytes: new TextEncoder().encode('png!') })
    expect(parseDataImage('data:image/webp;base64,AA==')?.extension).toBe('webp')
    expect(parseDataImage('data:image/jpeg;base64,AA==')?.extension).toBe('jpg')
    expect(parseDataImage('data:image/svg+xml;base64,AA==')).toBeUndefined()
    expect(parseDataImage('https://x.test/a.png')).toBeUndefined()
  })

  it('uploads nested images in order and leaves the rest untouched', async () => {
    const description = {
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: png, alt: 'a' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
        { type: 'blockquote', content: [{ type: 'image', attrs: { src: 'data:image/jpeg;base64,AA==' } }] },
        { type: 'image', attrs: { src: 'https://kept.test/a.png' } },
      ],
    }
    const uploaded: string[] = []
    const result = await uploadDataImages(description, async (image) => {
      uploaded.push(image.contentType)
      return `https://cdn.test/${uploaded.length}.${image.extension}`
    })
    expect(uploaded).toEqual(['image/png', 'image/jpeg'])
    expect(result).toEqual({
      type: 'doc',
      content: [
        { type: 'image', attrs: { src: 'https://cdn.test/1.png', alt: 'a' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
        { type: 'blockquote', content: [{ type: 'image', attrs: { src: 'https://cdn.test/2.jpg' } }] },
        { type: 'image', attrs: { src: 'https://kept.test/a.png' } },
      ],
    })
    expect(description.content[0].attrs!.src).toBe(png)
  })

  it('passes through a missing description', async () => {
    expect(await uploadDataImages(undefined, async () => 'x')).toBeUndefined()
  })
})
