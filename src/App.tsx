import { Routes, Route, useLocation } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import MapPage from "./routes/MapPage";
import './App.css'
import AirfieldDetails from "./routes/AirfieldDetails";
import { ActivityFilter, Data } from ".";
import ActivitiesList from "./routes/ActivitiesList";
import AirfieldsList from "./routes/AirfieldsList";
import ActivityDetails from "./routes/ActivityDetails";
import TripsList from "./routes/TripsList";
import TripDetails from "./routes/TripDetails";
import AddData from "./routes/AddData";
import { useEffect, useState } from "react";
import { ADfilter } from '.';
import Profile from "./routes/Profile";
import Contact from "./routes/Contact";
import ScrollToTop from "./components/ScrollToTop";


export default function App(data : Data) {
  const [ADfilter, setADfilter] = useState<ADfilter>({
    search:'',
    services: [],
    ad: [],
    runway: '',
    distance: '',
    target: '',
});

  const [ActFilter, setActFilter] = useState<ActivityFilter>({
    distance: '',
    search: '',
    target: '',
    type: [],
  })
  const location = useLocation();
  useEffect(() => {
    if(!location.pathname.startsWith('/activities/') && !location.pathname.startsWith('/airfields/')) {
      document.title = "AeroTrips"
    }
  }, [location]);

  const mapProps = {...data, ADfilter, ActFilter, setADfilter, setActFilter}
  
  return (
    <ScrollToTop>
    <Routes>
      <Route element={<Layout {...data} />}>
        <Route path="/"                       element={<Home />}/>
        <Route path="/profile"                element={<Profile {...data} />}/>
        <Route path="/airfields"              element={<AirfieldsList {...data} filters={ADfilter} setFilters={setADfilter} />} />
        <Route path="/airfields/:airfieldId"  element={<AirfieldDetails {...data} />} />
        <Route path="/activities"             element={<ActivitiesList {...data} filters={ActFilter} setFilters={setActFilter} />} />
        <Route path="/activities/:activityId" element={<ActivityDetails {...data}/>} />
        <Route path="/map/"                   element={<MapPage {...mapProps} />} />
        <Route path="/trips"                  element={<TripsList {...data} />} />
        <Route path="/:type?/:id?/edit/:lat?/:lng?"       element={<AddData {...data} />} />
        <Route path="/trips/:tripId"          element={<TripDetails {...data} />} />
        <Route path="/contact"                element={<Contact {...data} />} />
      </Route>
    </Routes>
    </ScrollToTop>
  );
}