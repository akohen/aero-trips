import { Fieldset, Group, Button, TextInput, InputLabel, Title, Chip } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Trip } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import Image from "@tiptap/extension-image";

const TripForm = ({submitFn, trip}: {submitFn: (document: object) => void, trip: Trip}) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      name: trip ? trip.name : '',
      description: trip ? trip.description: '',
      to: trip ? trip.to : '',
      from: trip ? trip.from : '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      from: (value) => (value && value.length != 4 ? 'Doit être un code OACI valide' : null),
      to: (value) => (value.length != 4 ? 'Doit être un code OACI valide' : null),
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
    ],
    content: form.values['description'],
    onUpdate({ editor }) {
      form.setFieldValue('description', editor?.getJSON());
    }
  });


  return (submitted && !trip) ? (
    <p>Message envoyé</p>
  ) : (<form onSubmit={form.onSubmit((values) => {
    submitFn(Object.keys(values)
      .filter((k) => form.isDirty(k))
      .reduce((a, k) => ({ ...a, [k]: values[k as 'name'|'description'] }), {})
    )
    setSubmitted(true)
  })}>
  <Title><BackButton />Proposer une modification</Title>
  <Fieldset legend="Modifier une sortie">
    <TextInput
      withAsterisk
      label="Nom de la sortie"
      placeholder="Nom de la sortie"
      {...form.getInputProps('name')}
    />
    <Group justify="space-between" align="top">
      <TextInput
        style = {{ flex: 1 }}
        label="Départ"
        placeholder="LFXX"
        {...form.getInputProps('from')}
      />
      <TextInput
        style = {{ flex: 1 }}
        label="Arrivée"
        placeholder="LFXX"
        withAsterisk
        {...form.getInputProps('to')}
      />
    </Group>
    <Group justify="center" align="baseline">
    <InputLabel>Type de sortie</InputLabel>
    <Chip.Group {...form.getInputProps('type')}>
      <Group justify="center" mt="md">
        <Chip value="short">Vol court</Chip>
        <Chip value="day">Sortie à la journée</Chip>
        <Chip value="multi">Voyage sur plusieurs jours</Chip>
      </Group>
    </Chip.Group>
    </Group>
    <InputLabel style={{width: '100%'}}>Description</InputLabel>
    <TextEditor editor={editor} />
    
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  {submitted && (<p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p>)}
  </Group>
</form>)
}

export default TripForm