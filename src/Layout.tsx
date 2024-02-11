import '@mantine/core/styles.css';
import '@mantine/tiptap/styles.css';
import { MantineProvider, AppShell, Burger, Group, Button, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, matchPath, useLocation, useNavigate } from "react-router-dom";
import { IconBulb, IconCirclePlus, IconHome, IconMap, IconMapRoute, IconPlaneArrival } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Data } from '.';
import TripStepSelect from './components/TripStepSelect';

function Layout({airfields, activities}: Data) {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation()
  const navigate = useNavigate();
  type FinderOptions = {group: string, items: {label: string, value: string}[]}[]
    const [data, setData] = useState<FinderOptions>([])

    useEffect(() => {
      const airfieldsOptions = [...airfields] 
        .map(([id, ad]) => (
          {label: `${ad.name} - ${ad.codeIcao}`, value:`airfields/${id}`}
        ))
      const activitiesOptions = [...activities] 
        .map(([id, activity]) => (
          {label: activity.name, value:`activities/${id}`}
        ))

      setData([
        {group:'Terrains', items:airfieldsOptions},
        {group:'Activités', items:activitiesOptions},
      ])

    },[airfields, activities])
  
  return (
    <MantineProvider>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 200,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
      <AppShell.Header>
        <Group px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <IconPlaneArrival />
          <h3>Aero Trips</h3>
        </Group>
      </AppShell.Header>

        <AppShell.Navbar p="md" zIndex={1000}>
          <Stack>
            
          <Button 
            component={Link} 
            onClick={toggle} 
            to="/" 
            leftSection={<IconHome size={14} />}
            variant={matchPath(location.pathname,'/') ? 'filled' : 'light'}
          >
            Home
          </Button>
          <Button 
            component={Link} 
            onClick={toggle} 
            to="/airfields" 
            leftSection={<IconPlaneArrival size={14} />}
            variant={location.pathname.startsWith('/airfields') ? 'filled' : 'light'}
          >
            Terrains
          </Button>
          <Button 
            component={Link} 
            onClick={toggle} 
            to="/activities" 
            leftSection={<IconBulb size={14} />}
            variant={location.pathname.startsWith('/activities') ? 'filled' : 'light'}
          >
            Activités
          </Button>
          <Button 
            component={Link} 
            onClick={toggle} 
            to="/trips" 
            leftSection={<IconMapRoute size={14} />}
            variant={location.pathname.startsWith('/trips') ? 'filled' : 'light'}
          >
            Sorties
          </Button>
          <Button 
            component={Link} 
            onClick={toggle} 
            to="/map"  
            leftSection={<IconMap size={14} />}
            variant={location.pathname.startsWith('/map') ? 'filled' : 'light'}
          >
            Carte
          </Button>
          <Button 
            component={Link} 
            onClick={toggle} 
            to="/edit" 
            leftSection={<IconCirclePlus size={14} />}
            variant={location.pathname.startsWith('/edit') ? 'filled' : 'light'}
          >
            Ajout
          </Button>
          <TripStepSelect
            data={data}
            addItem={(value: string) => navigate(value)}
            placeholder="Accès direct"
          />
          </Stack>
        </AppShell.Navbar>

        <AppShell.Main>
            <Outlet />
        </AppShell.Main>
      </AppShell> 
    </MantineProvider>
  )
}

export default Layout
