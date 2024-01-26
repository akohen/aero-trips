import haversineDistance from "haversine-distance";
import { Activity, ActivityType, Airfield, ADfilter } from "./types";

export const slug = (str: string) => {
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .concat('-',Math.random().toString(36).substring(7));
}

export const getActivityType = (type: ActivityType) => ({
  poi:      "A voir du ciel",
  transport:"Transport",
  food:     "Restauration",
  lodging:  "Hébergement",
  other:    "Autre",
}[type])

export const getAirfieldStatus = (status: Airfield["status"]) => ({
  CAP: "Ouvert à la circulation aérienne publique",
  RST: "Accès restreint",
  PRV: "Terrain privé",
  MIL: "Usage militaire uniquement",
  OFF: "Fermé",
}[status])

export function findNearest<T extends Airfield|Activity>(reference: Airfield|Activity, items:Map<string,T>, maxDistance: number = 10000): [distance: number, item: T, id: string][] {
  return [...items]
  .map(([id,ad]) => [haversineDistance(reference.position,ad.position), ad, id] as [number, T ,string])
  .filter(([dist,]) => dist < maxDistance && dist > 1)
  .sort((a,b) => a[0]-b[0])
}

export const filterAirfields = (data: Map<string,Airfield>, filters: ADfilter) => {
  const query = filters.search.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const status = ['CAP', 'PRV', 'RST'].filter( e => filters.ad.includes(e))

  return new Map([...data]
    .filter(([, item]) => {
      if( status.length > 0 && !status.includes(item.status)) return false
      if( filters.ad.includes('100LL') && !item.fuels?.includes('100LL')) return false
      if( filters.runway && Math.max(...item.runways.map(r => r.length)) < filters.runway) return false
      return true
    })
    .filter(([key, item]) => 
      [item.description, item.codeIcao, item.name, key].some((x) => x?.toLowerCase().includes(query))
    )
  )
}