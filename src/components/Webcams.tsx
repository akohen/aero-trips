import { Anchor, Button, Image, Stack, Text, Title } from "@mantine/core"
import { IconCamera } from "@tabler/icons-react"
import { useState } from "react"
import { Webcam } from ".."
import { isValidWebcam, webcamLabel } from "../utils/webcams"

const WebcamItem = ({ webcam, label }: { webcam: Webcam, label: string }) => {
  // A dead camera falls back to the link rather than a broken image
  const [failed, setFailed] = useState(false)
  if (!webcam.image || failed) return (
    <Button component="a" href={webcam.url} target="_blank" rel="noopener nofollow" variant="light" leftSection={<IconCamera size={20} />}>
      {label}
    </Button>
  )
  return (
    <Anchor href={webcam.url} target="_blank" rel="noopener nofollow" title={`${label} : ouvrir dans un nouvel onglet`}>
      <Image src={webcam.image} alt={label} loading="lazy" radius="sm" onError={() => setFailed(true)} />
      <Text size="sm">{label}{webcam.source === 'cam-aero' && ' · Cam-Aéro'}</Text>
    </Anchor>
  )
}

export const Webcams = ({ webcams }: { webcams?: Webcam[] }) => {
  const valid = (webcams ?? []).filter(isValidWebcam)
  if (valid.length === 0) return null
  return (
    <Stack gap={4}>
      <Title order={4}>{valid.length > 1 ? 'Webcams' : 'Webcam'}</Title>
      {valid.map((webcam, i) => <WebcamItem key={webcam.url} webcam={webcam} label={webcamLabel(webcam, i, valid.length)} />)}
    </Stack>
  )
}
