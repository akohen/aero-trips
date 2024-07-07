import '@mantine/core/styles.css';
import '@mantine/tiptap/styles.css';
import { MantineProvider, AppShell, Burger, Group, Button, Stack, em, Title } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Link, Outlet, matchPath, useLocation, useNavigate } from "react-router-dom";
import { IconBrandGoogleFilled, IconBulb, IconCirclePlus, IconHome, IconLogout, IconMail, IconMap, IconMapRoute, IconPlaneArrival, IconUser } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Data } from '.';
import TripStepSelect from './components/TripStepSelect';
import { googleLogin, googleLogout } from './data/firebase';

function Layout({airfields, activities, profile}: Data) {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation()
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`);
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
        header={{ 
          height: 80, 
          collapsed: !isMobile,
        }}
        navbar={{
          width: 200,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
      <AppShell.Header  zIndex={1200}>
        <Group px="md">
          <Burger opened={opened} onClick={toggle} size="sm" />
          <IconPlaneArrival />
          <h3>Aero Trips</h3>
        </Group>
      </AppShell.Header>

        <AppShell.Navbar p="md" zIndex={1000}>
        <Stack style={{flexGrow:1}}>
          <Stack style={{flexGrow:1}}>
            <Group visibleFrom='sm'>
              <IconPlaneArrival />
              <Title order={3}>Aero Trips</Title>
            </Group>
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
          <Button 
            component={Link} 
            onClick={toggle} 
            to="/contact" 
            leftSection={<IconMail size={14} />}
            variant={location.pathname.startsWith('/contact') ? 'filled' : 'light'}
          >
            Contact
          </Button>
          <TripStepSelect
            data={data}
            addItem={(value: string) => {navigate(value); close()}}
            placeholder="Accès direct"
          />
          </Stack>

          <Stack>
          {profile ? 
          <>
            <Button 
              component={Link} 
              onClick={toggle} 
              to="/profile"  
              leftSection={<IconUser size={14} />}
              variant={location.pathname.startsWith('/profile') ? 'filled' : 'light'}
            >
            Mon profil
            </Button>
            <Button
              onClick={googleLogout}
              leftSection={<IconLogout size={14} />}
              variant='light'
            >
            Déconnexion
            </Button>
          </>
          : 
          <Button
              onClick={googleLogin}
              leftSection={<IconBrandGoogleFilled size={14} />}
              variant='light'
            >
            Connexion
          </Button>
          }
          </Stack>
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
