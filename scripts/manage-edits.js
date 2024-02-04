import select from '@inquirer/select';
import chalk from 'chalk';
import admin from "firebase-admin";
import { generateHTML } from '@tiptap/html'
import StarterKit from "@tiptap/starter-kit"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import creds from "../serviceAccountKey.json" with { "type": "json" }
const firebaseConfig = {
  apiKey: "AIzaSyAleHj_gty6XncQLEDlLn3Ih7X08KuQ-jw",
  authDomain: "aero-trips.firebaseapp.com",
  projectId: "aero-trips",
  storageBucket: "aero-trips.appspot.com",
  messagingSenderId: "484361364174",
  appId: "1:484361364174:web:4c4eaf632f931956aca69f",
  measurementId: "G-CKJYT103VV",
  credential: admin.credential.cert(creds),
};

admin.initializeApp(firebaseConfig);
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const storage = admin.storage().bucket()

const options = {
  message: 'Choisir une action pour ce changement',
  choices: [
    {
      name: 'Appliquer',
      value: 'apply',
      description: 'Appliquer le changement (supprime la demande ensuite)',
    },
    {
      name: 'Ignorer pour le moment',
      value: 'skip',
      description: `N'applique pas le changement, mais conserve les données`,
    },
    {
      name: 'Supprimer',
      value: 'delete',
      description: `Supprime le changement sans l'appliquer`,
    },
  ],
};

const changes = await db.collection('changes').get()
const results = []
changes.forEach(d => {
  const {targetDocument, ...newDoc} = d.data()
  results.push({targetDocument, newDoc, id:d.id})
})

console.log(chalk.bgMagenta(chalk.bold(results.length) + " changements à valider"))

for(const {targetDocument, newDoc, id} of results) {
  let answer
  if(process.argv.includes('--apply-all')) {
    answer = 'apply'
  } else {
    const currentDoc = (await db.doc(targetDocument).get()).data()
    console.log(chalk.bgBlue(targetDocument) + ' => ' + (currentDoc ? chalk.bgBlue('edit') : chalk.bgGreen('new') ))
    for(let field in newDoc) {
      let newField = newDoc[field]
      let currentField = currentDoc ? currentDoc[field] : undefined
      if(field == "position") {
        newField = newDoc[field].latitude +','+newDoc[field].longitude
        if(currentField) {currentField = currentDoc[field].latitude +','+currentDoc[field].longitude}
      } else if(field == 'description') {
        newField = generateHTML(newField,[StarterKit,Link, Image])
          .replace(/<img src="data:image\/(jpg|png|jpeg);base64.*?">/gi,'<BASE 64 IMAGE>')
        if(currentField) {currentField = generateHTML(currentField,[StarterKit,Link, Image])}
      } else if(field == 'steps') {
        newField = newField.map(e => e.id).join(', ')
        if(currentField) {currentField = currentField.map(e => e.id).join(', ')}
      }
      
      if(currentDoc && newField == currentField) continue
      console.log(chalk.italic.blue(field))
      console.log(chalk.green(newField))
      if(currentDoc) console.log(chalk.red(currentField))
    }
  answer = await select(options);
  }

  if(answer == 'apply') {
    if(newDoc.description) {
      newDoc.description.content.forEach(async e => {
        if(e.type == 'image') {
          const type = e.attrs.src.match(/data:image\/(png|jpeg)/)
          const data = e.attrs.src.replace(/^data:image\/jpeg;base64,/, "")
          var bitmap = Buffer.from(data,'base64');
          const path = 'images/'+Math.random().toString(36).substring(2)+'.'+type[1]
          e.attrs.src = admin.storage().bucket().file(path).publicUrl()
          await admin.storage().bucket().file(path).save(bitmap, {contentType:'image/'+type[1]})
          await admin.storage().bucket().file(path).makePublic()
        }
      })
    }
    await db.doc(targetDocument).set(newDoc, {merge: true})
  }
  if(['delete', 'apply'].includes(answer)) {
    await db.doc(`changes/${id}`).delete()
  }
}
