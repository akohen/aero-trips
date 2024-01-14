import { Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Home from "./routes/Home";
import ListPage from "./routes/ListPage";
import './App.css'

export default function Root() {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/list" element={<ListPage />} />
        </Route>
      </Routes>
    );
  }