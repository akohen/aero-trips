import { Fieldset, Group, Button, Title, Space, Chip, InputLabel } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Airfield } from "..";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import Image from "@tiptap/extension-image";

const AirfieldForm = ({submitFn, airfield}: {submitFn: (document: object) => void, airfield: Airfield}) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      description: airfield ? airfield.description : {},
      fuels: airfield ? airfield.fuels : []
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
    ],
    content: form.values['description'],
    onUpdate({ editor }) {
      form.setFieldValue('description', editor.getJSON());
    }
  });


  return (submitted && !airfield) ? (<>
    <Title><BackButton />Proposer une modification</Title>
    <p>Votre proposition a bien été enregistrée, elle sera ajoutée au site d'ici quelques jours!</p>
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
    <InputLabel>Essence disponible sur le terrain</InputLabel>
    <Chip.Group multiple {...form.getInputProps('fuels')}>
      <Group justify="center" mt="md">
        <Chip value="100LL">100LL</Chip>
        <Chip value="JETA1">Jet A1</Chip>
        <Chip value="SP98">SP98</Chip>
      </Group>
    </Chip.Group>
    </Group>
    <Space mt={"md"}/>
    <TextEditor editor={editor} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  {submitted && (<p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p>)}
  </Group>
</form>)
}

export default AirfieldForm