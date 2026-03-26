import { Fieldset, TextInput, Group, Space, Button, Text, Title, InputLabel, Center } from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import { Event, Airfield, Profile } from "..";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { slug } from "../utils/utils";
import { Timestamp, addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "../data/firebase";
import AnonymousSubmission from "./AnonymousSubmission";
import useTextEditor from "../hooks/useTextEditor";
import { Select } from "@mantine/core";

const EventForm = ({event, events, profile, id, airfields}: {event?: Event, events: Map<string,Event>, profile?: Profile, id: string|undefined, airfields: Map<string,Airfield>}) => {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate();

  const airfieldOptions = [...airfields].map(([adId, ad]) => ({
    value: adId,
    label: `${ad.name} - ${ad.codeIcao}`,
  }))

  const form = useForm({
    initialValues: {
      title: event?.title ?? '',
      airfieldId: event?.airfieldId ?? '',
      startDate: event?.startDate ? new Date(event.startDate.seconds * 1000) : null as Date | null,
      endDate: event?.endDate ? new Date(event.endDate.seconds * 1000) : null as Date | null,
      description: event?.description ?? '',
      link: event?.link ?? '',
    },
    validate: {
      title: (value: string) => value.length < 2 ? 'Le titre doit avoir au moins 2 caractères' : null,
      airfieldId: (value: string) => value.length === 0 ? 'Choisir un terrain' : null,
      startDate: (value) => value === null ? 'La date de début est obligatoire' : null,
      endDate: (value, values) => value && values.startDate && value < values.startDate ? 'La date de fin doit être après la date de début' : null,
    }
  });

  const editor = useTextEditor({
    profile,
    content: form.values.description,
    onUpdate: (content) => form.setFieldValue('description', content),
  });

  const saveEvent = (values: typeof form.values) => {
    const newEvent = {
      title: values.title,
      airfieldId: values.airfieldId,
      startDate: Timestamp.fromDate(new Date(values.startDate!)),
      ...(values.endDate ? { endDate: Timestamp.fromDate(new Date(values.endDate)) } : {}),
      description: values.description,
      ...(values.link ? { link: values.link.startsWith('http') ? values.link : 'https://' + values.link } : {}),
      author: profile ? profile.uid : 'anonymous',
      updated_at: Timestamp.fromDate(new Date()),
    }
    const eventId = id ?? slug(values.title)

    if (profile) {
      setDoc(doc(db, "events", eventId), newEvent, { merge: true })
        .then(() => {
          events.set(eventId, { ...newEvent, id: eventId } as Event)
          navigate(`/events/${eventId}`)
        })
        .catch(e => setError(e.message as string))
    } else {
      addDoc(collection(db, "changes"), {
        ...newEvent,
        targetDocument: `events/${eventId}`,
      })
      setSubmitted(true)
    }
  }

  return submitted ? <AnonymousSubmission /> : (
    <form onSubmit={form.onSubmit(saveEvent)}>
      <Title><BackButton />{event ? 'Modifier l\'événement' : 'Ajouter un événement'}</Title>
      <Fieldset>
        <Group justify="space-between" align="top">
          <TextInput
            style={{ flex: 2 }}
            label="Titre de l'événement"
            placeholder="Titre de l'événement"
            {...form.getInputProps('title')}
          />
          <TextInput
            style={{ flex: 1 }}
            label="Lien (site internet)"
            placeholder="https://..."
            {...form.getInputProps('link')}
          />
        </Group>
        <Group mt="md" align="top">
          <Select
            style={{ flex: 2 }}
            label="Terrain associé"
            placeholder="Choisir un terrain"
            data={airfieldOptions}
            searchable
            {...form.getInputProps('airfieldId')}
          />
          <DatePickerInput
            style={{ flex: 1 }}
            label="Date de début"
            placeholder="Date de début"
            {...form.getInputProps('startDate')}
          />
          <DatePickerInput
            style={{ flex: 1 }}
            label="Date de fin (optionnel)"
            placeholder="Date de fin"
            minDate={form.values.startDate ?? undefined}
            clearable
            {...form.getInputProps('endDate')}
          />
        </Group>
        <Space h="md" />
        <Center mt="md"><InputLabel>Description de l'événement</InputLabel></Center>
        <TextEditor editor={editor} profile={profile} />
      </Fieldset>
      <Group mt="md">
        <Button type="submit">Enregistrer</Button>
        <Text c="red">{error}</Text>
      </Group>
    </form>
  )
}

export default EventForm
