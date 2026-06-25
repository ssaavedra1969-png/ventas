import { readFileSync, existsSync } from 'fs'
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
const { getFirestore, collection, getDocs, query, orderBy, limit, doc, getDoc } = await import('firebase/firestore')

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

const db = getFirestore(app)

// Check total count
const all = await getDocs(collection(db, 'clientes'))
console.log(`Total documentos en clientes: ${all.docs.length}`)

// Check first 5 ordered by codigoCliente
const snap = await getDocs(query(collection(db, 'clientes'), orderBy('codigoCliente'), limit(5)))
console.log('\nPrimeros 5 por codigoCliente:')
snap.docs.forEach(d => {
  const data = d.data()
  console.log(`  ${data.codigoCliente} - ${data.razonSocial} (${data.condicionIVA})`)
})

// Check specific document
const d1 = await getDoc(doc(db, 'clientes', '00001'))
if (d1.exists()) {
  console.log(`\nDocumento 00001:`, JSON.stringify(d1.data(), null, 2))
}

process.exit(0)
