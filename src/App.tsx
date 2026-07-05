import { Routes, Route, useLocation, useSearchParams } from "react-router";
import { Center, Loader } from "@mantine/core";
import Layout from "./Layout";
import Home from "./routes/Home";
import './App.css'
import 'dayjs/locale/fr';
import AirfieldDetails from "./routes/AirfieldDetails";
import { ActivityFilter, Data } from ".";
import ActivitiesList from "./routes/ActivitiesList";
import AirfieldsList from "./routes/AirfieldsList";
import ActivityDetails from "./routes/ActivityDetails";
import TripsList from "./routes/TripsList";
import AddData from "./routes/AddData";
import { lazy, Suspense, useEffect, useState } from "react";
// Lazy-loaded: these routes pull in Leaflet (vendor-map, ~45 kB gzip),
// which is useless on the home/airfield/activity pages that dominate SEO traffic.
const MapPage = lazy(() => import("./routes/MapPage"));
const TripDetails = lazy(() => import("./routes/TripDetails"));
import { ADfilter } from '.';
import Profile from "./routes/Profile";
import Contact from "./routes/Contact";
import ScrollToTop from "./components/ScrollToTop";
import UserDetails from "./routes/UserDetails";
import { DatesProvider } from "@mantine/dates";
import dayjs from "dayjs";
import LastChanges from "./routes/LastChanges";
import EventsList from "./routes/EventsList";
import EventDetails from "./routes/EventDetails";
import NotFound from "./routes/NotFound";


export default function App(data : Data) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [ADfilter, setADfilter] = useState<ADfilter>({
    search:searchParams.get("adSearch") || '',
    services: searchParams.get("adServices") ? searchParams.get("adServices")!.split(',') : [],
    ad: searchParams.get("adMisc") ? searchParams.get("adMisc")!.split(',') : [],
    runway: searchParams.get("rwyLen") != '' ? parseInt(searchParams.get("rwyLen") as string) : '',
    distance: searchParams.get("adDist") != '' ? parseInt(searchParams.get("adDist") as string) : '',
    target: searchParams.get("adTgt") || '',
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
    distance: searchParams.get("d") != '' ? parseInt(searchParams.get("d") as string) : '',
    search: searchParams.get("s") || '',
    target: searchParams.get("a") || '',
    type: searchParams.get("t") ? searchParams.get("t")!.split(',') : [],
  })
  const setActivityFilters = (newFilters: ActivityFilter) => {
    setSearchParams(params => {
      params.set("s", newFilters.search)
      params.set("d", newFilters.distance ? newFilters.distance.toString():'')
      params.set("t", newFilters.type.join(','))
      params.set("a", newFilters.target?.toString()||'')
      if(newFilters.search === '') params.delete("s")
      if(!newFilters.distance) params.delete("d")
      if(newFilters.type.length === 0) params.delete("t")
      if(!newFilters.target) params.delete("a")
      return params
    })
    return setActFilter(newFilters)
  }

  const location = useLocation();
  useEffect(() => {
    if(!location.pathname.startsWith('/activities/') && !location.pathname.startsWith('/airfields/')) {
      document.title = "AeroTrips"
    }
  }, [location]);

  const mapProps = {...data, ADfilter, ActFilter, setADfilter: setAirfieldFilters, setActFilter: setActivityFilters}
  dayjs.locale('fr')
  
  return (
    <ScrollToTop>
    <DatesProvider settings={{ locale: 'fr' }}>
    <Routes>
      <Route element={<Layout {...data} />}>
        <Route path="/"                       element={<Home {...data} />}/>
        <Route path="/profile"                element={<Profile {...data} />}/>
        <Route path="/profile/:userId"        element={<UserDetails {...data} />}/>
        <Route path="/airfields"              element={<AirfieldsList {...data} filters={ADfilter} setFilters={setAirfieldFilters} />} />
        <Route path="/airfields/:airfieldId"  element={<AirfieldDetails {...data} />} />
        <Route path="/activities"             element={<ActivitiesList {...data} filters={ActFilter} setFilters={setActivityFilters} />} />
        <Route path="/activities/:activityId" element={<ActivityDetails {...data}/>} />
        <Route path="/map/:lat?/:lng?"        element={<Suspense fallback={<Center h="80vh"><Loader /></Center>}><MapPage {...mapProps} /></Suspense>} />
        <Route path="/trips"                  element={<TripsList {...data} />} />
        <Route path="/:type?/:id?/edit/:lat?/:lng?"       element={<AddData {...data} />} />
        <Route path="/trips/:tripId"          element={<Suspense fallback={<Center h="80vh"><Loader /></Center>}><TripDetails {...data} /></Suspense>} />
        <Route path="/events"                 element={<EventsList {...data} setADfilter={setAirfieldFilters} />} />
        <Route path="/events/:eventId"        element={<EventDetails {...data} />} />
        <Route path="/contact"                element={<Contact {...data} />} />
        <Route path="/changes"                element={<LastChanges {...data} />} />
        <Route path="*"                       element={<NotFound />} />
      </Route>
    </Routes>
    </DatesProvider>
    </ScrollToTop>
  );
}