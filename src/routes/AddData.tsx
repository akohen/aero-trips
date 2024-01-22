import { Button, TextInput, Chip, Fieldset, Group } from "@mantine/core";
import { useForm } from "@mantine/form"
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { GeoPoint } from "firebase/firestore";
import { useState } from "react";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RTE({name, form}:any) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
    ],
    content: form.values[name],
    onUpdate({ editor }) {
      form.setFieldValue(name, editor?.getHTML());
    }
  });

  return (
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
  );
}

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

const AddData = ({saveChange}: {saveChange:(obj: object) => void}) => {
  const [submitted, setSubmitted] = useState(false)

  const formSubmit = ({name, type, position, description}: {name: string, type: string[], position: string, description: string}) => {
    const point: GeoPoint= new GeoPoint(...position.split(', ').map(parseFloat) as [number, number])
    saveChange({targetDocument:"activities/"+slug(name), name, type, description, position: point})
    setSubmitted(true)
  }

  const form = useForm({
    initialValues: {
      name: '',
      position: '',
      type: [],
      description: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'Le nom doit avoir au moins 2 charactères' : null),
      position: (value) => (/^-?\d+.\d+, -?\d+.\d+$/g.test(value) ? null : 'Doit être de la forme "Latitude, Longitude" (eg. "12.345, -6.789")'),
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
      <RTE name="description" form={form} />
      </Fieldset>
      <Group mt="md">
        <Button type="submit">Submit</Button>
      </Group>
    </form>
  )
}

export default AddData