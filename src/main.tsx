import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { DataProvider } from './DataProvider.tsx';
import React from 'react';

const router = createBrowserRouter([
  { path: "*", element: <DataProvider />},
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
