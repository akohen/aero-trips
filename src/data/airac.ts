import cycles from './airac.json' assert { type: "json" };

const MONTHS = ['JAN', 'FEB', 'MAR', 'AVR', 'MAI', 'JUN', 'JUI', 'AOU', 'SEP', 'OCT', 'NOV', 'DEC']
const now = new Date().valueOf()
const current = cycles.filter(d => (now - new Date(d[2]+2000,d[1]-1,d[0]).valueOf()) > 0).at(-1)
const airac = current?.[0] + '_'+MONTHS[(current?.[1] || 1) - 1]+'_20'+current?.[2]

export default function getAirac() {
    return airac
}
