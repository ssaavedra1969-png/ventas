import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryConstraint,
  setDoc,
  writeBatch,
  limit,
} from 'firebase/firestore'
import { db } from './firebase'
import { getCached, setCache, clearCache } from './cache'
import {
  localGetAll, localGet, localSet, localDelete,
  enqueueOperation, generateLocalId,
} from './db'
import { syncManager } from './sync'
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Cliente, Producto, Remito, RemitoItem, Vendedor, EmpresaConfig, Pago, Entrega } from '@/types'

const CACHE_KEYS = {
  clientes: 'allClientes',
  productos: 'allProductos',
  remitos: 'allRemitos',
} as const

const COLECCIONES = {
  clientes: 'clientes',
  productos: 'productos',
  remitos: 'remitos',
  contadores: 'contadores',
  vendedores: 'vendedores',
  configuracion: 'configuracion',
} as const

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

// ============ CONFIGURACIÓN EMPRESA ============

const DEFAULT_EMPRESA: EmpresaConfig = {
  razonSocial: 'GRUPO FALPAT SRL',
  cuit: '30-71784388-2',
  direccion: 'Av. Ejemplo 1234',
  telefono: '(011) 1234-5678',
  email: 'info@falpat.com',
  telefonoAdmin: '(011) 1234-5678',
}

export async function getEmpresaConfig(): Promise<EmpresaConfig> {
  try {
    const _db = getDb()
    const docRef = doc(_db, COLECCIONES.configuracion, 'empresa')
    const snap = await getDoc(docRef)
    if (!snap.exists()) {
      await setDoc(docRef, DEFAULT_EMPRESA)
      await localSet('configuracion', { id: 'empresa', ...DEFAULT_EMPRESA })
      return DEFAULT_EMPRESA
    }
    const data = snap.data() as EmpresaConfig
    await localSet('configuracion', { id: 'empresa', ...data })
    return data
  } catch {
    const local = await localGet<EmpresaConfig & { id: string }>('configuracion', 'empresa')
    if (local) {
      return local as EmpresaConfig
    }
    return DEFAULT_EMPRESA
  }
}

export async function saveEmpresaConfig(data: EmpresaConfig): Promise<void> {
  await localSet('configuracion', { id: 'empresa', ...data })
  try {
    const _db = getDb()
    const docRef = doc(_db, COLECCIONES.configuracion, 'empresa')
    await setDoc(docRef, data)
  } catch {
    await enqueueOperation({
      collection: 'configuracion', docId: 'empresa', operation: 'set',
      data, timestamp: Date.now(), retryCount: 0,
    })
  }
}

// ============ HELPERS IVA ============

export function getTipoFactura(condicionIVA: string): 'A' | 'B' {
  if (condicionIVA === 'RI' || condicionIVA === 'Monotributo') return 'A'
  return 'B'
}

export function getIvaRate(condicionIVA: string): number {
  if (condicionIVA === 'Exento') return 0
  return 0.21
}

export const CONDIVA_LABEL: Record<string, string> = {
  CF: 'Consumidor Final (CF) - Factura B',
  Exento: 'Exento de IVA - Factura B',
  RI: 'Responsable Inscripto (con IVA) - Factura A',
  Monotributo: 'Monotributista (con IVA) - Factura A',
}

export const CONDICIONES_IVA = ['CF', 'Exento', 'RI', 'Monotributo']

export function condicaToLabel(v: string): string {
  return CONDIVA_LABEL[v] || v
}

// ============ CLIENTES ============

async function getNextCodigoCliente(): Promise<string> {
  try {
    const contadorRef = doc(getDb(), COLECCIONES.contadores, 'cliente')
    const snap = await getDoc(contadorRef)

    if (!snap.exists()) {
      const snapshot = await getDocs(collection(getDb(), COLECCIONES.clientes))
      let maxNumeric = 0
      snapshot.docs.forEach(d => {
        const cod = d.data().codigoCliente
        if (cod) {
          const num = parseInt(cod, 10)
          if (!isNaN(num) && num > maxNumeric) maxNumeric = num
        }
      })
      const next = maxNumeric + 1
      await setDoc(contadorRef, { ultimo: next })
      await localSet('contadores', { id: 'cliente', ultimo: next })
      return String(next).padStart(5, '0')
    }

    const ultimo = snap.data().ultimo + 1
    await updateDoc(contadorRef, { ultimo })
    await localSet('contadores', { id: 'cliente', ultimo: snap.data().ultimo + 1 })
    return String(ultimo).padStart(5, '0')
  } catch {
    const local = await localGet<{ id: string; ultimo: number }>('contadores', 'cliente')
    let next: number
    if (!local) {
      const clientes = await localGetAll<any>('clientes')
      let maxNumeric = 0
      clientes.forEach(c => {
        const cod = c.codigoCliente
        if (cod) {
          const num = parseInt(cod, 10)
          if (!isNaN(num) && num > maxNumeric) maxNumeric = num
        }
      })
      next = maxNumeric + 1
    } else {
      next = local.ultimo + 1
    }
    await localSet('contadores', { id: 'cliente', ultimo: next })
    return String(next).padStart(5, '0')
  }
}

export async function getClientes(search?: string, page = 1, pageSize = 10) {
  try {
    const _db = getDb()
    const constraints: QueryConstraint[] = []
    constraints.push(orderBy('codigoCliente', 'asc'))

    const q = query(collection(_db, COLECCIONES.clientes), ...constraints)
    const snapshot = await getDocs(q)

    let clientes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Cliente[]

    if (search) {
      const s = search.toLowerCase()
      clientes = clientes.filter(
        (c) =>
          c.razonSocial.toLowerCase().includes(s) ||
          c.numeroDocumento.toLowerCase().includes(s) ||
          c.codigoCliente.toLowerCase().includes(s)
      )
    }

    const total = clientes.length
    const start = (page - 1) * pageSize
    const paginated = clientes.slice(start, start + pageSize)

    syncManager.cacheCollection('clientes', clientes.map(c => ({ ...c, id: c.id! }))).catch(() => {})

    return { data: paginated, total, totalPages: Math.ceil(total / pageSize) }
  } catch {
    let clientes = await localGetAll<Cliente>('clientes')

    if (search) {
      const s = search.toLowerCase()
      clientes = clientes.filter(
        (c) =>
          c.razonSocial?.toLowerCase().includes(s) ||
          c.numeroDocumento?.toLowerCase().includes(s) ||
          c.codigoCliente?.toLowerCase().includes(s)
      )
    }

    const total = clientes.length
    const start = (page - 1) * pageSize
    const paginated = clientes.slice(start, start + pageSize)

    return { data: paginated, total, totalPages: Math.ceil(total / pageSize) }
  }
}

export async function getAllClientes(force = false) {
  if (!force) {
    const cached = getCached<Cliente[]>(CACHE_KEYS.clientes)
    if (cached) return cached
  }
  try {
    const q = query(
      collection(getDb(), COLECCIONES.clientes),
      orderBy('razonSocial', 'asc')
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Cliente[]
    setCache(CACHE_KEYS.clientes, data)
    syncManager.cacheCollection('clientes', data.map(c => ({ ...c, id: c.id! }))).catch(() => {})
    return data
  } catch (error) {
    const localData = await localGetAll<Cliente>('clientes')
    if (localData.length > 0) {
      setCache(CACHE_KEYS.clientes, localData)
      return localData
    }
    throw error
  }
}

export async function getCliente(id: string) {
  try {
    const docRef = doc(getDb(), COLECCIONES.clientes, id)
    const snap = await getDoc(docRef)
    if (!snap.exists()) return null
    const data = { id: snap.id, ...snap.data() } as Cliente
    await localSet('clientes', data as any)
    return data
  } catch {
    const local = await localGet<Cliente>('clientes', id)
    return local ?? null
  }
}

export async function createCliente(data: Omit<Cliente, 'id' | 'createdAt' | 'codigoCliente'>) {
  const codigoCliente = await getNextCodigoCliente()
  const fullData = { ...data, codigoCliente, createdAt: Timestamp.now() }
  const tempId = generateLocalId()

  await localSet('clientes', { id: tempId, ...fullData })
  clearCache(CACHE_KEYS.clientes)

  try {
    const docRef = await addDoc(collection(getDb(), COLECCIONES.clientes), fullData)
    await localDelete('clientes', tempId)
    await localSet('clientes', { id: docRef.id, ...fullData })
    return docRef.id
  } catch {
    await enqueueOperation({
      collection: 'clientes', docId: tempId, operation: 'create',
      data: fullData, timestamp: Date.now(), retryCount: 0,
    })
    return tempId
  }
}

export async function updateCliente(id: string, data: Partial<Cliente>) {
  const existing = await localGet<any>('clientes', id)
  if (existing) {
    await localSet('clientes', { ...existing, ...data, id })
  }
  clearCache(CACHE_KEYS.clientes)
  try {
    await updateDoc(doc(getDb(), COLECCIONES.clientes, id), data)
  } catch {
    await enqueueOperation({
      collection: 'clientes', docId: id, operation: 'update',
      data, timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function deleteCliente(id: string) {
  await localDelete('clientes', id)
  clearCache(CACHE_KEYS.clientes)
  try {
    await deleteDoc(doc(getDb(), COLECCIONES.clientes, id))
  } catch {
    await enqueueOperation({
      collection: 'clientes', docId: id, operation: 'delete',
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function clienteExists(numeroDocumento: string, excludeId?: string) {
  try {
    const q = query(
      collection(getDb(), COLECCIONES.clientes),
      where('numeroDocumento', '==', numeroDocumento)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return false
    if (excludeId && snapshot.docs[0].id === excludeId) return false
    return true
  } catch {
    const clientes = await localGetAll<Cliente>('clientes')
    const match = clientes.find(c => c.numeroDocumento === numeroDocumento)
    if (!match) return false
    if (excludeId && match.id === excludeId) return false
    return true
  }
}

export async function createMultipleClientes(
  data: Omit<Cliente, 'id' | 'createdAt'>[]
) {
  const results: { label: string; ok: boolean; error?: string }[] = []

  try {
    const _db = getDb()
    const batch = writeBatch(_db)

    for (const item of data) {
      let codigoCliente = item.codigoCliente
      if (!codigoCliente || codigoCliente === '00000') {
        const contadorRef = doc(_db, COLECCIONES.contadores, 'cliente')
        const snap = await getDoc(contadorRef)
        let next: number
        if (!snap.exists()) {
          const snapshot = await getDocs(collection(_db, COLECCIONES.clientes))
          let maxNumeric = 0
          snapshot.docs.forEach(d => {
            const cod = d.data().codigoCliente
            if (cod) {
              const num = parseInt(cod, 10)
              if (!isNaN(num) && num > maxNumeric) maxNumeric = num
            }
          })
          next = maxNumeric + 1
          await setDoc(contadorRef, { ultimo: next })
        } else {
          next = snap.data().ultimo + 1
          await updateDoc(contadorRef, { ultimo: next })
        }
        codigoCliente = String(next).padStart(5, '0')
      }
      const ref = doc(collection(_db, COLECCIONES.clientes))
      const docData = { ...item, codigoCliente, createdAt: Timestamp.now() }
      batch.set(ref, docData)
      await localSet('clientes', { id: ref.id, ...docData })
      results.push({ label: `${item.razonSocial} (${item.numeroDocumento})`, ok: true })
    }

    await batch.commit()
    clearCache(CACHE_KEYS.clientes)
  } catch {
    for (const item of data) {
      const codigoCliente = await getNextCodigoCliente()
      const tempId = generateLocalId()
      const docData = { ...item, codigoCliente, createdAt: new Date() }
      await localSet('clientes', { id: tempId, ...docData })
      await enqueueOperation({
        collection: 'clientes', docId: tempId, operation: 'create',
        data: { ...item, codigoCliente, createdAt: Timestamp.now() },
        timestamp: Date.now(), retryCount: 0,
      })
      results.push({ label: `${item.razonSocial} (${item.numeroDocumento})`, ok: true })
    }
  }

  return results
}

// ============ PRODUCTOS ============

export async function getProductos(search?: string, page = 1, pageSize = 10) {
  try {
    const constraints: QueryConstraint[] = []
    constraints.push(orderBy('codigoProducto', 'asc'))

    const q = query(collection(getDb(), COLECCIONES.productos), ...constraints)
    const snapshot = await getDocs(q)

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

    const total = productos.length
    const start = (page - 1) * pageSize
    const paginated = productos.slice(start, start + pageSize)

    syncManager.cacheCollection('productos', productos.map(p => ({ ...p, id: p.id! }))).catch(() => {})

    return { data: paginated, total, totalPages: Math.ceil(total / pageSize) }
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

export async function getAllProductos(force = false) {
  if (!force) {
    const cached = getCached<Producto[]>(CACHE_KEYS.productos)
    if (cached) return cached
  }
  try {
    const q = query(
      collection(getDb(), COLECCIONES.productos),
      orderBy('nombre', 'asc')
    )
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Producto[]
    setCache(CACHE_KEYS.productos, data)
    syncManager.cacheCollection('productos', data.map(p => ({ ...p, id: p.id! }))).catch(() => {})
    return data
  } catch (error) {
    const localData = await localGetAll<Producto>('productos')
    if (localData.length > 0) {
      setCache(CACHE_KEYS.productos, localData)
      return localData
    }
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
  const tempId = generateLocalId()

  await localSet('productos', { id: tempId, ...fullData })
  clearCache(CACHE_KEYS.productos)

  try {
    const docRef = await addDoc(collection(getDb(), COLECCIONES.productos), fullData)
    await localDelete('productos', tempId)
    await localSet('productos', { id: docRef.id, ...fullData })
    return docRef.id
  } catch {
    await enqueueOperation({
      collection: 'productos', docId: tempId, operation: 'create',
      data: fullData, timestamp: Date.now(), retryCount: 0,
    })
    return tempId
  }
}

export async function updateProducto(id: string, data: Partial<Producto>) {
  const updateData = { ...data }
  if (updateData.valorUnitario !== undefined && updateData.precioSinIVA === undefined) {
    updateData.precioSinIVA = Math.round((updateData.valorUnitario / 1.21) * 100) / 100
  }
  const existing = await localGet<any>('productos', id)
  if (existing) {
    await localSet('productos', { ...existing, ...updateData, id })
  }
  clearCache(CACHE_KEYS.productos)
  try {
    await updateDoc(doc(getDb(), COLECCIONES.productos, id), updateData)
  } catch {
    await enqueueOperation({
      collection: 'productos', docId: id, operation: 'update',
      data: updateData, timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function deleteProducto(id: string) {
  await localDelete('productos', id)
  clearCache(CACHE_KEYS.productos)
  try {
    await deleteDoc(doc(getDb(), COLECCIONES.productos, id))
  } catch {
    await enqueueOperation({
      collection: 'productos', docId: id, operation: 'delete',
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

// ============ VENDEDORES ============

export async function getVendedores() {
  try {
    const q = query(
      collection(getDb(), COLECCIONES.vendedores),
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
    const docRef = await addDoc(collection(getDb(), COLECCIONES.vendedores), fullData)
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
  const existing = await localGet<any>('vendedores', id)
  if (existing) {
    await localSet('vendedores', { ...existing, ...data, id })
  }
  try {
    await updateDoc(doc(getDb(), COLECCIONES.vendedores, id), data)
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
    await deleteDoc(doc(getDb(), COLECCIONES.vendedores, id))
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
      collection(getDb(), COLECCIONES.vendedores),
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
  const _db = getDb()
  const q = query(
    collection(_db, COLECCIONES.remitos),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)

  const statsMap = new Map<string, VendedorStats>()

  for (const doc of snapshot.docs) {
    const data = doc.data()
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

    const fecha = data.fecha?.toDate?.() ?? data.fecha
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
      const ref = doc(collection(_db, COLECCIONES.vendedores))
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

export async function createMultipleProductos(
  data: Omit<Producto, 'id' | 'createdAt'>[]
) {
  const results: { label: string; ok: boolean; error?: string }[] = []

  try {
    const _db = getDb()
    const batch = writeBatch(_db)

    for (const item of data) {
      const ref = doc(collection(_db, COLECCIONES.productos))
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
    clearCache(CACHE_KEYS.productos)
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

// ============ REMITOS ============

async function getNextNumeroRemito(year: number): Promise<number> {
  try {
    const contadorRef = doc(getDb(), COLECCIONES.contadores, `remito_${year}`)
    const snap = await getDoc(contadorRef)

    if (!snap.exists()) {
      await setDoc(contadorRef, { ultimo: 1 })
      await localSet('contadores', { id: `remito_${year}`, ultimo: 1 })
      return 1
    }

    const ultimo = snap.data().ultimo + 1
    await updateDoc(contadorRef, { ultimo })
    await localSet('contadores', { id: `remito_${year}`, ultimo })
    return ultimo
  } catch {
    const local = await localGet<{ id: string; ultimo: number }>('contadores', `remito_${year}`)
    const next = (local?.ultimo ?? 0) + 1
    await localSet('contadores', { id: `remito_${year}`, ultimo: next })
    return next
  }
}

export async function createRemito(data: {
  idCliente: string
  clienteData: Remito['clienteData']
  vendedor?: Remito['vendedor']
  items: RemitoItem[]
  observaciones?: string
}) {
  const now = new Date()
  const year = now.getFullYear()
  const numeroRemito = await getNextNumeroRemito(year)

  const condicion = data.clienteData.condicionIVA || 'CF'
  const isFA = getTipoFactura(condicion) === 'A'
  const subtotalGeneral = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const iva = isFA ? subtotalGeneral * 0.21 : 0
  const totalGeneral = isFA ? subtotalGeneral + iva : subtotalGeneral

  const fullData = {
    numeroRemito,
    fecha: Timestamp.fromDate(now),
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    vendedor: data.vendedor || null,
    items: data.items,
    subtotalGeneral,
    iva,
    totalGeneral,
    estado: 'Enviado' as const,
    observaciones: data.observaciones || '',
    createdAt: Timestamp.now(),
  }
  const tempId = generateLocalId()

  await localSet('remitos', { id: tempId, ...fullData, fecha: now, createdAt: now })
  clearCache(CACHE_KEYS.remitos)

  try {
    const docRef = await addDoc(collection(getDb(), COLECCIONES.remitos), fullData)
    await localDelete('remitos', tempId)
    await localSet('remitos', { id: docRef.id, ...fullData, fecha: now, createdAt: now })
    return { id: docRef.id, numeroRemito }
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: tempId, operation: 'create',
      data: fullData, timestamp: Date.now(), retryCount: 0,
    })
    return { id: tempId, numeroRemito }
  }
}

export async function getRemitos(filters?: {
  cliente?: string
  estado?: string
  desde?: Date
  hasta?: Date
}) {
  try {
    const constraints: QueryConstraint[] = []
    constraints.push(orderBy('numeroRemito', 'desc'))

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

    syncManager.cacheCollection('remitos', remitos.map(r => ({ ...r, id: r.id! }))).catch(() => {})

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

export async function getAllRemitos(force = false) {
  if (!force) {
    const cached = getCached<Remito[]>(CACHE_KEYS.remitos)
    if (cached) return cached
  }
  try {
    const q = query(
      collection(getDb(), COLECCIONES.remitos),
      orderBy('numeroRemito', 'desc')
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
    setCache(CACHE_KEYS.remitos, data)
    syncManager.cacheCollection('remitos', data.map(r => ({ ...r, id: r.id! }))).catch(() => {})
    return data
  } catch (error) {
    const localData = await localGetAll<Remito>('remitos')
    localData.sort((a, b) => (b.numeroRemito ?? 0) - (a.numeroRemito ?? 0))
    if (localData.length > 0) {
      setCache(CACHE_KEYS.remitos, localData)
      return localData
    }
    throw error
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

export async function updateRemitoEstado(
  id: string,
  estado: Remito['estado']
) {
  const existing = await localGet<any>('remitos', id)
  if (existing) {
    await localSet('remitos', { ...existing, estado, id })
  }
  clearCache(CACHE_KEYS.remitos)
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
      ...existing,
      nroFactura, facturado: true, facturaAnulada: false, fechaFacturado: new Date(),
      id,
    })
  }
  clearCache(CACHE_KEYS.remitos)

  try {
    const ref = doc(getDb(), COLECCIONES.remitos, id)
    await updateDoc(ref, {
      nroFactura,
      facturado: true,
      facturaAnulada: false,
      fechaFacturado: Timestamp.now(),
    })

    try {
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        await setDoc(doc(getDb(), 'remitos_facturados', id), {
          ...data,
          idRespaldo: id,
          respaldoEn: Timestamp.now(),
        })
      }
    } catch (err) {
      console.error('Error al hacer backup del remito facturado:', err)
    }
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
  clearCache(CACHE_KEYS.remitos)
  try {
    const ref = doc(getDb(), COLECCIONES.remitos, id)
    await updateDoc(ref, { nroNC, montoNC, facturaAnulada: true })
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

export async function agregarEntrega(
  remitoId: string,
  data: { items: { idProducto: string; nombreProducto: string; cantidad: number }[]; fecha: Date }
) {
  const nuevaEntrega: Entrega = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    fecha: data.fecha,
    createdAt: new Date(),
    items: data.items.map((item) => ({
      idProducto: item.idProducto,
      nombreProducto: item.nombreProducto,
      cantidad: item.cantidad,
    })),
  }

  const existing = await localGet<any>('remitos', remitoId)
  if (existing) {
    const entregasActuales: Entrega[] = existing.entregas ?? []
    await localSet('remitos', {
      ...existing, entregas: [...entregasActuales, nuevaEntrega], id: remitoId,
    })
  }

  try {
    const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Remito no encontrado')

    const remito = snap.data()
    const entregasActuales: Entrega[] = remito.entregas ?? []
    const nuevasEntregas = [...entregasActuales, nuevaEntrega]
    await updateDoc(ref, { entregas: nuevasEntregas })
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: remitoId, operation: 'update',
      data: { entregas: existing?.entregas },
      timestamp: Date.now(), retryCount: 0,
    })
  }

  return nuevaEntrega
}

export async function eliminarEntrega(remitoId: string, entregaId: string) {
  let nuevasEntregas: Entrega[] = []

  const existing = await localGet<any>('remitos', remitoId)
  if (existing) {
    const entregasActuales: Entrega[] = existing.entregas ?? []
    nuevasEntregas = entregasActuales.filter((e) => e.id !== entregaId)
    await localSet('remitos', { ...existing, entregas: nuevasEntregas, id: remitoId })
  }

  try {
    const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Remito no encontrado')

    const data = snap.data()
    const entregasActuales: Entrega[] = data.entregas ?? []
    nuevasEntregas = entregasActuales.filter((e) => e.id !== entregaId)
    await updateDoc(ref, { entregas: nuevasEntregas })
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: remitoId, operation: 'update',
      data: { entregas: nuevasEntregas },
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

export async function actualizarEntrega(
  remitoId: string,
  entregaId: string,
  data: { items: { idProducto: string; nombreProducto: string; cantidad: number }[]; fecha: Date }
) {
  const existing = await localGet<any>('remitos', remitoId)
  let entregasActualizadas: Entrega[] = []
  if (existing) {
    const entregasActuales: Entrega[] = existing.entregas ?? []
    entregasActualizadas = entregasActuales.map((e) =>
      e.id === entregaId
        ? { ...e, fecha: data.fecha, items: data.items.map((item) => ({ idProducto: item.idProducto, nombreProducto: item.nombreProducto, cantidad: item.cantidad })) }
        : e
    )
    await localSet('remitos', { ...existing, entregas: entregasActualizadas, id: remitoId })
  }

  try {
    const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Remito no encontrado')
    const remito = snap.data()
    const entregasActuales: Entrega[] = remito.entregas ?? []
    entregasActualizadas = entregasActuales.map((e) =>
      e.id === entregaId
        ? { ...e, fecha: data.fecha, items: data.items.map((item) => ({ idProducto: item.idProducto, nombreProducto: item.nombreProducto, cantidad: item.cantidad })) }
        : e
    )
    await updateDoc(ref, { entregas: entregasActualizadas })
  } catch {
    await enqueueOperation({
      collection: 'remitos', docId: remitoId, operation: 'update',
      data: { entregas: entregasActualizadas },
      timestamp: Date.now(), retryCount: 0,
    })
  }
}

// ============ DASHBOARD STATS ============

export async function getDashboardStats(): Promise<{
  remitosMes: number
  totalFacturado: number
  clientesActivos: number
  ultimosRemitos: Remito[]
}> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  try {
    const q = query(
      collection(getDb(), COLECCIONES.remitos),
      orderBy('createdAt', 'desc'),
      limit(5)
    )
    const snapshot = await getDocs(q)
    const ultimosRemitos = snapshot.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        fecha: d.fecha?.toDate?.() ?? d.fecha,
        createdAt: d.createdAt?.toDate?.() ?? d.createdAt,
      } as Remito
    })

    const qMes = query(
      collection(getDb(), COLECCIONES.remitos),
      where('createdAt', '>=', Timestamp.fromDate(startOfMonth)),
      orderBy('createdAt', 'desc')
    )
    const snapMes = await getDocs(qMes)
    let remitosMes = 0
    let totalFacturado = 0
    snapMes.docs.forEach((doc) => {
      const d = doc.data()
      if (d.estado !== 'Anulado') {
        remitosMes++
        totalFacturado += d.totalGeneral ?? 0
      }
    })

    const clientes = await getAllClientes()
    const clientesActivos = clientes.length

    return { remitosMes, totalFacturado, clientesActivos, ultimosRemitos }
  } catch {
    const remitos = await localGetAll<Remito>('remitos')

    const ultimosRemitos = remitos
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return db - da
      })
      .slice(0, 5)

    const remitosMes = remitos.filter(r => {
      const d = r.createdAt ? new Date(r.createdAt) : new Date(r.fecha)
      return d >= startOfMonth && r.estado !== 'Anulado'
    }).length

    const totalFacturado = remitos
      .filter(r => {
        const d = r.createdAt ? new Date(r.createdAt) : new Date(r.fecha)
        return d >= startOfMonth && r.estado !== 'Anulado'
      })
      .reduce((sum, r) => sum + (r.totalGeneral ?? 0), 0)

    const clientes = await localGetAll<Cliente>('clientes')
    const clientesActivos = clientes.length

    return { remitosMes, totalFacturado, clientesActivos, ultimosRemitos }
  }
}

export { clearCache }
