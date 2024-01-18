import { GeoPoint } from "firebase/firestore"

export type Airfield = {
  codeIcao: string,
  name?: string,
  position: GeoPoint,
}

export type Data = {
  airfields: Airfield[],
}