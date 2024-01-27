import { Text } from "@mantine/core";
import { Activity } from "..";
import { IconBed, IconBulb, IconBus, IconEye, IconSoup } from "@tabler/icons-react";

const icons = {
  food: <IconSoup size={16} style={{verticalAlign:'middle'}} />,
  transport: <IconBus size={16} style={{verticalAlign:'middle'}} />,
  lodging: <IconBed size={16} style={{verticalAlign:'middle'}} />,
  poi: <IconEye size={16} style={{verticalAlign:'middle'}} />,
  other: <IconBulb size={16} style={{verticalAlign:'middle'}} />,
}

export const ActivityTitle = ({activity}: {activity: Activity}) => (
<Text size="sm" className="list-item-title">
  {activity.name}
  {activity.type.map(e => (icons[e]))}
</Text>)