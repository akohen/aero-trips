import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { Airfield, Profile, Runway } from '..';
import { Link } from 'react-router-dom';
import { CommonIcon } from './CommonIcon';

const AirfieldCard = ({airfield, distance, profile}: {airfield:Airfield, distance?:number, profile?:Profile}) => {
    const imgNode = airfield.description?.content != undefined ? airfield.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    const imgURL = getImage(imgNode, airfield.runways)
    return (
        <Paper
            shadow="md"
            radius="md"
            p='sm'
            miw={220} maw={260} mih={260} withBorder
            style={{
                backgroundImage: `url(${imgURL}), linear-gradient(transparent 50%, rgba(0,0,0,0.5) 80%)`,
                backgroundBlendMode: 'multiply',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'flex-end',
            }}
            component={Link}
            to={`/airfields/${airfield.codeIcao}`}
            className='activity-card'
        >
            <Stack gap='6px'>
                {distance && <Text c="white" fw={500} size="sm">à {distance > 2500 ? `${Math.round(distance/1000)}km` : `${Math.round(distance/100)*100}m`}</Text>}
                <Group gap='6px'>
                    <CommonIcon iconType='airfield' color='white' />
                    <CommonIcon iconType={airfield.status} color='white' />
                    {airfield.fuels?.includes('100LL') && <CommonIcon iconType='100LL' color='white' />}
                    {profile && profile.visited?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='visited' color='white' />}
                    {profile && profile.favorites?.find(v => v.type == 'airfields' && v.id == airfield.codeIcao) && <CommonIcon iconType='favorite' color='white' />}
                </Group>
                <Button
                    maw={235}
                    radius="md"
                    variant='white'
                    size='sm'
                    >
                    <Text size='xs' fw={700}>{airfield.codeIcao} - {airfield.name}</Text>
                </Button>
            </Stack>
        </Paper>
    );
}

const getImage = (imgNode:{attrs:{src:string}}, runways:Runway[]) => {
    if(imgNode) return imgNode.attrs.src
    if(runways.some(r => r.composition != 'GRASS')) return 'https://static.wixstatic.com/media/249296_6c727c318fd340f4856e5041e95c07c7~mv2.jpg'
    return 'https://media.flighttrainingcentral.com/wp-content/uploads/2019/06/05172620/maxresdefault-5-1030x579.jpg'
}
export default AirfieldCard