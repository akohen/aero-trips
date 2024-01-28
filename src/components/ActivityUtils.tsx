import { Paper, Text, Title, Tooltip } from "@mantine/core";
import { Activity } from "..";
import { IconBed, IconBulb, IconBus, IconEye, IconSoup } from "@tabler/icons-react";
import { Link } from "react-router-dom";

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
<Text span size="sm" className="list-item-title">
  {activity.name}
  {activity.type.map((e,i) => icons[e](i))}
</Text>)

export const NearbyActivities = ({items} : {items: [distance: number, item: Activity, id: string][]}) => (
  items.length > 0 && <Paper bg="gray.1">
    <Title order={4}>Activités proches</Title>
    { items.map(([dist, activity, id]) => (
        <Text key={id}>
          <Link to={`/activities/${id}`}>
            <ActivityTitle activity={activity} /><Text span size="sm"> à {dist > 1500 ? `${Math.round(dist/1000)}km` : `${Math.round(dist/100)*100}m`}</Text>
          </Link>
        </Text>
    ))}
  </Paper>
  
)
