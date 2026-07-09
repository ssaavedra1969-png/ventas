import {
  collection, doc, getDoc, getDocs, addDoc,
  query, orderBy, limit, Timestamp, runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGet, localSet } from '@/lib/db'
import type { Factura, RemitoItem, ClienteData } from '@/types'
/* eslint-disable @typescript-eslint/no-explicit-any */
type DocData = Record<string, any>

const COL = 'facturas'

function getDb() {
  if (!db) throw new Error('Firebase no está configurado.')
  return db
}

async function getNextNumero(year: number): Promise<number> {
  try {
    const _db = getDb()
    const ref = doc(_db, 'contadores', `factura_${year}`)
    const next = await runTransaction(_db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) {
        tx.set(ref, { ultimo: 1 })
        return 1
      }
      const n = snap.data().ultimo + 1
      tx.update(ref, { ultimo: n })
      return n
    })
    await localSet('contadores', { id: `factura_${year}`, ultimo: next })
    return next
  } catch {
    const local = await localGet<{ id: string; ultimo: number }>('contadores', `factura_${year}`)
    const next = (local?.ultimo ?? 0) + 1
    await localSet('contadores', { id: `factura_${year}`, ultimo: next })
    return next
  }
}

export async function createFactura(data: {
  numeroFactura: string
  idRemito: string
  numeroRemito: number
  fecha: Date
  idCliente: string
  clienteData: ClienteData
  items: RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
}) {
  const year = data.fecha.getFullYear()
  const numeroFacturaInterno = await getNextNumero(year)

  const fullData = {
    numeroFactura: data.numeroFactura,
    numeroFacturaInterno,
    idRemito: data.idRemito,
    numeroRemito: data.numeroRemito,
    fecha: Timestamp.fromDate(data.fecha),
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    items: data.items,
    subtotalGeneral: data.subtotalGeneral,
    iva: data.iva,
    totalGeneral: data.totalGeneral,
    pagos: [],
    totalPagado: 0,
    createdAt: Timestamp.now(),
  }

  try {
    const docRef = await addDoc(collection(getDb(), COL), fullData)
    await localSet('facturas', { id: docRef.id, ...fullData, fecha: data.fecha, createdAt: new Date() })
    return { id: docRef.id, numeroFacturaInterno }
  } catch {
    throw new Error('Error al crear factura en Firebase')
  }
}

function docToFactura(id: string, data: DocData): Factura {
  return {
    id,
    numeroFactura: data.numeroFactura,
    numeroFacturaInterno: data.numeroFacturaInterno,
    idRemito: data.idRemito,
    numeroRemito: data.numeroRemito,
    fecha: data.fecha?.toDate?.() ?? data.fecha,
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    items: data.items ?? [],
    subtotalGeneral: data.subtotalGeneral,
    iva: data.iva,
    totalGeneral: data.totalGeneral,
    pagos: data.pagos ?? [],
    totalPagado: data.totalPagado ?? 0,
    facturaAnulada: data.facturaAnulada,
    nroNC: data.nroNC,
    montoNC: data.montoNC,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  }
}

export async function getAllFacturas() {
  try {
    const q = query(collection(getDb(), COL), orderBy('numeroFacturaInterno', 'desc'), limit(20))
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => docToFactura(d.id, d.data()))
    await localSet('facturas_cache', { id: 'all', data: list })
    return list
  } catch {
    const cached = await localGet<{ data: Factura[] }>('facturas_cache', 'all')
    return cached?.data ?? []
  }
}

export async function getFactura(id: string): Promise<Factura | null> {
  try {
    const snap = await getDoc(doc(getDb(), COL, id))
    if (!snap.exists()) return null
    return docToFactura(snap.id, snap.data())
  } catch {
    const local = await localGet<Factura>('facturas', id)
    return local ?? null
  }
}
