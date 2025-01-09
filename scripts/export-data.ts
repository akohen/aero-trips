import { db } from '../src/data/firebase.ts';
import { collection, getDocs, Firestore } from "firebase/firestore";
import { Activity, Airfield } from '../src';
import fs from 'fs';

const ROOT_URL = 'https://aero-trips.web.app'
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
    const trips: string[] = []
    const querySnapshot = await getDocs(collection(db, "trips"))
    
    querySnapshot.forEach((doc) => {
        trips.push(doc.id)
    });
    return trips
}

const [airfields, activities, trips] = await Promise.all([updateAirfields(db), updateActivities(db), updateTrips(db)])
const urls = airfields
    .map(a => `${ROOT_URL}/airfields/${a.codeIcao}`)
    .concat(activities.map(a => `${ROOT_URL}/activities/${a.id}`))
    .concat(trips.map(t => `${ROOT_URL}/trips/${t}`))
fs.writeFileSync('public/sitemap.txt', urls.join('\n'))
console.log(`Saved ${airfields.length} airfields and ${activities.length} activities`)

process.exit(0)