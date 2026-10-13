import { describe, expect, it } from 'vitest'
import { parseChange } from '../../../src/utils/changes.ts'
import { changeSummary } from './changeMail.ts'

const SITE = 'https://aerotrips.fr'

describe('changeSummary', () => {
  it('lists the fields an edit changes, and links to its review page', () => {
    const parsed = parseChange({ targetDocument: 'airfields/LFOV', website: 'https://new.test', fuels: ['100LL'], updated_by: 'anonymous' })
    expect(changeSummary('abc', parsed, { website: 'https://old.test', fuels: ['100LL'] }, SITE)).toEqual({
      review: 'https://aerotrips.fr/admin/changes/abc',
      subject: 'Modification : airfields/LFOV',
      summary: ['Modification de airfields/LFOV', 'Champs : website'],
    })
  })

  it('tells a creation apart', () => {
    const { subject, summary } = changeSummary('x', parseChange({ targetDocument: 'activities/resto', name: 'Resto' }), undefined, SITE)
    expect(subject).toBe('Création : activities/resto')
    expect(summary[1]).toBe('Champs : name')
  })

  it('quotes contact messages', () => {
    const parsed = parseChange({ targetDocument: 'contacts/a@b.fr', email: 'a@b.fr', message: 'Bonjour' })
    expect(changeSummary('m', parsed, undefined, SITE)).toMatchObject({ subject: 'Message de a@b.fr', summary: ['De : a@b.fr', '', 'Bonjour'] })
  })

  it('flags invalid changes', () => {
    expect(changeSummary('z', parseChange({ targetDocument: 'profiles/x' }), undefined, SITE).subject).toBe('Changement invalide')
  })
})
