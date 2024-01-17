import { XMLParser } from "fast-xml-parser";
import { readFileSync, writeFileSync } from "fs";
import admin from "firebase-admin";
import { exit } from "process";


function DMS2DD(str) {
    const S = parseFloat(str)%100
    const M = Math.floor(parseInt(str)%10000/100)
    const D = Math.floor(parseInt(str)/10000)
    return (D+(M+S/60)/60) * ('SW'.includes(str[str.length-1]) ? -1 : 1)
}

import creds from "../serviceAccountKey.json" with { "type": "json" }
const firebaseConfig = {
  apiKey: "AIzaSyAleHj_gty6XncQLEDlLn3Ih7X08KuQ-jw",
  authDomain: "aero-trips.firebaseapp.com",
  projectId: "aero-trips",
  storageBucket: "aero-trips.appspot.com",
  messagingSenderId: "484361364174",
  appId: "1:484361364174:web:4c4eaf632f931956aca69f",
  measurementId: "G-CKJYT103VV",
  credential: admin.credential.cert(creds),
};

admin.initializeApp(firebaseConfig);
const db = admin.firestore();
const res = await db.doc(`airfields/XXXX`).set({name:"foo"});
//await setDoc(doc(db, "airfields", "XXXX"), {name:"test"})
//const db = getFirestore(app);
//const db = initializeFirestore(app)



exit(0)
const xmlFile = readFileSync(`./scripts/AIXM4.5_all_FR_OM_2023-10-05.xml`, 'utf8');
const parser = new XMLParser();
let jsonObj = parser.parse(xmlFile);

const airfields = {}
// General informations
jsonObj['AIXM-Snapshot'].Ahp
    .filter(e => (e.codeType == 'AD' && e.OrgUid.txtName == 'FRANCE' && e.codeIcao != undefined && e.txtRmk != 'AD CLOSED'))
    .forEach(e => {
        const obj = {
            codeIcao: e.codeIcao,
            name: e.txtName,
            position: [DMS2DD(e.geoLat), DMS2DD(e.geoLong)],
            runways: []
        }
        airfields[e.codeIcao] = obj
    });

// Runway information
jsonObj['AIXM-Snapshot'].Rwy
    .forEach(e => {
        if( e.RwyUid.AhpUid.codeId in airfields) {
            airfields[e.RwyUid.AhpUid.codeId].runways.push({
                designation: e.RwyUid.txtDesig,
                length: e.valLen,
                composition: e.codeComposition,
            })
        }
    })

writeFileSync('src/data/airfields.json', JSON.stringify(airfields))
console.log(Object.keys(airfields).length + ' airfields saved')