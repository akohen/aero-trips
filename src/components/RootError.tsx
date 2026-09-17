import { useEffect } from "react";
import { useRouteError } from "react-router";
import { isStaleChunkError, reloadOnce } from "../utils/staleChunk";

// Rendered by the router outside MantineProvider, so plain HTML only.

export default function RootError() {
  const error = useRouteError();
  const stale = isStaleChunkError(error);

  useEffect(() => {
    console.error("[RootError]", error);
    if (stale) reloadOnce();
  }, [error, stale]);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
      <h1 style={{ fontSize: "1.5rem" }}>
        {stale ? "Une nouvelle version d'AeroTrips est disponible" : "Oups, une erreur est survenue"}
      </h1>
      <p>Rechargez la page pour continuer.</p>
      <button
        onClick={() => window.location.reload()}
        style={{ padding: "0.6rem 1.2rem", fontSize: "1rem", cursor: "pointer" }}
      >
        Recharger
      </button>
    </div>
  );
}
