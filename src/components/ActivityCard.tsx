import { Button, Group, Paper, Stack } from '@mantine/core';
import { Activity } from '..';
import { Link } from 'react-router-dom';
import { CommonIcon } from './CommonIcon';

const ActivityCard = ({id, activity}: {id:string, activity:Activity}) => {
    const imgNode = activity.description?.content != undefined ? activity.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    const imgURL = imgNode ? imgNode.attrs.src : 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/991px-Placeholder_view_vector.svg.png'
    return (
        <Paper
            shadow="md"
            radius="md"
            p='sm'
            miw={220} maw={260} mih={260}
            style={{
                backgroundImage: `url(${imgURL}), linear-gradient(transparent 60%, rgba(0,0,0,0.9))`,
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


export default ActivityCard