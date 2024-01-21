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
import TripsList from "./routes/TripsList";
import TripDetails from "./routes/TripDetails";

export default function App(data : Data) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"                       element={<Home />}/>
          <Route path="/airfields"              element={<AirfieldsList {...data}/>} />
          <Route path="/airfields/:airfieldId"  element={<AirfieldDetails {...data} />} />
          <Route path="/activities"             element={<ActivitiesList {...data} />} />
          <Route path="/activities/:activityId" element={<ActivityDetails {...data}/>} />
          <Route path="/map/:lat?/:lng?"        element={<MapPage {...data}/>} />
          <Route path="/trips"                  element={<TripsList {...data} />} />
          <Route path="/trips/:tripId"          element={<TripDetails {...data} />} />
        </Route>
      </Routes>
    );
  }