import '@mantine/core/styles.css';
import { createBrowserRouter, RouterProvider, Route, Routes } from "react-router-dom";
import './App.css'

import ListPage from './routes/ListPage';
import Layout from './Layout';
import Home from './routes/Home';

const router = createBrowserRouter([
  { path: "*", Component: Root },
], {basename:"/aero-trips/"});

export default function App() {
  return <RouterProvider router={router} />;
}


function Root() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/list" element={<ListPage />} />
      </Route>
    </Routes>
  );
}