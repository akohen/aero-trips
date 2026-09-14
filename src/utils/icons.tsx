import {
  IconBan, IconBed, IconBike, IconBuildingAirport, IconBulb, IconBus, IconCar, IconCircleCheck, IconEye,
  IconForbid, IconGasStation, IconHistory, IconPaw, IconPlane, IconSailboat, IconShoe, IconSoup,
  IconStar, IconToiletPaper, IconTower
} from "@tabler/icons-react";
import { labels } from "./labels";

export const iconStyle = {
  size:16,
  style:{verticalAlign:'middle'}
}

const label = (key: string) => labels.get(key) ?? key

export const iconsList = new Map<string, {label: string,icon: React.FC,style: object}>([
  ['food', {label:label('food'), icon:IconSoup, style:iconStyle}],
  ['lodging', {label:label('lodging'), icon:IconBed, style:iconStyle}],
  ['transit', {label:label('transit'), icon:IconBus, style:iconStyle}],
  ['car', {label:label('car'), icon:IconCar, style:iconStyle}],
  ['hiking', {label:label('hiking'), icon:IconShoe, style:iconStyle}],
  ['culture', {label:label('culture'), icon:IconTower, style:iconStyle}],
  ['poi', {label:label('poi'), icon:IconEye, style:iconStyle}],
  ['aero', {label:label('aero'), icon:IconPlane, style:iconStyle}],
  ['bike', {label:label('bike'), icon:IconBike, style:iconStyle}],
  ['nautical', {label:label('nautical'), icon:IconSailboat, style:iconStyle}],
  ['nature', {label:label('nature'), icon:IconPaw, style:iconStyle}],
  ['other', {label:label('other'), icon:IconBulb, style:iconStyle}],
  ['public', {label:label('public'), icon:IconToiletPaper, style:iconStyle}],
  ['private', {label:label('private'), icon:IconToiletPaper, style:iconStyle}],
  ['CAP', {label:label('CAP'), icon:IconCircleCheck, style:{...iconStyle, color:"teal"}}],
  ['RST', {label:label('RST'), icon:IconForbid, style:{...iconStyle, color:"orange"}}],
  ['PRV', {label:label('PRV'), icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['MIL', {label:label('MIL'), icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['OFF', {label:label('OFF'), icon:IconBan, style:{...iconStyle, color:"red"}}],
  ['100LL', {label:label('100LL'), icon:IconGasStation, style:{...iconStyle, color:"darkblue"}}],
  ['SP95', {label:label('SP95'), icon:IconGasStation, style:{...iconStyle, color:"green"}}],
  ['SP98', {label:label('SP98'), icon:IconGasStation, style:{...iconStyle, color:"green"}}],
  ['UL91', {label:label('UL91'), icon:IconGasStation, style:{...iconStyle, color:"red"}}],
  ['visited', {label:label('visited'), icon:IconHistory, style:iconStyle}],
  ['favorite', {label:label('favorite'), icon:IconStar, style:iconStyle}],
  ['airfield', {label:label('airfield'), icon:IconBuildingAirport, style:iconStyle}],
])
