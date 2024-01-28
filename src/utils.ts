import haversineDistance from "haversine-distance";
import { Activity, Airfield, ADfilter, ActivityFilter, ActivityType } from ".";
import { GeoPoint } from "firebase/firestore";
import { IconBan, IconBed, IconBulb, IconBus, IconCircleCheck, IconEye, IconForbid, IconSoup } from "@tabler/icons-react";

export const slug = (str: string) => {
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .concat('-',Math.random().toString(36).substring(7));
}


const iconStyle = {
  size:16,
  style:{verticalAlign:'middle'}
}

export const iconsList = new Map<string, {label: string,icon: React.FC,style: object}>([
  ['food', {label:"Restauration", icon:IconSoup, style:iconStyle}],
  ['transport', {label:"Transport", icon:IconBus, style:iconStyle}],
  ['lodging', {label:"Hébergement", icon:IconBed, style:iconStyle}],
  ['poi', {label:"A voir du ciel", icon:IconEye, style:iconStyle}],
  ['other', {label:"Autre activité", icon:IconBulb, style:iconStyle}],
  ['CAP', {label:"Ouvert à la circulation aérienne publique", icon:IconCircleCheck, style:{...iconStyle, color:"teal"}}],
  ['RST', {label:"Accès restreint", icon:IconForbid, style:{...iconStyle, color:"orange"}}],
  ['PRV', {label:"Terrain privé", icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['MIL', {label:"Usage militaire uniquement", icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['OFF', {label:"Fermé", icon:IconBan, style:{...iconStyle, color:"red"}}],
])


export function findNearest<T extends Airfield|Activity>(reference: Airfield|Activity, items:Map<string,T>, maxDistance: number = 10000): [distance: number, item: T, id: string][] {
  return [...items]
  .map(([id,ad]) => [haversineDistance(reference.position,ad.position), ad, id] as [number, T ,string])
  .filter(([dist,]) => dist < maxDistance && dist > 1)
  .sort((a,b) => a[0]-b[0])
}


export const filterAirfields = (airfields: Map<string,Airfield>, activities: Map<string,Activity>, filters: ADfilter) => {
  const query = filters.search.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const status = ['CAP', 'PRV', 'RST'].filter( e => filters.ad.includes(e))

  return new Map([...airfields]
    .filter(([key, item]) => {
      if( status.length > 0 && !status.includes(item.status)) return false
      if( filters.ad.includes('100LL') && !item.fuels?.includes('100LL')) return false
      if( filters.runway && Math.max(...item.runways.map(r => r.length)) < filters.runway) return false
      if( filters.distance && filters.target && haversineDistance(item.position, new GeoPoint(...filters.target.split(',').map(parseFloat) as [number, number])) > filters.distance*1000) { return false}
      if( filters.services.length > 0 ) { 
        const adActivities = findNearest(item, activities, 3000)
        if(!filters.services.every( service => adActivities.some(([,activity]) => activity.type.includes(service as ActivityType)))) return false
      }
      return [item.description, item.codeIcao, item.name, key].some(x => x?.toLowerCase().includes(query))
    })
  )
}

export const filterActivities = (activities: Map<string,Activity>, filters: ActivityFilter) => {
  const query = filters.search.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  
  return new Map([...activities]
    .filter(([key, item]) => {
      if( filters.distance && filters.target && haversineDistance(item.position, new GeoPoint(...filters.target.split(',').map(parseFloat) as [number, number])) > filters.distance*1000) { return false}
      return [item.description, item.name, key].some(x => x?.toLowerCase().includes(query))
    })
  )
}