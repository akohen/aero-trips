import { Button, TextInput, Chip, Fieldset, Group, Space } from "@mantine/core";
import { useForm } from "@mantine/form"
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { GeoPoint } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Activity, Data } from "../types";


const slug = (str: string) => {
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .concat('-',Math.random().toString(36).substring(7));
}

const AddData = (data: Data) => {
  const params = useParams();
  const [submitted, setSubmitted] = useState(false)

  const formSubmit = ({name, type, position, description}: {name: string, type: string[], position: string, description: string}) => {
    const point: GeoPoint= new GeoPoint(...position.split(', ').map(parseFloat) as [number, number])
    data.saveChange({
      targetDocument:"activities/"+(params.id ? params.id : slug(name)), 
      name, type, description, position: point
    })
    setSubmitted(true)
  }

  const form = useForm({
    initialValues: {
      name: '',
      position: '',
      type: [] as string[],
      description: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      position: (value) => (/^-?\d+.\d+, -?\d+.\d+$/g.test(value) ? null : 'Doit être de la forme "Latitude, Longitude" (eg. "12.345, -6.789")'),
    }
  });

  useEffect(() => {
    if(params.type && params.id && ['activities','airfields','trips'].includes(params.type)) {
      if(params.type == 'activities') {
        const activity = data.activities.get(params.id) as Activity
        if(activity != undefined) {
          form.initialize({ 
            name: activity.name,
            description: activity.description as string,
            position: activity.position.latitude +', '+activity.position.longitude,
            type: activity.type as string[],
          })
          editor?.commands.setContent(activity.description as string)
        }
      }
    }
  },[data.activities, params])


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

  


  return submitted ? (
    <div>
      <p>{form.values.name} envoyé!</p>
      <p>Ces informations seront affichées d'ici quelques jours</p>
    </div>
  ): (
    <form onSubmit={form.onSubmit(formSubmit)}>
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
        </Group>
      </Chip.Group>
      <Space h="md" />
      <RichTextEditor editor={editor}>
      <RichTextEditor.Toolbar sticky stickyOffset={60}>
        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Bold />
          <RichTextEditor.Italic />
          <RichTextEditor.Underline />
          <RichTextEditor.Strikethrough />
          <RichTextEditor.ClearFormatting />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.H1 />
          <RichTextEditor.H2 />
          <RichTextEditor.H3 />
          <RichTextEditor.H4 />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Link />
          <RichTextEditor.Unlink />
        </RichTextEditor.ControlsGroup>

        <RichTextEditor.ControlsGroup>
          <RichTextEditor.Undo />
          <RichTextEditor.Redo />
        </RichTextEditor.ControlsGroup>
      </RichTextEditor.Toolbar>

      <RichTextEditor.Content />
    </RichTextEditor>
      </Fieldset>
      <Group mt="md">
        <Button type="submit">Submit</Button>
      </Group>
    </form>
  )
}

export default AddData