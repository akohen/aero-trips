import { useEffect, useState } from 'react'
import App from './App.tsx'
import { addDoc, collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { Activity, Airfield, Profile, Trip } from '.';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './data/firebase.ts';


export const DataProvider = () => {
  const [airfields, setAirfields] = useState<Map<string,Airfield>>(new Map())
  const [activities, setActivities] = useState<Map<string,Activity>>(new Map())
  const [trips, setTrips] = useState<Map<string,Trip>>(new Map())
  const [profile, setProfile] = useState<Profile|null>(null)

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

  const saveChange = (obj: object) => {
    addDoc(collection(db, "changes"), obj);
  }

  useEffect(() => {
    getAirfields()
    getActivities()
    getTrips()
  },[])

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;
        const query = await getDoc(doc(db, "profiles", uid))
        if(query.exists()) {
          setProfile({...query.data(), uid} as Profile)
        } else {
          setDoc(doc(db, "profiles", uid), {email:user.email, displayName:user.displayName})
          setProfile({email:user.email, displayName:user.displayName, uid} as Profile)
        }
      } else { setProfile(null) }
    })
  },[])

  return (<App
    airfields={airfields}
    activities={activities}
    trips={trips}
    saveChange={saveChange}
    profile={profile}
    setProfile={setProfile}
  />)
}
