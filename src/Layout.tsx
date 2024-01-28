import viteLogo from '/vite.svg'
import '@mantine/core/styles.css';
import '@mantine/tiptap/styles.css';
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
          width: 200,
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
          <Link onClick={toggle} to="/">Home</Link>
          <Link onClick={toggle} to="/airfields">Terrains</Link>
          <Link onClick={toggle} to="/activities">Activités</Link>
          <Link onClick={toggle} to="/trips">Sorties</Link>
          <Link onClick={toggle} to="/map">Carte</Link>
          <Link onClick={toggle} to="/edit">Ajout</Link>
        </AppShell.Navbar>

        <AppShell.Main>
            <Outlet />
        </AppShell.Main>
      </AppShell> 
    </MantineProvider>
  )
}

export default Layout
