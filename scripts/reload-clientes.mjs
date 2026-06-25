import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load env vars from .env.local
const envPath = resolve('.env.local')
if (!existsSync(envPath)) {
  console.error('.env.local not found')
  process.exit(1)
}
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

// Firebase web SDK
const firebase = require('firebase/app')
require('firebase/firestore')

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = firebase.initializeApp(firebaseConfig)
const { getFirestore, collection, doc, getDocs, deleteDoc, writeBatch, connectFirestoreEmulator } = require('firebase/firestore')
const db = getFirestore(app)

// Load Excel
const XLSX = require('xlsx')
const xlsPath = resolve('Clientes/Clientes.xlsx')
const wb = XLSX.readFile(xlsPath)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws)
console.log(`Leídos ${rows.length} clientes del Excel`)

function sanitize(val) {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function mapCondicionIVA(val) {
  const s = sanitize(val).toLowerCase()
  if (s.includes('responsable inscripto') || s === 'ri') return 'RI'
  if (s.includes('responsable no inscripto') || s === 'rni') return 'RI'
  if (s.includes('exento')) return 'Exento'
  if (s.includes('monotributo')) return 'Monotributo'
  if (s.includes('consumidor final') || s === 'cf') return 'CF'
  return 'CF'
}

async function main() {
  // 1. Delete all existing clientes
  console.log('\nEliminando todos los clientes existentes...')
  const snapshot = await getDocs(collection(db, 'clientes'))
  console.log(`  ${snapshot.docs.length} documentos encontrados`)
  if (snapshot.docs.length > 0) {
    const batchSize = 500
    const batches = []
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = snapshot.docs.slice(i, i + batchSize)
      for (const d of chunk) {
        batch.delete(doc(db, 'clientes', d.id))
      }
      batches.push(batch.commit())
    }
    await Promise.all(batches)
    console.log(`  Eliminados ${snapshot.docs.length} documentos`)
  }

  // 2. Import from Excel
  console.log('\nImportando clientes desde Excel...')
  let imported = 0
  const batchSize = 500
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = writeBatch(db)
    const chunk = rows.slice(i, i + batchSize)
    for (const row of chunk) {
      const raw = row['ID cliente'] ?? ''
      const id = String(raw).padStart(5, '0')
      const docRef = doc(db, 'clientes', id)
      const data = {
        codigoCliente: id,
        razonSocial: sanitize(row['Razon social'] ?? ''),
        tipoDocumento: sanitize(row['Tipo de documento'] ?? ''),
        numeroDocumento: sanitize(row['Numero de documento'] ?? ''),
        actividad: sanitize(row['Actividad'] ?? ''),
        telefono: '',
        domicilio: sanitize(row['Domicilio'] ?? ''),
        localidad: sanitize(row['Localidad'] ?? ''),
        condicionIVA: mapCondicionIVA(row['Condicion de IVA'] ?? ''),
      }
      batch.set(docRef, data)
      imported++
    }
    await batch.commit()
    console.log(`  Importados ${imported}/${rows.length}`)
  }

  console.log(`\n✓ Completado: ${imported} clientes importados`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
