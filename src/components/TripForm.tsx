import { Fieldset, Group, Button, TextInput, InputLabel, Title, Center, Text, Radio, Chip } from "@mantine/core"
import { DatePickerInput } from '@mantine/dates';
import { useEditor } from "@tiptap/react";
import { ActivityType, Data } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { default as TiptapImage } from "@tiptap/extension-image";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { IconBrandGoogleFilled, IconGripVertical, IconX } from "@tabler/icons-react";
import TripStepSelect from "./TripStepSelect";
import { CommonIcon } from "./CommonIcon";
import { editorProps, slug } from "../utils";
import { db, googleLogin } from "../data/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const TripForm = ({airfields, activities, trips, profile, id}: Data & {id: string|undefined}) => {
  type FinderOptions = {group: string, items: {label: string, value: string}[]}[]
  const trip = id ? trips.get(id) : undefined
  const [data, setData] = useState<FinderOptions>([])
  const [error, setError] = useState('')
  const navigate = useNavigate();
  
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
      name: trip ? trip.name : '',
      date: trip ? trip.date : undefined,
      description: trip ? trip.description: '',
      steps: trip ? trip.steps : [] as {type: 'activities'|'airfields', id:string}[],
      type: trip ? trip.type : '' as "short" | "day" | "multi",
      tags: trip ? trip.tags : [],
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      steps: (value) => (value.length < 2 ? 'La sortie doit comporter au moins 2 étapes' : null),
      type: (value) => (!value ? 'Choisir une durée de sortie' : null),
      tags: (value: ActivityType[]) => value.length == 0 ? 'Choisir au moins 1 thème' : null,
      description: () => editor!.state.doc.textContent.trim().length == 0 ? 'La description ne peut pas être vide' : null,
    }
  });

  const addStep = (a: string) => {
    form.clearFieldError('steps');
    if(a) {
      const [type, id] = a.split('/')
      form.insertListItem('steps', { type: type, id: id })
    }
  }

  const saveTrip = (values: typeof form.values) => {
    if(!profile) return

    const newTrip = {...values, uid: profile.uid, author: profile.displayName}
    const tripID = id ? id : slug(newTrip.name)
    setDoc(doc(db, "trips", tripID), newTrip, {merge:true})
      .then(() => {
        trips.set(tripID!, newTrip)
        navigate(`/trips/${tripID}`)
      })
      .catch(e => setError(e.message as string))
  }


  const DisplayItem = ({item}: {item:{type:'activities'|'airfields', id:string}}) => item.type == 'activities' ? (
    <Text>{activities.get(item.id)?.name}</Text>
  ) : (
    <Text>{airfields.get(item.id)?.name} - {airfields.get(item.id)?.codeIcao}</Text>
  )


  const steps = form.values.steps.map((_, index) => (
    <Draggable key={index} index={index} draggableId={index.toString()}>
      {(provided) => (
        <Group ref={provided.innerRef} mt="xs" {...provided.draggableProps}>
          <Center {...provided.dragHandleProps}>
            <IconGripVertical size="1.2rem" />
          </Center>
          <IconX
            className="clickable"
            onClick={() => form.removeListItem('steps',index)}
            size="1rem"
          />
          <DisplayItem item={form.values.steps[index]} />
        </Group>
      )}
    </Draggable>
  ))

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      TiptapImage.configure({allowBase64: false}),
    ],
    editorProps: editorProps(profile),
    content: form.values['description'],
    onUpdate({ editor }) {
      form.setFieldValue('description', editor?.getJSON());
    }
  }, [profile]);

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
      <InputLabel style={{width: '100%'}}>Ajouter une étape</InputLabel>
      <TripStepSelect
        data={data}
        addItem={addStep}
        placeholder="Chercher un lieu, une activité ou un terrain"
        {...{error:form.getInputProps('steps').error}}
      />
    <InputLabel style={{width: '100%'}}>Description</InputLabel>
    <TextEditor editor={editor} profile={profile} />
    <Text c="red">{form.getInputProps('description').error}</Text>
    
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
    <Text c="red">{error}</Text>
  </Group>
</form>)
}

export default TripForm