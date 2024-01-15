import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "fs";

const xmlFile = readFileSync(`${process.cwd()}/scripts/AIXM4.5_all_FR_OM_2023-10-05.xml`, 'utf8');
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

// Usage restrictions
jsonObj['AIXM-Snapshot'].Ahu
    .filter(e => e.UsageLimitation.codeUsageLimitation != 'PERMIT')
    .forEach(e => {
        //console.log(e)
    })

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


//console.log(ADlist[0])
console.log(Object.keys(airfields).length)
console.log(jsonObj['AIXM-Snapshot'].Ahu.length)
