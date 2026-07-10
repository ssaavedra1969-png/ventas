import { localGetAll, localGetMeta, localSetMeta } from './db'
import { syncManager } from './sync'
import type { StoreName } from './db'

const TTL_MS = 5 * 60 * 1000

export async function isStale(collection: string, ttlMs = TTL_MS): Promise<boolean> {
  const lastSync = await localGetMeta(`lastSync_${collection}`)
  if (!lastSync) return true
  return Date.now() - (lastSync as number) > ttlMs
}

export async function markSynced(collection: string): Promise<void> {
  await localSetMeta(`lastSync_${collection}`, Date.now())
}

export async function invalidateCache(collection: string): Promise<void> {
  await localSetMeta(`lastSync_${collection}`, 0)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function localFirstRead<T extends Record<string, any>>(
  storeName: StoreName,
  fetchFromFirebase: () => Promise<T[]>,
  ttlMs = TTL_MS,
): Promise<T[]> {
  const local = await localGetAll<T>(storeName)
  if (local.length > 0) {
    if (await isStale(storeName, ttlMs)) {
      fetchFromFirebase()
        .then((data) => {
          syncManager.cacheCollection(storeName, data as unknown as { id: string }[])
          markSynced(storeName)
        })
        .catch(() => {})
    }
    return local
  }
  const data = await fetchFromFirebase()
  await syncManager.cacheCollection(storeName, data as unknown as { id: string }[])
  await markSynced(storeName)
  return data
}
