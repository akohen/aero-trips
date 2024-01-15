import { XMLParser } from "fast-xml-parser";
import { readFileSync, writeFileSync } from "fs";

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
            position: [e.geoLat, e.geoLong],
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