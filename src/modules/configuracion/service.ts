import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { localGet, localSet } from '@/lib/db'
import type { EmpresaConfig } from '@/types'

const DEFAULT_EMPRESA: EmpresaConfig = {
  razonSocial: 'GRUPO FALPAT SRL',
  cuit: '30-71784388-2',
  direccion: 'Av. Ejemplo 1234',
  telefono: '(011) 1234-5678',
  email: 'info@falpat.com',
  telefonoAdmin: '(011) 1234-5678',
}

function getDb() {
  if (!db) throw new Error('Firebase no está configurado. Verificá las variables de entorno.')
  return db
}

export async function getEmpresaConfig(): Promise<EmpresaConfig> {
  try {
    const _db = getDb()
    const docRef = doc(_db, 'configuracion', 'empresa')
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
    const docRef = doc(_db, 'configuracion', 'empresa')
    await setDoc(docRef, data)
  } catch (err) {
    throw new Error(`Error al guardar configuración en Firebase: ${err instanceof Error ? err.message : err}`)
  }
}

export function getTipoFactura(condicionIVA: string): 'A' | 'B' {
  if (condicionIVA === 'RI' || condicionIVA === 'Monotributo') return 'A'
  return 'B'
}

export function getIvaRate(condicionIVA: string): number {
  if (condicionIVA === 'Exento') return 0
  return 0.21
}
