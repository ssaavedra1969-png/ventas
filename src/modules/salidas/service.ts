import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, Timestamp,
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
  items: EntregaItem[]
  vehiculoPatente?: string
  vehiculoMarca?: string
  choferNombre?: string
  clienteData?: ClienteData
  remitoItems?: RemitoItem[]
}) {
  const _db = getDb()

  let numeroSalida = 1
  try {
    const q = query(
      collection(_db, COL),
      where('idRemito', '==', data.idRemito),
      orderBy('numeroSalida', 'desc')
    )
    const snap = await getDocs(q)
    if (snap.docs.length > 0) {
      numeroSalida = snap.docs[0].data().numeroSalida + 1
    }
  } catch {
    try {
      const cached = await localGet<{ data: Salida[] }>('salidas_cache', `remito_${data.idRemito}`)
      if (cached?.data?.length) {
        const max = Math.max(...cached.data.map((s) => s.numeroSalida))
        numeroSalida = max + 1
      }
    } catch {}
  }

  const fullData = {
    numeroSalida,
    idRemito: data.idRemito,
    numeroRemito: data.numeroRemito,
    fecha: Timestamp.fromDate(data.fecha),
    items: data.items,
    ...(data.vehiculoPatente ? { vehiculoPatente: data.vehiculoPatente } : {}),
    ...(data.vehiculoMarca ? { vehiculoMarca: data.vehiculoMarca } : {}),
    ...(data.choferNombre ? { choferNombre: data.choferNombre } : {}),
    ...(data.clienteData ? { clienteData: data.clienteData } : {}),
    ...(data.remitoItems ? { remitoItems: data.remitoItems } : {}),
    createdAt: Timestamp.now(),
  }

  try {
    const docRef = await addDoc(collection(_db, COL), fullData)
    try { await localSet('salidas', { id: docRef.id, ...fullData, fecha: data.fecha, createdAt: new Date() }) } catch {}
    return { id: docRef.id, numeroSalida }
  } catch (e) {
    console.error('createSalida error:', e)
    throw new Error('Error al crear salida en Firebase')
  }
}

function docToSalida(id: string, data: DocData): Salida {
  return {
    id,
    numeroSalida: data.numeroSalida,
    idRemito: data.idRemito,
    numeroRemito: data.numeroRemito,
    fecha: data.fecha?.toDate?.() ?? data.fecha,
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
    const q = query(collection(getDb(), COL), orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => docToSalida(d.id, d.data()))
    return list
  } catch {
    const cached = await localGet<{ data: Salida[] }>('salidas_cache', 'all').catch(() => null)
    return cached?.data ?? []
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
