'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudOff } from 'lucide-react'
import { syncManager } from '@/lib/sync'

export default function SyncStatus() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const unsub = syncManager.subscribe((status) => {
      setOnline(status.online)
    })
    return unsub
  }, [])

  if (online) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"
      >
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden sm:inline">Sin conexión</span>
      </motion.div>
    </AnimatePresence>
  )
}
