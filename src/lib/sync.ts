import {
  doc, getDoc,
} from 'firebase/firestore'
import { db as firebaseDb } from './firebase'
import {
  localBulkSet,
  type StoreName,
} from './db'

export type SyncStatus = {
  online: boolean
  pendingCount: number
  syncing: boolean
}

type SyncCallback = (status: SyncStatus) => void

const CHECK_INTERVAL = 60000 // 60s

class SyncManager {
  private _online: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true
  private listeners: Set<SyncCallback> = new Set()
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkConnectivity())
      window.addEventListener('offline', () => this.checkConnectivity())
    }
  }

  get online(): boolean { return this._online }

  start(intervalMs = CHECK_INTERVAL) {
    this.checkConnectivity()
    this.intervalId = setInterval(() => this.checkConnectivity(), intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async checkConnectivity() {
    const wasOnline = this._online
    if (!navigator.onLine) {
      this._online = false
    } else {
      try {
        const ref = doc(firebaseDb!, 'configuracion', 'empresa')
        await getDoc(ref)
        this._online = true
      } catch {
        this._online = false
      }
    }
    if (wasOnline !== this._online) this.notify()
  }

  subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback)
    callback({ online: this._online, pendingCount: 0, syncing: false })
    return () => this.listeners.delete(callback)
  }

  private notify() {
    Array.from(this.listeners).forEach(cb => {
      cb({ online: this._online, pendingCount: 0, syncing: false })
    })
  }

  async cacheCollection<T extends { id: string }>(storeName: StoreName, items: T[]): Promise<void> {
    if (items.length === 0) return
    await localBulkSet(storeName, items)
  }
}

export const syncManager = new SyncManager()
