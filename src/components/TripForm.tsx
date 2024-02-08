import { Fieldset, Group, Button, TextInput, InputLabel, Title, Center, Text, Radio } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Activity, Airfield, Trip } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { default as TiptapImage } from "@tiptap/extension-image";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { IconGripVertical, IconX } from "@tabler/icons-react";
import TripStepSelect from "./TripStepSelect";
import { editorProps } from "../utils";

const TripForm = ({submitFn, trip, airfields, activities}: 
  {submitFn: (document: object) => void, trip: Trip, airfields: Map<string, Airfield>, activities: Map<string, Activity>}) => {
  const [submitted, setSubmitted] = useState(false)

  type FinderOptions = {group: string, items: {label: string, value: string}[]}[]
    const [data, setData] = useState<FinderOptions>([])

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
      description: trip ? trip.description: '',
      steps: trip ? trip.steps : [] as {type: 'activities'|'airfields', id:string}[],
      type: trip ? trip.type : '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      steps: (value) => (value.length < 1 ? 'La sortie doit comporter au moins 1 étape' : null),
      type: (value) => (value == '' ? 'Choisir une durée de sortie' : null)
    }
  });

  const addStep = (a: string) => {
    form.clearFieldError('steps');
    if(a) {
      const [type, id] = a.split('/')
      form.insertListItem('steps', { type: type, id: id })
    }
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
      TiptapImage.configure({allowBase64: true}),
    ],
    editorProps: editorProps,
    content: form.values['description'],
    onUpdate({ editor }) {
      form.setFieldValue('description', editor?.getJSON());
    }
  });


  return (submitted) ? (
    <><Title><BackButton />Proposer une modification</Title>
    <p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p>
    </>
  ) : (<form onSubmit={form.onSubmit((values) => {
    submitFn(Object.keys(values)
      .filter((k) => form.isDirty(k))
      .reduce((a, k) => ({ ...a, [k]: values[k as 'name'|'description'] }), {})
    )
    setSubmitted(true)
  })}>
  <Title><BackButton />Proposer une modification</Title>
  <Fieldset legend="Modifier une sortie">
    
    <Group justify="space-between" align="top">
      <TextInput
        withAsterisk
        style = {{ flex: 1 }}
        label="Nom de la sortie"
        placeholder="Nom de la sortie"
        {...form.getInputProps('name')}
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
        {...{error:form.getInputProps('steps').error}}
      />
    <InputLabel style={{width: '100%'}}>Description</InputLabel>
    <TextEditor editor={editor} />
    
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  </Group>
</form>)
}

export default TripForm