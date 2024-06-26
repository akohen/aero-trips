import { Fieldset, Group, Button, Title, Space, Chip, InputLabel, TextInput } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Airfield, Profile } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { default as TiptapImage } from "@tiptap/extension-image";
import { editorProps } from "../utils";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../data/firebase";

const AirfieldForm = ({airfield, profile}: {airfield: Airfield, profile: Profile|null}) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      description: airfield ? airfield.description : {},
      fuels: airfield ? airfield.fuels : [],
      toilet: airfield ? airfield.toilet : '',
      website: airfield ? airfield.website : '',
    },
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

  const submitFn = (document: {name?: string, position?: string}) => {
    addDoc(collection(db, "changes"), {
      ...document,
      targetDocument:`airfields/${airfield.codeIcao}`,
      updated_at: new Date(),
    })
  }


  return (submitted) ? (<>
    <Title><BackButton />Proposer une modification</Title>
    <p>Votre modification a bien été enregistrée, elle sera ajoutée au site d'ici quelques jours!</p>
    <p><RouterLink to=".." relative="path">Retour</RouterLink></p>
  </>) : (
  <form onSubmit={form.onSubmit((values) => {
    submitFn(Object.keys(values)
      .filter((k) => form.isDirty(k))
      .reduce((a, k) => ({ ...a, [k]: values[k as 'description'] }), {})
    )
    setSubmitted(true)
  })}>
  <Title><BackButton />Proposer une modification</Title>
  <Fieldset legend={`Terrain de ${airfield.name}`}>
    <Group justify="center" align="baseline">
      <InputLabel>Site Internet</InputLabel>
      <TextInput
        placeholder="Site internet"
        {...form.getInputProps('website')}
      />
    </Group>
    <Group justify="center" align="baseline">
    <InputLabel>Essence disponible sur le terrain</InputLabel>
    <Chip.Group multiple {...form.getInputProps('fuels')}>
      <Group justify="center" mt="md">
        <Chip value="100LL">100LL</Chip>
        <Chip value="JETA1">Jet A1</Chip>
        <Chip value="SP98">SP98</Chip>
        <Chip value="UL91">UL91</Chip>
      </Group>
    </Chip.Group>
    </Group>
    <Group justify="center" align="baseline">
    <InputLabel>Toilettes sur le terrain</InputLabel>
    <Chip.Group {...form.getInputProps('toilet')}>
      <Group justify="center" mt="md">
        <Chip value="no">Non</Chip>
        <Chip value="public">Oui, publiques (eg. terminal)</Chip>
        <Chip value="private">Oui, privées (eg. restaurant ou aéroclub)</Chip>
      </Group>
    </Chip.Group>
    </Group>
    <Space mt={"md"}/>
    <TextEditor editor={editor} profile={profile} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  </Group>
</form>)
}

export default AirfieldForm