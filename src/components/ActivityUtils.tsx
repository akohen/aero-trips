import { Text, Tooltip } from "@mantine/core";
import { Activity } from "..";
import { IconBed, IconBulb, IconBus, IconEye, IconSoup } from "@tabler/icons-react";

const iconStyle = {
  size:16,
  style:{verticalAlign:'middle'}
}

const icons = {
  food: (i: number) => <Tooltip key={i} label="Restauration"><IconSoup {...iconStyle} /></Tooltip>,
  transport: (i: number) => <Tooltip key={i} label="Transport"><IconBus key={i} {...iconStyle} /></Tooltip>,
  lodging: (i: number) => <Tooltip key={i} label="Hébergement"><IconBed key={i} {...iconStyle} /></Tooltip>,
  poi: (i: number) => <Tooltip key={i} label="A voir du ciel"><IconEye key={i} {...iconStyle} /></Tooltip>,
  other: (i: number) => <Tooltip key={i} label="Autre activité"><IconBulb key={i} {...iconStyle} /></Tooltip>,
}

export const ActivityTitle = ({activity}: {activity: Activity}) => (
<Text size="sm" className="list-item-title">
  {activity.name}
  {activity.type.map((e,i) => icons[e](i))}
</Text>)