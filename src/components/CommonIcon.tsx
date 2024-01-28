import { Tooltip } from "@mantine/core"
import { iconsList } from "../utils"

export const CommonIcon = ({iconType, ...rest}: {iconType: string}) => {
  const {label, icon, style} = iconsList.get(iconType) || {}
  if(!icon) return
  const Icon = icon
  return <Tooltip {...rest} label={label}><Icon {...style} /></Tooltip>
}