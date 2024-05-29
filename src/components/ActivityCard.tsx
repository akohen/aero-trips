import { Button, Group, Paper, Stack } from '@mantine/core';
import { Activity } from '..';
import { Link } from 'react-router-dom';
import { CommonIcon } from './CommonIcon';

const ActivityCard = ({id, activity}: {id:string, activity:Activity}) => {
    const imgNode = activity.description?.content != undefined ? activity.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    if(!imgNode) return
    return (
        <Paper
            shadow="md"
            radius="md"
            p='sm'
            miw={220} maw={260} mih={260}
            style={{ 
                backgroundImage: `url(${imgNode.attrs.src})`, 
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'flex-end',
            }}
            component={Link}
            to={`/activities/${id}`}
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