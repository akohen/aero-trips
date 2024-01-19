import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import MapPage from "./routes/MapPage";

import './App.css'
import AirfieldDetails from "./routes/AirfieldDetails";
import { Activity, Airfield } from "./types";
import ActivitiesList from "./routes/ActivitiesList";
import AirfieldsList from "./routes/AirfieldsList";

export default function App({airfields, activities}:{airfields: Map<string,Airfield>, activities: Map<string,Activity>}) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />}/>
          <Route path="/airfields" element={<AirfieldsList airfields={airfields}/>} />
          <Route path="/airfields/:airfieldId" element={<AirfieldDetails airfields={airfields}/>} />
          <Route path="/activities" element={<ActivitiesList activities={activities} />} />
          <Route path="/map" element={<MapPage airfields={[]} activities={[]}/>} />
        </Route>
      </Routes>
    );
  }