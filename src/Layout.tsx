import '@mantine/core/styles.css';
import '@mantine/tiptap/styles.css';
import '@mantine/dates/styles.css';
import { MantineProvider, AppShell, Burger, Group, Button, Stack, em, Title } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Link, Outlet, matchPath, useLocation, useNavigate } from "react-router";
import { IconBrandGoogleFilled, IconBulb, IconCalendarEvent, IconCirclePlus, IconHome, IconLogout, IconMail, IconMap, IconMapRoute, IconPlaneArrival, IconUser } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { Data } from '.';
import TripStepSelect from './components/TripStepSelect';
import { googleLogin, googleLogout } from './data/firebase';

function Layout({airfields, activities, profile}: Data) {
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation()
  const isMobile = useMediaQuery(`(max-width: ${em(768)})`);
  const navigate = useNavigate();
  type FinderOptions = {group: string, items: {label: string, value: string}[]}[]
  const data = useMemo<FinderOptions>(() => {
    const airfieldsOptions = [...airfields]
      .map(([id, ad]) => ({label: `${ad.name} - ${ad.codeIcao}`, value:`airfields/${id}`}))
    const activitiesOptions = [...activities]
      .map(([id, activity]) => ({label: activity.name, value:`activities/${id}`}))
    return [
      {group:'Terrains', items:airfieldsOptions},
      {group:'Activités', items:activitiesOptions},
    ]
  }, [airfields, activities])

  useEffect(() => {
    try{
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
      if(!link){
        link = document.createElement('link') as HTMLLinkElement
        link.setAttribute('rel','canonical')
        document.head.appendChild(link)
      }
      link.href = 'https://aerotrips.fr' + location.pathname + location.search
    }catch{/* ignore */}
  }, [location.pathname, location.search])
  
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
          <img src="/icon.png" style={{width: 32, height: 32}} />
          <h3>Aero Trips</h3>
        </Group>
      </AppShell.Header>

        <AppShell.Navbar p="md" zIndex={1000}>
        <Stack style={{flexGrow:1}}>
          <Stack style={{flexGrow:1}}>
            <Group visibleFrom='sm'>
              <img src="/icon.png" style={{width: 32, height: 32}} />
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
            to="/events"
            leftSection={<IconCalendarEvent size={14} />}
            variant={location.pathname.startsWith('/events') ? 'filled' : 'light'}
          >
            Événements
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
            addItem={(value: string) => {navigate(`/${value}`); close()}}
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
