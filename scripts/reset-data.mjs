import { existsSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')
const { getFirestore } = require('firebase-admin/firestore')

const PROJECT_ID = 'leafy-valor-410916'
const SERVICE_ACCOUNT_PATH = resolve('backups/service-account.json')

function initApp() {
  if (admin.apps && admin.apps.length > 0) return admin.apps[0]
  if (existsSync(SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH)
    const cred = admin.cert ? admin.cert(serviceAccount) : admin.credential.cert(serviceAccount)
    return admin.initializeApp({ credential: cred })
  }
  return admin.initializeApp({ projectId: PROJECT_ID })
}

async function deleteAllDocs(db, colName) {
  console.log(`  Eliminando ${colName}...`)
  const snapshot = await db.collection(colName).get()
  if (snapshot.empty) {
    console.log(`    → 0 documentos, limpio`)
    return
  }
  const batchSize = 500
  let total = 0
  const docs = snapshot.docs.map(d => d.ref)
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch()
    const chunk = docs.slice(i, i + batchSize)
    chunk.forEach(ref => batch.delete(ref))
    await batch.commit()
    total += chunk.length
    console.log(`    → ${total}/${docs.length} eliminados`)
  }
  console.log(`    → ${total} documentos eliminados`)
}

async function resetContadores(db) {
  const year = new Date().getFullYear()
  const counters = [
    `presupuesto_${year}`,
    `factura_${year}`,
    `remito_${year}`,
    `remito_aprobado_${year}`,
  ]
  console.log(`  Resetando contadores...`)
  for (const id of counters) {
    const ref = db.collection('contadores').doc(id)
    await ref.set({ ultimo: 0 })
    console.log(`    → ${id}: ultimo = 0`)
  }
  // Delete all per-remito salidas counters (referenced remitos gone)
  console.log(`  Eliminando contadores de salidas...`)
  const salidasCounters = await db.collection('contadores').get()
  let deleted = 0
  for (const doc of salidasCounters.docs) {
    if (doc.id.startsWith('salidas_')) {
      await doc.ref.delete()
      deleted++
    }
  }
  console.log(`    → ${deleted} contadores salidas eliminados`)
}

async function main() {
  console.log('Inicializando Firebase Admin...')
  let app
  try {
    app = initApp()
  } catch {
    console.error('\nNo se pudieron cargar las credenciales de Firebase.')
    console.error(`Asegurate de que exista: ${SERVICE_ACCOUNT_PATH}`)
    process.exit(1)
  }

  const db = getFirestore(app)

  console.log('\n⚠️  ESTA ACCIÓN ELIMINA DATOS DE FORMA PERMANENTE ⚠️')
  console.log('\nColecciones a VACIAR:')
  console.log('  • presupuestos')
  console.log('  • remitos')
  console.log('  • remitos_aprobados')
  console.log('  • facturas')
  console.log('  • salidas')
  console.log('\nContadores a RESETEAR a 0:')
  console.log('  • presupuesto_2026')
  console.log('  • factura_2026')
  console.log('  • remito_2026')
  console.log('  • remito_aprobado_2026')
  console.log('\nContadores de salidas a ELIMINAR:')
  console.log('  • salidas_* (todos)')
  console.log('\nSE CONSERVAN:')
  console.log('  • clientes')
  console.log('  • productos')
  console.log('  • vendedores')
  console.log('  • vehiculos')
  console.log('  • choferes')
  console.log('  • contadores/cliente')
  console.log('')

  if (process.argv[2] !== '--force') {
    console.error('Para confirmar, ejecutá:')
    console.error('  node scripts/reset-data.mjs --force')
    process.exit(1)
  }

  console.log('Iniciando reset...\n')

  await deleteAllDocs(db, 'presupuestos')
  await deleteAllDocs(db, 'remitos')
  await deleteAllDocs(db, 'remitos_aprobados')
  await deleteAllDocs(db, 'facturas')
  await deleteAllDocs(db, 'salidas')
  await resetContadores(db)

  console.log('\n✓ Reset completado.')
  console.log('  La app ya puede usarse desde cero.')
  console.log('  Ejecutá npm run backup para confirmar el estado.')
  process.exit(0)
}

main()
