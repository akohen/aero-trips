import { Routes, Route, useLocation, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [ADfilter, setADfilter] = useState<ADfilter>({
    search:searchParams.get("adSearch") || '',
    services: searchParams.get("adServices") ? searchParams.get("adServices")!.split(',') : [],
    ad: searchParams.get("adMisc") ? searchParams.get("adMisc")!.split(',') : [],
    runway: searchParams.get("rwylLen") != '' ? parseInt(searchParams.get("rwyLen") as string) : '',
    distance: '',
    target: '',
  });
  const setAirfieldFilters = (newFilters: ADfilter) => {
    setSearchParams(params => {
      params.set("adSearch", newFilters.search)
      params.set("adServices", newFilters.services.join(','))
      params.set("adMisc", newFilters.ad.join(','))
      params.set("rwyLen", newFilters.runway ? newFilters.runway.toString():'')
      params.set("adDist", newFilters.distance.toString())
      params.set("adTgt", newFilters.target?.toString()||'')
      if(newFilters.search === '') params.delete("adSearch")
      if(newFilters.services.length === 0) params.delete("adServices")
      if(newFilters.ad.length === 0) params.delete("adMisc")
      if(!newFilters.runway) params.delete("rwyLen")
      if(!newFilters.distance) params.delete("adDist")
      if(!newFilters.target) params.delete("adTgt")
      return params
    })
    return setADfilter(newFilters)
  }

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
        <Route path="/airfields"              element={<AirfieldsList {...data} filters={ADfilter} setFilters={setAirfieldFilters} />} />
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