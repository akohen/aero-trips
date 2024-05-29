import { Tooltip } from "@mantine/core"
import { iconsList } from "../utils"

export const CommonIcon = ({iconType, color}: {iconType: string, color?: string}) => {
  const {label, icon, style} = iconsList.get(iconType) || {}
  const iconStyle = color ? {...style, color} : style
  if(!icon) return
  const Icon = icon
  return <Tooltip label={label} zIndex={1201}><Icon {...iconStyle} /></Tooltip>
}