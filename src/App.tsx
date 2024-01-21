import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import MapPage from "./routes/MapPage";

import './App.css'
import AirfieldDetails from "./routes/AirfieldDetails";
import { Data } from "./types";
import ActivitiesList from "./routes/ActivitiesList";
import AirfieldsList from "./routes/AirfieldsList";
import ActivityDetails from "./routes/ActivityDetails";

export default function App({airfields, activities} : Data) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />}/>
          <Route path="/airfields" element={<AirfieldsList airfields={airfields}/>} />
          <Route path="/airfields/:airfieldId" element={
            <AirfieldDetails airfields={airfields} activities={activities} />
          } />
          <Route path="/activities" element={
            <ActivitiesList activities={activities} />
          } />
          <Route path="/activities/:activityId" element={<ActivityDetails activities={activities}/>} />
          <Route path="/map/:lat?/:lng?" element={<MapPage airfields={airfields} activities={activities}/>} />
        </Route>
      </Routes>
    );
  }