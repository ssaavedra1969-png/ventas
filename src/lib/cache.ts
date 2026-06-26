type CacheEntry<T> = { data: T; timestamp: number }
const store = new Map<string, CacheEntry<unknown>>()
const TTL = 300000 // 5 minutos

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (entry && Date.now() - entry.timestamp < TTL) {
    return entry.data as T
  }
  store.delete(key)
  return null
}

export function setCache<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() })
}

export function clearCache(key?: string): void {
  if (key) store.delete(key)
  else store.clear()
}
