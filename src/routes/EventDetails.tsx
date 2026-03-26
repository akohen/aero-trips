import { Button, Grid, Paper, Stack, Text, Title } from "@mantine/core"
import { useParams } from "react-router-dom"
import { Link } from "react-router-dom"
import { Data } from ".."
import BackButton from "../components/BackButton"
import Description from "../components/Description"
import EditButton from "../components/EditButton"
import { formatDate } from "../utils/utils"
import { IconExternalLink } from "@tabler/icons-react"
import { useEffect } from "react"

const EventDetails = ({ events, airfields }: Data) => {
  const params = useParams()
  const event = params.eventId ? events.get(params.eventId) : undefined
  const airfield = event ? airfields.get(event.airfieldId) : undefined

  useEffect(() => {
    if (event) document.title = `${event.title} - AeroTrips`
  }, [event])

  if (events.size === 0) return <p>Chargement en cours</p>
  if (!event) return <p>Événement non trouvé</p>

  const dateLabel = event.endDate
    ? `${formatDate(event.startDate)} → ${formatDate(event.endDate)}`
    : formatDate(event.startDate)

  return (
    <>
      <Title order={1}>
        <BackButton />{event.title}
        <EditButton />
      </Title>

      <Grid grow mt="md">
        <Grid.Col span={3}>
          <Paper shadow="md" radius="md" p="xs" withBorder bg="gray.0">
            <Stack gap="xs">
              {airfield ? (
                <Text>
                  <b>Terrain: </b>
                  <Link to={`/airfields/${event.airfieldId}`}>
                    {airfield.name} - {airfield.codeIcao}
                  </Link>
                </Text>
              ) : (
                <Text><b>Terrain: </b>{event.airfieldId}</Text>
              )}
              <Text><b>Date: </b>{dateLabel}</Text>
              {event.link && (
                <Button
                  component={Link}
                  to={event.link}
                  target="_blank"
                  leftSection={<IconExternalLink size={16} />}
                >
                  Site de l'événement
                </Button>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
        {event.description && (
          <Grid.Col span={6}>
            <Description content={event.description} />
          </Grid.Col>
        )}
      </Grid>
    </>
  )
}

export default EventDetails
