import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import AirfieldsPage from "./routes/AirfieldsPage";
import Activities from "./routes/Activities";
import MapPage from "./routes/MapPage";

import './App.css'
import AirfieldDetails from "./routes/AirfieldDetails";
import { Data } from "./types";

export default function App({data}:{data: Data}) {  
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />}/>
          <Route path="/airfields" element={<AirfieldsPage airfields={data.airfields}/>} />
          <Route path="/airfields/:airfieldId" element={<AirfieldDetails />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/map" element={<MapPage airfields={data.airfields}/>} />
        </Route>
      </Routes>
    );
  }