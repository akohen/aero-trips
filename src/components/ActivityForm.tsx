import { Fieldset, TextInput, Chip, Group, Space, Button, Text, Title, InputLabel, Center, Tooltip } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Activity, ActivityType, Profile } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { default as TiptapImage } from "@tiptap/extension-image";
import { IconInfoCircle } from "@tabler/icons-react";
import { editorProps, slug } from "../utils";
import { CommonIcon } from "./CommonIcon";
import { GeoPoint, addDoc, collection, doc, setDoc } from "firebase/firestore";
import { db } from "../data/firebase";

const ActivityForm = ({activity, profile, id, activities}: {activity: Activity, profile: Profile|null, id: string|undefined, activities: Map<string,Activity>}) => {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      name: activity ? activity.name : '',
      position: activity ? activity.position.latitude +', '+activity.position.longitude: '',
      type: activity? activity.type : [] as ActivityType[],
      description: activity ? activity.description : '',
      website: activity ? activity.website : '',
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
    editorProps: editorProps(profile),
    content: form.values['description'],
    onUpdate({ editor }) {
      form.setFieldValue('description', editor.getJSON());
    }
  }, [profile]);


  const saveActivity = (values: typeof form.values) => {
    const newActivity = {
      ...values, 
      position: new GeoPoint(...values.position.split(', ').map(parseFloat) as [number, number]),
      updated_at: new Date(),
    }
    const activityID = id ? id : slug(values.name)

    if(profile) {
      setDoc(doc(db, "activities", activityID), newActivity, {merge:true})
      .then(() => {
        activities.set(activityID, newActivity)
        navigate(`/activities/${activityID}`)
      })
      .catch(e => setError(e.message as string))
    } else {
      addDoc(collection(db, "changes"), {
        ...newActivity,
        targetDocument:`activities/${activityID}`,
      })
      setSubmitted(true)    
    }
  }




  const PositionTooltip = () => (
    <Tooltip label={"Pour obtenir la position, sur Google Maps, clic droit sur le lieu, cliquer sur la première ligne qui s'affiche, puis coller la valeur dans la case ci-dessous"}>
      <InputLabel>Position
      <IconInfoCircle color="darkblue" size={18} style={{verticalAlign:'middle'}} />
      </InputLabel>
    </Tooltip>)

  return (submitted) ? (
    <><Title><BackButton />{activity ? 'Proposer une modification' : 'Proposer une nouvelle activité ou lieu'}</Title>
    <p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p></>
  ) : (<form onSubmit={form.onSubmit(saveActivity)}>
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
      label="Site internet"
      placeholder="Site internet"
      {...form.getInputProps('website')}
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
  <TextEditor editor={editor} profile={profile} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
    <Text c="red">{error}</Text>
  </Group>
</form>)
}

export default ActivityForm