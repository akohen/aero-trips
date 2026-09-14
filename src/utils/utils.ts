import haversineDistance from "haversine-distance";
import { Activity, Airfield, ADfilter, ActivityFilter, ActivityType, Event, Profile } from "..";
import type { Timestamp } from "firebase/firestore";

// "DIEPPE SAINT AUBIN" -> "Dieppe Saint Aubin", "SAINT-CYR-L'ECOLE" -> "Saint-Cyr-L'Ecole"
export const titleCase = (str: string) => {
  return str
    .toLowerCase()
    .replace(/(^|[\s\-'/])([a-zà-ÿ])/g, (_, sep, chr) => sep + chr.toUpperCase())
}

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


export function findNearest<T extends Airfield|Activity>(reference: Airfield|Activity, items:Map<string,T>, maxDistance: number = 10000): [distance: number, item: T, id: string][] {
  return [...items]
  .map(([id,ad]) => [haversineDistance(reference.position,ad.position), ad, id] as [number, T ,string])
  .filter(([dist,]) => dist < maxDistance && dist > 1)
  .sort((a,b) => a[0]-b[0])
}


export const filterAirfields = (airfields: Map<string,Airfield>, activities: Map<string,Activity>, filters: ADfilter, profile?: Profile, events?: Map<string,Event>) => {
  const query = filters.search.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const status = ['CAP', 'PRV', 'RST'].filter( e => filters.ad.includes(e))

  return new Map([...airfields]
    .filter(([key, item]) => {
      if( status.length > 0 && !status.includes(item.status)) return false
      if( filters.ad.includes('100LL') && !item.fuels?.includes('100LL')) return false
      if( filters.ad.includes('SP9X') && !item.fuels?.some(f => f.startsWith('SP9'))) return false
      if( filters.ad.includes('UL91') && !item.fuels?.includes('UL91')) return false
      if( filters.runway && Math.max(...item.runways.map(r => r.length)) < filters.runway) return false
      if( filters.ad.includes('toilet') && (item.toilet == 'no' || !item.toilet)) return false
      if( filters.ad.includes('nvfr') && !item.nightVFR) return false
      if( filters.ad.includes('concrete') && !item.runways.some(r => r.composition != 'GRASS') ) return false
      if( profile && filters.ad.includes('visited') && !profile.visited?.find(v => v.type == 'airfields' && v.id == key)) return false
      if( profile && filters.ad.includes('favorite') && !profile.favorites?.find(f => f.type == 'airfields' && f.id == key)) return false
      if( filters.ad.includes('upcomingEvents') ) {
        const hasUpcoming = [...(events?.values() ?? [])].some(e => e.airfieldId === key && isUpcomingEvent(e))
        if (!hasUpcoming) return false
      }
      if( filters.distance && filters.target ) {
        const [targetType, targetId] = filters.target.split('/')
        const target = {activities, airfields}[targetType]?.get(targetId)
        if(target && (haversineDistance(item.position, target.position) > filters.distance*1000)) return false
      } 
      if( filters.services.length > 0 ) { 
        const adActivities = findNearest(item, activities, 5000)
        if(!filters.services.every( service => adActivities.some(([,activity]) => activity.type.includes(service as ActivityType)))) return false
      }
      return [item.codeIcao, item.name, key].some(x => x?.toLowerCase().includes(query))
    })
  )
}

export const filterActivities = (airfields: Map<string,Airfield>, activities: Map<string,Activity>, filters: ActivityFilter) => {
  const searchWords = filters.search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(' ')
  const checkItem = (txt: string) => {
    const words = txt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(' ')
    return searchWords.every(searchWord => words.some(word => word.includes(searchWord)))
  }

  return new Map([...activities]
    .filter(([key, item]) => {
      if (!item?.name || !item?.position || !item?.type) {
        console.warn('[filterActivities] Skipping malformed activity:', key, item)
        return false
      }
      if( filters.distance && filters.target ) {
        const [targetType, targetId] = filters.target.split('/')
        const target = {activities, airfields}[targetType]?.get(targetId)
        if(target && (haversineDistance(item.position, target.position) > filters.distance*1000)) return false
      }
      if( filters.type.length > 0 && !filters.type.some(t => item.type.includes(t as ActivityType))) return false
      return checkItem(item.name)
    })
  )
}

export const shortener = (str: string, length: number) => {
  const returnString = str.replace(/(^\w+:|^)\/\//, '');
  if(returnString.length < length) return returnString;
  return returnString.slice(0,15) + '...' + returnString.slice(-10);
}

export const formatDate = (date: Timestamp) => {
  return new Date(date.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export const isUpcomingEvent = (e: Event): boolean => {
  const end = e.endDate ? new Date(e.endDate.seconds * 1000) : new Date(e.startDate.seconds * 1000)
  return end >= new Date()
}