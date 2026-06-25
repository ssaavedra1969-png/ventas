'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudOff, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { syncManager } from '@/lib/sync'

export default function SyncStatus() {
  const [online, setOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const unsub = syncManager.subscribe((status) => {
      setOnline(status.online)
      setPendingCount(status.pendingCount)
      setSyncing(status.syncing)
    })
    return unsub
  }, [])

  if (online && pendingCount === 0 && !syncing) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
          !online
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : syncing
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : pendingCount > 0
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-green-500/10 text-green-400 border border-green-500/20'
        }`}
      >
        {!online ? (
          <>
            <CloudOff className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Sin conexión</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500/20 text-[10px]">
                {pendingCount}
              </span>
            )}
          </>
        ) : syncing ? (
          <>
            <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
            <span className="hidden sm:inline">Sincronizando...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
            <button
              onClick={() => syncManager.processQueue()}
              className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors text-[10px]"
            >
              Sincronizar
            </button>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Sincronizado</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
