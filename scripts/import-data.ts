import { firebaseConfig } from '../src/data/firebase.ts';
import { Activity, Airfield } from '../src';
import { readFileSync } from "fs";
import creds from "../serviceAccountKey.json" with { "type": "json" }
import chalk from 'chalk';
import admin from "firebase-admin";
import haversineDistance from "haversine-distance";


const changes: {document: string, data: object}[] = []
let flags = 0
admin.initializeApp({
    ...firebaseConfig,
    credential: admin.credential.cert(creds as admin.ServiceAccount)
});
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true })
const batch = db.batch()

const getAirfields = async (db: admin.firestore.Firestore) => {
    const airfields: Map<string,Airfield> = new Map();
    (await db.collection("airfields").get()).forEach((doc) => {
        airfields.set(doc.id ,doc.data() as Airfield)
    });
    return airfields
}

const getActivities = async (db: admin.firestore.Firestore) => {
    const activities: Map<string,Activity> = new Map();
    (await db.collection("activities").get()).forEach((doc) => {
        activities.set(doc.id, doc.data() as Activity)
    });
    return activities
}

const updateNightVFR = (airfields: Map<string, Airfield>) => {
    const nvfr = JSON.parse(readFileSync(`./scripts/NVFR.json`, 'utf8'))
    nvfr.forEach(code => {
        if(airfields.has(code) && !airfields.get(code)!.nightVFR) {
            changes.push({document: `airfields/${code}`, data:{nightVFR: true}})
        } else {
            console.log(chalk.red(`Airfield ${code} not found`))
        }
    })
    console.log(`Loaded ${airfields.size} airfields`)
}

const getPOIs = (activities: Map<string, Activity>, search: string) => {
    const pois = JSON.parse(readFileSync(`./scripts/POI.json`, 'utf8'))
    console.log(`Loaded ${pois.length} POIs`)

    return pois.filter((poi: { id: string; }) => {
        if(search && !poi[0].normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .includes(search) ) {
            return false
        }

        const position = {lat: poi[1], lng: poi[2]}
        for (const activity of activities.values()) {
            if(haversineDistance(position, activity.position) < 500) {
                console.log(`${chalk.red(activity.name)} too close to ${chalk.red(poi[0])} - https://aero-trips.web.app/map/${poi[1]}/${poi[2]}`)
                return false
            }
        }
        return true
    })
}

if(process.argv.includes('--nvfr')) {
    flags += 1
    console.log(chalk.green('Updating NVFR'))
    const airfields = await getAirfields(db)
    updateNightVFR(airfields)
}

if(process.argv.includes('--poi')) {
    flags += 1
    
    const search = process.argv.find(arg => arg.startsWith('--search='))
    const searchString = search ? search.split('=')[1]
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase() : ''

    console.log(chalk.green(`Updating POIs, searching for "${searchString}"`))
    const activities = await getActivities(db)
    const poi = getPOIs(activities, searchString)
    console.log(`Found ${poi.length} POIs`)
    poi.slice(0, 50).forEach(poi => {
        console.log(`New POI ${chalk.bold.blue(poi[0])}
https://aero-trips.web.app/map/${poi[1]}/${poi[2]}
https://google.com/search?q=${encodeURIComponent(poi[0]).replace(/'/g, "%27")}
`)
    })
}

if(flags === 0) {
    console.log(chalk.red('No flags set'))
    console.log('--nvfr to update NVFR')
    console.log('--poi to load POIs')
    console.log('--apply to apply changes')
    process.exit(0)
}

if(changes.length === 0) {
    console.log(chalk.red('No changes to apply'))
    process.exit(0)
}

if(process.argv.includes('--apply')) {
    console.log(chalk.green(`Applying ${changes.length} changes`))
    for (const change of changes) {
        console.log(`Updating ${change.document} with ${JSON.stringify(change.data)}`)
        batch.set(db.doc(change.document), change.data, { merge: true })
    }
    await batch.commit()
} else {
    console.log(chalk.red(`Use --apply to apply ${changes.length} changes`))
}

process.exit(0)