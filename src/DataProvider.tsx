import { useEffect, useState } from 'react'
import App from './App.tsx'
import { collection, doc, getDoc, getDocs, setDoc, query, where } from "firebase/firestore";
import { Activity, Airfield, MapView, Profile, Trip } from '.';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './data/firebase.ts';
import airfieldsData from './data/airfields.json'
import activitiesData from './data/activities.json'


export const DataProvider = () => {
  const [airfields, setAirfields] = useState<Map<string,Airfield>>(new Map())
  const [activities, setActivities] = useState<Map<string,Activity>>(new Map())
  const [trips, setTrips] = useState<Map<string,Trip>>(new Map())
  const [profile, setProfile] = useState<Profile|undefined>(undefined)
  const [mapView, setMapView] = useState<MapView>({center:[49, 2.5], zoom:8})

  const getAirfields = async () => {
    const newAirfields = new Map<string, Airfield>()
    airfieldsData.airfields.forEach(e => newAirfields.set(e.codeIcao, e as Airfield))
    // Called here so that the data is displayed as soon as possible
    setAirfields(newAirfields)
    
    const req = await getDocs(query(
      collection(db, "airfields"), 
      where("updated_at", ">=", new Date(airfieldsData.updated_at))
    ));
    req.docs.forEach(e => newAirfields.set(e.id, e.data() as Airfield))
    setAirfields(new Map<string, Airfield>(newAirfields.entries()))
  }

  const getActivities = async () => {
    const newActivities = new Map<string, Activity>()
    activitiesData.activities.forEach(e => newActivities.set(e.id, e as Activity))
    setActivities(newActivities)
    
    const query = await getDocs(collection(db, "activities"));
    query.docs.forEach(e => newActivities.set(e.id, {...e.data(), id:e.id} as Activity))
    setActivities(new Map<string, Activity>(newActivities.entries()))
  }

  const getTrips = async () => {
    const query = await getDocs(collection(db, "trips"));
    const newTrips = new Map<string, Trip>()
    query.docs.forEach(e => newTrips.set(e.id, e.data() as Trip))
    setTrips(newTrips)
  }

  useEffect(() => {
    getAirfields()
    getActivities()
    getTrips()
  },[])

  useEffect(() => {
    class userProfile implements Profile {
      displayName!: string;
      uid!: string;
      email!: string;
      visited?: { type: 'activities' | 'airfields'; id: string; }[] = [];
      update: (changes: Partial<Profile>) => void;
      constructor(params: Omit<Profile, "update">) {
        Object.assign(this, params);
        this.update = (changes: Partial<Profile>) => {
          setDoc(doc(db, "profiles", this.uid), changes, {merge:true})
          const updatedProfile = { ...this, ...changes };
          Object.assign(this, updatedProfile); // I think this whole update function is weird, and this is why
          setProfile(updatedProfile)
        }
      }
    }

    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const query = await getDoc(doc(db, "profiles", uid))
        if(query.exists()) {
          setProfile(new userProfile({...query.data(), uid} as Profile))
        } else {
          setDoc(doc(db, "profiles", uid), {email:user.email, displayName:user.displayName})
          setProfile(new userProfile({email:user.email!, displayName:user.displayName!, uid}))
        }
      } else { setProfile(undefined) }
    })
  },[])

  return (<App
    airfields={airfields}
    activities={activities}
    trips={trips}
    profile={profile}
    mapView={mapView}
    setMapView={setMapView}
  />)
}
