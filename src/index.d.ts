import { GeoPoint } from "firebase/firestore"

type Data = {
  airfields: Map<string,Airfield>,
  activities: Map<string,Activity>,
  trips: Map<string,Trip>,
  profile: Profile?,
  mapView: MapView,
  setMapView: React.Dispatch<React.SetStateAction<MapView>>,
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
  website?: string,
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
  website?: string,
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
  'nautical' | // Activités nautiques
  'nature' | // Nature et animaux
  'other' // autre activité

type Trip = {
  name: string,
  description: JSONContent,
  type: 'short' | 'day' | 'multi',
  steps: {type: 'activities'|'airfields', id:string}[],
  tags: ActivityType[],
  uid: string,
  author: string,
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

interface Profile {
  displayName: string,
  uid: string,
  email: string,
  homebase?: string,
  favorites?: string[],
  visited?: {type: 'activities'|'airfields', id:string}[],
  update: (changes: Partial<Profile>) => void,
}

type MapView = {
  center: LatLng,
  zoom: number
}