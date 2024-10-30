import { useEffect, useState } from 'react'
import App from './App.tsx'
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { Activity, Airfield, MapView, Profile, Trip } from '.';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './data/firebase.ts';


export const DataProvider = () => {
  const [airfields, setAirfields] = useState<Map<string,Airfield>>(new Map())
  const [activities, setActivities] = useState<Map<string,Activity>>(new Map())
  const [trips, setTrips] = useState<Map<string,Trip>>(new Map())
  const [profile, setProfile] = useState<Profile|null>(null)
  const [mapView, setMapView] = useState<MapView>({center:[49, 2.5], zoom:8})

  const getAirfields = async () => {
    const query = await getDocs(collection(db, "airfields"));
    const newAirfields = new Map<string, Airfield>()
    query.docs.forEach(e => newAirfields.set(e.id, e.data() as Airfield))
    setAirfields(newAirfields)
  }
  const getActivities = async () => {
    const query = await getDocs(collection(db, "activities"));
    const newActivities = new Map<string, Activity>()
    query.docs.forEach(e => newActivities.set(e.id, e.data() as Activity))
    setActivities(newActivities)
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
      update: (changes: Partial<Profile>) => void;
      constructor(params: Omit<Profile, "update">) {
        Object.assign(this, params);
        this.update = (changes: Partial<Profile>) => {
          setDoc(doc(db, "profiles", this.uid), changes, {merge:true})
          setProfile({...this, ...changes} as Profile)
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
      } else { setProfile(null) }
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
