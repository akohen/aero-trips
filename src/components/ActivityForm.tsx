import { Fieldset, TextInput, Chip, Group, Space, Button, Text } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Activity } from "../types";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";

const ActivityForm = ({submitFn, activity}: {submitFn: (document: object) => void, activity: Activity}) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      name: activity ? activity.name : '',
      position: activity ? activity.position.latitude +', '+activity.position.longitude: '',
      type: activity? activity.type : [] as string[],
      description: activity ? activity.description : '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      position: (value) => (/^-?\d+.\d+, -?\d+.\d+$/g.test(value) ? null : 'Doit être de la forme "Latitude, Longitude" (eg. "12.345, -6.789")'),
      type: (value) => value.length == 0 ? 'Choisir au moins 1 type' : null,
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    content: form.values['description'],
    onUpdate({ editor }) {
      form.setFieldValue('description', editor?.getHTML());
    }
  });


  return (submitted && !activity) ? (
    <p>Message envoyé</p>
  ) : (<form onSubmit={form.onSubmit((values) => {
    submitFn(Object.keys(values)
      .filter((k) => form.isDirty(k))
      .reduce((a, k) => ({ ...a, [k]: values[k as 'name'|'position'|'description'|'type'] }), {})
    )
    setSubmitted(true)
  })}>
  <h1>Proposer un ajout/modification</h1>
  <Fieldset legend="Ajouter une activité">
    <TextInput
      label="Nom de l'activité"
      placeholder="Nom de l'activité"
      {...form.getInputProps('name')}
    />

    <TextInput
      label="Position"
      placeholder="48.10000, -0.10000"
      {...form.getInputProps('position')}
    />
  <Chip.Group multiple {...form.getInputProps('type')}>
    <Group justify="center" mt="md">
      <Chip value="transport">Transport</Chip>
      <Chip value="food">Restauration</Chip>
      <Chip value="lodging">Hébergement</Chip>
      <Chip value="poi">A voir du ciel</Chip>
      <Chip value="other">Autre</Chip>
      <Text c="red">{form.getInputProps('type').error}</Text>
    </Group>
  </Chip.Group>
  <Space h="md" />
  <TextEditor editor={editor} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  {submitted && (<p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p>)}
  </Group>
</form>)
}

export default ActivityForm