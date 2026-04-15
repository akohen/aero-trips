import { useEffect, useState } from 'react'
import App from './App.tsx'
import { collection, doc, getDoc, getDocs, setDoc, query, where, type DocumentData } from "firebase/firestore";
import { Activity, Airfield, Event, MapView, Profile, Trip } from '.';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './data/firebase.ts';
import airfieldsData from './data/airfields.json'
import activitiesData from './data/activities.json'

const toAirfield = (data: DocumentData, id: string): Airfield | null => {
  if (!data.codeIcao || !data.name || !data.position || !data.runways || !data.status) {
    console.warn('[DataProvider] Skipping malformed airfield:', id, data)
    return null
  }
  return data as Airfield
}

const toActivity = (data: DocumentData, id: string): Activity | null => {
  if (!data.name || !data.position || !data.type) {
    console.warn('[DataProvider] Skipping malformed activity:', id, data)
    return null
  }
  return { ...data, id } as Activity
}

const toTrip = (data: DocumentData, id: string): Trip | null => {
  if (!data.name || !data.steps || !data.uid) {
    console.warn('[DataProvider] Skipping malformed trip:', id, data)
    return null
  }
  return data as Trip
}

const toEvent = (data: DocumentData, id: string): Event | null => {
  if (!data.title || !data.airfieldId || !data.startDate) {
    console.warn('[DataProvider] Skipping malformed event:', id, data)
    return null
  }
  return { ...data, id } as Event
}


class UserProfile implements Profile {
  displayName!: string;
  uid!: string;
  email!: string;
  visited?: { type: 'activities' | 'airfields'; id: string; }[] = [];
  update: (changes: Partial<Profile>) => void;
  constructor(params: Omit<Profile, "update">, setProfile: (p: Profile) => void) {
    Object.assign(this, params);
    this.update = (changes: Partial<Profile>) => {
      setDoc(doc(db, "profiles", this.uid), changes, {merge:true})
      const updatedProfile = { ...this, ...changes };
      Object.assign(this, updatedProfile);
      setProfile(updatedProfile)
    }
  }
}

export const DataProvider = () => {
  const [airfields, setAirfields] = useState<Map<string,Airfield>>(new Map())
  const [activities, setActivities] = useState<Map<string,Activity>>(new Map())
  const [trips, setTrips] = useState<Map<string,Trip>>(new Map())
  const [events, setEvents] = useState<Map<string,Event>>(new Map())
  const [profile, setProfile] = useState<Profile|undefined>(undefined)
  const [mapView, setMapView] = useState<MapView>({center:[49, 2.5], zoom:8})

  const getAirfields = async () => {
    const newAirfields = new Map<string, Airfield>()
    airfieldsData.airfields.forEach(e => { const a = toAirfield(e, e.codeIcao); if (a) newAirfields.set(e.codeIcao, a) })
    // Called here so that the data is displayed as soon as possible
    setAirfields(newAirfields)
    
    const req = await getDocs(query(
      collection(db, "airfields"), 
      where("updated_at", ">=", new Date(airfieldsData.updated_at))
    ));
    req.docs.forEach(e => { const a = toAirfield(e.data(), e.id); if (a) newAirfields.set(e.id, a) })
    setAirfields(new Map<string, Airfield>(newAirfields.entries()))
  }

  const getActivities = async () => {
    const newActivities = new Map<string, Activity>()
    activitiesData.activities.forEach(e => { const a = toActivity(e, e.id); if (a) newActivities.set(e.id, a) })
    setActivities(newActivities)
    
    const req = await getDocs(query(
      collection(db, "activities"), 
      where("updated_at", ">=", new Date(activitiesData.updated_at))
    ));
    req.docs.forEach(e => { const a = toActivity(e.data(), e.id); if (a) newActivities.set(e.id, a) })
    setActivities(new Map<string, Activity>(newActivities.entries()))
  }

  const getTrips = async () => {
    const query = await getDocs(collection(db, "trips"));
    const newTrips = new Map<string, Trip>()
    query.docs.forEach(e => { const t = toTrip(e.data(), e.id); if (t) newTrips.set(e.id, t) })
    setTrips(newTrips)
  }

  const getEvents = async () => {
    const query = await getDocs(collection(db, "events"));
    const newEvents = new Map<string, Event>()
    query.docs.forEach(e => { const ev = toEvent(e.data(), e.id); if (ev) newEvents.set(e.id, ev) })
    setEvents(newEvents)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getAirfields()
    getActivities()
    getTrips()
    getEvents()
  },[])

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const query = await getDoc(doc(db, "profiles", uid))
        if(query.exists()) {
          setProfile(new UserProfile({...query.data(), uid} as Profile, setProfile))
        } else {
          setDoc(doc(db, "profiles", uid), {email:user.email, displayName:user.displayName})
          setProfile(new UserProfile({email:user.email!, displayName:user.displayName!, uid}, setProfile))
        }
      } else { setProfile(undefined) }
    })
  },[])

  return (<App
    airfields={airfields}
    activities={activities}
    trips={trips}
    events={events}
    profile={profile}
    mapView={mapView}
    setMapView={setMapView}
  />)
}
