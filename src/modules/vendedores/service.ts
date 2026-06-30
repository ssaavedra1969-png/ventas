import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, Timestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGetAll, localGet, localSet, localDelete, generateLocalId, enqueueOperation } from '@/lib/db'
import { syncManager } from '@/lib/sync'
import { getAllRemitos } from '@/lib/firestore'
import type { Vendedor, RemitoItem } from '@/types'

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

export async function getVendedores() {
  try {
    const q = query(
      collection(getDb(), 'vendedores'),
      orderBy('nombre', 'asc')
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Vendedor[]
    syncManager.cacheCollection('vendedores', data.map(v => ({ ...v, id: v.id! }))).catch(() => {})
    return data
  } catch {
    const localData = await localGetAll<Vendedor>('vendedores')
    if (localData.length > 0) return localData
    throw new Error('Sin conexión y sin datos locales de vendedores')
  }
}

export async function createVendedor(data: Omit<Vendedor, 'id' | 'createdAt'>) {
  const fullData = { ...data, createdAt: Timestamp.now() }
  const tempId = generateLocalId()

  await localSet('vendedores', { id: tempId, ...fullData })

  try {
    const docRef = await addDoc(collection(getDb(), 'vendedores'), fullData)
    await localDelete('vendedores', tempId)
    await localSet('vendedores', { id: docRef.id, ...fullData })
    return docRef.id
  } catch {
    await enqueueOperation({
      collection: 'vendedores', docId: tempId, operation: 'create',
      data: fullData, timestamp: Date.now(), retryCount: 0,
    })
    return tempId
  }
}

export async function updateVendedor(id: string, data: Partial<Vendedor>) {
  const existing = await localGet<Vendedor>('vendedores', id)
  if (existing) {
    await localSet('vendedores', { ...existing, ...data, id })
  }
  try {
    await updateDoc(doc(getDb(), 'vendedores', id), data)
  } catch {
    await enqueueOperation({
      collection: 'vendedores', docId: id, operation: 'update',
      data, timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function deleteVendedor(id: string) {
  await localDelete('vendedores', id)
  try {
    await deleteDoc(doc(getDb(), 'vendedores', id))
  } catch {
    await enqueueOperation({
      collection: 'vendedores', docId: id, operation: 'delete',
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

export interface VendedorStats {
  codigo: string
  nombre: string
  totalRemitos: number
  totalFacturado: number
  totalItems: number
  remitosPorEstado: Record<string, number>
  ultimoRemito: Date | null
  remitoMasAlto: number
}

export async function getVendedoresStats(): Promise<VendedorStats[]> {
  const allRemitos = await getAllRemitos()
  const statsMap = new Map<string, VendedorStats>()
  for (const data of allRemitos) {
    const vendedor = data.vendedor
    if (!vendedor?.codigo) continue
    const key = vendedor.codigo
    if (!statsMap.has(key)) {
      statsMap.set(key, {
        codigo: vendedor.codigo,
        nombre: vendedor.nombre,
        totalRemitos: 0,
        totalFacturado: 0,
        totalItems: 0,
        remitosPorEstado: {},
        ultimoRemito: null,
        remitoMasAlto: 0,
      })
    }
    const stat = statsMap.get(key)!
    stat.totalRemitos++
    if (data.estado !== 'Anulado') {
      stat.totalFacturado += data.totalGeneral || 0
    }
    const items = (data.items || []) as RemitoItem[]
    stat.totalItems += items.reduce((sum, item) => sum + item.cantidad, 0)
    const estado: string = data.estado || 'Desconocido'
    stat.remitosPorEstado[estado] = (stat.remitosPorEstado[estado] || 0) + 1
    const total = data.totalGeneral || 0
    if (total > stat.remitoMasAlto) stat.remitoMasAlto = total
    const fecha = data.fecha
    if (fecha && (!stat.ultimoRemito || fecha > stat.ultimoRemito)) {
      stat.ultimoRemito = fecha
    }
  }
  return Array.from(statsMap.values()).sort((a, b) => b.totalFacturado - a.totalFacturado)
}

export async function createMultipleVendedores(
  data: Omit<Vendedor, 'id' | 'createdAt'>[]
) {
  const results: { label: string; ok: boolean; error?: string }[] = []
  try {
    const _db = getDb()
    const batch = writeBatch(_db)
    for (const item of data) {
      const ref = doc(collection(_db, 'vendedores'))
      const docData = { ...item, activo: true, createdAt: Timestamp.now() }
      batch.set(ref, docData)
      await localSet('vendedores', { id: ref.id, ...docData })
      results.push({ label: `${item.nombre} (${item.codigo})`, ok: true })
    }
    await batch.commit()
  } catch {
    for (const item of data) {
      const tempId = generateLocalId()
      const docData = { ...item, activo: true, createdAt: new Date() }
      await localSet('vendedores', { id: tempId, ...docData })
      await enqueueOperation({
        collection: 'vendedores', docId: tempId, operation: 'create',
        data: { ...item, activo: true, createdAt: Timestamp.now() },
        timestamp: Date.now(), retryCount: 0,
      })
      results.push({ label: `${item.nombre} (${item.codigo})`, ok: true })
    }
  }
  return results
}

export async function vendedorCodigoExists(codigo: string, excludeId?: string) {
  try {
    const q = query(
      collection(getDb(), 'vendedores'),
      where('codigo', '==', codigo)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return false
    if (excludeId && snapshot.docs[0].id === excludeId) return false
    return true
  } catch {
    const vendedores = await localGetAll<Vendedor>('vendedores')
    const match = vendedores.find(v => v.codigo === codigo)
    if (!match) return false
    if (excludeId && match.id === excludeId) return false
    return true
  }
}
