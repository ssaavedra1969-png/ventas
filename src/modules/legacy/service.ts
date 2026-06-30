import {
  collection, doc, getDoc, getDocs,
  query, orderBy, limit, where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGetAll, localGet, localSet } from '@/lib/db'
import { syncManager } from '@/lib/sync'
import type { Remito } from '@/types'
/* eslint-disable @typescript-eslint/no-explicit-any */

const COLECCIONES = {
  remitos: 'remitos',
} as const

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

export async function getAllRemitos() {
  try {
    const q = query(
      collection(getDb(), COLECCIONES.remitos),
      orderBy('numeroRemito', 'desc'),
      limit(50)
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        fecha: d.fecha?.toDate?.() ?? d.fecha,
        createdAt: d.createdAt?.toDate?.() ?? d.createdAt,
        entregas: (d.entregas ?? []).map((e: Record<string, unknown>) => ({
          ...e,
          fecha: (e.fecha as { toDate?: () => Date })?.toDate?.() ?? e.fecha,
          createdAt: (e.createdAt as { toDate?: () => Date })?.toDate?.() ?? e.createdAt,
        })),
      } as Remito
    })
    await syncManager.cacheCollection('remitos', data.map(r => ({ ...r, id: r.id! })))
    return data
  } catch {
    const localData = await localGetAll<Remito>('remitos')
    localData.sort((a, b) => (b.numeroRemito ?? 0) - (a.numeroRemito ?? 0))
    if (localData.length > 0) return localData
    throw new Error('Sin conexión y sin datos locales de remitos')
  }
}

export async function getRemito(id: string) {
  try {
    const docRef = doc(getDb(), COLECCIONES.remitos, id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    const data = snap.data()
    const remito = {
      id: snap.id,
      ...data,
      fecha: data.fecha?.toDate?.() ?? data.fecha,
      createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
      entregas: (data.entregas ?? []).map((e: Record<string, unknown>) => ({
        ...e,
        fecha: (e.fecha as { toDate?: () => Date })?.toDate?.() ?? e.fecha,
        createdAt: (e.createdAt as { toDate?: () => Date })?.toDate?.() ?? e.createdAt,
      })),
    } as Remito
    await localSet('remitos', remito as any)
    return remito
  } catch {
    const local = await localGet<Remito>('remitos', id)
    return local ?? null
  }
}

export async function getRemitos(filters?: {
  cliente?: string
  estado?: string
  desde?: Date
  hasta?: Date
}) {
  try {
    const constraints: import('firebase/firestore').QueryConstraint[] = []
    constraints.push(orderBy('numeroRemito', 'desc'))
    constraints.push(limit(50))

    if (filters?.estado && filters.estado !== 'todos') {
      constraints.push(where('estado', '==', filters.estado))
    }

    const q = query(collection(getDb(), COLECCIONES.remitos), ...constraints)
    const snapshot = await getDocs(q)

    let remitos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      fecha: doc.data().fecha?.toDate?.() ?? doc.data().fecha,
      createdAt: doc.data().createdAt?.toDate?.() ?? doc.data().createdAt,
    })) as Remito[]

    if (filters?.cliente) {
      const s = filters.cliente.toLowerCase()
      remitos = remitos.filter(
        (r) =>
          (r.clienteData.razonSocial?.toLowerCase().includes(s) ?? false) ||
          (r.clienteData.numeroDocumento?.toLowerCase().includes(s) ?? false) ||
          (r.clienteData.codigoCliente?.toLowerCase().includes(s) ?? false)
      )
    }

    if (filters?.desde) {
      remitos = remitos.filter((r) => r.fecha >= filters.desde!)
    }
    if (filters?.hasta) {
      remitos = remitos.filter((r) => r.fecha <= filters.hasta!)
    }

    await syncManager.cacheCollection('remitos', remitos.map(r => ({ ...r, id: r.id! })))

    return remitos
  } catch {
    let remitos = await localGetAll<Remito>('remitos')

    if (filters?.cliente) {
      const s = filters.cliente.toLowerCase()
      remitos = remitos.filter(
        (r) =>
          (r.clienteData?.razonSocial?.toLowerCase().includes(s) ?? false) ||
          (r.clienteData?.numeroDocumento?.toLowerCase().includes(s) ?? false) ||
          (r.clienteData?.codigoCliente?.toLowerCase().includes(s) ?? false)
      )
    }

    if (filters?.estado && filters.estado !== 'todos') {
      remitos = remitos.filter((r) => r.estado === filters.estado)
    }

    if (filters?.desde) {
      remitos = remitos.filter((r) => r.fecha >= filters.desde!)
    }
    if (filters?.hasta) {
      remitos = remitos.filter((r) => r.fecha <= filters.hasta!)
    }

    remitos.sort((a, b) => (b.numeroRemito ?? 0) - (a.numeroRemito ?? 0))
    return remitos
  }
}
