import { Activity, ADfilter, Airfield, Profile } from "..";
import { Text, Tooltip } from "@mantine/core";
import { IconCoins, IconCurrencyEuro, IconCurrencyEuroOff } from "@tabler/icons-react";
import { CommonIcon } from "./CommonIcon";
import { iconStyle } from "../utils/icons";
import { LandingFeeLevel, landingFeeDisplay, landingFeeLevel } from "../utils/reports";

// A glyph per level, not just a colour: cards with a photo draw every icon white
const FEE_ICONS: Record<LandingFeeLevel, { icon: typeof IconCoins, color: string }> = {
  free: { icon: IconCurrencyEuroOff, color: 'green' },
  cheap: { icon: IconCurrencyEuro, color: 'orange' },
  high: { icon: IconCoins, color: 'red' },
}

/** Landing fee level, the price in the tooltip; nothing when unknown */
export const LandingFeeIcon = ({ airfield, color }: { airfield: Airfield, color?: string }) => {
  const level = landingFeeLevel(airfield.landingFee)
  if (!level) return null
  const { icon: Icon, color: levelColor } = FEE_ICONS[level]
  return (
    <Tooltip label={landingFeeDisplay(airfield.landingFee).label} zIndex={1201}>
      <Icon {...iconStyle} color={color ?? levelColor} />
    </Tooltip>
  )
}


export const AirfieldIcon = ({ airfield, profile, color }: { airfield: Airfield, profile?: Profile, color?: string }) => (
  <>
    <CommonIcon iconType='airfield' color={color} />
    <CommonIcon iconType={airfield.status} color={color} />
    {airfield.fuels?.includes('100LL') && <CommonIcon iconType='100LL' color={color} />}
    {airfield.nightVFR && <CommonIcon iconType={`nvfr-${airfield.nightVFR}`} color={color} />}
    <LandingFeeIcon airfield={airfield} color={color} />
    {profile && profile.visited?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='visited' color={color} />}
    {profile && profile.favorites?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='favorite' color={color} />}
  </>
)

export const AirfieldTitle = ({ad, profile}: {ad: Airfield, profile?: Profile}) => {
  return (<>
    <CommonIcon iconType={ad.status} /> 
    {ad.name} 
    {ad.fuels?.map(e => <CommonIcon key={e} iconType={e} />)}
    {ad.nightVFR && <CommonIcon iconType={`nvfr-${ad.nightVFR}`} />}
    <LandingFeeIcon airfield={ad} />
    {profile && profile.visited?.find(v => v.type == 'airfields' && v.id == ad.codeIcao) && <CommonIcon iconType="visited" />}
    {profile && profile.favorites?.find(v => v.type == 'airfields' && v.id == ad.codeIcao) && <CommonIcon iconType="favorite" />}
  </>)
}

export const ToiletText = ({airfield}:{airfield: Airfield}) => {
  if(airfield.toilet == 'private') return <Text>Toilettes privées</Text>
  if(airfield.toilet == 'public') return <Text>Toilettes publiques</Text>
}

const AD_LABELS: Record<string, string> = {
  CAP: 'Accès public',
  RST: 'Accès restreint',
  toilet: 'Toilettes',
  '100LL': '100LL',
  SP9X: 'SP95/98',
  UL91: 'UL91',
  concrete: 'Piste en dur',
  nvfr: 'VFR de nuit',
  'nvfr-full': 'VFR de nuit sans limitations',
  'fee-free': "Sans taxe d'atterrissage",
  'fee-15': 'Taxe < 15 €',
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