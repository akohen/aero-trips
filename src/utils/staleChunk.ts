const RELOAD_KEY = "stale-chunk-reload";

// After a deploy, an already-open tab still references the previous build's
// hashed chunks, which no longer exist on Hosting.
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS|MIME type/i.test(message);
}

// Reloads at most once per minute, so a genuinely broken build can't loop.
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
