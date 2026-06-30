import {
  collection, doc, getDoc, getDocs, updateDoc,
  query, orderBy, limit, where, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGetAll, localGet, localSet, enqueueOperation } from '@/lib/db'
import { syncManager } from '@/lib/sync'
import { clearCache } from '@/lib/cache'
import type { Remito, Pago, Entrega } from '@/types'
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

export async function updateRemitoEstado(id: string, estado: Remito['estado']) {
  const existing = await localGet<any>('remitos', id)
  if (existing) {
    await localSet('remitos', { ...existing, estado, id })
  }
  clearCache('allRemitos')
  try {
    await updateDoc(doc(getDb(), COLECCIONES.remitos, id), { estado })
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: id, operation: 'update',
      data: { estado }, timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function updateRemitoNroFactura(id: string, nroFactura: string) {
  const existing = await localGet<any>('remitos', id)
  if (existing) {
    await localSet('remitos', {
      ...existing, nroFactura, facturado: true, facturaAnulada: false, fechaFacturado: new Date(), id,
    })
  }
  clearCache('allRemitos')
  try {
    const ref = doc(getDb(), COLECCIONES.remitos, id)
    await updateDoc(ref, { nroFactura, facturado: true, facturaAnulada: false, fechaFacturado: Timestamp.now() })
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: id, operation: 'update',
      data: { nroFactura, facturado: true, facturaAnulada: false, fechaFacturado: Timestamp.now() },
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function updateRemitoNC(id: string, nroNC: string, montoNC: number) {
  const existing = await localGet<any>('remitos', id)
  if (existing) {
    await localSet('remitos', { ...existing, nroNC, montoNC, facturaAnulada: true, id })
  }
  clearCache('allRemitos')
  try {
    await updateDoc(doc(getDb(), COLECCIONES.remitos, id), { nroNC, montoNC, facturaAnulada: true })
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: id, operation: 'update',
      data: { nroNC, montoNC, facturaAnulada: true },
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function agregarPago(
  remitoId: string,
  pago: { monto: number; metodo: Pago['metodo']; referencia?: string; fecha: Date }
) {
  const nuevoPago = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    monto: pago.monto,
    metodo: pago.metodo,
    fecha: pago.fecha,
    createdAt: new Date(),
  } as Pago & { createdAt: Date }
  if (pago.referencia) nuevoPago.referencia = pago.referencia
  if (isNaN(pago.monto) || pago.monto <= 0) throw new Error('Monto inválido')

  const existing = await localGet<any>('remitos', remitoId)
  if (existing) {
    const pagosActuales: Pago[] = existing.pagos ?? []
    const nuevosPagos = [...pagosActuales, nuevoPago]
    const totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0)
    await localSet('remitos', { ...existing, pagos: nuevosPagos, totalPagado, id: remitoId })
  }

  try {
    const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Remito no encontrado')
    const data = snap.data()
    const pagosActuales: Pago[] = data.pagos ?? []
    const pagoRaw = {
      id: nuevoPago.id,
      monto: pago.monto,
      metodo: pago.metodo,
      fecha: Timestamp.fromDate(pago.fecha),
      createdAt: Timestamp.now(),
    } as any
    if (pago.referencia) pagoRaw.referencia = pago.referencia
    const nuevosPagos = [...pagosActuales, pagoRaw]
    const totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0)
    await updateDoc(ref, { pagos: nuevosPagos, totalPagado })
  } catch {
    const localActualizado = await localGet<any>('remitos', remitoId)
    await enqueueOperation({
      collection: 'remitos', docId: remitoId, operation: 'update',
      data: { pagos: localActualizado?.pagos ?? [], totalPagado: localActualizado?.totalPagado ?? 0 },
      timestamp: Date.now(), retryCount: 0,
    })
  }
  return nuevoPago
}

export async function eliminarPago(remitoId: string, pagoId: string) {
  let nuevosPagos: Pago[] = []
  let totalPagado = 0
  const existing = await localGet<any>('remitos', remitoId)
  if (existing) {
    const pagosActuales: Pago[] = existing.pagos ?? []
    nuevosPagos = pagosActuales.filter((p) => p.id !== pagoId)
    totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0)
    await localSet('remitos', { ...existing, pagos: nuevosPagos, totalPagado, id: remitoId })
  }
  try {
    const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Remito no encontrado')
    const data = snap.data()
    const pagosActuales: Pago[] = data.pagos ?? []
    nuevosPagos = pagosActuales.filter((p) => p.id !== pagoId)
    totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0)
    await updateDoc(ref, { pagos: nuevosPagos, totalPagado })
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: remitoId, operation: 'update',
      data: { pagos: nuevosPagos, totalPagado },
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function eliminarEntrega(remitoId: string, entregaId: string) {
  try {
    const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Remito no encontrado')
    const data = snap.data()
    const entregasActuales: Entrega[] = data.entregas ?? []
    const nuevasEntregas = entregasActuales.filter((e) => e.id !== entregaId)
    await updateDoc(ref, { entregas: nuevasEntregas })
  } catch {
    throw new Error('Error al eliminar entrega en Firebase')
  }
}
