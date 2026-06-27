import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const admin = require('firebase-admin')
const { Timestamp, getFirestore } = require('firebase-admin/firestore')

const SERVICE_ACCOUNT_PATH = resolve('backups/service-account.json')

function initApp() {
  if (admin.apps && admin.apps.length > 0) return admin.apps[0]
  if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('No se encuentra service-account.json en backups/')
    process.exit(1)
  }
  const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'))
  const cred = admin.cert ? admin.cert(serviceAccount) : admin.credential.cert(serviceAccount)
  return admin.initializeApp({ credential: cred })
}

const db = getFirestore(initApp())

function toDate(v) {
  if (!v) return null
  if (typeof v === 'object' && v._timestamp) return new Date(v._timestamp)
  if (v instanceof Timestamp) return v.toDate()
  if (v instanceof Date) return v
  return new Date(v)
}

function deserialize(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deserialize)
  if (obj._timestamp) return Timestamp.fromDate(new Date(obj._timestamp))
  const r = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === '_id' || k === '_createdAt' || k === '_updatedAt') continue
    r[k] = deserialize(v)
  }
  return r
}

function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const r = {}
  for (const [k, v] of Object.entries(obj)) {
    const key = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    r[key] = snakeToCamel(v)
  }
  return r
}

async function migrate() {
  console.log('Leyendo remitos legacy...')
  const snap = await db.collection('remitos').orderBy('numeroRemito', 'asc').get()
  const total = snap.docs.length
  console.log(`Total remitos legacy: ${total}`)

  let presupuestos = 0
  let remitosAprobados = 0
  let facturas = 0
  let salidas = 0
  let errores = 0

  for (const doc of snap.docs) {
    try {
      const data = doc.data()
      const id = doc.id
      const estado = data.estado || 'Enviado'
      const fecha = toDate(data.fecha) || new Date()
      const createdAt = data.createdAt ? Timestamp.fromDate(toDate(data.createdAt)) : Timestamp.now()
      const fechaTs = Timestamp.fromDate(fecha)

      const base = {
        fecha: fechaTs,
        idCliente: data.idCliente || '',
        clienteData: data.clienteData || {},
        vendedor: data.vendedor || null,
        items: (data.items || []).map((i) => ({
          idProducto: i.idProducto || '',
          nombreProducto: i.nombreProducto || '',
          cantidad: i.cantidad || 0,
          precioUnitario: i.precioUnitario || 0,
          bonificacion: i.bonificacion || 0,
          subtotal: i.subtotal || 0,
        })),
        subtotalGeneral: data.subtotalGeneral || 0,
        iva: data.iva || 0,
        totalGeneral: data.totalGeneral || 0,
        observaciones: data.observaciones || '',
        createdAt,
      }

      if (estado === 'Enviado' || estado === 'Anulado') {
        // → Presupuesto
        const ref = await db.collection('presupuestos').add({
          ...base,
          numeroPresupuesto: data.numeroRemito,
          estado,
        })
        console.log(`  P-${String(data.numeroRemito).padStart(6, '0')} → presupuestos/${ref.id}`)
        presupuestos++
      } else if (['Aceptado', 'En_Revision', 'A_Entregar'].includes(estado)) {
        // → Remito aprobado
        let newEstado = estado
        if (newEstado === 'Aceptado') newEstado = 'En_Revision'
        const remitoRef = await db.collection('remitos_aprobados').add({
          ...base,
          numeroRemito: data.numeroRemito,
          numeroPresupuestoOriginal: data.numeroRemito,
          estado: newEstado,
          ultimoNumeroSalida: 0,
        })
        console.log(`  R-${String(data.numeroRemito).padStart(6, '0')} → remitos_aprobados/${remitoRef.id}`)
        remitosAprobados++

        // Migrar factura si existe
        if (data.facturado || data.nroFactura) {
          const facturaNumero = data.nroFactura || `F-${String(data.numeroRemito).padStart(6, '0')}`
          const facturaRef = await db.collection('facturas').add({
            ...base,
            numeroFactura: facturaNumero,
            numeroFacturaInterno: data.numeroRemito,
            idRemito: remitoRef.id,
            numeroRemito: data.numeroRemito,
            pagos: (data.pagos || []).map((p) => ({
              id: p.id,
              monto: p.monto,
              metodo: p.metodo,
              referencia: p.referencia || '',
              fecha: p.fecha ? Timestamp.fromDate(toDate(p.fecha)) : Timestamp.now(),
              createdAt: p.createdAt ? Timestamp.fromDate(toDate(p.createdAt)) : Timestamp.now(),
            })),
            totalPagado: data.totalPagado || 0,
            facturaAnulada: data.facturaAnulada || false,
            nroNC: data.nroNC || '',
            montoNC: data.montoNC || 0,
          })
          console.log(`  → facturas/${facturaRef.id} (${facturaNumero})`)
          facturas++
        }

        // Migrar entregas → salidas
        const entregas = data.entregas || []
        for (let i = 0; i < entregas.length; i++) {
          const e = entregas[i]
          const salidaRef = await db.collection('salidas').add({
            numeroSalida: i + 1,
            idRemito: remitoRef.id,
            numeroRemito: data.numeroRemito,
            fecha: e.fecha ? Timestamp.fromDate(toDate(e.fecha)) : fechaTs,
            items: (e.items || []).map((item) => ({
              idProducto: item.idProducto || '',
              nombreProducto: item.nombreProducto || '',
              cantidad: item.cantidad || 0,
            })),
            vehiculoPatente: e.vehiculoPatente || null,
            vehiculoMarca: e.vehiculoMarca || null,
            choferNombre: e.choferNombre || null,
            createdAt,
          })
          console.log(`  → salidas/${salidaRef.id} (S-${String(i + 1).padStart(3, '0')})`)
          salidas++
        }

        // Actualizar ultimoNumeroSalida
        if (entregas.length > 0) {
          await remitoRef.update({ ultimoNumeroSalida: entregas.length })
        }
      } else {
        console.warn(`  Estado desconocido "${estado}" en remito ${id}, ignorando`)
      }
    } catch (err) {
      console.error(`  ERROR migrando ${doc.id}:`, err.message)
      errores++
    }
  }

  // Actualizar contadores
  const maxPres = snap.docs
    .filter((d) => ['Enviado', 'Anulado'].includes(d.data().estado))
    .reduce((max, d) => Math.max(max, d.data().numeroRemito || 0), 0)
  const maxRem = snap.docs
    .filter((d) => ['Aceptado', 'En_Revision', 'A_Entregar'].includes(d.data().estado))
    .reduce((max, d) => Math.max(max, d.data().numeroRemito || 0), 0)

  await db.collection('contadores').doc(`presupuesto_${new Date().getFullYear()}`).set({ ultimo: maxPres }, { merge: true })
  await db.collection('contadores').doc(`remito_aprobado_${new Date().getFullYear()}`).set({ ultimo: maxRem }, { merge: true })
  await db.collection('contadores').doc(`factura_${new Date().getFullYear()}`).set({ ultimo: maxRem }, { merge: true })

  console.log('\n=== RESUMEN ===')
  console.log(`Presupuestos migrados: ${presupuestos}`)
  console.log(`Remitos aprobados migrados: ${remitosAprobados}`)
  console.log(`Facturas migradas: ${facturas}`)
  console.log(`Salidas migradas: ${salidas}`)
  console.log(`Errores: ${errores}`)
  console.log('Migración completada.')
}

migrate().catch(console.error)
