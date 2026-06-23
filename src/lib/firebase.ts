import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | undefined
let db: Firestore | undefined
let auth: Auth | undefined

function initFirebase() {
  if (typeof window === 'undefined') return
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your-api-key') return
  if (getApps().length === 0) {
    try {
      app = initializeApp(firebaseConfig)
      db = getFirestore(app)
      auth = getAuth(app)
    } catch {
      console.warn('Firebase initialization failed')
    }
  } else {
    app = getApps()[0]
    db = getFirestore(app)
    auth = getAuth(app!)
  }
}

initFirebase()

export { db, auth }
export default app
