import { useEffect, useState } from 'react'
import App from './App.tsx'
import { FirebaseOptions, initializeApp } from "firebase/app";
import { CACHE_SIZE_UNLIMITED, collection, getDocs, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { Airfield, Data } from './types.ts';

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
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_SIZE_UNLIMITED})
});


export const DataProvider = () => {
  const [data, setData] = useState<Data>({airfields:[]})

  useEffect(() => {
    getDocs(collection(db, "airfields")).then( e => {
      setData({airfields: e.docs.map(e => e.data() as Airfield)})
    })
  }, [])

  return (<App data={data}/>)
}
