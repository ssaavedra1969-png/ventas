import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'falpat_offline'
const DB_VERSION = 2

const STORES = [
  'clientes',
  'productos',
  'vendedores',
  'remitos',
  'remitos_facturados',
  'contadores',
  'configuracion',
  'vehiculos',
  'choferes',
  'syncQueue',
  'meta',
] as const

export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase<unknown>> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            if (store === 'syncQueue') {
              db.createObjectStore(store, { keyPath: 'id', autoIncrement: true })
            } else if (store === 'meta') {
              db.createObjectStore(store, { keyPath: 'key' })
            } else {
              db.createObjectStore(store, { keyPath: 'id' })
            }
          }
        }
      },
    })
  }
  return dbPromise
}

export async function localGetAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDb()
  return db.getAll(storeName)
}

export async function localGet<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const db = await getDb()
  return db.get(storeName, id)
}

export async function localSet<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.put(storeName, value as any)
}

export async function localDelete(storeName: StoreName, id: string): Promise<void> {
  const db = await getDb()
  await db.delete(storeName, id)
}

export async function localClear(storeName: StoreName): Promise<void> {
  const db = await getDb()
  await db.clear(storeName)
}

export async function localBulkSet<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
  if (items.length === 0) return
  const db = await getDb()
  const tx = db.transaction(storeName, 'readwrite')
  for (const item of items) {
    await tx.store.put(item)
  }
  await tx.done
}

export async function localBulkDelete(storeName: StoreName): Promise<void> {
  const db = await getDb()
  await db.clear(storeName)
}

// Meta key-value
export async function localGetMeta(key: string): Promise<unknown> {
  const db = await getDb()
  const entry = await db.get('meta', key)
  return entry?.value
}

export async function localSetMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb()
  await db.put('meta', { key, value })
}

// --- Sync Queue ---

export interface SyncQueueItem {
  id?: number
  collection: string
  docId?: string
  operation: 'create' | 'update' | 'set' | 'delete'
  data?: unknown
  timestamp: number
  retryCount: number
  lastError?: string
}

export async function enqueueOperation(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
  const db = await getDb()
  return db.add('syncQueue', item) as Promise<number>
}

export async function getQueue(): Promise<SyncQueueItem[]> {
  const db = await getDb()
  return db.getAll('syncQueue')
}

export async function removeQueueItem(id: number): Promise<void> {
  const db = await getDb()
  await db.delete('syncQueue', id)
}

export async function updateQueueItem(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
  const db = await getDb()
  const item = await db.get('syncQueue', id)
  if (item) {
    await db.put('syncQueue', { ...item, ...updates })
  }
}

export async function getQueueCount(): Promise<number> {
  const db = await getDb()
  const all = await db.getAll('syncQueue')
  return all.length
}

export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
