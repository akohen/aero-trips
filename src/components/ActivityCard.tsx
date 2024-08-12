import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { Activity, ActivityType } from '..';
import { Link } from 'react-router-dom';
import { CommonIcon } from './CommonIcon';

const ActivityCard = ({id, activity, distance}: {id:string, activity:Activity, distance?:number}) => {
    const imgNode = activity.description?.content != undefined ? activity.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    const imgURL = getImage(imgNode, activity.type)
    return (
        <Paper
            shadow="md"
            radius="md"
            p='sm'
            miw={220} maw={260} mih={260}
            style={{
                backgroundImage: `url(${imgURL}), linear-gradient(transparent 50%, rgba(0,0,0,0.5) 80%)`,
                backgroundBlendMode: 'multiply',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'flex-end',
            }}
            component={Link}
            to={`/activities/${id}`}
            className='activity-card'
        >
            <Stack gap='6px'>
                {distance && <Text c="white" fw={500} size="sm">à {distance > 2500 ? `${Math.round(distance/1000)}km` : `${Math.round(distance/100)*100}m`}</Text>}
                <Group gap='6px'>
                    {activity.type.map((e,i) => <CommonIcon iconType={e} key={i} color='white' /> )}
                </Group>
                <Button
                    maw={235}
                    radius="md"
                    variant='white'
                    size='sm'
                    >
                    {activity.name}
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
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/991px-Placeholder_view_vector.svg.png'
}
export default ActivityCard