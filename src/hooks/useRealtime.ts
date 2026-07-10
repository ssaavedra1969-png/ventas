'use client'

import { useState, useEffect } from 'react'
import { realtime } from '@/lib/realtime'
import type { StoreName } from '@/lib/db'

export function useRealtime<T extends { id?: string }>(
  storeName: StoreName,
): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = realtime.subscribe<T>(storeName, (items) => {
      setData(items)
      setLoading(false)
    })
    return unsub
  }, [storeName])

  return { data, loading }
}
