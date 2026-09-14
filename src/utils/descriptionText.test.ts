import { describe, expect, it } from 'vitest'
import { descriptionToText } from './descriptionText'

// Shape taken verbatim from src/data/airfields.json (LFAB)
const realDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: "L'" },
        {
          type: 'text',
          text: 'aéroclub de Dieppe',
          marks: [{ type: 'link', attrs: { href: 'http://www.aeroclubdieppe.fr', rel: 'noopener', target: null } }],
        },
        { type: 'text', text: ' propose une brochure pour les pilotes de passage.' },
      ],
    },
    { type: 'image', attrs: { src: 'https://example.com/piste.jpg', alt: "La piste de l'aérodrome", title: null } },
  ],
}

describe('descriptionToText', () => {
  it('serializes a real airfield description to markdown', () => {
    expect(descriptionToText(realDoc)).toBe(
      "L'[aéroclub de Dieppe](http://www.aeroclubdieppe.fr) propose une brochure pour les pilotes de passage.\n\n" +
      "![La piste de l'aérodrome](https://example.com/piste.jpg)"
    )
  })

  it('drops markdown syntax in plain-text mode', () => {
    expect(descriptionToText(realDoc, { markdown: false })).toBe(
      "L'aéroclub de Dieppe propose une brochure pour les pilotes de passage.\n\n" +
      "(image : La piste de l'aérodrome)"
    )
  })

  it('handles headings, lists, marks and hard breaks', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Services' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Restaurant', marks: [{ type: 'bold' }] }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Camping' }] }] },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ligne 1' }, { type: 'hardBreak' }, { type: 'text', text: 'Ligne 2' }] },
      ],
    }
    expect(descriptionToText(doc)).toBe('## Services\n\n- **Restaurant**\n- Camping\n\nLigne 1\nLigne 2')
  })

  it('falls back to the alt attribute chain for images', () => {
    const withTitle = { type: 'doc', content: [{ type: 'image', attrs: { src: 'a.jpg', title: 'Un titre' } }] }
    const bare = { type: 'doc', content: [{ type: 'image', attrs: { src: 'a.jpg' } }] }
    expect(descriptionToText(withTitle)).toBe('![Un titre](a.jpg)')
    expect(descriptionToText(bare)).toBe('![image](a.jpg)')
  })

  it('recurses into unknown node types instead of dropping them', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'futureExtension', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Toujours visible' }] }] }],
    }
    expect(descriptionToText(doc)).toBe('Toujours visible')
  })

  it('truncates on a word boundary', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'un deux trois quatre cinq six' }] }] }
    expect(descriptionToText(doc, { maxLength: 18 })).toBe('un deux trois…')
  })

  it('returns an empty string for missing or malformed input', () => {
    expect(descriptionToText(undefined)).toBe('')
    expect(descriptionToText(null)).toBe('')
    expect(descriptionToText('not a doc')).toBe('')
  })
})

describe('descriptionToText images option', () => {
  it('omits image nodes when asked', () => {
    expect(descriptionToText(realDoc, { images: false })).toBe(
      "L'[aéroclub de Dieppe](http://www.aeroclubdieppe.fr) propose une brochure pour les pilotes de passage."
    )
  })

  it('returns an empty string for an image-only description', () => {
    const doc = { type: 'doc', content: [{ type: 'image', attrs: { src: 'a.jpg', alt: 'Vue' } }] }
    expect(descriptionToText(doc, { images: false })).toBe('')
  })
})
