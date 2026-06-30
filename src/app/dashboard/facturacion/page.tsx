'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAllRemitos, agregarPago, eliminarPago } from '@/modules/legacy'
import type { Remito, Pago } from '@/types'
import {
  DollarSign,
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

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Debito', 'Credito'] as const

const getEstadoCobranza = (remito: Remito) => {
  const pagado = remito.totalPagado ?? 0
  if (pagado <= 0) return { label: 'Pendiente', color: 'text-red-400 bg-red-500/10', icon: AlertCircle }
  if (pagado >= remito.totalGeneral) return { label: 'Pagado', color: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle2 }
  return { label: 'Parcial', color: 'text-amber-400 bg-amber-500/10', icon: Clock }
}

export default function FacturacionPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [nuevoPago, setNuevoPago] = useState<Record<string, { monto: string; metodo: string; referencia: string }>>({})
  const [guardando, setGuardando] = useState<string | null>(null)

  const fetchRemitos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllRemitos()
      setRemitos(data.filter((r) => r.facturado))
    } catch {
      toast.error('Error al cargar facturación')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRemitos()
  }, [fetchRemitos])

  const filtrados = remitos.filter((r) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.clienteData.razonSocial?.toLowerCase().includes(s) ||
      (r.clienteData.numeroDocumento || (r.clienteData as { cuit?: string }).cuit || '').toLowerCase().includes(s) ||
      (r.nroFactura ?? '').toLowerCase().includes(s) ||
      String(r.numeroRemito).includes(s)
    )
  })

  const handleAgregarPago = async (remitoId: string) => {
    const datos = nuevoPago[remitoId]
    if (!datos || !datos.monto || !datos.metodo) return
    const monto = parseFloat(datos.monto)
    if (isNaN(monto) || monto <= 0) return
    setGuardando(remitoId)
    try {
      await agregarPago(remitoId, {
        monto,
        metodo: datos.metodo as Pago['metodo'],
        referencia: datos.referencia || undefined,
        fecha: new Date(),
      })
      setNuevoPago((prev) => ({ ...prev, [remitoId]: { monto: '', metodo: '', referencia: '' } }))
      toast.success('Pago registrado')
      fetchRemitos()
    } catch (err) {
      console.error('Error al registrar pago:', err)
      toast.error('Error al registrar pago')
    } finally {
      setGuardando(null)
    }
  }

  const handleEliminarPago = async (remitoId: string, pagoId: string) => {
    try {
      await eliminarPago(remitoId, pagoId)
      toast.success('Pago eliminado')
      fetchRemitos()
    } catch {
      toast.error('Error al eliminar pago')
    }
  }

  const totalGeneral = filtrados.reduce((s, r) => s + r.totalGeneral, 0)
  const totalPagado = filtrados.reduce((s, r) => s + (r.totalPagado ?? 0), 0)
  const totalPendiente = totalGeneral - totalPagado

  const initPago = (id: string) => {
    if (!nuevoPago[id]) {
      setNuevoPago((prev) => ({ ...prev, [id]: { monto: '', metodo: 'Efectivo', referencia: '' } }))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Facturación</h1>
            <p className="text-[#B0B0D0] text-sm">Control de pagos y cobranza</p>
          </div>
        </div>
        <button
          onClick={() => fetchRemitos()}
          className="p-2 rounded-lg text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-[#6B6B8A]">Total Facturado</p>
          <p className="text-lg font-bold text-white">${totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-[#6B6B8A]">Total Cobrado</p>
          <p className="text-lg font-bold text-emerald-400">${totalPagado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-xs text-[#6B6B8A]">Pendiente</p>
          <p className="text-lg font-bold text-amber-400">${totalPendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
        <input
          type="text"
          placeholder="Buscar por cliente, CUIT, N° Factura o N° Remito..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#12122A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="h-10 w-10 text-[#6B6B8A] mx-auto mb-3" />
            <p className="text-[#6B6B8A]">No hay facturas registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtrados.map((remito) => {
              const cobranza = getEstadoCobranza(remito)
              const exp = expandido === remito.id
              const pagos = remito.pagos ?? []
              const pagado = remito.totalPagado ?? 0
              const saldo = remito.totalGeneral - pagado
              const init = nuevoPago[remito.id!]

              return (
                <div key={remito.id}>
                  {/* Fila principal */}
                  <div
                    className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setExpandido(exp ? null : remito.id!)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Line 1: Remito + Fecha + Cliente */}
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-white font-bold shrink-0">#{String(remito.numeroRemito).padStart(6, '0')}</span>
                          <span className="text-[#6B6B8A]">|</span>
                          <span className="text-[#B0B0D0] shrink-0">{format(remito.fecha, 'dd/MM/yyyy', { locale: es })}</span>
                          <span className="text-[#6B6B8A]">|</span>
                          <span className="text-white truncate">{remito.clienteData.razonSocial}</span>
                        </div>

                        {/* Line 2: N° Factura + Montos + Estado */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* N° Factura - prominent */}
                          <div className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25">
                            <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-semibold">Factura N°</span>
                            <span className="ml-2 text-sm font-bold text-emerald-400">{remito.nroFactura || '—'}</span>
                          </div>

                          <span className="text-[#6B6B8A] hidden sm:inline">|</span>

                          {/* Montos */}
                          <span className="text-xs text-[#B0B0D0]">
                            Total: <span className="text-white font-mono font-semibold">${remito.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                          </span>
                          <span className="text-xs text-[#B0B0D0]">
                            Pagado: <span className="text-emerald-400 font-mono font-semibold">${pagado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                          </span>
                          <span className="text-xs text-[#B0B0D0]">
                            Saldo: <span className="text-amber-400 font-mono font-semibold">${saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                          </span>

                          {/* Estado badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cobranza.color}`}>
                            <cobranza.icon className="h-3 w-3" />
                            {cobranza.label}
                          </span>
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
                        <div className="px-6 pb-4 pt-2 border-t border-white/5 bg-white/[0.02]">
                          {/* Pagos existentes */}
                          {pagos.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider mb-2">Pagos Registrados</p>
                              <div className="space-y-1">
                                {pagos.map((pago) => (
                                  <div key={pago.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/5 text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono text-emerald-400 font-bold">${pago.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                      <span className="text-[#B0B0D0] text-xs">{pago.metodo}</span>
                                      {pago.referencia && <span className="text-[#6B6B8A] text-xs">Ref: {pago.referencia}</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-[#6B6B8A]">{format(pago.fecha instanceof Date ? pago.fecha : (pago.fecha as unknown as { toDate: () => Date })?.toDate?.() ?? new Date(), 'dd/MM/yyyy HH:mm')}</span>
                                      <button
                                        onClick={() => handleEliminarPago(remito.id!, pago.id)}
                                        className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Nuevo pago */}
                          <div className="flex items-end gap-2 flex-wrap">
                            <div>
                              <label className="block text-[10px] text-[#6B6B8A] mb-1">Monto $</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={init?.monto ?? ''}
                                onChange={(e) => {
                                  initPago(remito.id!)
                                  setNuevoPago((prev) => ({ ...prev, [remito.id!]: { ...prev[remito.id!], monto: e.target.value } }))
                                }}
                                className="w-28 px-2 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/10 text-white text-sm text-center focus:outline-none focus:border-emerald-500/50 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#6B6B8A] mb-1">Método</label>
                              <select
                                value={init?.metodo ?? 'Efectivo'}
                                onChange={(e) => {
                                  initPago(remito.id!)
                                  setNuevoPago((prev) => ({ ...prev, [remito.id!]: { ...prev[remito.id!], metodo: e.target.value } }))
                                }}
                                className="w-32 px-2 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                              >
                                {METODOS_PAGO.map((m) => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#6B6B8A] mb-1">Referencia</label>
                              <input
                                type="text"
                                placeholder="Opicional"
                                value={init?.referencia ?? ''}
                                onChange={(e) => {
                                  initPago(remito.id!)
                                  setNuevoPago((prev) => ({ ...prev, [remito.id!]: { ...prev[remito.id!], referencia: e.target.value } }))
                                }}
                                className="w-36 px-2 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
                              />
                            </div>
                            <button
                              onClick={() => handleAgregarPago(remito.id!)}
                              disabled={guardando === remito.id || !init?.monto || isNaN(parseFloat(init.monto)) || parseFloat(init.monto) <= 0}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40 inline-flex items-center gap-1"
                            >
                              {guardando === remito.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                              Agregar Pago
                            </button>
                          </div>
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
    </div>
  )
}
