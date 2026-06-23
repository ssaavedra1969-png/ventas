import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')

const PROJECT_ID = 'leafy-valor-410916'
const SERVICE_ACCOUNT_PATH = resolve('backups/service-account.json')
const DEFAULT_INPUT = resolve('backups')

function deserialize(data) {
  if (data === null || data === undefined) return data
  if (Array.isArray(data)) return data.map(deserialize)
  if (typeof data === 'object' && !(data instanceof Date)) {
    if (data._timestamp) return admin.firestore.Timestamp.fromDate(new Date(data._timestamp))
    if (data._ref) return null
    const obj = {}
    for (const [k, v] of Object.entries(data)) {
      if (k === '_id' || k === '_createdAt' || k === '_updatedAt') continue
      obj[k] = deserialize(v)
    }
    return obj
  }
  return data
}

function initApp() {
  if (admin.apps.length > 0) return admin.apps[0]
  if (existsSync(SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH)
    return admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  }
  return admin.initializeApp({ projectId: PROJECT_ID })
}

async function restoreCollection(db, name, inputDir) {
  const filePath = resolve(inputDir, `${name}.json`)
  if (!existsSync(filePath)) {
    console.log(`  ${name}: archivo no encontrado, saltando`)
    return { total: 0, ok: 0, errors: [] }
  }

  console.log(`  Restaurando ${name}...`)
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
  if (!Array.isArray(raw) || raw.length === 0) {
    console.log(`    → 0 documentos (vacio)`)
    return { total: 0, ok: 0, errors: [] }
  }

  const results = { total: raw.length, ok: 0, errors: [] }
  const batchSize = 500

  for (let i = 0; i < raw.length; i += batchSize) {
    const batch = db.batch()
    const chunk = raw.slice(i, i + batchSize)

    for (const doc of chunk) {
      if (!doc._id) {
        results.errors.push(`Documento sin _id en indice ${i}`)
        continue
      }
      const data = deserialize(doc)
      const ref = db.collection(name).doc(doc._id)
      batch.set(ref, data, { merge: false })
    }

    try {
      await batch.commit()
      results.ok += chunk.length
    } catch (err) {
      results.errors.push(`Error en lote ${i / batchSize}: ${err.message}`)
    }
  }

  console.log(`    → ${results.ok}/${results.total} documentos restaurados`)
  if (results.errors.length > 0) {
    console.log(`    → ${results.errors.length} errores`)
    results.errors.slice(0, 3).forEach(e => console.log(`      ✗ ${e}`))
  }

  return results
}

async function main() {
  const inputDir = process.argv[2] || DEFAULT_INPUT

  if (!existsSync(inputDir)) {
    console.error(`El directorio ${inputDir} no existe.`)
    console.error('Primero ejecutá export-firestore.mjs para generar los datos.')
    process.exit(1)
  }

  console.log('Inicializando Firebase Admin...')
  let app
  try {
    app = initApp()
  } catch {
    console.error(`\nNo se pudieron cargar las credenciales de Firebase.`)
    console.error(``)
    console.error(`Para configurar la clave de service account:`)
    console.error(`  1. Andá a Firebase Console → Project Settings → Service Accounts`)
    console.error(`  2. Hacé clic en "Generate New Private Key"`)
    console.error(`  3. Descargá el archivo JSON`)
    console.error(`  4. Guardalo en: ${SERVICE_ACCOUNT_PATH}`)
    console.error(`  5. Ejecutá de nuevo el comando`)
    process.exit(1)
  }

  const db = app.firestore()

  console.log(`\nRestaurando colecciones desde: ${inputDir}`)
  console.log('')

  const collections = ['clientes', 'productos', 'vendedores', 'remitos', 'contadores']
  const totals = { total: 0, ok: 0, errors: 0 }

  for (const name of collections) {
    const result = await restoreCollection(db, name, inputDir)
    totals.total += result.total
    totals.ok += result.ok
    totals.errors += result.errors.length
  }

  console.log(`\n✓ Restauración completada:`)
  console.log(`  ${totals.ok}/${totals.total} documentos restaurados`)
  if (totals.errors > 0) console.log(`  ${totals.errors} errores`)
  process.exit(0)
}

main()
