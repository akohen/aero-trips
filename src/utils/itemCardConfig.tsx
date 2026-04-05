import { Group, Text } from '@mantine/core';
import { Activity, Airfield, Profile } from '..';
import { AirfieldIcon } from '../components/AirfieldUtils';
import { ActivityIcon } from '../components/ActivityUtils';
import { CardConfig } from '../components/CardList';
import { getAirfieldImage, getActivityImage, getImgNode } from './itemImages';

export const getItemImageUrl = (item: Airfield | Activity): string | undefined => {
  const imgNode = getImgNode(item.description);
  return 'codeIcao' in item
    ? getAirfieldImage(imgNode, item.runways)
    : getActivityImage(imgNode, item.type);
};

export const getItemLink = (item: Airfield | Activity): string =>
  'codeIcao' in item ? `/airfields/${item.codeIcao}` : `/activities/${item.id}`;

export const getItemCardConfig = (
  options?: { distance?: number; profile?: Profile }
): CardConfig<Airfield | Activity> => ({
  title: (i) => 'codeIcao' in i ? `${i.codeIcao} - ${i.name}` : i.name,
  icons: (i, _key, hasImage) => (
    <Group gap='3px'>
      {'codeIcao' in i
        ? <AirfieldIcon airfield={i} profile={options?.profile} color={hasImage ? 'white' : undefined} />
        : <ActivityIcon activity={i} profile={options?.profile} color={hasImage ? 'white' : undefined} />
      }
      {options?.distance !== undefined && (
        <Text c={hasImage ? 'white' : undefined} fw={500} size="sm">
          à {options.distance > 2500
            ? `${Math.round(options.distance / 1000)}km`
            : `${Math.round(options.distance / 100) * 100}m`}
        </Text>
      )}
    </Group>
  ),
});
