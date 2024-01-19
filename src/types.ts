import { GeoPoint } from "firebase/firestore"

export type Airfield = {
  codeIcao: string,
  name: string,
  position: GeoPoint,
  runways: Runway[],
  description?: string,
}

export type Runway = {
  composition?: string,
  designation?: string,
  length: number,
}

export type Activity = {
  id: string,
  name: string,
  position: GeoPoint,
  description?: string,
  type: ActivityType[],
}

export type ActivityType = 
  'transport' | 
  'food' |
  'lodging' | 
  'other'
