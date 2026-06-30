import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, orderBy, Timestamp, runTransaction,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGet, localSet } from '@/lib/db'
import type { RemitoAprobado, RemitoItem, ClienteData, VendedorInfo } from '@/types'
/* eslint-disable @typescript-eslint/no-explicit-any */
type DocData = Record<string, any>

const COL = 'remitos_aprobados'

function getDb() {
  if (!db) throw new Error('Firebase no está configurado.')
  return db
}

async function getNextNumero(year: number): Promise<number> {
  try {
    const _db = getDb()
    const ref = doc(_db, 'contadores', `remito_aprobado_${year}`)
    const next = await runTransaction(_db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) {
        tx.set(ref, { ultimo: 1 })
        return 1
      }
      const n = snap.data().ultimo + 1
      tx.update(ref, { ultimo: n })
      return n
    })
    await localSet('contadores', { id: `remito_aprobado_${year}`, ultimo: next })
    return next
  } catch {
    const local = await localGet<{ id: string; ultimo: number }>('contadores', `remito_aprobado_${year}`)
    const next = (local?.ultimo ?? 0) + 1
    await localSet('contadores', { id: `remito_aprobado_${year}`, ultimo: next })
    return next
  }
}

export async function createRemitoFromPresupuesto(presupuesto: {
  id: string
  numeroPresupuesto: number
  fecha: Date
  idCliente: string
  clienteData: ClienteData
  vendedor?: VendedorInfo
  items: RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
  observaciones?: string
}) {
  const year = presupuesto.fecha.getFullYear()
  const numeroRemito = await getNextNumero(year)

  const fullData = {
    numeroRemito,
    numeroPresupuestoOriginal: presupuesto.numeroPresupuesto,
    fecha: Timestamp.fromDate(presupuesto.fecha),
    idCliente: presupuesto.idCliente,
    clienteData: presupuesto.clienteData,
    vendedor: presupuesto.vendedor || null,
    items: presupuesto.items,
    subtotalGeneral: presupuesto.subtotalGeneral,
    iva: presupuesto.iva,
    totalGeneral: presupuesto.totalGeneral,
    estado: 'En_Revision' as const,
    observaciones: presupuesto.observaciones || '',
    createdAt: Timestamp.now(),
  }

  try {
    const docRef = await addDoc(collection(getDb(), COL), fullData)
    await localSet('remitos_aprobados', { id: docRef.id, ...fullData, fecha: presupuesto.fecha, createdAt: new Date() })
    return { id: docRef.id, numeroRemito }
  } catch {
    throw new Error('Error al crear remito desde presupuesto')
  }
}

function docToRemito(id: string, data: DocData): RemitoAprobado {
  return {
    id,
    numeroRemito: data.numeroRemito,
    numeroPresupuestoOriginal: data.numeroPresupuestoOriginal,
    fecha: data.fecha?.toDate?.() ?? data.fecha,
    idCliente: data.idCliente,
    clienteData: data.clienteData,
    vendedor: data.vendedor || undefined,
    items: data.items ?? [],
    subtotalGeneral: data.subtotalGeneral,
    iva: data.iva,
    totalGeneral: data.totalGeneral,
    estado: data.estado,
    observaciones: data.observaciones,
    usuarioCreador: data.usuarioCreador,
    createdAt: data.createdAt?.toDate?.() ?? data.createdAt,
  }
}

export async function getAllRemitosAprobados() {
  try {
    const q = query(collection(getDb(), COL), orderBy('numeroRemito', 'desc'))
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => docToRemito(d.id, d.data()))
    await localSet('remitos_aprobados_cache', { id: 'all', data: list })
    return list
  } catch {
    const cached = await localGet<{ data: RemitoAprobado[] }>('remitos_aprobados_cache', 'all')
    return cached?.data ?? []
  }
}

export async function getRemitoAprobado(id: string): Promise<RemitoAprobado | null> {
  try {
    const snap = await getDoc(doc(getDb(), COL, id))
    if (!snap.exists()) return null
    return docToRemito(snap.id, snap.data())
  } catch {
    const local = await localGet<RemitoAprobado>('remitos_aprobados', id)
    return local ?? null
  }
}

export async function updateRemitoAprobadoEstado(id: string, estado: RemitoAprobado['estado']) {
  try {
    await updateDoc(doc(getDb(), COL, id), { estado })
    await localSet('remitos_aprobados', { id, estado })
  } catch {
    throw new Error('Error al actualizar estado del remito')
  }
}
