import haversineDistance from "haversine-distance";
import { Activity, Airfield, ADfilter, ActivityFilter, ActivityType, Profile } from ".";
import { 
  IconBan, IconBed, IconBike, IconBuildingAirport, IconBulb, IconBus, IconCar, IconCircleCheck, IconEye, 
  IconForbid, IconGasStation, IconHistory, IconPaw, IconPlane, IconSailboat, IconShoe, IconSoup, 
  IconStar, IconToiletPaper, IconTower 
} from "@tabler/icons-react";
import { Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

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


export const iconStyle = {
  size:16,
  style:{verticalAlign:'middle'}
}

export const iconsList = new Map<string, {label: string,icon: React.FC,style: object}>([
  ['food', {label:"Restauration", icon:IconSoup, style:iconStyle}],
  ['lodging', {label:"Hébergement", icon:IconBed, style:iconStyle}],
  ['transit', {label:"Transport en commun", icon:IconBus, style:iconStyle}],
  ['car', {label:"Taxi ou location de voiture", icon:IconCar, style:iconStyle}],
  ['hiking', {label:"Marche à pied", icon:IconShoe, style:iconStyle}],
  ['culture', {label:"Culture", icon:IconTower, style:iconStyle}],
  ['poi', {label:"A voir du ciel", icon:IconEye, style:iconStyle}],
  ['aero', {label:"Aéronautique", icon:IconPlane, style:iconStyle}],
  ['bike', {label:"Vélo", icon:IconBike, style:iconStyle}],
  ['nautical', {label:"Activités nautiques", icon:IconSailboat, style:iconStyle}],
  ['nature', {label:"Nature et animaux", icon:IconPaw, style:iconStyle}],
  ['other', {label:"Autre activité", icon:IconBulb, style:iconStyle}],
  ['public', {label:"Toilettes publiques", icon:IconToiletPaper, style:iconStyle}],
  ['private', {label:"Toilettes privées", icon:IconToiletPaper, style:iconStyle}],
  ['CAP', {label:"Ouvert à la circulation aérienne publique", icon:IconCircleCheck, style:{...iconStyle, color:"teal"}}],
  ['RST', {label:"Accès restreint", icon:IconForbid, style:{...iconStyle, color:"orange"}}],
  ['PRV', {label:"Terrain privé", icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['MIL', {label:"Usage militaire uniquement", icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['OFF', {label:"Fermé", icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['100LL', {label:"Essence 100LL disponible", icon:IconGasStation, style:{...iconStyle, color:"darkblue"}}],
  ['SP95', {label:"Essence SP95/98 disponible", icon:IconGasStation, style:{...iconStyle, color:"green"}}],
  ['SP98', {label:"Essence SP95/98 disponible", icon:IconGasStation, style:{...iconStyle, color:"green"}}],
  ['visited', {label:"Déjà visité", icon:IconHistory, style:iconStyle}],
  ['favorite', {label:"Favori", icon:IconStar, style:iconStyle}],
  ['airfield', {label:"Aérodrome", icon:IconBuildingAirport, style:iconStyle}],
])


export function findNearest<T extends Airfield|Activity>(reference: Airfield|Activity, items:Map<string,T>, maxDistance: number = 10000): [distance: number, item: T, id: string][] {
  return [...items]
  .map(([id,ad]) => [haversineDistance(reference.position,ad.position), ad, id] as [number, T ,string])
  .filter(([dist,]) => dist < maxDistance && dist > 1)
  .sort((a,b) => a[0]-b[0])
}


export const filterAirfields = (airfields: Map<string,Airfield>, activities: Map<string,Activity>, filters: ADfilter, profile?: Profile) => {
  const query = filters.search.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const status = ['CAP', 'PRV', 'RST'].filter( e => filters.ad.includes(e))

  return new Map([...airfields]
    .filter(([key, item]) => {
      if( status.length > 0 && !status.includes(item.status)) return false
      if( filters.ad.includes('100LL') && !item.fuels?.includes('100LL')) return false
      if( filters.ad.includes('SP9X') && !item.fuels?.some(f => f.startsWith('SP9'))) return false
      if( filters.runway && Math.max(...item.runways.map(r => r.length)) < filters.runway) return false
      if( filters.ad.includes('toilet') && (item.toilet == 'no' || !item.toilet)) return false
      if( filters.ad.includes('nvfr') && !item.nightVFR) return false
      if( filters.ad.includes('concrete') && !item.runways.some(r => r.composition != 'GRASS') ) return false
      if( profile && filters.ad.includes('visited') && !profile.visited?.find(v => v.type == 'airfields' && v.id == key)) return false
      if( profile && filters.ad.includes('favorite') && !profile.favorites?.find(f => f.type == 'airfields' && f.id == key)) return false
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
  const query = filters.search.toLowerCase().trim().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  
  return new Map([...activities]
    .filter(([key, item]) => {
      if( filters.distance && filters.target ) {
        const [targetType, targetId] = filters.target.split('/')
        const target = {activities, airfields}[targetType]?.get(targetId)
        if(target && (haversineDistance(item.position, target.position) > filters.distance*1000)) return false
      } 
      if( filters.type.length > 0 && !filters.type.some(t => item.type.includes(t as ActivityType))) return false
      return [item.name, key].some(x => x?.toLowerCase().includes(query))
    })
  )
}


export const editorProps = (profile?: Profile) => ({
  handleDrop: function(view: EditorView, event: DragEvent, _slice: Slice, moved: boolean) {
    if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) { // if dropping external files
      const file = event.dataTransfer.files[0]; 
      const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
      uploadImage(view, coordinates!.pos, file, profile)
      return true; // handled
    }
    return false; // not handled use default behaviour
  }
})


export const uploadImage = (view: EditorView, pos: number, file: File, profile?: Profile) => {
  if ((file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp") && file.size < 2**19) { // check valid image type under 512kB
    if(profile) {
      const storage = getStorage();
      const storageRef = ref(storage, `img/${profile.uid}/${Math.random().toString(36).substring(2)}`);
      uploadBytes(storageRef, file, {contentType: file.type})
      .catch(e => console.error(e))
      .then(() => {
        getDownloadURL(storageRef).then((url) => {
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src: url }); // creates the image element
          const transaction = view.state.tr.insert(pos, node); // places it in the correct position
          return view.dispatch(transaction);
        })
      })
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = function () {
        const { schema } = view.state;
        const node = schema.nodes.image.create({ src: reader.result }); // creates the image element
        const transaction = view.state.tr.insert(pos, node); // places it in the correct position
        return view.dispatch(transaction);
      }
    }
  } else {window.alert("Les images doivent être au format .png ou .jpg et faire moins de 500 ko")}
}

export const shortener = (str: string, length: number) => {
  const returnString = str.replace(/(^\w+:|^)\/\//, '');
  if(returnString.length < length) return returnString;
  return returnString.slice(0,15) + '...' + returnString.slice(-10);
}