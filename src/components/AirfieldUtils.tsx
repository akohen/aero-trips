import { Activity, ADfilter, Airfield, Profile } from "..";
import { Text, Stack } from "@mantine/core";
import { Link } from "react-router";
import { CommonIcon } from "./CommonIcon";
import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet';
import pinRunway from '/map-pin-runway.svg'
import { getResizedUrl } from "../utils/image";


export const AirfieldIcon = ({ airfield, profile, color }: { airfield: Airfield, profile?: Profile, color?: string }) => (
  <>
    <CommonIcon iconType='airfield' color={color} />
    <CommonIcon iconType={airfield.status} color={color} />
    {airfield.fuels?.includes('100LL') && <CommonIcon iconType='100LL' color={color} />}
    {profile && profile.visited?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='visited' color={color} />}
    {profile && profile.favorites?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='favorite' color={color} />}
  </>
)

export const AirfieldTitle = ({ad, profile}: {ad: Airfield, profile?: Profile}) => {
  return (<>
    <CommonIcon iconType={ad.status} /> 
    {ad.name} 
    {ad.fuels?.map(e => <CommonIcon key={e} iconType={e} />)}
    {profile && profile.visited?.find(v => v.type == 'airfields' && v.id == ad.codeIcao) && <CommonIcon iconType="visited" />}
    {profile && profile.favorites?.find(v => v.type == 'airfields' && v.id == ad.codeIcao) && <CommonIcon iconType="favorite" />}
  </>)
}

export const ToiletText = ({airfield}:{airfield: Airfield}) => {
  if(airfield.toilet == 'private') return <Text>Toilettes privées</Text>
  if(airfield.toilet == 'public') return <Text>Toilettes publiques</Text>
}

export const AirfieldMarker = ({airfield}: {airfield:Airfield}) => {
  const imgNode = airfield.description?.content != undefined ? airfield.description.content.find( (a: { type: string }) => a.type =='image') : undefined
  return (
  <Marker 
    position={[airfield.position.latitude,airfield.position.longitude]}
    icon={new Icon({iconUrl: pinRunway, iconAnchor:[25,49], iconSize:[50,50]})}
    zIndexOffset={1000}
  >
    <Popup>
      <Link to={`/airfields/${airfield.codeIcao}`}>
        <Stack align="center" gap={"xs"}>
          <div><AirfieldTitle ad={airfield}/></div>
          {imgNode != undefined && (
            <img
              src={imgNode.attrs.src} width="150px"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallbackAttempted) {
                  img.dataset.fallbackAttempted = 'true';
                  img.src = getResizedUrl(imgNode.attrs.src);
                }
              }}
            />
          )}
          <span>Voir plus de détails...</span>
        </Stack>
      </Link>
    </Popup>
  </Marker>
)}

const AD_LABELS: Record<string, string> = {
  CAP: 'Accès public',
  RST: 'Accès restreint',
  toilet: 'Toilettes',
  '100LL': '100LL',
  SP9X: 'SP95/98',
  UL91: 'UL91',
  concrete: 'Piste en dur',
  nvfr: 'VFR de nuit',
  visited: 'Visité',
  favorite: 'Favori',
  upcomingEvents: 'Événements',
}

const SERVICE_LABELS: Record<string, string> = {
  food: 'Restauration', lodging: 'Hébergement', bike: 'Vélo',
  transit: 'Transport', car: 'Voiture', hiking: 'Randonnée',
  culture: 'Culture', aero: 'Aéro', nautical: 'Nautique', other: 'Autre',
}

export const ActiveBadges = ({ airfields, activities, filters, setFilters }: { 
  airfields: Map<string, Airfield>,
  activities: Map<string, Activity>,
  filters: ADfilter,
  setFilters: (newFilters: ADfilter) => void
}) => {
  type ActiveBadge = { key: string, label: string, onRemove: () => void }
  const activeBadges: ActiveBadge[] = []

  if (filters.runway !== '' && Number.isFinite(filters.runway)) {
    activeBadges.push({
      key: 'runway',
      label: `≥ ${filters.runway}m`,
      onRemove: () => setFilters({ ...filters, runway: '' }),
    })
  }
  for (const v of filters.ad) {
    activeBadges.push({
      key: `ad-${v}`,
      label: AD_LABELS[v] ?? v,
      onRemove: () => setFilters({ ...filters, ad: filters.ad.filter(x => x !== v) }),
    })
  }
  for (const v of filters.services) {
    activeBadges.push({
      key: `svc-${v}`,
      label: SERVICE_LABELS[v] ?? v,
      onRemove: () => setFilters({ ...filters, services: filters.services.filter(x => x !== v) }),
    })
  }
  const validDist = filters.distance !== '' && Number.isFinite(filters.distance)
  if (validDist && filters.target) {
    const [targetType, targetId] = filters.target.split('/')
    const target = {activities, airfields}[targetType]?.get(targetId)
    const targetLabel = target && 'codeIcao' in target
      ? target.codeIcao
      : target
        ? (target.name.length > 16 ? target.name.slice(0, 15) + '…' : target.name)
        : filters.target
    activeBadges.push({
      key: 'distance',
      label: `< ${filters.distance}km de ${targetLabel}`,
      onRemove: () => setFilters({ ...filters, distance: '', target: null }),
    })
  }
  return activeBadges
}