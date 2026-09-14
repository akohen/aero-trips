/**
 * The MCP server's dataset: the same committed JSON snapshots the SPA bundles.
 *
 * esbuild inlines both files into lib/index.js (--loader:.json=json), so there
 * is no filesystem read at cold start and no data to deploy separately. The
 * flip side is that the data is only as fresh as the last `npm run export` +
 * deploy, which is why SNAPSHOT_DATE is surfaced in every tool response.
 */
import airfieldsJson from '../../src/data/airfields.json'
import activitiesJson from '../../src/data/activities.json'
import type { Activity, Airfield } from '../../src'

// The JSON holds serialized Firestore GeoPoints/Timestamps rather than live SDK
// instances. Structurally compatible with everything we use (haversine-distance
// reads .latitude/.longitude directly), so cast once here rather than at use.
const snapshot = airfieldsJson as unknown as { updated_at: string; airfields: Airfield[] }
const activitySnapshot = activitiesJson as unknown as { updated_at: string; activities: Activity[] }

export const airfields = new Map<string, Airfield>(
  snapshot.airfields.map(a => [a.codeIcao, a]),
)

export const activities = new Map<string, Activity>(
  activitySnapshot.activities.map(a => [a.id, a]),
)

/** Snapshot date, formatted for French output (the UI language). */
export const SNAPSHOT_DATE = new Date(snapshot.updated_at).toLocaleDateString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
})

export const SITE_URL = 'https://aerotrips.fr'
