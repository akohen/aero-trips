import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import FieldsPage from "./routes/FieldsPage";
import Activities from "./routes/Activities";
import MapPage from "./routes/MapPage";

import './App.css'
import { Data } from './types.ts'

export default function Root(props: {data: Data}) {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home data={props.data} />}/>
          <Route path="/fields" element={<FieldsPage />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/map" element={<MapPage />} />
        </Route>
      </Routes>
    );
  }