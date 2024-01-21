import { Button, TextInput, Chip, Fieldset, Group } from "@mantine/core";
import { useForm } from "@mantine/form"
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Data } from "../types";
import { addDoc, collection } from "firebase/firestore";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Demo({name, form}:any) {
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

const AddData = (data:Data) => {
  const saveChange = ({name, type}: {name: string, type: string[]}) => {
    console.log(name, type)
    addDoc(collection(data.db, "changes"), {
      targetDocument: "activities/"+slug(name),
      name,
      type,
    });
  }
  const form = useForm({
    initialValues: {
      name: '',
      type: [],
    },
  });
  return (
  <form onSubmit={form.onSubmit(saveChange)}>
    <p>Ajouter une activité</p>
    <Fieldset legend="Ajouter une activité">
      <TextInput
        label="Nom de l'activité"
        placeholder="Nom de l'activité"
        {...form.getInputProps('name')}
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
    </Fieldset>
    <Group mt="md">
      <Button type="submit">Submit</Button>
    </Group>
  </form>
)}

export default AddData