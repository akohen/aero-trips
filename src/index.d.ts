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
  description?: string,
  status:'CAP'|'PRV'|'RST'|'MIL'|'OFF'
  fuels?: string[]
}

type Runway = {
  composition?: string,
  designation?: string,
  length: number,
}

type Activity = {
  name: string,
  position: GeoPoint,
  description?: string,
  type: ActivityType[],
}

type ActivityType = 
  'transport' | 
  'food' |
  'lodging' | 
  'poi' |
  'other'

type Trip = {
  from?: string,
  to: string,
  name: string,
  description: string,
  type: 'short' | 'day' | 'multi',
  wpt?: GeoPoint[],
}

type ADfilter = {
  search: string,
  services: string[],
  ad: string[],
  runway: number | '',
  distance: number | '',
  target: string | null,
}