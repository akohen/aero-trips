import { firebaseConfig } from '../src/data/firebase.ts';
import { Airfield } from '../src';
import { readFileSync } from "fs";
import creds from "../serviceAccountKey.json" with { "type": "json" }
import chalk from 'chalk';
import admin from "firebase-admin";


/*
import { XMLParser } from "fast-xml-parser";
const parser = new XMLParser({ ignoreAttributes: false });
const xmlFile = readFileSync(`./scripts/AIXM4.5_all_FR_OM_2025-02-20.xml`, 'utf8');
const aixm = parser.parse(xmlFile);
*/

const changes: {document: string, data: object}[] = []
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

const airfields = await getAirfields(db)
updateNightVFR(airfields)

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