import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import MapPage from "./routes/MapPage";
import './App.css'
import AirfieldDetails from "./routes/AirfieldDetails";
import { Data } from ".";
import ActivitiesList from "./routes/ActivitiesList";
import AirfieldsList from "./routes/AirfieldsList";
import ActivityDetails from "./routes/ActivityDetails";
import TripsList from "./routes/TripsList";
import TripDetails from "./routes/TripDetails";
import AddData from "./routes/AddData";
import { useState } from "react";
import { ADfilter } from '.';


export default function App(data : Data) {
  const [ADfilter, setADfilter] = useState<ADfilter>({
    search:'',
    services: [],
    ad: [],
    runway: '',
    distance: '',
    target: '',
});
  
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/"                       element={<Home />}/>
        <Route path="/airfields"              element={<AirfieldsList {...data} filters={ADfilter} setFilters={setADfilter} />} />
        <Route path="/airfields/:airfieldId"  element={<AirfieldDetails {...data} />} />
        <Route path="/activities"             element={<ActivitiesList {...data} />} />
        <Route path="/activities/:activityId" element={<ActivityDetails {...data}/>} />
        <Route path="/map/:lat?/:lng?"        element={<MapPage {...data} ADfilter={ADfilter} />} />
        <Route path="/trips"                  element={<TripsList {...data} />} />
        <Route path="/trips/:tripId"          element={<TripDetails {...data} />} />
        <Route path="/:type?/:id?/edit"       element={<AddData {...data} />} />
      </Route>
    </Routes>
  );
}