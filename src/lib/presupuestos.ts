import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, Timestamp, runTransaction,
} from 'firebase/firestore'
import { db } from './firebase'
import { localGet, localSet, localDelete } from './db'
import { getTipoFactura } from './firestore'
import type {
  Presupuesto, RemitoItem, ClienteData, VendedorInfo,
} from '@/types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocData = Record<string, any>

const COL = 'presupuestos'

function getDb() {
  if (!db) throw new Error('Firebase no está configurado.')
  return db
}

async function getNextNumero(year: number): Promise<number> {
  try {
    const _db = getDb()
    const ref = doc(_db, 'contadores', `presupuesto_${year}`)
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
    await localSet('contadores', { id: `presupuesto_${year}`, ultimo: next })
    return next
  } catch {
    const local = await localGet<{ id: string; ultimo: number }>('contadores', `presupuesto_${year}`)
    const next = (local?.ultimo ?? 0) + 1
    await localSet('contadores', { id: `presupuesto_${year}`, ultimo: next })
    return next
  }
}

export async function createPresupuesto(data: {
  idCliente: string
  clienteData: ClienteData
  vendedor?: VendedorInfo
  items: RemitoItem[]
  fecha?: string
  observaciones?: string
}) {
  const now = data.fecha ? new Date(data.fecha) : new Date()
  const year = now.getFullYear()
  const numeroPresupuesto = await getNextNumero(year)

  const condicion = data.clienteData.condicionIVA || 'CF'
  const isFA = getTipoFactura(condicion) === 'A'
  const subtotalGeneral = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const iva = isFA ? subtotalGeneral * 0.21 : 0
  const totalGeneral = isFA ? subtotalGeneral + iva : subtotalGeneral

  const fullData = {
    numeroPresupuesto,
    fecha: Timestamp.fromDate(now),
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    vendedor: data.vendedor || null,
    items: data.items,
    subtotalGeneral, iva, totalGeneral,
    estado: 'Enviado' as const,
    observaciones: data.observaciones || '',
    createdAt: Timestamp.now(),
  }

  try {
    const docRef = await addDoc(collection(getDb(), COL), fullData)
    await localSet('presupuestos', { id: docRef.id, ...fullData, fecha: now, createdAt: now })
    return { id: docRef.id, numeroPresupuesto }
  } catch {
    throw new Error('Error al crear presupuesto en Firebase')
  }
}

function docToPresupuesto(id: string, data: DocData): Presupuesto {
  return {
    id,
    numeroPresupuesto: data.numeroPresupuesto,
    fecha: data.fecha?.toDate?.() ?? data.fecha,
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    vendedor: data.vendedor || undefined,
    items: data.items ?? [],
    subtotalGeneral: data.subtotalGeneral,
    iva: data.iva,
    totalGeneral: data.totalGeneral,
    estado: data.estado,
    observaciones: data.observaciones,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  }
}

export async function getAllPresupuestos() {
  try {
    const q = query(collection(getDb(), COL), orderBy('numeroPresupuesto', 'desc'))
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => docToPresupuesto(d.id, d.data()))
    await localSet('presupuestos_cache', { id: 'all', data: list })
    return list
  } catch {
    const cached = await localGet<{ data: Presupuesto[] }>('presupuestos_cache', 'all')
    return cached?.data ?? []
  }
}

export async function getPresupuesto(id: string): Promise<Presupuesto | null> {
  try {
    const snap = await getDoc(doc(getDb(), COL, id))
    if (!snap.exists()) return null
    return docToPresupuesto(snap.id, snap.data())
  } catch {
    const local = await localGet<Presupuesto>('presupuestos', id)
    return local ?? null
  }
}

export async function updatePresupuestoEstado(id: string, estado: Presupuesto['estado']) {
  try {
    await updateDoc(doc(getDb(), COL, id), { estado })
    await localSet('presupuestos', { id, estado })
  } catch {
    throw new Error('Error al actualizar estado del presupuesto')
  }
}

export async function deletePresupuesto(id: string) {
  try {
    await deleteDoc(doc(getDb(), COL, id))
    await localDelete('presupuestos', id)
  } catch {
    throw new Error('Error al eliminar presupuesto')
  }
}
