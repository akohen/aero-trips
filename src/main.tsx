import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection  } from "firebase/firestore";
import { Airfield, Data } from './types.ts';

const firebaseConfig = {
  apiKey: "AIzaSyAleHj_gty6XncQLEDlLn3Ih7X08KuQ-jw",
  authDomain: "aero-trips.firebaseapp.com",
  projectId: "aero-trips",
  storageBucket: "aero-trips.appspot.com",
  messagingSenderId: "484361364174",
  appId: "1:484361364174:web:4c4eaf632f931956aca69f",
  measurementId: "G-CKJYT103VV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const data: Data = {
  airfields: []
}
const query = await getDocs(collection(db, "airfields"))
query.forEach(a => data.airfields.push(a.data() as Airfield) )


const router = createBrowserRouter([
  { path: "*", element: <App data={data} />},
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
