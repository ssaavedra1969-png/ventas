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
  limit,
  startAfter,
  getCountFromServer,
  Timestamp,
  QueryConstraint,
  setDoc,
  writeBatch,
  runTransaction,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import { clearCache } from './cache'
import {
  localGetAll, localGet, localSet, localDelete,
  enqueueOperation, generateLocalId,
} from './db'
import { syncManager } from './sync'
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Cliente, Producto, Remito, RemitoItem, Vendedor, EmpresaConfig, Pago, Entrega, Vehiculo, Chofer } from '@/types'

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
    const _db = getDb()
    const contadorRef = doc(_db, COLECCIONES.contadores, 'cliente')
    const next = await runTransaction(_db, async (transaction) => {
      const snap = await transaction.get(contadorRef)
      if (!snap.exists()) {
        const allSnap = await getDocs(collection(_db, COLECCIONES.clientes))
        let maxNumeric = 0
        allSnap.docs.forEach(d => {
          const cod = d.data().codigoCliente
          if (cod) {
            const num = parseInt(cod, 10)
            if (!isNaN(num) && num > maxNumeric) maxNumeric = num
          }
        })
        const n = maxNumeric + 1
        transaction.set(contadorRef, { ultimo: n })
        return n
      }
      const n = snap.data().ultimo + 1
      transaction.update(contadorRef, { ultimo: n })
      return n
    })
    await localSet('contadores', { id: 'cliente', ultimo: next })
    return String(next).padStart(5, '0')
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

const _clientesCursors = new Map<number, DocumentSnapshot>()

export async function getClientes(search?: string, page = 1, pageSize = 20) {
  try {
    const _db = getDb()
    const baseQuery = collection(_db, COLECCIONES.clientes)
    const order = orderBy('codigoCliente', 'asc')

    // Total count (1 read, lightweight)
    let total = 0
    try {
      const countSnap = await getCountFromServer(query(baseQuery, order))
      total = countSnap.data().count
    } catch {
      const cached = await localGetAll<Cliente>('clientes')
      total = cached.length
    }

    // Build paginated query
    const dataConstraints: QueryConstraint[] = [order, limit(pageSize)]
    if (page > 1 && _clientesCursors.has(page - 1)) {
      dataConstraints.push(startAfter(_clientesCursors.get(page - 1)!))
    }

    const q = query(baseQuery, ...dataConstraints)
    const snapshot = await getDocs(q)

    // Store cursor for next page
    if (snapshot.docs.length > 0) {
      _clientesCursors.set(page, snapshot.docs[snapshot.docs.length - 1])
    }
    // Clean up old cursors beyond current page
    Array.from(_clientesCursors.keys()).forEach(key => {
      if (key >= page + 2) _clientesCursors.delete(key)
    })

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

    // Cache en IndexedDB para fallback offline
    syncManager.cacheCollection('clientes', snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as any)).catch(() => {})

    return { data: clientes, total, totalPages: Math.ceil(total / pageSize) }
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

export async function getAllClientes() {
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
    await syncManager.cacheCollection('clientes', data.map(c => ({ ...c, id: c.id! })))
    return data
  } catch (error) {
    const localData = await localGetAll<Cliente>('clientes')
    if (localData.length > 0) return localData
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

  try {
    const docRef = await addDoc(collection(getDb(), COLECCIONES.clientes), fullData)
    await localSet('clientes', { id: docRef.id, ...fullData })
    clearCache(CACHE_KEYS.clientes)
    _clientesCursors.clear()
    return docRef.id
  } catch {
    throw new Error('Error al crear cliente en Firebase')
  }
}

export async function updateCliente(id: string, data: Partial<Cliente>) {
  try {
    await updateDoc(doc(getDb(), COLECCIONES.clientes, id), data)
    clearCache(CACHE_KEYS.clientes)
    _clientesCursors.clear()
  } catch {
    throw new Error('Error al actualizar cliente en Firebase')
  }
}

export async function deleteCliente(id: string) {
  try {
    await deleteDoc(doc(getDb(), COLECCIONES.clientes, id))
    clearCache(CACHE_KEYS.clientes)
    _clientesCursors.clear()
  } catch {
    throw new Error('Error al eliminar cliente en Firebase')
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

const _productosCursors = new Map<number, DocumentSnapshot>()

export async function getProductos(search?: string, page = 1, pageSize = 20) {
  try {
    const _db = getDb()
    const baseQuery = collection(_db, COLECCIONES.productos)
    const order = orderBy('codigoProducto', 'asc')

    // Total count (1 read)
    let total = 0
    try {
      const countSnap = await getCountFromServer(query(baseQuery, order))
      total = countSnap.data().count
    } catch {
      const cached = await localGetAll<Producto>('productos')
      total = cached.length
    }

    // Paginated query
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
      collection(getDb(), COLECCIONES.productos),
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
    const docRef = await addDoc(collection(getDb(), COLECCIONES.productos), fullData)
    await localSet('productos', { id: docRef.id, ...fullData })
    clearCache(CACHE_KEYS.productos)
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
    await updateDoc(doc(getDb(), COLECCIONES.productos, id), updateData)
    clearCache(CACHE_KEYS.productos)
    _productosCursors.clear()
  } catch {
    throw new Error('Error al actualizar producto en Firebase')
  }
}

export async function deleteProducto(id: string) {
  try {
    await deleteDoc(doc(getDb(), COLECCIONES.productos, id))
    clearCache(CACHE_KEYS.productos)
    _productosCursors.clear()
  } catch {
    throw new Error('Error al eliminar producto en Firebase')
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

// ============ VEHÍCULOS ============

export async function getAllVehiculos(): Promise<Vehiculo[]> {
  try {
    const snapshot = await getDocs(collection(getDb(), 'vehiculos'))
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehiculo))
    data.sort((a, b) => a.patente.localeCompare(b.patente))
    await syncManager.cacheCollection('vehiculos', data.map(v => ({ ...v, id: v.id! })))
    return data
  } catch {
    const result = await localGetAll<Vehiculo>('vehiculos')
    return result.sort((a, b) => a.patente.localeCompare(b.patente))
  }
}

export async function createVehiculo(data: Omit<Vehiculo, 'id' | 'createdAt'>): Promise<string> {
  try {
    const ref = doc(collection(getDb(), 'vehiculos'))
    const id = ref.id
    await setDoc(ref, { ...data, createdAt: Timestamp.now() })
    await localSet('vehiculos', { ...data, id, createdAt: new Date() } as any)
    return id
  } catch {
    throw new Error('Error al crear vehículo en Firebase')
  }
}

export async function deleteVehiculo(id: string): Promise<void> {
  try {
    await deleteDoc(doc(getDb(), 'vehiculos', id))
  } catch {
    throw new Error('Error al eliminar vehículo en Firebase')
  }
}

export async function importVehiculos(data: { patente: string; marca: string }[]): Promise<{ label: string; ok: boolean; error?: string }[]> {
  const results: { label: string; ok: boolean; error?: string }[] = []
  for (const v of data) {
    try {
      await createVehiculo(v)
      results.push({ label: v.patente, ok: true })
    } catch (err) {
      results.push({ label: v.patente, ok: false, error: String(err) })
    }
  }
  return results
}

export async function importChoferes(data: { nombre: string; documento?: string; telefono?: string }[]): Promise<{ label: string; ok: boolean; error?: string }[]> {
  const results: { label: string; ok: boolean; error?: string }[] = []
  for (const c of data) {
    try {
      await createChofer(c)
      results.push({ label: c.nombre, ok: true })
    } catch (err) {
      results.push({ label: c.nombre, ok: false, error: String(err) })
    }
  }
  return results
}

// ============ CHOFERES ============

export async function getAllChoferes(): Promise<Chofer[]> {
  try {
    const snapshot = await getDocs(collection(getDb(), 'choferes'))
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chofer))
    data.sort((a, b) => a.nombre.localeCompare(b.nombre))
    await syncManager.cacheCollection('choferes', data.map(c => ({ ...c, id: c.id! })))
    return data
  } catch {
    const result = await localGetAll<Chofer>('choferes')
    return result.sort((a, b) => a.nombre.localeCompare(b.nombre))
  }
}

export async function createChofer(data: Omit<Chofer, 'id' | 'createdAt'>): Promise<string> {
  try {
    const ref = doc(collection(getDb(), 'choferes'))
    const id = ref.id
    await setDoc(ref, { ...data, createdAt: Timestamp.now() })
    await localSet('choferes', { ...data, id, createdAt: new Date() } as any)
    return id
  } catch {
    throw new Error('Error al crear chofer en Firebase')
  }
}

export async function updateChofer(id: string, data: Partial<Chofer>): Promise<void> {
  try {
    await updateDoc(doc(getDb(), 'choferes', id), data)
  } catch {
    throw new Error('Error al actualizar chofer en Firebase')
  }
}

export async function deleteChofer(id: string): Promise<void> {
  try {
    await deleteDoc(doc(getDb(), 'choferes', id))
  } catch {
    throw new Error('Error al eliminar chofer en Firebase')
  }
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
    const _db = getDb()
    const contadorRef = doc(_db, COLECCIONES.contadores, `remito_${year}`)
    const next = await runTransaction(_db, async (transaction) => {
      const snap = await transaction.get(contadorRef)
      if (!snap.exists()) {
        transaction.set(contadorRef, { ultimo: 1 })
        return 1
      }
      const n = snap.data().ultimo + 1
      transaction.update(contadorRef, { ultimo: n })
      return n
    })
    await localSet('contadores', { id: `remito_${year}`, ultimo: next })
    return next
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
  fecha?: string
  observaciones?: string
}) {
  const now = data.fecha ? new Date(data.fecha) : new Date()
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

  try {
    const docRef = await addDoc(collection(getDb(), COLECCIONES.remitos), fullData)
    await localSet('remitos', { id: docRef.id, ...fullData, fecha: now, createdAt: now })
    return { id: docRef.id, numeroRemito }
  } catch {
    throw new Error('Error al crear remito en Firebase')
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
  } catch (error) {
    const localData = await localGetAll<Remito>('remitos')
    localData.sort((a, b) => (b.numeroRemito ?? 0) - (a.numeroRemito ?? 0))
    if (localData.length > 0) return localData
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
  data: {
    items: { idProducto: string; nombreProducto: string; cantidad: number }[]
    fecha: Date
    vehiculoPatente?: string
    vehiculoMarca?: string
    choferNombre?: string
  }
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
    ...(data.vehiculoPatente ? { vehiculoPatente: data.vehiculoPatente } : {}),
    ...(data.vehiculoMarca ? { vehiculoMarca: data.vehiculoMarca } : {}),
    ...(data.choferNombre ? { choferNombre: data.choferNombre } : {}),
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
    throw new Error('Error al guardar entrega en Firebase')
  }

  return nuevaEntrega
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

export async function actualizarEntrega(
  remitoId: string,
  entregaId: string,
  data: {
    items: { idProducto: string; nombreProducto: string; cantidad: number }[]
    fecha: Date
    vehiculoPatente?: string
    vehiculoMarca?: string
    choferNombre?: string
  }
) {
  try {
    const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
    const snap = await getDoc(ref)
    if (!snap.exists()) throw new Error('Remito no encontrado')
    const remito = snap.data()
    const entregasActuales: Entrega[] = remito.entregas ?? []
    const entregasActualizadas = entregasActuales.map((e) =>
      e.id === entregaId
        ? {
            ...e,
            fecha: data.fecha,
            items: data.items.map((item) => ({ idProducto: item.idProducto, nombreProducto: item.nombreProducto, cantidad: item.cantidad })),
            ...(data.vehiculoPatente ? { vehiculoPatente: data.vehiculoPatente } : {}),
            ...(data.vehiculoMarca ? { vehiculoMarca: data.vehiculoMarca } : {}),
            ...(data.choferNombre ? { choferNombre: data.choferNombre } : {}),
          }
        : e
    )
    await updateDoc(ref, { entregas: entregasActualizadas })
  } catch {
    throw new Error('Error al actualizar entrega en Firebase')
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
    const allRemitos = await getAllRemitos()
    const clientes = await getAllClientes()

    const sorted = [...allRemitos].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return db - da
    })

    const ultimosRemitos = sorted.slice(0, 5)

    let remitosMes = 0
    let totalFacturado = 0
    for (const r of allRemitos) {
      const d = r.createdAt ? new Date(r.createdAt) : new Date(r.fecha)
      if (d >= startOfMonth && r.estado !== 'Anulado') {
        remitosMes++
        totalFacturado += r.totalGeneral ?? 0
      }
    }

    return { remitosMes, totalFacturado, clientesActivos: clientes.length, ultimosRemitos }
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
