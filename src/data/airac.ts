export function getAirac(reference: Date) {
  let current = new Date("2023/12/28")
  while (nextAirac(current) < reference) { current = nextAirac(current) }
  const MONTHS = ['JAN', 'FEB', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC']
  return String(current.getDate()).padStart(2,'0') + '_' + MONTHS[current.getMonth()] + '_' + current.getFullYear()
}

export function nextAirac(start: Date) {
  const nextDate = new Date(start);
  nextDate.setDate(nextDate.getDate() + 28);
  return nextDate;
}

const airac = getAirac(new Date())
export default airac
export const getVacUrl = (codeIcao: string) => `https://www.sia.aviation-civile.gouv.fr/dvd/eAIP_${airac}/Atlas-VAC/PDF_AIPparSSection/VAC/AD/AD-2.${codeIcao}.pdf`
