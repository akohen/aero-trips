import { Button, Stack, Text, Title } from "@mantine/core"
import { Link } from "react-router"

export default function NotFound() {
  return (
    <Stack align="center" mt="xl" gap="md">
      <Title>404</Title>
      <Text>Cette page n'existe pas.</Text>
      <Button component={Link} to="/">Retour à l'accueil</Button>
    </Stack>
  )
}
