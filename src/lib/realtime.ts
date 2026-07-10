import {
  collection, onSnapshot, type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { localBulkSet } from './db'
import type { StoreName } from './db'

type ListenerCallback<T> = (data: T[]) => void

class RealtimeManager {
  private listeners = new Map<string, Set<ListenerCallback<unknown>>>()
  private unsubscribes = new Map<string, Unsubscribe>()
  private cached = new Map<string, unknown[]>()

  subscribe<T extends { id?: string }>(
    storeName: StoreName,
    callback: ListenerCallback<T>,
  ): () => void {
    if (!this.listeners.has(storeName)) {
      this.listeners.set(storeName, new Set())
      this.startListening(storeName)
    }
    this.listeners.get(storeName)!.add(callback as ListenerCallback<unknown>)

    const cached = this.cached.get(storeName)
    if (cached) setTimeout(() => callback(cached as T[]), 0)

    return () => {
      const set = this.listeners.get(storeName)
      if (!set) return
      set.delete(callback as ListenerCallback<unknown>)
      // Listener stays alive for the session to avoid re-reads on navigation
    }
  }

  getCached<T>(storeName: StoreName): T[] | null {
    const data = this.cached.get(storeName)
    return data ? (data as T[]) : null
  }

  private startListening(storeName: StoreName) {
    const unsub = onSnapshot(collection(db!, storeName),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const d: Record<string, unknown> = { id: doc.id, ...doc.data() }
          return d
        })
        this.cached.set(storeName, data)
        localBulkSet(storeName, data as { id: string }[]).catch(() => {})
        const set = this.listeners.get(storeName)
        if (set) set.forEach((cb) => cb(data))
      },
      () => {
        // Error silencioso — los datos se mantienen en React state/IndexedDB
      },
    )
    this.unsubscribes.set(storeName, unsub)
  }
}

export const realtime = new RealtimeManager()
