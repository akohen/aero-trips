import haversineDistance from "haversine-distance";
import { Activity, ActivityType, Airfield } from "./types";

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