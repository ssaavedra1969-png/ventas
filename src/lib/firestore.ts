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
} from 'firebase/firestore'
import { db } from './firebase'
import type { Cliente, Producto, Remito, RemitoItem } from '@/types'

const COLECCIONES = {
  clientes: 'clientes',
  productos: 'productos',
  remitos: 'remitos',
  contadores: 'contadores',
} as const

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

// ============ CLIENTES ============

export async function getClientes(search?: string, page = 1, pageSize = 10) {
  const _db = getDb()
  const constraints: QueryConstraint[] = []
  constraints.push(orderBy('createdAt', 'desc'))

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
        c.cuit.toLowerCase().includes(s) ||
        c.razonSocial.toLowerCase().includes(s)
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

export async function getAllClientes() {
  const q = query(
    collection(getDb(), COLECCIONES.clientes),
    orderBy('razonSocial', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Cliente[]
}

export async function getCliente(id: string) {
  const docRef = doc(getDb(), COLECCIONES.clientes, id)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Cliente
}

export async function createCliente(data: Omit<Cliente, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(getDb(), COLECCIONES.clientes), {
    ...data,
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

export async function clienteExists(cuit: string, excludeId?: string) {
  const q = query(
    collection(getDb(), COLECCIONES.clientes),
    where('cuit', '==', cuit)
  )
  const snapshot = await getDocs(q)
  if (snapshot.empty) return false
  if (excludeId && snapshot.docs[0].id === excludeId) return false
  return true
}

// ============ PRODUCTOS ============

export async function getProductos(search?: string, page = 1, pageSize = 10) {
  const constraints: QueryConstraint[] = []
  constraints.push(orderBy('createdAt', 'desc'))

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

export async function getAllProductos() {
  const q = query(
    collection(getDb(), COLECCIONES.productos),
    orderBy('nombre', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Producto[]
}

export async function createProducto(data: Omit<Producto, 'id' | 'createdAt'>) {
  const docRef = await addDoc(collection(getDb(), COLECCIONES.productos), {
    ...data,
    stock: data.stock ?? 0,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export async function updateProducto(id: string, data: Partial<Producto>) {
  await updateDoc(doc(getDb(), COLECCIONES.productos, id), data)
}

export async function deleteProducto(id: string) {
  await deleteDoc(doc(getDb(), COLECCIONES.productos, id))
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
  items: RemitoItem[]
  observaciones?: string
}) {
  const now = new Date()
  const year = now.getFullYear()
  const numeroRemito = await getNextNumeroRemito(year)

  const subtotalGeneral = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const iva = subtotalGeneral * 0.21
  const totalGeneral = subtotalGeneral + iva

  const docRef = await addDoc(collection(getDb(), COLECCIONES.remitos), {
    numeroRemito,
    fecha: Timestamp.fromDate(now),
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    items: data.items,
    subtotalGeneral,
    iva,
    totalGeneral,
    estado: 'Pendiente',
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
        r.clienteData.razonSocial.toLowerCase().includes(s) ||
        r.clienteData.cuit.toLowerCase().includes(s)
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
  estado: 'Pendiente' | 'Entregado' | 'Anulado'
) {
  await updateDoc(doc(getDb(), COLECCIONES.remitos, id), { estado })
}

export async function getDashboardStats(): Promise<{
  remitosMes: number
  totalFacturado: number
  clientesActivos: number
  ultimosRemitos: Remito[]
}> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const q = query(
    collection(getDb(), COLECCIONES.remitos),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)

  const remitos = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    fecha: doc.data().fecha?.toDate?.() ?? doc.data().fecha,
    createdAt: doc.data().createdAt?.toDate?.() ?? doc.data().createdAt,
  })) as Remito[]

  const remitosMes = remitos.filter(
    (r) => r.createdAt! >= startOfMonth && r.estado !== 'Anulado'
  ).length

  const totalFacturado = remitos
    .filter((r) => r.estado !== 'Anulado')
    .reduce((sum, r) => sum + r.totalGeneral, 0)

  const clientesSnapshot = await getDocs(
    collection(getDb(), COLECCIONES.clientes)
  )
  const clientesActivos = clientesSnapshot.size

  const ultimosRemitos = remitos.slice(0, 5)

  return { remitosMes, totalFacturado, clientesActivos, ultimosRemitos }
}
