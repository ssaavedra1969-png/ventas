import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, startAfter,
  getCountFromServer, Timestamp, writeBatch,
  type DocumentSnapshot, type QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGetAll, localSet, generateLocalId, enqueueOperation } from '@/lib/db'
import { syncManager } from '@/lib/sync'
import type { Producto } from '@/types'
/* eslint-disable @typescript-eslint/no-explicit-any */

const COLECCION_PRODUCTOS = 'productos'

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

const _productosCursors = new Map<number, DocumentSnapshot>()

export async function getProductos(search?: string, page = 1, pageSize = 20) {
  try {
    const _db = getDb()
    const baseQuery = collection(_db, COLECCION_PRODUCTOS)
    const order = orderBy('codigoProducto', 'asc')

    let total = 0
    try {
      const countSnap = await getCountFromServer(query(baseQuery, order))
      total = countSnap.data().count
    } catch {
      const cached = await localGetAll<Producto>('productos')
      total = cached.length
    }

    const dataConstraints: QueryConstraint[] = [order, limit(pageSize)]
    if (page > 1 && _productosCursors.has(page - 1)) {
      dataConstraints.push(startAfter(_productosCursors.get(page - 1)!))
    }

    const q = query(baseQuery, ...dataConstraints)
    const snapshot = await getDocs(q)

    if (snapshot.docs.length > 0) {
      _productosCursors.set(page, snapshot.docs[snapshot.docs.length - 1])
    }
    Array.from(_productosCursors.keys()).forEach(key => {
      if (key >= page + 2) _productosCursors.delete(key)
    })

    let productos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Producto[]

    if (search) {
      const s = search.toLowerCase()
      productos = productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(s) ||
          p.tipo.toLowerCase().includes(s)
      )
    }

    syncManager.cacheCollection('productos', snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as any)).catch(() => {})

    return { data: productos, total, totalPages: Math.ceil(total / pageSize) }
  } catch {
    let productos = await localGetAll<Producto>('productos')

    if (search) {
      const s = search.toLowerCase()
      productos = productos.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(s) ||
          p.tipo?.toLowerCase().includes(s)
      )
    }

    const total = productos.length
    const start = (page - 1) * pageSize
    const paginated = productos.slice(start, start + pageSize)

    return { data: paginated, total, totalPages: Math.ceil(total / pageSize) }
  }
}

export async function getAllProductos() {
  try {
    const q = query(
      collection(getDb(), COLECCION_PRODUCTOS),
      orderBy('nombre', 'asc')
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Producto[]
    await syncManager.cacheCollection('productos', data.map(p => ({ ...p, id: p.id! })))
    return data
  } catch (error) {
    const localData = await localGetAll<Producto>('productos')
    if (localData.length > 0) return localData
    throw error
  }
}

export async function createProducto(data: Omit<Producto, 'id' | 'createdAt'>) {
  const fullData = {
    ...data,
    codigoProducto: data.codigoProducto ?? '',
    precioSinIVA: data.precioSinIVA ?? Math.round((data.valorUnitario / 1.21) * 100) / 100,
    stock: data.stock ?? 0,
    createdAt: Timestamp.now(),
  }
  try {
    const docRef = await addDoc(collection(getDb(), COLECCION_PRODUCTOS), fullData)
    await localSet('productos', { id: docRef.id, ...fullData })
    _productosCursors.clear()
    return docRef.id
  } catch {
    throw new Error('Error al crear producto en Firebase')
  }
}

export async function updateProducto(id: string, data: Partial<Producto>) {
  const updateData = { ...data }
  if (updateData.valorUnitario !== undefined && updateData.precioSinIVA === undefined) {
    updateData.precioSinIVA = Math.round((updateData.valorUnitario / 1.21) * 100) / 100
  }
  try {
    await updateDoc(doc(getDb(), COLECCION_PRODUCTOS, id), updateData)
    _productosCursors.clear()
  } catch {
    throw new Error('Error al actualizar producto en Firebase')
  }
}

export async function deleteProducto(id: string) {
  try {
    await deleteDoc(doc(getDb(), COLECCION_PRODUCTOS, id))
    _productosCursors.clear()
  } catch {
    throw new Error('Error al eliminar producto en Firebase')
  }
}

export async function createMultipleProductos(
  data: Omit<Producto, 'id' | 'createdAt'>[]
) {
  const results: { label: string; ok: boolean; error?: string }[] = []

  try {
    const _db = getDb()
    const batch = writeBatch(_db)

    for (const item of data) {
      const ref = doc(collection(_db, COLECCION_PRODUCTOS))
      const docData = {
        ...item,
        precioSinIVA: item.precioSinIVA ?? Math.round((item.valorUnitario / 1.21) * 100) / 100,
        stock: item.stock ?? 0,
        createdAt: Timestamp.now(),
      }
      batch.set(ref, docData)
      await localSet('productos', { id: ref.id, ...docData })
      results.push({ label: `${item.nombre}`, ok: true })
    }

    await batch.commit()
  } catch {
    for (const item of data) {
      const tempId = generateLocalId()
      const docData = {
        ...item,
        precioSinIVA: item.precioSinIVA ?? Math.round((item.valorUnitario / 1.21) * 100) / 100,
        stock: item.stock ?? 0,
        createdAt: new Date(),
      }
      await localSet('productos', { id: tempId, ...docData })
      await enqueueOperation({
        collection: 'productos', docId: tempId, operation: 'create',
        data: {
          ...item,
          precioSinIVA: item.precioSinIVA ?? Math.round((item.valorUnitario / 1.21) * 100) / 100,
          stock: item.stock ?? 0,
          createdAt: Timestamp.now(),
        },
        timestamp: Date.now(), retryCount: 0,
      })
      results.push({ label: `${item.nombre}`, ok: true })
    }
  }

  return results
}
