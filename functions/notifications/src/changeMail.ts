import { diffChange, ParsedChange } from '../../../src/utils/changes.ts'

/**
 * What a new guest change says, for its notification: subject, readable summary (the fields it changes, or the
 * contact message) and the link to its review page. `current` is the target document, for an edit.
 */
export const changeSummary = (id: string, parsed: ParsedChange, current: Record<string, unknown> | undefined, siteUrl: string) => {
  const review = `${siteUrl}/admin/changes/${encodeURIComponent(id)}`
  if (parsed.kind === 'contact') {
    return { review, subject: `Message de ${parsed.email}`, summary: [`De : ${parsed.email}`, '', parsed.message] }
  }
  if (parsed.kind === 'invalid') {
    return { review, subject: 'Changement invalide', summary: [`Invalide : ${parsed.reason}`] }
  }
  const fields = diffChange(parsed.fields, current).map(d => d.field).filter(f => f !== 'updated_by')
  return {
    review,
    subject: `${current ? 'Modification' : 'Création'} : ${parsed.targetDocument}`,
    summary: [
      `${current ? 'Modification de' : 'Création de'} ${parsed.targetDocument}`,
      fields.length ? `Champs : ${fields.join(', ')}` : 'Aucune différence avec la version actuelle',
    ],
  }
}
