import { db } from '../src/data/firebase.ts';
import { collection, getDocs, Firestore, Timestamp } from "firebase/firestore";
import { Activity, Airfield } from '../src';
import fs from 'fs';

const ROOT_URL = 'https://aerotrips.fr'

const updateAirfields = async (db: Firestore) => {
    const airfields: Airfield[] = []
    const querySnapshot = await getDocs(collection(db, "airfields"))

    querySnapshot.forEach((doc) => {
        airfields.push(doc.data() as Airfield)
    });
    fs.writeFileSync('src/data/airfields.json', JSON.stringify({"updated_at":new Date(), airfields}))
    return airfields
}

const updateActivities = async (db: Firestore) => {
    const activities: Activity[] = []
    const querySnapshot = await getDocs(collection(db, "activities"))

    querySnapshot.forEach((doc) => {
        activities.push({...doc.data()as Activity, id:doc.id} )
    });
    fs.writeFileSync('src/data/activities.json', JSON.stringify({"updated_at":new Date(), activities}))
    return activities
}

const updateTrips = async (db: Firestore) => {
    const trips: {id: string, updated_at?: Timestamp}[] = []
    const querySnapshot = await getDocs(collection(db, "trips"))
    querySnapshot.forEach((doc) => {
        trips.push({id: doc.id, updated_at: doc.data().updated_at})
    });
    return trips
}

const updateEvents = async (db: Firestore) => {
    const events: {id: string, updated_at?: Timestamp}[] = []
    const querySnapshot = await getDocs(collection(db, "events"))
    querySnapshot.forEach((doc) => {
        events.push({id: doc.id, updated_at: doc.data().updated_at})
    });
    return events
}

const toDateString = (ts?: Timestamp) =>
    ts ? new Date(ts.seconds * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)

const generateSitemap = (
    airfields: Airfield[],
    activities: Activity[],
    trips: {id: string, updated_at?: Timestamp}[],
    events: {id: string, updated_at?: Timestamp}[]
) => {
    const entry = (loc: string, lastmod: string, changefreq: string = 'monthly', priority: string = '0.8') =>
        `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`

    const entries = [
        entry(`${ROOT_URL}/airfields`, toDateString()),
        ...airfields.map(a => entry(`${ROOT_URL}/airfields/${a.codeIcao}`, toDateString(a.updated_at), 'monthly', '0.8')),
        entry(`${ROOT_URL}/activities`, toDateString()),
        ...activities.map(a => entry(`${ROOT_URL}/activities/${a.id}`, toDateString(a.updated_at), 'monthly', '0.7')),
        entry(`${ROOT_URL}/trips`, toDateString()),
        ...trips.map(t => entry(`${ROOT_URL}/trips/${t.id}`, toDateString(t.updated_at), 'weekly', '0.9')),
        entry(`${ROOT_URL}/events`, toDateString()),
        ...events.map(e => entry(`${ROOT_URL}/events/${e.id}`, toDateString(e.updated_at), 'weekly', '0.6')),
    ]

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${entries.join('\n')}
</urlset>`

    fs.writeFileSync('public/sitemap.xml', xml)
}

const [airfields, activities, trips, events] = await Promise.all([updateAirfields(db), updateActivities(db), updateTrips(db), updateEvents(db)])
const urls = airfields
    .map(a => `${ROOT_URL}/airfields/${a.codeIcao}`)
    .concat(activities.map(a => `${ROOT_URL}/activities/${a.id}`))
    .concat(trips.map(t => `${ROOT_URL}/trips/${t.id}`))
    .concat(events.map(e => `${ROOT_URL}/events/${e.id}`))
fs.writeFileSync('public/sitemap.txt', urls.join('\n'))
generateSitemap(airfields, activities, trips, events)
console.log(`Saved ${airfields.length} airfields, ${activities.length} activities, ${trips.length} trips and ${events.length} events`)

process.exit(0)