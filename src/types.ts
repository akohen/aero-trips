import { GeoPoint } from "firebase/firestore"

export type Data = {
  airfields: Map<string,Airfield>,
  activities: Map<string,Activity>,
  trips: Map<string,Trip>,
  saveChange: (obj: object) => void,
}

export type Airfield = {
  codeIcao: string,
  name: string,
  position: GeoPoint,
  runways: Runway[],
  description?: string,
  status:'CAP'|'PRV'|'RST'|'MIL'|'OFF'
  fuels?: string[]
}

export type Runway = {
  composition?: string,
  designation?: string,
  length: number,
}

export type Activity = {
  name: string,
  position: GeoPoint,
  description?: string,
  type: ActivityType[],
}

export type ActivityType = 
  'transport' | 
  'food' |
  'lodging' | 
  'poi' |
  'other'

export type Trip = {
  from?: string,
  to: string,
  name: string,
  description: string,
  type: 'short' | 'day' | 'multi',
  wpt?: GeoPoint[],
}

export type ADfilter = {
  search: string,
  services: string[],
  ad: string[],
  runway: number | undefined,
  distance: number | undefined,
  target: string,
}