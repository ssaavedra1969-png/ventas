import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve('.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '')
  process.env[key] = val
}

const { initializeApp } = await import('firebase/app')
const { getFirestore, collection, getDocs, query, orderBy } = await import('firebase/firestore')

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

const db = getFirestore(app)

const snap = await getDocs(query(collection(db, 'clientes'), orderBy('codigoCliente', 'asc')))
console.log(`Total: ${snap.docs.length} clientes`)
snap.docs.slice(0, 5).forEach(d => {
  const data = d.data()
  console.log(`  ${data.codigoCliente} - ${data.razonSocial}`)
})
console.log('...')
snap.docs.slice(-3).forEach(d => {
  const data = d.data()
  console.log(`  ${data.codigoCliente} - ${data.razonSocial}`)
})

process.exit(0)
