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

// Test 1: query without orderBy
const snap1 = await getDocs(query(collection(db, 'clientes')))
console.log(`Sin orderBy: ${snap1.docs.length} docs`)

// Test 2: query with orderBy('createdAt', 'desc')
try {
  const snap2 = await getDocs(query(collection(db, 'clientes'), orderBy('createdAt', 'desc')))
  console.log(`Con orderBy(createdAt,desc): ${snap2.docs.length} docs`)
  if (snap2.docs.length > 0) {
    console.log('  Primer doc:', snap2.docs[0].id, 'has createdAt:', 'createdAt' in snap2.docs[0].data())
  }
} catch (e) {
  console.log('Error con orderBy(createdAt,desc):', e.message)
}

// Test 3: Check one document's data
const snap3 = await getDocs(query(collection(db, 'clientes'), orderBy('codigoCliente'), limit(3)))
snap3.docs.forEach(d => console.log(`  ${d.id}:`, Object.keys(d.data()).join(', ')))

process.exit(0)
