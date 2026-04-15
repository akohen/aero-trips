import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

export const firebaseConfig = {
  'production': {
    apiKey: "AIzaSyAleHj_gty6XncQLEDlLn3Ih7X08KuQ-jw",
    authDomain: "aerotrips.fr",
    projectId: "aero-trips",
    storageBucket: "aero-trips.appspot.com",
    messagingSenderId: "484361364174",
    appId: "1:484361364174:web:4c4eaf632f931956aca69f",
    measurementId: "G-CKJYT103VV"
  },
  'staging': {
    apiKey: "AIzaSyBdEJDEfGkpc2m6s-N0hW1jP-o1vNdOGHE",
    authDomain: "aero-trips-staging.firebaseapp.com",
    projectId: "aero-trips-staging",
    storageBucket: "aero-trips-staging.appspot.com",
    messagingSenderId: "39898345407",
    appId: "1:39898345407:web:7cdab41986edf28898bb0a"
  }
}

const isProd = () => (typeof import.meta !== 'undefined' && import.meta.env?.PROD)
  || (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'production'

const app = initializeApp(firebaseConfig[isProd() ? 'production' : 'staging']);
export const db = initializeFirestore(app, {
  //localCache: persistentLocalCache({tabManager: persistentMultipleTabManager(), cacheSizeBytes: CACHE_SIZE_UNLIMITED}),
  ignoreUndefinedProperties: true,
});

export const provider = new GoogleAuthProvider();

export const auth = getAuth();

export const googleLogout = () => signOut(auth)
  .catch((error) => {console.error(error)})

export const googleLogin = () => signInWithPopup(auth, provider)
  .catch((error) => {
    const errorCode = error.code
    const errorMessage = error.message
    const credential = GoogleAuthProvider.credentialFromError(error)
    console.error(errorCode, errorMessage, credential)
  })