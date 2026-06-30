import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGetAll, localGet, localSet, localDelete, generateLocalId, enqueueOperation } from '@/lib/db'
import { syncManager } from '@/lib/sync'
import type { Vendedor } from '@/types'

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
