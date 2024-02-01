import { GeoPoint } from "firebase/firestore"

type Data = {
  airfields: Map<string,Airfield>,
  activities: Map<string,Activity>,
  trips: Map<string,Trip>,
  saveChange: (obj: object) => void,
}

type Airfield = {
  codeIcao: string,
  name: string,
  position: GeoPoint,
  runways: Runway[],
  description?: JSONContent,
  status:'CAP'|'PRV'|'RST'|'MIL'|'OFF'
  fuels?: string[],
  toilet?:'no'|'public'|'private',
}

type Runway = {
  composition?: string,
  designation?: string,
  length: number,
}

type Activity = {
  name: string,
  position: GeoPoint,
  description?: JSONContent,
  type: ActivityType[],
}

type ActivityType =  // food, lodging, bike, hiking, transit, car, poi, historic?
  'food' | // Restaurant, aires de picnic, food trucks...
  'lodging' | // Hotel, camping...
  'bike' | // location de vélo
  'transit' | // Train, bus, tram, subway stations...
  'car' | // Taxi ou location de voiture
  'hiking' | // Randonnée
  'culture' | // Chateau, musée...
  'poi' | // A voir du ciel
  'aero' | // En rapport avec l'aéronautique
  'other' // autre activité

type Trip = {
  from?: string,
  to: string,
  name: string,
  description: JSONContent,
  type: 'short' | 'day' | 'multi',
  steps?: {type: 'activity'|'airfield', id:string}[],
}

type ADfilter = {
  search: string,
  services: string[],
  ad: string[],
  runway: number | '',
  distance: number | '',
  target: string | null,
}

type ActivityFilter = {
  search: string,
  target: string | null,
  distance: number | '',
  type: string[],
}
