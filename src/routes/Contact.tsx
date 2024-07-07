import { Button, Paper, Space, Text, Textarea, TextInput, Title } from "@mantine/core"
import { useForm } from "@mantine/form";
import { addDoc, collection } from "firebase/firestore";
import { Data } from "..";
import { db } from "../data/firebase";
import { useState } from "react";
import BackButton from "../components/BackButton";

const Contact = ({profile}: Data) => {
  const [submitted, setSubmitted] = useState(false)

  const form = useForm({
    initialValues: {
      message: '',
      email: profile ? profile.email : '',
    },
    validate: {
      message: (value) => value.length == 0 ? 'Le message ne peut pas être vide' : null,
    }
  });

  const submitFn = async (document: {email: string}) => {
    await addDoc(collection(db, "changes"), {
      ...document,
      targetDocument:`contacts/${document.email}`,
      updated_at: new Date(),
    })
    setSubmitted(true)
  }

  if(submitted) return (<>
    <Title><BackButton />Contact</Title>
    <Paper shadow="md" radius="md" p='sm' mt="md">
      <Text>Votre message a bien été envoyé</Text>
      <Text mt="md">Merci pour votre retour!</Text>
    </Paper>
</>)

  return (<>
  <Title><BackButton />Contact</Title>
  <Paper shadow="md" radius="md" p='sm' mt="md">
    <Text>Vous pouvez utiliser le formulaire ci-dessous pour nous signaler un bug, une idée d'amélioration ou tout autre message.</Text>
    <form onSubmit={form.onSubmit(submitFn)}>
      <Space mt={"md"}/>
      <TextInput
        label="Nom ou email"
        placeholder="Votre nom, ou email (pour pouvoir vous répondre)"
        {...form.getInputProps('email')}
      />
      <Textarea
        withAsterisk
        label="Message"
        placeholder="Votre message"
        mt="md"
        autosize
        minRows={3}
        {...form.getInputProps('message')}
      />
      <Button mt="md" type="submit">Enregistrer</Button>
    </form>
  </Paper>
</>)}

export default Contact
