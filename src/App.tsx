import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import MapPage from "./routes/MapPage";

import './App.css'
import AirfieldDetails from "./routes/AirfieldDetails";
import { Data } from "./types";
import ActivitiesList from "./routes/ActivitiesList";
import AirfieldsPage from "./routes/AirfieldsPage";

export default function App({data}:{data: Data}) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home activities={data.activities}/>}/>
          <Route path="/airfields" element={<AirfieldsPage airfields={data.airfields}/>} />
          <Route path="/airfields/:airfieldId" element={<AirfieldDetails airfields={data.airfields}/>} />
          <Route path="/activities" element={<ActivitiesList airfields={data.airfields} />} />
          <Route path="/map" element={<MapPage airfields={data.airfields}/>} />
        </Route>
      </Routes>
    );
  }