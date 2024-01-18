import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import FieldsPage from "./routes/AirfieldsPage";
import Activities from "./routes/Activities";
import MapPage from "./routes/MapPage";

import './App.css'

export default function Root() {  
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />}/>
          <Route path="/fields" element={<FieldsPage />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/map" element={<MapPage />} />
        </Route>
      </Routes>
    );
  }