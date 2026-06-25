'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAllRemitos, clearCache, agregarEntrega, eliminarEntrega } from '@/lib/firestore'
import type { Remito } from '@/types'
import {
  Truck,
  Search,
  Loader2,
  Plus,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

function calcEntregado(remito: Remito, idProducto: string): number {
  if (!remito.entregas) return 0
  let total = 0
  for (const entrega of remito.entregas) {
    for (const item of entrega.items) {
      if (item.idProducto === idProducto) total += item.cantidad
    }
  }
  return total
}

function calcPendiente(remito: Remito, idProducto: string, cantidad: number): number {
  return cantidad - calcEntregado(remito, idProducto)
}

export default function EntregasPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [modalRemitoId, setModalRemitoId] = useState<string | null>(null)
  const [entregaItems, setEntregaItems] = useState<{ idProducto: string; cantidad: string }[]>([])
  const [guardando, setGuardando] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'pendientes' | 'completadas'>('pendientes')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getAllRemitos()
      setRemitos(r)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Calcular estado de entrega por remito
  const remitosConEstado = useMemo(() => {
    return remitos
      .filter((r) => r.estado !== 'Anulado' && r.estado !== 'Enviado')
      .map((r) => {
        const productosConEntrega = r.items.map((item) => {
          const entregado = calcEntregado(r, item.idProducto)
          const pendiente = calcPendiente(r, item.idProducto, item.cantidad)
          return { ...item, entregado, pendiente }
        })
        const totalPendiente = productosConEntrega.reduce((s, p) => s + p.pendiente, 0)
        const totalItems = productosConEntrega.reduce((s, p) => s + p.cantidad, 0)
        const completada = totalPendiente === 0
        const enProgreso = totalPendiente > 0 && totalPendiente < totalItems
        return { ...r, productosConEntrega, totalPendiente, completada, enProgreso }
      })
  }, [remitos])

  const filtrados = useMemo(() => {
    let items = remitosConEstado
    if (filtroEstado === 'pendientes') items = items.filter((r) => !r.completada)
    if (filtroEstado === 'completadas') items = items.filter((r) => r.completada)
    if (search) {
      const s = search.toLowerCase()
      items = items.filter(
        (r) =>
          r.clienteData.razonSocial.toLowerCase().includes(s) ||
          String(r.numeroRemito).includes(s)
      )
    }
    return items
  }, [remitosConEstado, filtroEstado, search])

  const stats = useMemo(() => {
    const pendientes = remitosConEstado.filter((r) => !r.completada)
    const completadas = remitosConEstado.filter((r) => r.completada)
    const enProgreso = pendientes.filter((r) => r.enProgreso)
    const totalPendiente = pendientes.reduce((s, r) => s + r.totalPendiente, 0)
    return { pendientes: pendientes.length, completadas: completadas.length, enProgreso: enProgreso.length, totalPendiente }
  }, [remitosConEstado])

  // ─── Modal ──────────────────────────────────────────────────────

  const abrirModal = (remitoId: string) => {
    const remito = remitosConEstado.find((r) => r.id === remitoId)
    if (!remito) return
    setModalRemitoId(remitoId)
    setEntregaItems(
      remito.productosConEntrega
        .filter((p) => p.pendiente > 0)
        .map((p) => ({ idProducto: p.idProducto, cantidad: String(p.pendiente) }))
    )
  }

  const handleGuardarEntrega = async () => {
    if (!modalRemitoId) return
    const remito = remitosConEstado.find((r) => r.id === modalRemitoId)
    if (!remito) return
    const items = entregaItems
      .filter((ei) => parseFloat(ei.cantidad) > 0)
      .map((ei) => {
        const prod = remito.items.find((i) => i.idProducto === ei.idProducto)
        return {
          idProducto: ei.idProducto,
          nombreProducto: prod?.nombreProducto ?? ei.idProducto,
          cantidad: parseFloat(ei.cantidad),
        }
      })
    if (items.length === 0) {
      toast.error('Agregá al menos un producto con cantidad > 0')
      return
    }
    setGuardando(true)
    try {
      await agregarEntrega(modalRemitoId, { items, fecha: new Date() })
      toast.success('Entrega registrada')
      setModalRemitoId(null)
      clearCache('allRemitos')
      fetchData()
    } catch (err) {
      console.error('Error al registrar entrega:', err)
      toast.error('Error al registrar entrega')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminarEntrega = async (remitoId: string, entregaId: string) => {
    try {
      await eliminarEntrega(remitoId, entregaId)
      toast.success('Entrega eliminada')
      setDeleteConfirm(null)
      clearCache('allRemitos')
      fetchData()
    } catch {
      toast.error('Error al eliminar entrega')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Entregas</h1>
            <p className="text-[#B0B0D0] text-sm">Control de entregas de productos</p>
          </div>
        </div>
        <button
          onClick={() => { clearCache('allRemitos'); fetchData() }}
          className="p-2 rounded-lg text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-[#6B6B8A]">Pendientes</p>
          <p className="text-lg font-bold text-amber-400">{stats.pendientes}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-[#6B6B8A]">En Progreso</p>
          <p className="text-lg font-bold text-blue-400">{stats.enProgreso}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-[#6B6B8A]">Completadas</p>
          <p className="text-lg font-bold text-emerald-400">{stats.completadas}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-[#6B6B8A]">Unid. Pendientes</p>
          <p className="text-lg font-bold text-white">{stats.totalPendiente}</p>
        </div>
      </div>

      {/* Filtros + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {(['pendientes', 'todas', 'completadas'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtroEstado === f
                  ? 'bg-[#6C3CE1]/20 text-white'
                  : 'text-[#6B6B8A] hover:text-white'
              }`}
            >
              {f === 'pendientes' ? 'Pendientes' : f === 'todas' ? 'Todas' : 'Completadas'}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
          <input
            type="text"
            placeholder="Buscar por cliente o N° remito..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#12122A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-white">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <Truck className="h-10 w-10 text-[#6B6B8A] mx-auto mb-3" />
            <p className="text-[#6B6B8A]">
              {filtroEstado === 'pendientes' ? 'No hay entregas pendientes' : 'No hay remitos registrados'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtrados.map((remito) => {
              const exp = expandido === remito.id
              return (
                <div key={remito.id}>
                  {/* Fila principal */}
                  <div
                    className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpandido(exp ? null : remito.id!)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-white font-bold shrink-0">#{String(remito.numeroRemito).padStart(6, '0')}</span>
                          <span className="text-[#6B6B8A]">|</span>
                          <span className="text-[#B0B0D0] shrink-0">{format(remito.fecha, 'dd/MM/yyyy', { locale: es })}</span>
                          <span className="text-[#6B6B8A]">|</span>
                          <span className="text-white truncate">{remito.clienteData.razonSocial}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-[#B0B0D0]">
                            Productos:{' '}
                            <span className="text-white font-mono">
                              {remito.productosConEntrega.filter((p) => p.pendiente > 0).length}/{remito.productosConEntrega.length}
                            </span>
                          </span>
                          <span className="text-xs text-[#B0B0D0]">
                            Und. pendientes:{' '}
                            <span className="text-amber-400 font-mono font-semibold">{remito.totalPendiente}</span>
                          </span>
                          {remito.completada ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/10">
                              <CheckCircle2 className="h-3 w-3" />
                              Completada
                            </span>
                          ) : remito.enProgreso ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-blue-400 bg-blue-500/10">
                              <Clock className="h-3 w-3" />
                              En Progreso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-500/10">
                              <AlertCircle className="h-3 w-3" />
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 mt-1 text-[#6B6B8A]">
                        {exp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Detalle expandido */}
                  <AnimatePresence>
                    {exp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4 pt-2 border-t border-white/5 bg-white/[0.02] space-y-4">
                          {/* Productos */}
                          <div>
                            <p className="text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider mb-2">Productos</p>
                            <div className="space-y-1.5">
                              {remito.productosConEntrega.map((item) => {
                                const pct = item.cantidad > 0 ? Math.round((item.entregado / item.cantidad) * 100) : 0
                                const completado = item.pendiente === 0
                                return (
                                  <div key={item.idProducto} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-white/[0.03]">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-white font-medium truncate">{item.nombreProducto}</span>
                                        <span className="text-xs text-[#B0B0D0] font-mono ml-2 shrink-0">
                                          {item.entregado}/{item.cantidad}
                                        </span>
                                      </div>
                                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ${
                                            completado ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-blue-500'
                                          }`}
                                          style={{ width: `${Math.min(100, pct)}%` }}
                                        />
                                      </div>
                                      <div className="flex justify-between mt-0.5">
                                        <span className="text-[10px] text-[#6B6B8A]">
                                          {completado ? 'Completado' : `${item.pendiente} pendiente(s)`}
                                        </span>
                                        <span className="text-[10px] text-[#6B6B8A]">{pct}%</span>
                                      </div>
                                    </div>
                                    {completado && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Historial de entregas */}
                          {remito.entregas && remito.entregas.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider mb-2">Entregas Registradas</p>
                              <div className="space-y-1">
                                {remito.entregas.map((entrega) => (
                                  <div key={entrega.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/5 text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-[#6B6B8A] shrink-0">
                                        {format(entrega.fecha instanceof Date ? entrega.fecha : new Date(entrega.fecha), 'dd/MM/yyyy HH:mm')}
                                      </span>
                                      <span className="text-[#B0B0D0] text-xs">
                                        {entrega.items.map((ei) => `${ei.nombreProducto} x${ei.cantidad}`).join(', ')}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setDeleteConfirm(entrega.id)}
                                      className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors shrink-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Botón registrar entrega */}
                          {!remito.completada && (
                            <button
                              onClick={() => abrirModal(remito.id!)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors inline-flex items-center gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              Registrar Entrega
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Registrar Entrega */}
      {modalRemitoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!guardando) setModalRemitoId(null) }} />
          <div className="relative w-full max-w-lg glass-card rounded-2xl p-6 animate-fadeInUp">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-400" />
                Registrar Entrega
              </h2>
              <button onClick={() => { if (!guardando) setModalRemitoId(null) }} className="text-[#6B6B8A] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {entregaItems.map((ei, idx) => {
                const remito = remitosConEstado.find((r) => r.id === modalRemitoId)
                const prod = remito?.productosConEntrega.find((p) => p.idProducto === ei.idProducto)
                return (
                  <div key={ei.idProducto} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{prod?.nombreProducto ?? ei.idProducto}</p>
                      <p className="text-[10px] text-[#6B6B8A]">Pendiente: {prod?.pendiente ?? 0}</p>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={prod?.pendiente ?? 0}
                        value={ei.cantidad}
                        onChange={(e) => {
                          const nueva = [...entregaItems]
                          nueva[idx] = { ...nueva[idx], cantidad: e.target.value }
                          setEntregaItems(nueva)
                        }}
                        className="w-full px-2 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/10 text-white text-sm text-center focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setModalRemitoId(null)}
                disabled={guardando}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarEntrega}
                disabled={guardando}
                className="flex-1 btn-nebula px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-1"
              >
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && modalRemitoId && (
        <EliminarEntregaModal
          remitoId={modalRemitoId}
          entregaId={deleteConfirm}
          onConfirm={handleEliminarEntrega}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      {deleteConfirm && !modalRemitoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-fadeInUp text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">¿Eliminar Entrega?</h2>
            <p className="text-sm text-[#B0B0D0] mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EliminarEntregaModal({
  remitoId,
  entregaId,
  onConfirm,
  onCancel,
}: {
  remitoId: string
  entregaId: string
  onConfirm: (remitoId: string, entregaId: string) => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-fadeInUp text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">¿Eliminar Entrega?</h2>
        <p className="text-sm text-[#B0B0D0] mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">Cancelar</button>
          <button onClick={() => onConfirm(remitoId, entregaId)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  )
}
