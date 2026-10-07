/**
 * Admin SDK setup shared by the scripts that target staging or production (`recompute`, `import:fees`):
 * NODE_ENV=production → production, else staging; FIRESTORE_EMULATOR_HOST → the emulator.
 */
import { firebaseConfig } from '../src/data/firebase.ts'
import admin from 'firebase-admin'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const env = process.env.NODE_ENV === 'production' ? 'production' : 'staging'
const emulator = process.env.FIRESTORE_EMULATOR_HOST
export const projectId = emulator ? process.env.GCLOUD_PROJECT ?? 'demo-aerotrips' : firebaseConfig[env].projectId

// Service-account keys (gitignored): serviceAccountKey.json (production), serviceAccountKey.staging.json (staging);
// the one matching the project is used. Without it: application-default credentials (`gcloud auth
// application-default login`, or GOOGLE_APPLICATION_CREDENTIALS). The emulator needs none.
const credential = (() => {
  if (emulator) return undefined
  for (const file of ['../serviceAccountKey.json', '../serviceAccountKey.staging.json']) {
    try {
      const creds = require(file)
      if (creds.project_id === projectId) return admin.credential.cert(creds)
    } catch { /* no key on disk */ }
  }
  return admin.credential.applicationDefault()
})()

admin.initializeApp({ projectId, ...(credential && { credential }) })
export const db = admin.firestore()
