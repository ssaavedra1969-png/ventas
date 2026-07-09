import {
  collection, doc, getDoc, getDocs, updateDoc, deleteDoc,
  query, orderBy, where, limit, Timestamp, runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGet, localSet, localDelete } from '@/lib/db'
import type { Salida, EntregaItem, ClienteData, RemitoItem } from '@/types'
/* eslint-disable @typescript-eslint/no-explicit-any */
type DocData = Record<string, any>

const COL = 'salidas'

function getDb() {
  if (!db) throw new Error('Firebase no está configurado.')
  return db
}

export async function createSalida(data: {
  idRemito: string
  numeroRemito: number
  fecha: Date
  horaEntrega?: string
  items: EntregaItem[]
  vehiculoPatente?: string
  vehiculoMarca?: string
  choferNombre?: string
  clienteData?: ClienteData
  remitoItems?: RemitoItem[]
}) {
  const _db = getDb()
  const col = collection(_db, COL)
  const newRef = doc(col)
  const counterRef = doc(_db, 'contadores', `salidas_${data.idRemito}`)

  const fullData = {
    idRemito: data.idRemito,
    numeroRemito: data.numeroRemito,
    fecha: Timestamp.fromDate(data.fecha),
    items: data.items,
    ...(data.horaEntrega ? { horaEntrega: data.horaEntrega } : {}),
    ...(data.vehiculoPatente ? { vehiculoPatente: data.vehiculoPatente } : {}),
    ...(data.vehiculoMarca ? { vehiculoMarca: data.vehiculoMarca } : {}),
    ...(data.choferNombre ? { choferNombre: data.choferNombre } : {}),
    ...(data.clienteData ? { clienteData: data.clienteData } : {}),
    ...(data.remitoItems ? { remitoItems: data.remitoItems } : {}),
    createdAt: Timestamp.now(),
  }

  let numeroSalida: number
  try {
    numeroSalida = await runTransaction(_db, async (tx) => {
      const snap = await tx.get(counterRef)
      const next = !snap.exists() ? 1 : snap.data().ultimo + 1
      tx.set(counterRef, { ultimo: next })
      tx.set(newRef, { ...fullData, numeroSalida: next })
      return next
    })
  } catch (e) {
    console.error('createSalida transaction error:', e)
    throw new Error('Error al crear salida en Firebase')
  }

  try { await localSet('salidas', { id: newRef.id, ...fullData, numeroSalida, fecha: data.fecha, createdAt: new Date() }) } catch {}
  return { id: newRef.id, numeroSalida }
}

function docToSalida(id: string, data: DocData): Salida {
  return {
    id,
    numeroSalida: data.numeroSalida,
    idRemito: data.idRemito,
    numeroRemito: data.numeroRemito,
    fecha: data.fecha?.toDate?.() ?? data.fecha,
    horaEntrega: data.horaEntrega,
    items: data.items ?? [],
    vehiculoPatente: data.vehiculoPatente,
    vehiculoMarca: data.vehiculoMarca,
    choferNombre: data.choferNombre,
    clienteData: data.clienteData,
    remitoItems: data.remitoItems,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  }
}

export async function getSalidasByRemito(remitoId: string): Promise<Salida[]> {
  try {
    const q = query(
      collection(getDb(), COL),
      where('idRemito', '==', remitoId),
      orderBy('numeroSalida', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => docToSalida(d.id, d.data()))
  } catch {
    const cached = await localGet<{ data: Salida[] }>('salidas_cache', `remito_${remitoId}`).catch(() => null)
    return cached?.data ?? []
  }
}

export async function getAllSalidas() {
  try {
    const q = query(collection(getDb(), COL), orderBy('createdAt', 'desc'), limit(20))
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => docToSalida(d.id, d.data()))
    return list
  } catch {
    const cached = await localGet<{ data: Salida[] }>('salidas_cache', 'all').catch(() => null)
    return cached?.data ?? []
  }
}

export async function getSalidasByMonth(year: number, month: number): Promise<Salida[]> {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 1)
  try {
    const q = query(
      collection(getDb(), COL),
      where('fecha', '>=', Timestamp.fromDate(start)),
      where('fecha', '<', Timestamp.fromDate(end)),
      orderBy('fecha', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => docToSalida(d.id, d.data()))
  } catch {
    const cached = await localGet<{ data: Salida[] }>('salidas_cache', 'all').catch(() => null)
    if (cached?.data) {
      return cached.data.filter((s) => {
        const d = s.fecha instanceof Date ? s.fecha : new Date(s.fecha)
        return d >= start && d < end
      })
    }
    return []
  }
}

export async function getSalida(id: string): Promise<Salida | null> {
  try {
    const snap = await getDoc(doc(getDb(), COL, id))
    if (!snap.exists()) return null
    return docToSalida(snap.id, snap.data())
  } catch {
    const local = await localGet<Salida>('salidas', id)
    return local ?? null
  }
}

export async function updateSalida(id: string, data: {
  fecha: Date
  horaEntrega?: string
  items: EntregaItem[]
  vehiculoPatente?: string
  vehiculoMarca?: string
  choferNombre?: string
}) {
  const _db = getDb()
  const updateData: Record<string, unknown> = {
    fecha: Timestamp.fromDate(data.fecha),
    items: data.items,
  }
  if (data.horaEntrega !== undefined) updateData.horaEntrega = data.horaEntrega || null
  if (data.vehiculoPatente !== undefined) updateData.vehiculoPatente = data.vehiculoPatente || null
  if (data.vehiculoMarca !== undefined) updateData.vehiculoMarca = data.vehiculoMarca || null
  if (data.choferNombre !== undefined) updateData.choferNombre = data.choferNombre || null
  try {
    await updateDoc(doc(_db, COL, id), updateData)
    try {
      const salida = await getSalida(id)
      if (salida) await localSet('salidas', { id, ...salida })
    } catch {}
  } catch (e) {
    console.error('updateSalida error:', e)
    throw new Error('Error al actualizar salida en Firebase')
  }
}

export async function deleteSalida(id: string) {
  try {
    await deleteDoc(doc(getDb(), COL, id))
    await localDelete('salidas', id)
  } catch {
    throw new Error('Error al eliminar salida')
  }
}
