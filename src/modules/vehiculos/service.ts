import {
  collection, doc, getDocs, updateDoc, deleteDoc, setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localSet } from '@/lib/db'
import { syncManager } from '@/lib/sync'
import { localFirstRead, markSynced } from '@/lib/local-first'
import type { Vehiculo, Chofer } from '@/types'
/* eslint-disable @typescript-eslint/no-explicit-any */

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

export async function getAllVehiculos(options?: { forceRefresh?: boolean }): Promise<Vehiculo[]> {
  if (options?.forceRefresh) {
    const data = await fetchVehiculosFromFirebase()
    return data
  }
  const local = await localFirstRead<Vehiculo>('vehiculos', fetchVehiculosFromFirebase)
  return local.sort((a, b) => a.patente.localeCompare(b.patente))
}

async function fetchVehiculosFromFirebase(): Promise<Vehiculo[]> {
  const snapshot = await getDocs(collection(getDb(), 'vehiculos'))
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehiculo))
  data.sort((a, b) => a.patente.localeCompare(b.patente))
  await syncManager.cacheCollection('vehiculos', data.map(v => ({ ...v, id: v.id! })))
  await markSynced('vehiculos')
  return data
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

export async function getAllChoferes(options?: { forceRefresh?: boolean }): Promise<Chofer[]> {
  if (options?.forceRefresh) {
    const data = await fetchChoferesFromFirebase()
    return data
  }
  const local = await localFirstRead<Chofer>('choferes', fetchChoferesFromFirebase)
  return local.sort((a, b) => a.nombre.localeCompare(b.nombre))
}

async function fetchChoferesFromFirebase(): Promise<Chofer[]> {
  const snapshot = await getDocs(collection(getDb(), 'choferes'))
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chofer))
  data.sort((a, b) => a.nombre.localeCompare(b.nombre))
  await syncManager.cacheCollection('choferes', data.map(c => ({ ...c, id: c.id! })))
  await markSynced('choferes')
  return data
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
