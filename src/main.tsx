import ReactDOM from 'react-dom/client'
import { createBrowserRouter } from 'react-router';
// From react-router/dom: the only RouterProvider that honors navigate's flushSync option.
import { RouterProvider } from 'react-router/dom';
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
