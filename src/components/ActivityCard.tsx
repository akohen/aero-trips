import { Button, em, Group, Paper, Stack, Text } from '@mantine/core';
import { Activity, ActivityType, Profile } from '..';
import { Link } from 'react-router-dom';
import { CommonIcon } from './CommonIcon';
import { useMediaQuery } from '@mantine/hooks';

const ActivityCard = ({activity, distance, profile}: {activity:Activity, distance?:number, profile?:Profile}) => {
    const imgNode = activity.description?.content != undefined ? activity.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    const imgURL = getImage(imgNode, activity.type)
    const isMobile = useMediaQuery(`(max-width: ${em(768)})`);
    const maxNameLength = isMobile ? 23 : 30
    return (
        <Paper
            shadow="md"
            radius="md"
            p='xs'
            miw={isMobile ? 150 : 220} maw={isMobile ? 150 : 260} mih={isMobile ? 150 : 260}
            style={{
                backgroundImage: `url(${imgURL}), linear-gradient(transparent 25%, rgba(0,0,0,0.5) 75%)`,
                backgroundBlendMode: 'multiply',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'flex-end',
            }}
            component={Link}
            to={`/activities/${activity.id}`}
            className='activity-card'
        >
            <Stack gap='3px'>
                <Group gap='3px'>
                    {activity.type.map((e,i) => <CommonIcon iconType={e} key={i} color='white' /> )}
                    {profile?.visited?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="visited" color='white' />}
                    {profile?.favorites?.find(v => v.type == 'activities' && v.id == activity.id) && <CommonIcon iconType="favorite" color='white' />}
                    {distance && <Text c="white" fw={500} size={isMobile ? 'xs' : 'sm'}>à {distance > 2500 ? `${Math.round(distance/1000)}km` : `${Math.round(distance/100)*100}m`}</Text>}
                </Group>
                <Button
                    maw={isMobile ? 130 : 235}
                    radius="md"
                    variant='white'
                    size='xs'
                    px={isMobile ? '3' : 'sm'} 
                >
                    <Text size={isMobile ? 'xs' : 'sm'} fw={isMobile ? 300 : 500}>{activity.name.length > maxNameLength ? activity.name.slice(0,maxNameLength-4) + ".." : activity.name}</Text>
                </Button>
            </Stack>
        </Paper>
    );
}

const getImage = (imgNode:{attrs:{src:string}}, types:ActivityType[]) => {
    if(imgNode) return imgNode.attrs.src
    if(types.includes('food')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Frestaurant.jpg?alt=media&token=257ab852-a209-414d-8d77-671d91ce3aa7'
    if(types.includes('lodging')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Flodging.jpg?alt=media&token=93c51d40-d215-4fa2-b69c-51162fe5717d'
    if(types.includes('transit')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Ftransit.jpg?alt=media&token=375e623c-aec6-4e51-a888-cfd38019a7d0'
    if(types.includes('bike')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fbike.jpg?alt=media&token=161bd4af-01b7-4be5-b3f9-c4bd22aca5db'
    if(types.includes('car')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fcar.jpg?alt=media&token=3b0bfb95-b994-487c-8552-fd88e5b7fccc'
    if(types.includes('hiking')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fhiking.jpg?alt=media&token=942cf1d2-1501-4524-bc10-c2fe425253e8'
    if(types.includes('nautical')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fnautical.jpg?alt=media&token=7d117c7e-e1d9-4787-9ec6-95064a1d5f94'
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/991px-Placeholder_view_vector.svg.png'
}
export default ActivityCard