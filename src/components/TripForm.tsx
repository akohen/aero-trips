import { Fieldset, Group, Button, TextInput, InputLabel, Title, Center, Text, Radio, Chip, Box } from "@mantine/core"
import { DatePickerInput } from '@mantine/dates';
import { ActivityType, Data } from "..";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { useDraftTrip } from "../hooks/useDraftTrip";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { IconBrandGoogleFilled, IconGripVertical, IconTrash, IconX } from "@tabler/icons-react";
import TripStepSelect from "./TripStepSelect";
import { CommonIcon } from "./CommonIcon";
import { slug } from "../utils/utils";
import { db, googleLogin } from "../data/firebase";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import useTextEditor from "../hooks/useTextEditor";

const TripForm = ({airfields, activities, trips, profile, id}: Data & {id: string|undefined}) => {
  type FinderOptions = {group: string, items: {label: string, value: string}[]}[]
  const trip = id ? trips.get(id) : undefined
  const [data, setData] = useState<FinderOptions>([])
  const [error, setError] = useState('')
  const navigate = useNavigate();
  const { draft, setDraft, clearDraft, hasDraftForTrip } = useDraftTrip();
  const draftApplies = id ? hasDraftForTrip(id) : !draft.id
  
  useEffect(() => {
    const airfieldsOptions = [...airfields] 
      .map(([id, ad]) => (
        {label: `${ad.name} - ${ad.codeIcao}`, value:`airfields/${id}`}
      ))
    const activitiesOptions = [...activities] 
      .map(([id, activity]) => (
        {label: activity.name, value:`activities/${id}`}
      ))

    setData([
      {group:'Terrains', items:airfieldsOptions},
      {group:'Activités', items:activitiesOptions},
    ])

  },[airfields, activities])

  const form = useForm({
    initialValues: {
      name: draftApplies ? draft.name : (trip?.name ?? ''),
      date: draftApplies ? draft.date : (trip?.date ? dayjs(trip.date.toDate()).format('MM/DD/YYYY') : undefined),
      description: draftApplies ? draft.description : (trip?.description ?? ''),
      steps: draftApplies ? draft.steps : (trip?.steps ?? []) as {type: 'activities'|'airfields', id:string}[],
      type: (draftApplies ? draft.type : (trip?.type ?? '')) as "short" | "day" | "multi",
      tags: draftApplies ? draft.tags : (trip?.tags ?? []),
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      steps: (value) => (value.length < 2 ? 'La sortie doit comporter au moins 2 étapes' : null),
      type: (value) => (!value ? 'Choisir une durée de sortie' : null),
      tags: (value: ActivityType[]) => value.length == 0 ? 'Choisir au moins 1 thème' : null,
      description: () => editor!.state.doc.textContent.trim().length == 0 ? 'La description ne peut pas être vide' : null,
    }
  });

  useEffect(() => {
    setDraft({ ...form.values, id })
  }, [form.values, id, setDraft])

  const addStep = (a: string) => {
    form.clearFieldError('steps');
    if(a) {
      const [type, id] = a.split('/')
      form.insertListItem('steps', { type: type, id: id })
    }
  }

  const saveTrip = (values: typeof form.values) => {
    if(!profile) return

    const date = values.date ? Timestamp.fromMillis(dayjs(values.date?.toString(), 'DD/MM/YYYY').valueOf()) : undefined;
    const newTrip = {
      ...values,
      uid: profile.uid,
      author: profile.displayName,
      date,
      updated_at: Timestamp.fromDate(new Date()),
    }
    console.log(newTrip)
    const tripID = id ? id : slug(newTrip.name)
    setDoc(doc(db, "trips", tripID), newTrip, {merge:false})
      .then(() => {
        trips.set(tripID!, newTrip)
        clearDraft()
        navigate(`/trips/${tripID}`)
      })
      .catch(e => setError(e.message as string))
  }


  const DisplayItem = ({item}: {item:{type:'activities'|'airfields', id:string}}) => item.type == 'activities' ? (
    <Text truncate component={Link} style={{ display: 'block' }} to={`/activities/${item.id}`}>{activities.get(item.id)?.name}</Text>
  ) : (
    <Text truncate component={Link} style={{ display: 'block' }} to={`/airfields/${item.id}`}>{airfields.get(item.id)?.name} - {airfields.get(item.id)?.codeIcao}</Text>
  )


  const steps = form.values.steps.map((_, index) => (
    <Draggable key={index} index={index} draggableId={index.toString()}>
      {(provided) => (
        <Group wrap="nowrap" ref={provided.innerRef} mt="xs" {...provided.draggableProps}>
          <Center {...provided.dragHandleProps}>
            <IconGripVertical size="1.2rem" />
          </Center>
          <IconX
            className="clickable"
            onClick={() => form.removeListItem('steps',index)}
            size="1rem"
          />
          <Box style={{ flex: 1, minWidth: 0 }}>
            <DisplayItem item={form.values.steps[index]} />
          </Box>
        </Group>
      )}
    </Draggable>
  ))

  const editor = useTextEditor({
    profile,
    content: form.values.description,
    onUpdate: (content) => form.setFieldValue('description', content),
  });

  if(!profile || (trip && profile.uid != trip.uid)) return (<>
    <Title><BackButton />Proposer une sortie</Title>
    <p>Connectez vous avec un compte Google pour pouvoir créer et modifier vos propositions de sorties.</p>
    <Button
        onClick={googleLogin}
        leftSection={<IconBrandGoogleFilled size={14} />}
        variant='light'
      >
      Connexion
    </Button>
  </>)

  return (<form onSubmit={form.onSubmit(saveTrip)}>
  <Title><BackButton />Proposer une sortie</Title>
  <Fieldset legend="Modifier une sortie">
    <TextInput
      withAsterisk
      miw={180}
      label="Nom de la sortie"
      placeholder="Nom de la sortie"
      {...form.getInputProps('name')}
    />
    
    <Group justify="space-between" align="top" mt={"xs"}>
      <DatePickerInput
        label="Date de la sortie"
        placeholder="Laisser vide pour une sortie en projet"
        clearable
        valueFormat="DD/MM/YYYY"
        style = {{ flex: 1 }}
        miw={250}
        {...form.getInputProps('date')}
      />
      <Radio.Group
        {...form.getInputProps('type')}
        label="Durée de la sortie"
        withAsterisk
      >
      <Group mt="xs">
        <Radio value="short" label="Vol court" />
        <Radio value="day" label="Sortie à la journée" />
        <Radio value="multi" label="Voyage sur plusieurs jours" />
      </Group>
    </Radio.Group>
    </Group>
    <InputLabel mt="md">Thème(s) de la sortie</InputLabel>
    <Chip.Group multiple {...form.getInputProps('tags')}>
    <Group justify="center">
      <Chip value="bike"><CommonIcon iconType="bike"/>&nbsp;Vélo</Chip>
      <Chip value="hiking"><CommonIcon iconType="hiking"/>&nbsp;Marche à pied</Chip>
      <Chip value="culture"><CommonIcon iconType="culture"/>&nbsp;Culture</Chip>
      <Chip value="aero"><CommonIcon iconType="aero"/>&nbsp;Aéronautique</Chip>
      <Chip value="nautical"><CommonIcon iconType="nautical"/>&nbsp;Plage et nautisme</Chip>
      <Chip value="nature"><CommonIcon iconType="nature"/>&nbsp;Nature et animaux</Chip>
      <Chip value="poi"><CommonIcon iconType="poi"/>&nbsp;Vues aériennes</Chip>
      <Chip value="other"><CommonIcon iconType="other"/>&nbsp;Autre</Chip>
      <Text c="red">{form.getInputProps('tags').error}</Text>
    </Group>
  </Chip.Group>
  <InputLabel mt={"md"}>Liste des étapes</InputLabel>
    <DragDropContext
        onDragEnd={({ destination, source }) =>
          destination?.index !== undefined && form.reorderListItem('steps', { from: source.index, to: destination.index })
        }
      >
        <Droppable droppableId="dnd-list" direction="vertical">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {steps}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <InputLabel mt={"md"}>Ajouter une étape</InputLabel>
      <TripStepSelect
        data={data}
        addItem={addStep}
        placeholder="Chercher un lieu, une activité ou un terrain"
        {...{error:form.getInputProps('steps').error}}
      />
    <InputLabel mt={"md"}>Description</InputLabel>
    <TextEditor editor={editor} profile={profile} />
    <Text c="red">{form.getInputProps('description').error}</Text>
    
  </Fieldset>
  <Group mt="md">
    <Button 
      variant="subtle"
      color="red"
      leftSection={<IconTrash size={16} />}
      onClick={() => { clearDraft(); navigate(-1)}}
    >
      Supprimer le brouillon
    </Button>
    <Button type="submit">Enregistrer</Button>
    <Text c="red">{error}</Text>
  </Group>
</form>)
}

export default TripForm