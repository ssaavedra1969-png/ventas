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
import type { Cliente, Producto, Remito, RemitoItem, Vendedor, EmpresaConfig, Pago } from '@/types'

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
  const _db = getDb()
  const docRef = doc(_db, COLECCIONES.configuracion, 'empresa')
  const snap = await getDoc(docRef)
  if (!snap.exists()) {
    await setDoc(docRef, DEFAULT_EMPRESA)
    return DEFAULT_EMPRESA
  }
  return snap.data() as EmpresaConfig
}

export async function saveEmpresaConfig(data: EmpresaConfig): Promise<void> {
  const _db = getDb()
  const docRef = doc(_db, COLECCIONES.configuracion, 'empresa')
  await setDoc(docRef, data)
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
    return String(next).padStart(5, '0')
  }

  const ultimo = snap.data().ultimo + 1
  await updateDoc(contadorRef, { ultimo })
  return String(ultimo).padStart(5, '0')
}

export async function getClientes(search?: string, page = 1, pageSize = 10) {
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

  return {
    data: paginated,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getAllClientes(force = false) {
  if (!force) {
    const cached = getCached<Cliente[]>(CACHE_KEYS.clientes)
    if (cached) return cached
  }
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
  return data
}

export async function getCliente(id: string) {
  const docRef = doc(getDb(), COLECCIONES.clientes, id)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Cliente
}

export async function createCliente(data: Omit<Cliente, 'id' | 'createdAt' | 'codigoCliente'>) {
  const codigoCliente = await getNextCodigoCliente()
  const docRef = await addDoc(collection(getDb(), COLECCIONES.clientes), {
    ...data,
    codigoCliente,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateCliente(id: string, data: Partial<Cliente>) {
  await updateDoc(doc(getDb(), COLECCIONES.clientes, id), data)
}

export async function deleteCliente(id: string) {
  await deleteDoc(doc(getDb(), COLECCIONES.clientes, id))
}

export async function clienteExists(numeroDocumento: string, excludeId?: string) {
  const q = query(
    collection(getDb(), COLECCIONES.clientes),
    where('numeroDocumento', '==', numeroDocumento)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return false
  if (excludeId && snapshot.docs[0].id === excludeId) return false
  return true
}

export async function createMultipleClientes(
  data: Omit<Cliente, 'id' | 'createdAt'>[]
) {
  const _db = getDb()
  const batch = writeBatch(_db)
  const results: { label: string; ok: boolean; error?: string }[] = []

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
    batch.set(ref, { ...item, codigoCliente, createdAt: Timestamp.now() })
    results.push({ label: `${item.razonSocial} (${item.numeroDocumento})`, ok: true })
  }

  await batch.commit()
  return results
}

// ============ PRODUCTOS ============

export async function getProductos(search?: string, page = 1, pageSize = 10) {
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

  return {
    data: paginated,
    total,
    totalPages: Math.ceil(total / pageSize),
  }
}

export async function getAllProductos(force = false) {
  if (!force) {
    const cached = getCached<Producto[]>(CACHE_KEYS.productos)
    if (cached) return cached
  }
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
  return data
}

export async function createProducto(data: Omit<Producto, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(getDb(), COLECCIONES.productos), {
    ...data,
    codigoProducto: data.codigoProducto ?? '',
    precioSinIVA: data.precioSinIVA ?? Math.round((data.valorUnitario / 1.21) * 100) / 100,
    stock: data.stock ?? 0,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateProducto(id: string, data: Partial<Producto>) {
  const updateData = { ...data }
  if (updateData.valorUnitario !== undefined && updateData.precioSinIVA === undefined) {
    updateData.precioSinIVA = Math.round((updateData.valorUnitario / 1.21) * 100) / 100
  }
  await updateDoc(doc(getDb(), COLECCIONES.productos, id), updateData)
}

export async function deleteProducto(id: string) {
  await deleteDoc(doc(getDb(), COLECCIONES.productos, id))
}

// ============ VENDEDORES ============

export async function getVendedores() {
  const q = query(
    collection(getDb(), COLECCIONES.vendedores),
    orderBy('nombre', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Vendedor[]
}

export async function createVendedor(data: Omit<Vendedor, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(getDb(), COLECCIONES.vendedores), {
    ...data,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateVendedor(id: string, data: Partial<Vendedor>) {
  await updateDoc(doc(getDb(), COLECCIONES.vendedores, id), data)
}

export async function deleteVendedor(id: string) {
  await deleteDoc(doc(getDb(), COLECCIONES.vendedores, id))
}

export async function vendedorCodigoExists(codigo: string, excludeId?: string) {
  const q = query(
    collection(getDb(), COLECCIONES.vendedores),
    where('codigo', '==', codigo)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return false
  if (excludeId && snapshot.docs[0].id === excludeId) return false
  return true
}

export async function createMultipleVendedores(
  data: Omit<Vendedor, 'id' | 'createdAt'>[]
) {
  const _db = getDb()
  const batch = writeBatch(_db)
  const results: { label: string; ok: boolean; error?: string }[] = []

  for (const item of data) {
    const ref = doc(collection(_db, COLECCIONES.vendedores))
    batch.set(ref, { ...item, activo: true, createdAt: Timestamp.now() })
    results.push({ label: `${item.nombre} (${item.codigo})`, ok: true })
  }

  await batch.commit()
  return results
}

export async function createMultipleProductos(
  data: Omit<Producto, 'id' | 'createdAt'>[]
) {
  const _db = getDb()
  const batch = writeBatch(_db)
  const results: { label: string; ok: boolean; error?: string }[] = []

  for (const item of data) {
    const ref = doc(collection(_db, COLECCIONES.productos))
    batch.set(ref, {
      ...item,
      precioSinIVA: item.precioSinIVA ?? Math.round((item.valorUnitario / 1.21) * 100) / 100,
      stock: item.stock ?? 0,
      createdAt: Timestamp.now(),
    })
    results.push({ label: `${item.nombre}`, ok: true })
  }

  await batch.commit()
  return results
}

// ============ REMITOS ============

async function getNextNumeroRemito(year: number): Promise<number> {
  const contadorRef = doc(getDb(), COLECCIONES.contadores, `remito_${year}`)
  const snap = await getDoc(contadorRef)

  if (!snap.exists()) {
    await setDoc(contadorRef, { ultimo: 1 })
    return 1
  }

  const ultimo = snap.data().ultimo + 1
  await updateDoc(contadorRef, { ultimo })
  return ultimo
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

  const docRef = await addDoc(collection(getDb(), COLECCIONES.remitos), {
    numeroRemito,
    fecha: Timestamp.fromDate(now),
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    vendedor: data.vendedor || null,
    items: data.items,
    subtotalGeneral,
    iva,
    totalGeneral,
    estado: 'Enviado',
    observaciones: data.observaciones || '',
    createdAt: Timestamp.now(),
  })

  return { id: docRef.id, numeroRemito }
}

export async function getRemitos(filters?: {
  cliente?: string
  estado?: string
  desde?: Date
  hasta?: Date
}) {
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

  return remitos
}

export async function getAllRemitos(force = false) {
  if (!force) {
    const cached = getCached<Remito[]>(CACHE_KEYS.remitos)
    if (cached) return cached
  }
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
    } as Remito
  })
  setCache(CACHE_KEYS.remitos, data)
  return data
}

export async function getRemito(id: string) {
  const docRef = doc(getDb(), COLECCIONES.remitos, id)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    id: snap.id,
    ...data,
    fecha: data.fecha?.toDate?.() ?? data.fecha,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  } as Remito
}

export async function updateRemitoEstado(
  id: string,
  estado: Remito['estado']
) {
  await updateDoc(doc(getDb(), COLECCIONES.remitos, id), { estado })
}

export async function updateRemitoNroFactura(id: string, nroFactura: string) {
  const ref = doc(getDb(), COLECCIONES.remitos, id)
  await updateDoc(ref, {
    nroFactura,
    facturado: true,
    facturaAnulada: false,
    fechaFacturado: Timestamp.now(),
  })
  // Backup automático en segundo plano
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
}

export async function updateRemitoNC(id: string, nroNC: string, montoNC: number) {
  const ref = doc(getDb(), COLECCIONES.remitos, id)
  await updateDoc(ref, {
    nroNC,
    montoNC,
    facturaAnulada: true,
  })
}

export async function agregarPago(
  remitoId: string,
  pago: { monto: number; metodo: Pago['metodo']; referencia?: string; fecha: Date }
) {
  const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Remito no encontrado')

  const data = snap.data()
  const pagosActuales: Pago[] = data.pagos ?? []
  const nuevoPago = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    monto: pago.monto,
    metodo: pago.metodo,
    referencia: pago.referencia,
    fecha: Timestamp.fromDate(pago.fecha),
    createdAt: Timestamp.now(),
  }
  const nuevosPagos = [...pagosActuales, nuevoPago]
  const totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0)

  await updateDoc(ref, { pagos: nuevosPagos, totalPagado })
  return nuevoPago
}

export async function eliminarPago(remitoId: string, pagoId: string) {
  const ref = doc(getDb(), COLECCIONES.remitos, remitoId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Remito no encontrado')

  const data = snap.data()
  const pagosActuales: Pago[] = data.pagos ?? []
  const nuevosPagos = pagosActuales.filter((p) => p.id !== pagoId)
  const totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0)

  await updateDoc(ref, { pagos: nuevosPagos, totalPagado })
}

export async function getDashboardStats(): Promise<{
  remitosMes: number
  totalFacturado: number
  clientesActivos: number
  ultimosRemitos: Remito[]
}> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Últimos 5 remitos (lectura acotada)
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

  // Remitos del mes con filtro en Firestore
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

  // Clientes: usa caché si está disponible
  const clientes = await getAllClientes()
  const clientesActivos = clientes.length

  return { remitosMes, totalFacturado, clientesActivos, ultimosRemitos }
}

export { clearCache }
