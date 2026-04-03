import { Button, Group, Paper, Stack, Text, em } from '@mantine/core';
import { Activity, Airfield, Profile } from '..';
import { Link } from 'react-router-dom';
import { CommonIcon } from './CommonIcon';
import { useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import { getResizedUrl } from '../utils/image';
import { getAirfieldImage, getActivityImage } from '../utils/itemImages';

const ItemCard = ({item, distance, profile}: {item:Airfield|Activity, distance?:number, profile?:Profile}) => {
    const imgNode = item.description?.content != undefined ? item.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    const imgURL = 'codeIcao' in item ? getAirfieldImage(imgNode, item.runways) : getActivityImage(imgNode, item.type);
    const [currentImgURL, setCurrentImgURL] = useState(imgURL);
    const isMobile = useMediaQuery(`(max-width: ${em(768)})`);
    const fullTitle = 'codeIcao' in item ? `${item.codeIcao} - ${item.name}` : item.name;
    const maxNameLength = isMobile ? 19 : 22
    const title = fullTitle.length > maxNameLength ? `${fullTitle.slice(0,maxNameLength-3)}..` : fullTitle;

    return (
        <Paper
            shadow="md"
            radius="md"
            p='xs'
            w={isMobile ? 150 : 220} h={isMobile ? 150 : 260}
            style={{
                backgroundImage: `url(${currentImgURL}), linear-gradient(transparent 25%, rgba(0,0,0,0.5) 75%)`,
                backgroundBlendMode: 'multiply',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'flex-end',
            }}
            component={Link}
            to={'codeIcao' in item ? `/airfields/${item.codeIcao}` : `/activities/${item.id}`}
            className='activity-card'
        >
            {imgNode && <img src={currentImgURL} style={{display: 'none'}} onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallbackAttempted) {
                    img.dataset.fallbackAttempted = 'true';
                    setCurrentImgURL(getResizedUrl(imgNode.attrs.src));
                }
            }} />}
            <Stack gap='6px'>
                <Group gap='3px'>
                {'codeIcao' in item ? 
                    <AirfieldIcon airfield={item} profile={profile} /> : 
                    <ActivityIcon activity={item} profile={profile} />
                }
                    {distance && <Text c="white" fw={500} size="sm">à {distance > 2500 ? `${Math.round(distance/1000)}km` : `${Math.round(distance/100)*100}m`}</Text>}
                </Group>
                <Button
                    maw={isMobile ? 130 : 235}
                    radius="md"
                    variant='white'
                    size='xs'
                    px={isMobile ? '3' : 'sm'} 
                >
                    <Text size={isMobile ? 'xs' : 'sm'} fw={isMobile ? 300 : 500}>{title}</Text>
                </Button>
            </Stack>
        </Paper>
    );
}


const AirfieldIcon = ({airfield, profile}: {airfield: Airfield, profile?: Profile}) => (
    <>
        <CommonIcon iconType='airfield' color='white' />
        <CommonIcon iconType={airfield.status} color='white' />
        {airfield.fuels?.includes('100LL') && <CommonIcon iconType='100LL' color='white' />}
        {profile && profile.visited?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='visited' color='white' />}
        {profile && profile.favorites?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='favorite' color='white' />}
    </>
)

const ActivityIcon = ({activity, profile}: {activity: Activity, profile?: Profile}) => (
    <>
        {activity.type.map((e,i) => <CommonIcon iconType={e} key={i} color='white' /> )}
        {profile?.visited?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="visited" color='white' />}
        {profile?.favorites?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="favorite" color='white' />}
    </>
)

export default ItemCard