import { Routes, Route, useLocation, useSearchParams, NavigateOptions } from "react-router";
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
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
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
import LandingPage from "./routes/LandingPage";
import { hasActivityFilters, hasAirfieldFilters, parseActivityFilters, parseAirfieldFilters, writeActivityFilters, writeAirfieldFilters } from "./utils/filterParams";


type FilterUpdate = { ad?: ADfilter, act?: ActivityFilter }
const usesAirfieldFilters = (path: string) => path === '/airfields' || path === '/map' || path.startsWith('/map/')
const usesActivityFilters = (path: string) => path === '/activities' || path === '/map' || path.startsWith('/map/')

export default function App(data : Data) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation();

  // Derived from the URL, never copied into state: react-router applies location changes in a
  // transition, so a copy would render ahead of the URL, and anything writing the query string in
  // between (CardList's page number) would write the old query back and erase the new filters.
  const ADfilter = useMemo(() => parseAirfieldFilters(searchParams), [searchParams])
  const ActFilter = useMemo(() => parseActivityFilters(searchParams), [searchParams])

  // One navigation per update (two setSearchParams in a row would each start from the same, stale query).
  // flushSync re-renders with the new URL within the event, so the controlled search inputs keep up.
  const setFilters = useCallback(({ ad, act }: FilterUpdate, options?: NavigateOptions) => setSearchParams(params => {
    if (ad) writeAirfieldFilters(params, ad)
    if (act) writeActivityFilters(params, act)
    return params
  }, { flushSync: true, ...options }), [setSearchParams])
  const setAirfieldFilters = (ad: ADfilter) => setFilters({ ad })
  const setActivityFilters = (act: ActivityFilter) => setFilters({ act })

  // Filters follow the user across the lists and the map: entering one of those pages with no
  // filters in its URL (e.g. from the navbar) restores the last ones used there.
  const lastFilters = useRef<Required<FilterUpdate>>({ ad: ADfilter, act: ActFilter })
  const lastPath = useRef<string | null>(null)
  useEffect(() => {
    const path = location.pathname
    const entered = lastPath.current !== path
    lastPath.current = path
    const restore: FilterUpdate = {}
    if (usesAirfieldFilters(path)) {
      if (entered && !hasAirfieldFilters(ADfilter) && hasAirfieldFilters(lastFilters.current.ad)) restore.ad = lastFilters.current.ad
      else lastFilters.current.ad = ADfilter
    }
    if (usesActivityFilters(path)) {
      if (entered && !hasActivityFilters(ActFilter) && hasActivityFilters(lastFilters.current.act)) restore.act = lastFilters.current.act
      else lastFilters.current.act = ActFilter
    }
    if (restore.ad || restore.act) setFilters(restore, { replace: true, flushSync: false })
  }, [location.pathname, ADfilter, ActFilter, setFilters])

  useEffect(() => {
    // Pages that set their own title through usePageSeo
    if(!['/activities/', '/airfields/', '/decouvrir/'].some(p => location.pathname.startsWith(p))) {
      document.title = "AeroTrips"
    }
  }, [location]);

  const mapProps = {...data, ADfilter, ActFilter, setADfilter: setAirfieldFilters, setActFilter: setActivityFilters, setFilters}
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
        <Route path="/events"                 element={<EventsList {...data} />} />
        <Route path="/events/:eventId"        element={<EventDetails {...data} />} />
        <Route path="/decouvrir/:slug"        element={<LandingPage {...data} />} />
        <Route path="/contact"                element={<Contact {...data} />} />
        <Route path="/changes"                element={<LastChanges {...data} />} />
        <Route path="*"                       element={<NotFound />} />
      </Route>
    </Routes>
    </DatesProvider>
    </ScrollToTop>
  );
}