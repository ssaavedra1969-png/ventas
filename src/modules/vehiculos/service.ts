import {
  collection, doc, getDocs, updateDoc, deleteDoc, setDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGetAll, localSet } from '@/lib/db'
import { syncManager } from '@/lib/sync'
import type { Vehiculo, Chofer } from '@/types'
/* eslint-disable @typescript-eslint/no-explicit-any */

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

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
