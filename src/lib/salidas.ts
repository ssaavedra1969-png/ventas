import {
  collection, doc, getDoc, getDocs, addDoc, deleteDoc,
  query, orderBy, where, Timestamp, runTransaction,
} from 'firebase/firestore'
import { db } from './firebase'
import { localGet, localSet, localDelete } from './db'
import type { Salida, EntregaItem, ClienteData, RemitoItem } from '@/types'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  let numeroSalida: number

  try {
    const remitoRef = doc(_db, 'remitos_aprobados', data.idRemito)
    numeroSalida = await runTransaction(_db, async (tx) => {
      const snap = await tx.get(remitoRef)
      if (!snap.exists()) throw new Error('Remito no encontrado')
      const current = snap.data().ultimoNumeroSalida ?? 0
      const next = current + 1
      tx.update(remitoRef, { ultimoNumeroSalida: next })
      return next
    })
  } catch {
    const remitoLocal = await localGet<{ ultimoNumeroSalida?: number }>('remitos_aprobados', data.idRemito)
    numeroSalida = (remitoLocal?.ultimoNumeroSalida ?? 0) + 1
    await localSet('remitos_aprobados', { id: data.idRemito, ultimoNumeroSalida: numeroSalida })
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
    await localSet('salidas', { id: docRef.id, ...fullData, fecha: data.fecha, createdAt: new Date() })
    return { id: docRef.id, numeroSalida }
  } catch {
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
    const cached = await localGet<{ data: Salida[] }>('salidas_cache', `remito_${remitoId}`)
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
    const cached = await localGet<{ data: Salida[] }>('salidas_cache', 'all')
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

export async function deleteSalida(id: string) {
  try {
    await deleteDoc(doc(getDb(), COL, id))
    await localDelete('salidas', id)
  } catch {
    throw new Error('Error al eliminar salida')
  }
}
