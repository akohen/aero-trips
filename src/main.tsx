import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router';
import { DataProvider } from './DataProvider.tsx';
import RootError from './components/RootError.tsx';
import { reloadOnce } from './utils/staleChunk.ts';
import React from 'react';

// Vite fires this when a lazy chunk fails to load (typically a stale tab after a deploy).
// Reloading picks up the new index.html; preventDefault only if we actually reload.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnce()) event.preventDefault();
});

const router = createBrowserRouter([
  { path: "*", element: <DataProvider />, errorElement: <RootError /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
