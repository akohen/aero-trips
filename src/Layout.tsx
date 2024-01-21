import viteLogo from '/vite.svg'
import '@mantine/core/styles.css';
import { MantineProvider, AppShell, Burger, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, Outlet } from "react-router-dom";

function Layout() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <MantineProvider>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 250,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
      <AppShell.Header>
        <Group px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <img src={viteLogo} alt="Vite logo" />
          <h3>Aero Trips</h3>
        </Group>
      </AppShell.Header>

        <AppShell.Navbar p="md">
          <Link to="/">Home</Link>
          <Link to="/airfields">Terrains</Link>
          <Link to="/activities">Activités</Link>
          <Link to="/trips">Sorties</Link>
          <Link to="/map">Carte</Link>
        </AppShell.Navbar>

        <AppShell.Main>
            <Outlet />
        </AppShell.Main>
      </AppShell> 
    </MantineProvider>
  )
}

export default Layout
