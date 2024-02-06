import { useEffect, useState } from 'react'
import App from './App.tsx'
import { FirebaseOptions, initializeApp } from "firebase/app";
import { addDoc, collection, getDocs, initializeFirestore } from "firebase/firestore";
import { Activity, Airfield, Trip } from '.';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAleHj_gty6XncQLEDlLn3Ih7X08KuQ-jw",
  authDomain: "aero-trips.firebaseapp.com",
  projectId: "aero-trips",
  storageBucket: "aero-trips.appspot.com",
  messagingSenderId: "484361364174",
  appId: "1:484361364174:web:4c4eaf632f931956aca69f",
  measurementId: "G-CKJYT103VV"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  //localCache: persistentLocalCache({tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_SIZE_UNLIMITED}),
  ignoreUndefinedProperties: true,
});


export const DataProvider = () => {
  const [airfields, setAirfields] = useState<Map<string,Airfield>>(new Map())
  const [activities, setActivities] = useState<Map<string,Activity>>(new Map())
  const [trips, setTrips] = useState<Map<string,Trip>>(new Map())

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

  return (<App airfields={airfields} activities={activities} trips={trips} saveChange={saveChange} />)
}
