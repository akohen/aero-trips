import select from '@inquirer/select';
import chalk from 'chalk';
import admin from "firebase-admin";
import { getDownloadURL } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';
import { generateHTML } from '@tiptap/html'
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import { firebaseConfig } from '../src/data/firebase.ts'
import { diffChange, mayCreate, parseChange, uploadDataImages } from '../src/utils/changes.ts'
import creds from "../serviceAccountKey.json" with { "type": "json" }

admin.initializeApp({
    ...firebaseConfig[process.env.NODE_ENV === 'production' ? 'production' : 'staging'],
    credential: admin.credential.cert(creds)
});
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

const APPLY = {
  name: 'Appliquer',
  value: 'apply',
  description: 'Appliquer le changement (supprime la demande ensuite)',
}
const SKIP = {
  name: 'Ignorer pour le moment',
  value: 'skip',
  description: `N'applique pas le changement, mais conserve les données`,
}
const DELETE = {
  name: 'Supprimer',
  value: 'delete',
  description: `Supprime le changement sans l'appliquer`,
}
const ask = (choices) => select({ message: 'Choisir une action pour ce changement', choices })

// Same storage as the `applyChange` callable (functions/admin/): a member-like upload the resizer handles
const uploadImage = async ({ contentType, extension, bytes }) => {
  const file = admin.storage().bucket().file(`img/guest/${randomUUID()}.${extension}`)
  await file.save(Buffer.from(bytes), {
    contentType,
    resumable: false,
    metadata: { metadata: { firebaseStorageDownloadTokens: randomUUID() } },
  })
  return getDownloadURL(file)
}

const display = (field, value) => {
  if (value === undefined) return value
  if (field == 'position') return value.latitude + ',' + value.longitude
  if (field == 'description') {
    return generateHTML(value, [StarterKit, Link, Image])
      .replace(/<img src="data:image\/[a-z]+;base64.*?">/gi, '<BASE 64 IMAGE>')
  }
  if (field == 'steps') return value.map(e => e.id).join(', ')
  return typeof value === 'object' ? JSON.stringify(value) : value
}

const changes = await db.collection('changes').orderBy("updated_at").get()

console.log(chalk.bgMagenta(chalk.bold(changes.size) + " changements à valider"))

for(const change of changes.docs) {
  const parsed = parseChange(change.data())
  const applyAll = process.argv.includes('--apply-all')

  if(parsed.kind == 'contact') {
    if(applyAll) continue
    console.log(chalk.bgYellow(`Message de ${parsed.email}`))
    console.log(parsed.message)
    if(await ask([SKIP, DELETE]) == 'delete') await change.ref.delete()
    continue
  }
  if(parsed.kind == 'invalid') {
    console.log(chalk.bgRed(`Changement ${change.id} invalide : ${parsed.reason}`))
    if(applyAll) continue
    console.log(JSON.stringify(parsed.fields))
    if(await ask([SKIP, DELETE]) == 'delete') await change.ref.delete()
    continue
  }

  const targetRef = db.doc(parsed.targetDocument)
  const currentDoc = (await targetRef.get()).data()
  if(!currentDoc && !mayCreate(parsed.collection)) {
    console.log(chalk.bgRed(`${parsed.targetDocument} n'existe pas : un invité ne crée pas de terrain`))
    if(!applyAll && await ask([SKIP, DELETE]) == 'delete') await change.ref.delete()
    continue
  }

  let answer = 'apply'
  if(!applyAll) {
    console.log(chalk.bgBlue(parsed.targetDocument) + ' => ' + (currentDoc ? chalk.bgBlue('edit') : chalk.bgGreen('new') ))
    for(const {field, current, proposed} of diffChange(parsed.fields, currentDoc)) {
      console.log(chalk.italic.blue(field))
      console.log(chalk.green(display(field, proposed)))
      if(currentDoc) console.log(chalk.red(display(field, current)))
    }
    answer = await ask([APPLY, SKIP, DELETE]);
  }

  if(answer == 'apply') {
    const fields = 'description' in parsed.fields
      ? { ...parsed.fields, description: await uploadDataImages(parsed.fields.description, uploadImage) }
      : parsed.fields
    // Stamp the apply time, not the submission time: a change applied after an export would
    // otherwise predate the snapshot and be missed by DataProvider's "updated since" query.
    await db.runTransaction(async (tx) => {
      tx.set(targetRef, { ...fields, updated_at: admin.firestore.Timestamp.now() }, {merge: true})
      tx.delete(change.ref)
    })
  } else if(answer == 'delete') {
    await change.ref.delete()
  }
}
