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
  Timestamp,
  QueryConstraint,
  DocumentSnapshot,
  setDoc,
  writeBatch,
  runTransaction,
  getCountFromServer,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  localGetAll, localGet, localSet,
  enqueueOperation, generateLocalId,
} from '@/lib/db'
import { syncManager } from '@/lib/sync'
import { localFirstRead, markSynced } from '@/lib/local-first'
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Cliente } from './types'

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

async function getNextCodigoCliente(): Promise<string> {
  try {
    const _db = getDb()
    const contadorRef = doc(_db, 'contadores', 'cliente')
    const next = await runTransaction(_db, async (transaction) => {
      const snap = await transaction.get(contadorRef)
      if (!snap.exists()) {
        const allSnap = await getDocs(collection(_db, 'clientes'))
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
      const clientes = await localGetAll<Cliente>('clientes')
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
let _clientesLastSort = 'codigoCliente'
let _clientesLastDir: 'asc' | 'desc' = 'asc'

const CLIENTES_SORT_FIELDS = ['codigoCliente', 'razonSocial', 'tipoDocumento', 'numeroDocumento', 'domicilio', 'localidad', 'telefono', 'condicionIVA'] as const

export async function getClientes(search?: string, page = 1, pageSize = 20, sortField = 'codigoCliente' as string, sortDir: 'asc' | 'desc' = 'asc') {
  try {
    const _db = getDb()
    const field = CLIENTES_SORT_FIELDS.includes(sortField as any) ? sortField : 'codigoCliente'
    if (field !== _clientesLastSort || sortDir !== _clientesLastDir) {
      _clientesCursors.clear()
      _clientesLastSort = field
      _clientesLastDir = sortDir
    }
    const baseQuery = collection(_db, 'clientes')
    const order = orderBy(field, sortDir)

    let total = 0
    try {
      const countSnap = await getCountFromServer(query(baseQuery, order))
      total = countSnap.data().count
    } catch {
      const cached = await localGetAll<Cliente>('clientes')
      total = cached.length
    }

    const dataConstraints: QueryConstraint[] = [order, limit(pageSize)]
    if (page > 1 && _clientesCursors.has(page - 1)) {
      dataConstraints.push(startAfter(_clientesCursors.get(page - 1)!))
    }

    const q = query(baseQuery, ...dataConstraints)
    const snapshot = await getDocs(q)

    if (snapshot.docs.length > 0) {
      _clientesCursors.set(page, snapshot.docs[snapshot.docs.length - 1])
    }
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

export async function getAllClientes(options?: { forceRefresh?: boolean }) {
  if (options?.forceRefresh) {
    const data = await fetchClientesFromFirebase()
    return data
  }
  return localFirstRead<Cliente>('clientes', fetchClientesFromFirebase)
}

async function fetchClientesFromFirebase(): Promise<Cliente[]> {
  const q = query(collection(getDb(), 'clientes'), orderBy('razonSocial', 'asc'))
  const snapshot = await getDocs(q)
  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Cliente[]
  await syncManager.cacheCollection('clientes', data.map(c => ({ ...c, id: c.id! })))
  await markSynced('clientes')
  return data
}

export async function getCliente(id: string) {
  try {
    const docRef = doc(getDb(), 'clientes', id)
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
    const docRef = await addDoc(collection(getDb(), 'clientes'), fullData)
    await localSet('clientes', { id: docRef.id, ...fullData })
    return docRef.id
  } catch {
    throw new Error('Error al crear cliente en Firebase')
  }
}

export async function updateCliente(id: string, data: Partial<Cliente>) {
  try {
    await updateDoc(doc(getDb(), 'clientes', id), data)
  } catch {
    throw new Error('Error al actualizar cliente en Firebase')
  }
}

export async function deleteCliente(id: string) {
  try {
    await deleteDoc(doc(getDb(), 'clientes', id))
  } catch {
    throw new Error('Error al eliminar cliente en Firebase')
  }
}

export async function clienteExists(numeroDocumento: string, excludeId?: string) {
  try {
    const q = query(
      collection(getDb(), 'clientes'),
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
        const contadorRef = doc(_db, 'contadores', 'cliente')
        const snap = await getDoc(contadorRef)
        let next: number
        if (!snap.exists()) {
          const snapshot = await getDocs(collection(_db, 'clientes'))
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
      const ref = doc(collection(_db, 'clientes'))
      const docData = { ...item, codigoCliente, createdAt: Timestamp.now() }
      batch.set(ref, docData)
      await localSet('clientes', { id: ref.id, ...docData })
      results.push({ label: `${item.razonSocial} (${item.numeroDocumento})`, ok: true })
    }

    await batch.commit()
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
