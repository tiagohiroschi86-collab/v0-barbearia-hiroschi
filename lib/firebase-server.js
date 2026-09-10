// Server-side Firestore client — usa a MESMA config pública do client (é pública por natureza no Firebase)
// NÃO substitui o Firebase; apenas permite o backend Next.js ler/escrever no MESMO Firestore
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBg_BaH-0ECyJo8h0oOmTlZgt1FU3uCevQ',
  authDomain: 'barbearia-do-hiroschi.firebaseapp.com',
  projectId: 'barbearia-do-hiroschi',
  storageBucket: 'barbearia-do-hiroschi.firebasestorage.app',
  messagingSenderId: '1017406700174',
  appId: '1:1017406700174:web:73a4302411f0efdff4e79f',
  measurementId: 'G-EE8CTZG69W',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const db = getFirestore(app)

export { db }
export default db
