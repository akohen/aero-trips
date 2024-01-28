import { Fieldset, TextInput, Chip, Group, Space, Button, Text, Title, InputLabel, Center, Tooltip } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Activity } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import Image from "@tiptap/extension-image";
import { IconInfoCircle } from "@tabler/icons-react";

const ActivityForm = ({submitFn, activity}: {submitFn: (document: object) => void, activity: Activity}) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      name: activity ? activity.name : '',
      position: activity ? activity.position.latitude +', '+activity.position.longitude: '',
      type: activity? activity.type : [] as string[],
      description: activity ? activity.description : {},
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
      Image.configure({allowBase64: false}),
    ],
    content: form.values['description'],
    editorProps: {
      handleDrop: function() {
        return false; //TODO
      }
    },
    onUpdate({ editor }) {
      form.setFieldValue('description', editor.getJSON());
    }
  });



  const PositionTooltip = () => (
    <Tooltip label={"Pour obtenir la position, sur Google Maps, clic droit sur le lieu, cliquer sur la première ligne qui s'affiche, puis coller la valeur dans la case ci-dessous"}>
      <InputLabel>Position
      <IconInfoCircle color="darkblue" size={18} style={{verticalAlign:'middle'}} />
      </InputLabel>
    </Tooltip>)

  return (submitted && !activity) ? (
    <><Title><BackButton />Proposer une nouvelle activité ou lieu</Title>
    <p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p></>
  ) : (<form onSubmit={form.onSubmit((values) => {
    submitFn(Object.keys(values)
      .filter((k) => form.isDirty(k))
      .reduce((a, k) => ({ ...a, [k]: values[k as 'name'|'position'|'description'|'type'] }), {})
    )
    setSubmitted(true)
  })}>
  <Title><BackButton />{activity ? 'Proposer une modification' : 'Proposer une nouvelle activité ou lieu'}</Title>
  <Fieldset>
  <Group justify="space-between" align="top">
    <TextInput
      style = {{ flex: 1 }}
      label="Nom de l'activité"
      placeholder="Nom de l'activité"
      {...form.getInputProps('name')}
    />
    <TextInput
      style = {{ flex: 1 }}
      label={<PositionTooltip />}
      placeholder="48.12345, -0.12345"
      {...form.getInputProps('position')}
    />
  </Group>    
  <Center mt={"md"}><InputLabel>Choisir une ou plusieurs catégories</InputLabel></Center>
  <Chip.Group multiple {...form.getInputProps('type')}>
    <Group justify="center" mt="md">
      <Chip value="food">Restauration</Chip>
      <Chip value="lodging">Hébergement</Chip>
      <Chip value="transit">Transport en commun</Chip>
      <Chip value="bike">Vélo</Chip>
      <Chip value="car">Taxi ou location de voiture</Chip>
      <Chip value="hiking">Marche à pied</Chip>
      <Chip value="culture">Musée, château ou activité culturelle</Chip>
      <Chip value="aero">Activité en lien avec l'aéronautique</Chip>
      <Chip value="poi">A voir du ciel</Chip>
      <Chip value="other">Autre</Chip>
      <Text c="red">{form.getInputProps('type').error}</Text>
    </Group>
  </Chip.Group>
  
  <Space h="md" />
  <Center mt={"md"}><InputLabel>Description de l'activité</InputLabel></Center>
  <TextEditor editor={editor} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  {submitted && (<p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p>)}
  </Group>
</form>)
}

export default ActivityForm