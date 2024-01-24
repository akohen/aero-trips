import { Fieldset, Group, Button, Title, Space } from "@mantine/core"
import { useEditor } from "@tiptap/react";
import { Airfield } from "../types";
import { StarterKit } from "@tiptap/starter-kit";
import { Link } from "@tiptap/extension-link";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";

const AirfieldForm = ({submitFn, airfield}: {submitFn: (document: object) => void, airfield: Airfield}) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      description: airfield ? airfield.description : '',
    },
  });

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


  return (submitted && !airfield) ? (
    <p>Message envoyé</p>
  ) : (<form onSubmit={form.onSubmit((values) => {
    submitFn(Object.keys(values)
      .filter((k) => form.isDirty(k))
      .reduce((a, k) => ({ ...a, [k]: values[k as 'description'] }), {})
    )
    setSubmitted(true)
  })}>
  <Title><BackButton />Proposer une modification</Title>
  <Space mt={"md"}/>
  <Fieldset legend={`Terrain de ${airfield.name}`}>
    <TextEditor editor={editor} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  {submitted && (<p>Modifications enregistrées. Elles seront visibles d'ici quelques jours. <RouterLink to=".." relative="path">Retour</RouterLink></p>)}
  </Group>
</form>)
}

export default AirfieldForm