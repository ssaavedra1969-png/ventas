import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')
const { getFirestore, Timestamp, DocumentReference } = require('firebase-admin/firestore')

const PROJECT_ID = 'leafy-valor-410916'

const SERVICE_ACCOUNT_PATH = resolve('backups/service-account.json')
const DEFAULT_OUTPUT = resolve('backups')

function serialize(data) {
  if (data === null || data === undefined) return data
  if (data instanceof Timestamp) return { _timestamp: data.toDate().toISOString() }
  if (data instanceof DocumentReference) return { _ref: data.path }
  if (Array.isArray(data)) return data.map(serialize)
  if (typeof data === 'object') {
    const obj = {}
    for (const [k, v] of Object.entries(data)) {
      obj[k] = serialize(v)
    }
    return obj
  }
  return data
}

function initApp() {
  if (admin.apps && admin.apps.length > 0) return admin.apps[0]
  if (existsSync(SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH)
    const cred = admin.cert ? admin.cert(serviceAccount) : admin.credential.cert(serviceAccount)
    return admin.initializeApp({ credential: cred })
  }
  return admin.initializeApp({ projectId: PROJECT_ID })
}

async function exportCollection(db, name, outDir) {
  console.log(`  Exportando ${name}...`)
  const snapshot = await db.collection(name).get()
  if (snapshot.empty) {
    const empty = []
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(empty, null, 2), 'utf-8')
    console.log(`    → 0 documentos`)
    return
  }
  const docs = snapshot.docs.map(d => ({
    _id: d.id,
    _createdAt: d.createTime?.toDate?.()?.toISOString?.() ?? null,
    _updatedAt: d.updateTime?.toDate?.()?.toISOString?.() ?? null,
    ...serialize(d.data()),
  }))
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(docs, null, 2), 'utf-8')
  console.log(`    → ${docs.length} documentos`)
}

async function main() {
  const outDir = process.argv[2] || DEFAULT_OUTPUT
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

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
    console.error(`  5. Ejecutá de nuevo el backup`)
    process.exit(1)
  }

  const db = getFirestore(app)

  console.log(`\nExportando colecciones a: ${outDir}`)
  console.log('')

  const collections = ['clientes', 'productos', 'vendedores', 'remitos', 'contadores', 'presupuestos', 'remitos_aprobados', 'facturas', 'salidas']
  for (const name of collections) {
    await exportCollection(db, name, outDir)
  }

  console.log('\n✓ Exportación completada exitosamente')
  process.exit(0)
}

main()
