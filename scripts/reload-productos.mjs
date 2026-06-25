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
const { getFirestore, collection, doc, getDocs, writeBatch, query, orderBy } = await import('firebase/firestore')

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

const db = getFirestore(app)

const XLSX = (await import('xlsx')).default
const xlsPath = resolve('Productos/Productos.xlsx')
const wb = XLSX.readFile(xlsPath)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
console.log(`Leídos ${rows.length} productos del Excel`)

async function main() {
  // 1. Delete existing
  console.log('\nEliminando productos existentes...')
  const snapshot = await getDocs(query(collection(db, 'productos')))
  console.log(`  ${snapshot.docs.length} documentos encontrados`)
  if (snapshot.docs.length > 0) {
    const batchSize = 500
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = snapshot.docs.slice(i, i + batchSize)
      for (const d of chunk) {
        batch.delete(doc(db, 'productos', d.id))
      }
      await batch.commit()
    }
    console.log(`  Eliminados ${snapshot.docs.length} documentos`)
  }

  // 2. Import
  console.log('\nImportando productos desde Excel...')
  let imported = 0
  const batchSize = 500
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = writeBatch(db)
    const chunk = rows.slice(i, i + batchSize)
    for (const row of chunk) {
      const raw = row['Cod. Prod.'] ?? ''
      const codigo = String(raw).padStart(5, '0')
      const docRef = doc(db, 'productos', codigo)
      const valorUnitario = Number(row.valorUnitario ?? 0) || 0
      batch.set(docRef, {
        codigoProducto: codigo,
        nombre: String(row.Nombre ?? ''),
        tipo: String(row.tipo ?? ''),
        medida: String(row.Medida ?? ''),
        valorUnitario,
        precioSinIVA: Math.round((valorUnitario / 1.21) * 100) / 100,
        stock: Number(row.stock ?? row.Stock ?? 0) || 0,
      })
      imported++
    }
    await batch.commit()
    console.log(`  Importados ${imported}/${rows.length}`)
  }

  console.log(`\n✓ Completado: ${imported} productos importados`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
