import { Fieldset, Group, Button, Title, Space, Chip, InputLabel, TextInput } from "@mantine/core"
import { Activity, Airfield, Profile } from "..";
import { useForm } from "@mantine/form";
import { useState } from "react";
import TextEditor from "./TextEditor";
import BackButton from "./BackButton";
import { addDoc, collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../data/firebase";
import AnonymousSubmission from "./AnonymousSubmission";
import { useNavigate } from "react-router";
import useTextEditor from "../hooks/useTextEditor";

const AirfieldForm = ({airfield, profile, airfields, activities}: {airfield: Airfield, profile?: Profile, airfields: Map<string,Airfield>, activities: Map<string,Activity>}) => {
  const [submitted, setSubmitted] = useState(false)
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      description: airfield ? airfield.description : {},
      fuels: airfield ? airfield.fuels : [],
      toilet: airfield ? airfield.toilet : '',
      website: airfield ? airfield.website : '',
    },
  });

  const editor = useTextEditor({
    profile,
    content: form.values.description,
    onUpdate: (content) => form.setFieldValue('description', content),
  });

  const submitFn = (document: typeof form.values) => {
    // Carry all data from the existing airfield, mostly as its easier to test prod data on dev/staging where the entry might not exist
    const updatedAirfield = {
      ...airfield,
      ...document,
      updated_at: Timestamp.fromDate(new Date()),
      updated_by: profile ? profile.uid : 'anonymous',
    } as Airfield

    if(updatedAirfield.website && !updatedAirfield.website.startsWith('http')) {
      updatedAirfield.website = 'https://' + updatedAirfield.website;
    }

    if(profile) {
      setDoc(doc(db, "airfields", airfield.codeIcao), updatedAirfield, {merge:true})
      .then(() => {
        airfields.set(airfield.codeIcao, updatedAirfield)
        navigate(`/airfields/${airfield.codeIcao}`)
      })
      .catch(e => console.error(e.message as string))
    } else {
      addDoc(collection(db, "changes"), {
        ...document,
        targetDocument:`airfields/${airfield.codeIcao}`,
        updated_at: Timestamp.fromDate(new Date()),
        updated_by: 'anonymous'
      })
      setSubmitted(true)
    }
  }


  return (submitted) ? <AnonymousSubmission /> : (
  <form onSubmit={form.onSubmit(submitFn)}>
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
    <TextEditor editor={editor} profile={profile} airfields={airfields} activities={activities} />
  </Fieldset>
  <Group mt="md">
    <Button type="submit">Enregistrer</Button>
  </Group>
</form>)
}

export default AirfieldForm