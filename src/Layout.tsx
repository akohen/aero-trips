import '@mantine/core/styles.css';
import '@mantine/tiptap/styles.css';
import { MantineProvider, AppShell, Burger, Group, Button, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet, matchPath, useLocation } from "react-router-dom";
import { IconBulb, IconCirclePlus, IconHome, IconMap, IconMapRoute, IconPlaneArrival } from '@tabler/icons-react';

function Layout() {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation()
  
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

        <AppShell.Navbar p="md">
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
