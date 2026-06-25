import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, Timestamp,
} from 'firebase/firestore'
import { db as firebaseDb } from './firebase'
import {
  getQueue, removeQueueItem, updateQueueItem, type SyncQueueItem,
  localBulkSet, localSet, localDelete, localGet,
  type StoreName,
} from './db'
import { clearCache } from './cache'

export type SyncStatus = {
  online: boolean
  pendingCount: number
  syncing: boolean
}

type SyncCallback = (status: SyncStatus) => void

const SYNC_INTERVAL = 60000

class SyncManager {
  private _online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private _syncing: boolean = false
  private _processing: boolean = false
  private listeners: Set<SyncCallback> = new Set()
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true))
      window.addEventListener('offline', () => this.setOnline(false))
    }
  }

  get online(): boolean { return this._online }
  get syncing(): boolean { return this._syncing }

  start(intervalMs = SYNC_INTERVAL) {
    this.checkConnectivity()
    this.intervalId = setInterval(() => this.checkConnectivity(), intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private setOnline(value: boolean) {
    if (this._online !== value) {
      this._online = value
      this.notify()
      if (value) this.processQueue()
    }
  }

  private async checkConnectivity() {
    if (!navigator.onLine) {
      this.setOnline(false)
      return
    }
    try {
      const ref = doc(firebaseDb!, 'configuracion', 'empresa')
      await getDoc(ref)
      if (!this._online) this.setOnline(true)
      else if (this._online) await this.processQueue()
    } catch {
      if (this._online) this.setOnline(false)
    }
  }

  subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback)
    this.getPendingCount().then(count => {
      callback({ online: this._online, pendingCount: count, syncing: this._syncing })
    })
    return () => this.listeners.delete(callback)
  }

  private notify() {
    this.getPendingCount().then(count => {
      Array.from(this.listeners).forEach(cb => {
        cb({ online: this._online, pendingCount: count, syncing: this._syncing })
      })
    })
  }

  async getPendingCount(): Promise<number> {
    try {
      return await getQueue().then(q => q.length)
    } catch {
      return 0
    }
  }

  async processQueue(): Promise<number> {
    if (this._processing || !this._online) return 0
    this._processing = true
    this._syncing = true
    this.notify()

    let processed = 0
    try {
      const queue = await getQueue()
      for (const item of queue) {
        try {
          await this.processItem(item)
          await removeQueueItem(item.id!)
          processed++
        } catch (err: unknown) {
          await updateQueueItem(item.id!, {
            retryCount: (item.retryCount ?? 0) + 1,
            lastError: err instanceof Error ? err.message : String(err),
          })
        }
      }
      if (processed > 0) {
        clearCache()
      }
    } finally {
      this._processing = false
      this._syncing = false
      this.notify()
    }
    return processed
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    const { collection: col, docId, operation, data } = item
    if (!firebaseDb) throw new Error('Firebase no disponible')

    switch (operation) {
      case 'create': {
        const docData = (data ?? {}) as Record<string, unknown>
        const ref = await addDoc(collection(firebaseDb, col), {
          ...docData,
          createdAt: docData.createdAt ?? Timestamp.now(),
        })
        if (docId?.startsWith?.('local_')) {
          const localDoc = await localGet(col as StoreName, docId)
          if (localDoc) {
            await localDelete(col as StoreName, docId)
            const updated = { ...(localDoc as Record<string, unknown>), id: ref.id }
            await localSet(col as StoreName, updated)
          }
        }
        break
      }
      case 'set':
        await setDoc(doc(firebaseDb, col, docId!), data as Record<string, unknown>)
        break
      case 'update':
        await updateDoc(doc(firebaseDb, col, docId!), data as Record<string, unknown>)
        break
      case 'delete':
        await deleteDoc(doc(firebaseDb, col, docId!))
        break
    }
  }

  async cacheCollection<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
    if (items.length === 0) return
    await localBulkSet(storeName, items)
  }

  async cacheDoc<T extends { id: string }>(storeName: StoreName, doc: T): Promise<void> {
    await localSet(storeName, doc)
  }
}

export const syncManager = new SyncManager()
