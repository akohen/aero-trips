import { Activity, Airfield } from '../src';
import { FirebaseOptions } from 'firebase/app';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAleHj_gty6XncQLEDlLn3Ih7X08KuQ-jw",
  authDomain: "aerotrips.fr",
  projectId: "aero-trips",
  storageBucket: "aero-trips.appspot.com",
  messagingSenderId: "484361364174",
  appId: "1:484361364174:web:4c4eaf632f931956aca69f",
  measurementId: "G-CKJYT103VV"
};
import { readFileSync } from "fs";
import creds from "../serviceAccountKey.json" with { "type": "json" }
import chalk from 'chalk';
import admin from "firebase-admin";
import haversineDistance from "haversine-distance";
import { select, input } from '@inquirer/prompts';


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
    nvfr.forEach((code: string) => {
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

    return pois.filter((poi: any[]) => {
        if(search && !poi[0].normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .includes(search) ) {
            return false
        }

        const position = {lat: poi[1], lng: poi[2]}
        for (const activity of activities.values()) {
            if(haversineDistance(position, activity.position) < 500) {
                console.log(`${chalk.red(activity.name)} too close to ${chalk.red(poi[0])} - https://aerotrips.fr/map/${poi[1]}/${poi[2]}`)
                return false
            }
        }
        return true
    })
}

const showDiff = (docPath: string, existing: Record<string, any> | null, incoming: Record<string, any>) => {
    if (!existing) {
        console.log(chalk.green(`  [new] ${docPath}`))
        for (const key of Object.keys(incoming)) {
            console.log(chalk.green(`    + ${key}`))
        }
        return
    }
    const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)])
    let hasChanges = false
    for (const key of allKeys) {
        if (!(key in incoming)) {
            console.log(chalk.red(`    - ${key}`))
            hasChanges = true
        } else if (!(key in existing)) {
            console.log(chalk.green(`    + ${key}`))
            hasChanges = true
        } else if (JSON.stringify(existing[key]) !== JSON.stringify(incoming[key])) {
            console.log(chalk.yellow(`    ~ ${key}`))
            hasChanges = true
        }
    }
    if (!hasChanges) {
        console.log(chalk.gray(`  [no change] ${docPath}`))
    }
}

const importAirfields = async (filePath: string) => {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'))
    const airfields: Airfield[] = Array.isArray(raw) ? raw : [raw]
    for (const airfield of airfields) {
        const docPath = `airfields/${airfield.codeIcao}`
        console.log(`Queuing airfield ${chalk.bold.blue(airfield.codeIcao)} - ${airfield.name}`)
        const existing = (await db.doc(docPath).get()).data() ?? null
        const data = { ...airfield as unknown as Record<string, any>, updated_at: admin.firestore.Timestamp.fromDate(new Date()) }
        showDiff(docPath, existing as Record<string, any> | null, data)
        changes.push({document: docPath, data})
    }
    console.log(`Queued ${airfields.length} airfield(s) from ${filePath}`)
}

const importActivities = async (filePath: string) => {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'))
    const activities: Activity[] = Array.isArray(raw) ? raw : [raw]
    for (const activity of activities) {
        const docPath = `activities/${activity.id}`
        console.log(`Queuing activity ${chalk.bold.blue(activity.id)} - ${activity.name}`)
        const existing = (await db.doc(docPath).get()).data() ?? null
        const data = { ...activity as unknown as Record<string, any>, updated_at: admin.firestore.Timestamp.fromDate(new Date()) }
        showDiff(docPath, existing as Record<string, any> | null, data)
        changes.push({document: docPath, data})
    }
    console.log(`Queued ${activities.length} activity/activities from ${filePath}`)
}

const processImportFiles = async (filePaths: string[]) => {
    for (const filePath of filePaths) {
        if (filePath.endsWith('airfield.json') || filePath.endsWith('airfields.json')) {
            await importAirfields(filePath)
        } else if (filePath.endsWith('activities.json') || filePath.endsWith('activity.json')) {
            await importActivities(filePath)
        } else {
            console.log(chalk.red(`Unknown file type for ${filePath}, expected *airfield(s).json or *activities.json`))
        }
    }
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
    poi.slice(0, 50).forEach((poi: any[]) => {
        console.log(`New POI ${chalk.bold.blue(poi[0])}
https://aerotrips.fr/map/${poi[1]}/${poi[2]}
https://google.com/search?q=${encodeURIComponent(poi[0]).replace(/'/g, "%27")}
`)
    })
}

if(process.argv.includes('--import')) {
    flags += 1
    const importIndex = process.argv.indexOf('--import')
    const filePaths = process.argv.slice(importIndex + 1).filter(arg => !arg.startsWith('--'))
    if (filePaths.length === 0) {
        console.log(chalk.red('No files specified after --import'))
        process.exit(1)
    }
    console.log(chalk.green(`Importing ${filePaths.length} file(s)`))
    await processImportFiles(filePaths)
}

if(flags === 0) {
    // Interactive mode
    const action = await select({
        message: 'What would you like to do?',
        choices: [
            { name: 'Update NVFR airfields', value: 'nvfr' },
            { name: 'Import POIs', value: 'poi' },
            { name: 'Import files', value: 'import' },
            { name: 'Exit', value: 'exit' },
        ]
    })

    if (action === 'exit') {
        process.exit(0)
    }

    if (action === 'nvfr') {
        console.log(chalk.green('Updating NVFR'))
        const airfields = await getAirfields(db)
        updateNightVFR(airfields)
    }

    if (action === 'poi') {
        const searchRaw = await input({ message: 'Search string (leave empty for all):' })
        const searchString = searchRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        console.log(chalk.green(`Updating POIs, searching for "${searchString}"`))
        const activities = await getActivities(db)
        const poi = getPOIs(activities, searchString)
        console.log(`Found ${poi.length} POIs`)
        poi.slice(0, 50).forEach((poi: any[]) => {
            console.log(`New POI ${chalk.bold.blue(poi[0])}
https://aerotrips.fr/map/${poi[1]}/${poi[2]}
https://google.com/search?q=${encodeURIComponent(poi[0]).replace(/'/g, "%27")}
`)
        })
    }

    if (action === 'import') {
        const pathsRaw = await input({ message: 'File paths (space-separated):' })
        const filePaths = pathsRaw.split(' ').map(p => p.trim()).filter(Boolean)
        await processImportFiles(filePaths)
    }
}

if(changes.length === 0) {
    console.log(chalk.red('No changes to apply'))
    process.exit(0)
}

let shouldApply = process.argv.includes('--apply')

if (!shouldApply) {
    const answer = await select({
        message: `Apply ${changes.length} change(s)?`,
        choices: [
            { name: 'Yes', value: true },
            { name: 'No', value: false },
        ]
    })
    shouldApply = answer
}

if(shouldApply) {
    console.log(chalk.green(`Applying ${changes.length} changes`))
    for (const change of changes) {
        console.log(`Updating ${change.document} with ${JSON.stringify(change.data)}`)
        batch.set(db.doc(change.document), change.data, { merge: true })
    }
    await batch.commit()
} else {
    console.log(chalk.red(`Aborted — ${changes.length} changes not applied`))
}

process.exit(0)
