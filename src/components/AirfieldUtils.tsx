import { IconBan, IconCircleCheck, IconForbid, IconGasStation } from "@tabler/icons-react";
import { Airfield } from "../types";

const icons = {
  CAP:<IconCircleCheck size={16} style={{verticalAlign:'middle'}} color="teal" />, 
  RST:<IconForbid size={16} style={{verticalAlign:'middle'}} color="orange" />, 
  MIL:<IconBan size={16} style={{verticalAlign:'middle'}} color="red" />, 
  PRV:<IconBan size={16} style={{verticalAlign:'middle'}} color="red" />,
  OFF:<IconBan size={16} style={{verticalAlign:'middle'}} color="red" />,
}

export const AirfieldTitle = ({ad}: {ad: Airfield}) => {
  return (<>{icons[ad.status]} {ad.name} {ad.fuels?.includes('100LL') ? <IconGasStation size={16} style={{verticalAlign:'middle'}} /> : undefined}</>)
}