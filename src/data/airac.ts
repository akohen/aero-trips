export function getAirac(reference: Date = new Date()) {
  let current = new Date("2023-12-28T10:00Z")
  while (nextAirac(current) < reference) { current = nextAirac(current) }
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return String(current.getDate()).padStart(2,'0') + '_' + MONTHS[current.getMonth()] + '_' + current.getFullYear()
}

export function nextAirac(start: Date) {
  const nextDate = new Date(start);
  nextDate.setDate(nextDate.getDate() + 28);
  return nextDate;
}

export const getVacUrl = (codeIcao: string) => `https://www.sia.aviation-civile.gouv.fr/media/dvd/eAIP_${getAirac()}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${codeIcao}.pdf`
