import { GeoPoint, Timestamp } from "firebase/firestore"

type Data = {
  airfields: Map<string,Airfield>,
  activities: Map<string,Activity>,
  trips: Map<string,Trip>,
  events: Map<string,Event>,
  profile?: Profile,
  /** True until Firebase Auth has resolved the session (and its profile) on load */
  authLoading: boolean,
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
  /** Night VFR licensing (SIA list): 'limited' needs prior approval and a briefing on local procedures */
  nightVFR?: 'full' | 'limited',
  webcams?: Webcam[],
  /** Function-owned (`applyReports`, from `reports`): clients never write it. Absent = unknown, never free */
  landingFee?: AirfieldLandingFee,
  updated_at?: Timestamp,
}

/** Copy of the report `deriveLandingFee` chose (src/utils/reports.ts), so static consumers get source and date too */
type AirfieldLandingFee = {
  /** TTC, light aircraft < 2 t; 0 = free */
  amount: number,
  /** One night / 24 h, TTC; absent = unknown */
  parking24h?: number,
  note?: string,
  url?: string,
  /** 'aerops', 'edeis', 'pilot', 'admin'… */
  source: string,
  /** observedAt of the chosen report */
  checkedAt: Timestamp,
}

type ReportSource =
  | {type: 'pilot'}
  | {type: 'import', id: string} // 'aerops', 'edeis', 'adp'…
  | {type: 'admin'} // manual correction, always wins

/** A dated observation about a target. Every landing fee is a report; `applyReports` derives the airfield's from them */
type Report = {
  id: string,
  target: {type: 'airfields' | 'activities', id: string},
  source: ReportSource,
  /** Date of the data: the visit (pilot), the fee sheet's effective date or fetch date (import) */
  observedAt: Timestamp,
  /** Last write (import run, edit): set on every write */
  updated_at: Timestamp,
  landingFee?: {
    /** TTC, reference case: light aircraft < 2 t (≈ 1.2 t MTOW when the source has finer classes); 0 = free */
    amount: number,
    /** One night / 24 h, same aircraft; absent = unknown */
    parking24h?: number,
    note?: string,
    /** Official fee sheet or source page */
    url?: string,
  },
}

type Webcam = {
  /** Page shown to users (the image itself when there is none): always rendered as a link */
  url: string,
  /** Direct https snapshot: enables the preview. Absent = link only */
  image?: string,
  /** Short label when an airfield has several: "Piste 29", "Parking" */
  label?: string,
  /** Set by imports, which only ever rewrite their own entries; absent = manual */
  source?: 'cam-aero',
}

type Runway = {
  composition?: string,
  designation?: string,
  length: number,
}

type Activity = {
  id: string,
  name: string,
  position: GeoPoint,
  description?: JSONContent,
  type: ActivityType[],
  website?: string,
  updated_at?: Timestamp,
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
  date?: Timestamp,
  updated_at?: Timestamp,
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
  favorites?: {type: 'activities'|'airfields', id:string}[],
  visited?: {type: 'activities'|'airfields', id:string}[],
  /** Opt-in: mirrors name, home base and visited airfields to the public `passports` collection */
  passportPublic?: boolean,
  /** Applies the changes locally at once; resolves when Firestore has saved them */
  update: (changes: Partial<Profile>) => Promise<void>,
}

type MapView = {
  center: LatLng,
  zoom: number
}

type Event = {
  id: string,
  title: string,
  airfieldId: string,
  startDate: Timestamp,
  endDate?: Timestamp,
  description: JSONContent,
  link?: string,
  author?: string,
  updated_at?: Timestamp,
}