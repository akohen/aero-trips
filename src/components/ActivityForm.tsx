import { Fieldset, TextInput, Chip, Group, Space, Button, Text, Title, InputLabel, Center, Tooltip } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Activity, ActivityType } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { default as TiptapImage } from "@tiptap/extension-image";
import { IconInfoCircle } from "@tabler/icons-react";
import { editorProps } from "../utils";
import { CommonIcon } from "./CommonIcon";

const ActivityForm = ({submitFn, activity}: {submitFn: (document: object) => void, activity: Activity}) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      name: activity ? activity.name : '',
      position: activity ? activity.position.latitude +', '+activity.position.longitude: '',
      type: activity? activity.type : [] as ActivityType[],
      description: activity ? activity.description : '',
    },
    validate: {
      name: (value: string) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      position: (value) => (/^-?\d+.\d+, -?\d+.\d+$/g.test(value) ? null : 'Doit être de la forme "Latitude, Longitude" (eg. "12.345, -6.789")'),
      type: (value: ActivityType[]) => value.length == 0 ? 'Choisir au moins 1 type' : null,
    }
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      TiptapImage.configure({allowBase64: false}),
    ],
    editorProps: editorProps,
    content: form.values['description'],
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

  return (submitted) ? (
    <><Title><BackButton />{activity ? 'Proposer une modification' : 'Proposer une nouvelle activité ou lieu'}</Title>
    <p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p></>
  ) : (<form onSubmit={form.onSubmit((values) => {
    submitFn(Object.keys(values)
      .filter((k) => form.isDirty(k) || activity.name == '')
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
      <Chip value="food"><CommonIcon iconType="food"/>&nbsp;Restauration</Chip>
      <Chip value="lodging"><CommonIcon iconType="lodging"/>&nbsp;Hébergement</Chip>
      <Chip value="transit"><CommonIcon iconType="transit"/>&nbsp;Transport en commun</Chip>
      <Chip value="bike"><CommonIcon iconType="bike"/>&nbsp;Vélo</Chip>
      <Chip value="car"><CommonIcon iconType="car"/>&nbsp;Taxi ou location de voiture</Chip>
      <Chip value="hiking"><CommonIcon iconType="hiking"/>&nbsp;Marche à pied</Chip>
      <Chip value="culture"><CommonIcon iconType="culture"/>&nbsp;Musée, château ou activité culturelle</Chip>
      <Chip value="aero"><CommonIcon iconType="aero"/>&nbsp;Activité en lien avec l'aéronautique</Chip>
      <Chip value="nautical"><CommonIcon iconType="nautical"/>&nbsp;Activité nautique</Chip>
      <Chip value="nature"><CommonIcon iconType="nature"/>&nbsp;Nature et animaux</Chip>
      <Chip value="poi"><CommonIcon iconType="poi"/>&nbsp;A voir du ciel</Chip>
      <Chip value="other"><CommonIcon iconType="other"/>&nbsp;Autre</Chip>
      <Text c="red">{form.getInputProps('type').error}</Text>
    </Group>
  </Chip.Group>
  
  <Space h="md" />
  <Center mt={"md"}><InputLabel>Description de l'activité</InputLabel></Center>
  <TextEditor editor={editor} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  </Group>
</form>)
}

export default ActivityForm