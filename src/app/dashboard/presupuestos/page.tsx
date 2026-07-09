'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAllRemitos, updateRemitoEstado } from '@/modules/legacy'
import { getAllPresupuestos, updatePresupuestoEstado } from '@/modules/presupuestos'
import { createRemitoFromPresupuesto } from '@/modules/remitos-aprobados'
import type { Remito, Presupuesto } from '@/types'
import {
  Printer,
  Search,
  Loader2,
  AlertTriangle,
  Filter,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Smartphone,
  Send,
  PlusCircle,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const ESTADOS = ['Enviado', 'Anulado']

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'Enviado':
      return 'bg-blue-500/20 text-blue-400'
    case 'Anulado':
      return 'bg-red-500/20 text-red-400'
    default:
      return 'bg-white/5 text-[#B0B0D0]'
  }
}

const getEstadoLabel = (estado: string) => {
  switch (estado) {
    case 'Enviado': return 'Enviado'
    case 'Anulado': return 'Anulado'
    default: return estado
  }
}

export default function PresupuestosPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [anularConfirm, setAnularConfirm] = useState<{ id: string; tipo: 'legacy' | 'presupuesto' } | null>(null)
  const [aceptarConfirm, setAceptarConfirm] = useState<{ id: string; tipo: 'legacy' | 'presupuesto' } | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [wspPopup, setWspPopup] = useState<{
    remitoId: string
    phone: string
    tipo: 'presupuesto'
  } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [data, pres] = await Promise.all([
        getAllRemitos(),
        getAllPresupuestos(),
      ])
      setRemitos(data)
      setPresupuestos(pres)
    } catch {
      toast.error('Error al cargar presupuestos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const items = useMemo(() => {
    const result: (Remito & { _fuente?: string })[] = []
    for (const r of remitos) {
      if (r.estado === 'Enviado' || r.estado === 'Anulado') {
        result.push({ ...r, _fuente: 'legacy' })
      }
    }
    for (const p of presupuestos) {
      result.push({
        id: p.id,
        numeroRemito: p.numeroPresupuesto,
        fecha: p.fecha,
        idCliente: p.idCliente,
        clienteData: p.clienteData,
        vendedor: p.vendedor,
        items: p.items,
        subtotalGeneral: p.subtotalGeneral,
        iva: p.iva,
        totalGeneral: p.totalGeneral,
        estado: p.estado === 'Aprobado' ? 'En_Revision' : p.estado,
        observaciones: p.observaciones,
        createdAt: p.createdAt,
        _fuente: 'presupuesto',
      } as unknown as Remito & { _fuente?: string })
    }
    return result
  }, [remitos, presupuestos])

  const filtrados = items.filter((r) => {
    if (!ESTADOS.includes(r.estado as string)) return false
    if (filtroCliente) {
      const s = filtroCliente.toLowerCase()
      if (!r.clienteData.razonSocial?.toLowerCase().includes(s) &&
          !(r.clienteData.numeroDocumento || (r.clienteData as { cuit?: string }).cuit || '').toLowerCase().includes(s)) return false
    }
    if (filtroFecha) {
      const d = format(r.fecha, 'yyyy-MM-dd')
      if (d !== filtroFecha) return false
    }
    return true
  })

  const paginated = filtrados.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize))

  useEffect(() => { setPage(1) }, [filtroCliente, filtroFecha])

  const handleAceptarPresupuesto = (item: Remito & { _fuente?: string }) => {
    setAceptarConfirm({ id: item.id!, tipo: item._fuente === 'presupuesto' ? 'presupuesto' : 'legacy' })
  }

  const confirmarAceptar = async () => {
    if (!aceptarConfirm) return
    const { id, tipo } = aceptarConfirm
    if (tipo === 'presupuesto') {
      const pres = presupuestos.find((p) => p.id === id)
      if (!pres) { toast.error('Presupuesto no encontrado'); return }
      setUpdating(id)
      try {
        const result = await createRemitoFromPresupuesto({
          id: pres.id!,
          numeroPresupuesto: pres.numeroPresupuesto,
          fecha: pres.fecha,
          idCliente: pres.idCliente,
          clienteData: pres.clienteData,
          vendedor: pres.vendedor,
          items: pres.items,
          subtotalGeneral: pres.subtotalGeneral,
          iva: pres.iva,
          totalGeneral: pres.totalGeneral,
          observaciones: pres.observaciones,
        })
        await updatePresupuestoEstado(id, 'Aprobado')
        toast.success(`Remito N° ${String(result.numeroRemito).padStart(6, '0')} generado`)
        setAceptarConfirm(null)
        fetchData()
      } catch {
        toast.error('Error al aprobar presupuesto')
      } finally {
        setUpdating(null)
      }
    } else {
      setUpdating(id)
      try {
        await updateRemitoEstado(id, 'En_Revision')
        toast.success('Presupuesto aceptado')
        setAceptarConfirm(null)
        fetchData()
      } catch {
        toast.error('Error al actualizar el estado')
      } finally {
        setUpdating(null)
      }
    }
  }

  const handleWspConfirm = () => {
    if (!wspPopup) return
    const { remitoId, phone } = wspPopup
    const item = items.find((r) => r.id === remitoId)
    if (!item) return

    const cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone) {
      toast.error('Ingresá un número de teléfono válido')
      return
    }
    const nroStr = String(item.numeroRemito).padStart(6, '0')
    const msg = encodeURIComponent(
      `📋 PRESUPUESTO N° ${nroStr}\nCliente: ${item.clienteData.razonSocial}\nTotal: $${item.totalGeneral.toFixed(2)}\nCompleto: ${window.location.origin}/remitos/${remitoId}`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank')
    setWspPopup(null)
  }

  const getTotalPorEstado = (estados: string[]) =>
    filtrados
      .filter((r) => estados.includes(r.estado))
      .reduce((sum, r) => sum + r.totalGeneral, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-[#6C3CE1]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Presupuestos</h1>
            <p className="text-[#B0B0D0] text-sm">Gestión de presupuestos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="p-2 rounded-lg text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/dashboard/presupuestos/nuevo">
            <button className="btn-nebula inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium">
              <PlusCircle className="h-4 w-4" />
              Nuevo Presupuesto
            </button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-[#6B6B8A]" />
          <span className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider">
            Filtros
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
            />
          </div>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-xs text-[#6B6B8A]">Total Presupuestos</p>
          <p className="text-lg font-bold text-white">{filtrados.length}</p>
          <p className="text-xs font-mono text-white">
            ${getTotalPorEstado(ESTADOS).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-xs text-[#6B6B8A]">Enviados</p>
          <p className="text-lg font-bold text-blue-400">{filtrados.filter((r) => r.estado === 'Enviado').length}</p>
          <p className="text-xs font-mono text-blue-400">
            ${getTotalPorEstado(['Enviado']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-xs text-[#6B6B8A]">Anulados</p>
          <p className="text-lg font-bold text-red-400">{filtrados.filter((r) => r.estado === 'Anulado').length}</p>
          <p className="text-xs font-mono text-red-400">
            ${getTotalPorEstado(['Anulado']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="h-10 w-10 text-[#6B6B8A] mx-auto mb-3" />
            <p className="text-[#6B6B8A]">No hay presupuestos aún</p>
            <Link href="/dashboard/presupuestos/nuevo">
              <button className="mt-4 btn-nebula inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium">
                <PlusCircle className="h-4 w-4" />
                Crear Primer Presupuesto
              </button>
            </Link>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">N°</th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Fecha</th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Cliente</th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Total</th>
                  <th className="text-center text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Estado</th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/remitos/${item.id}?from=presupuestos`}>
                        <span className="text-sm font-bold text-white hover:text-[#6C3CE1] transition-colors">
                          #{String(item.numeroRemito).padStart(6, '0')}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#B0B0D0]">
                      {format(item.fecha, 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {item.clienteData.razonSocial}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-mono hidden sm:table-cell">
                      ${item.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(item.estado)}`}
                      >
                        {getEstadoLabel(item.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.estado === 'Enviado' && (
                          <>
                            <button
                              onClick={() =>
                                setWspPopup({
                                  remitoId: item.id!,
                                  phone: item.clienteData.telefono,
                                  tipo: 'presupuesto',
                                })
                              }
                              disabled={updating === item.id}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                              title="Enviar por WhatsApp al cliente"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleAceptarPresupuesto(item)}
                              disabled={updating === item.id}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                              title="Aprobar presupuesto"
                            >
                              {updating === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setAnularConfirm({ id: item.id ?? '', tipo: item._fuente === 'presupuesto' ? 'presupuesto' : 'legacy' })}
                              disabled={updating === item.id}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              title="Anular presupuesto"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {item.estado === 'Anulado' && (
                          <span className="text-[10px] text-red-400/60 italic mr-1">Anulado</span>
                        )}
                        <Link href={`/remitos/${item.id}?from=presupuestos`}>
                          <Printer className="h-4 w-4 text-[#6B6B8A] hover:text-white transition-colors" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#B0B0D0] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <span className="text-xs text-[#6B6B8A]">
                Página {page} de {totalPages} ({filtrados.length} resultados)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#B0B0D0] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente →
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Anular Confirmation */}
      <AnimatePresence>
        {anularConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAnularConfirm(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-sm glass-card rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                ¿Anular Presupuesto?
              </h2>
              <p className="text-sm text-[#B0B0D0] mb-6">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAnularConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!anularConfirm) return
                    const { id, tipo } = anularConfirm
                    if (tipo === 'presupuesto') {
                      try { await updatePresupuestoEstado(id, 'Anulado'); toast.success('Presupuesto anulado'); setAnularConfirm(null); fetchData() }
                      catch { toast.error('Error al anular') }
                    } else {
                      setUpdating(id)
                      try { await updateRemitoEstado(id, 'Anulado'); toast.success('Presupuesto anulado'); setAnularConfirm(null); fetchData() }
                      catch { toast.error('Error al anular') }
                      finally { setUpdating(null) }
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
                >
                  Anular
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Aceptar Confirmation */}
      <AnimatePresence>
        {aceptarConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setAceptarConfirm(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-sm glass-card rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">
                Aprobar Presupuesto
              </h2>
              <p className="text-sm text-[#B0B0D0] mb-6">
                Se generará un Remito a partir del presupuesto
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAceptarConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAceptar}
                  disabled={updating === aceptarConfirm?.id}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {updating === aceptarConfirm?.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Popup */}
      <AnimatePresence>
        {wspPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setWspPopup(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-sm glass-card rounded-2xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 text-center">
                Enviar Presupuesto por WhatsApp
              </h2>
              <p className="text-sm text-[#B0B0D0] mb-4 text-center">
                Número del cliente
              </p>
              <input
                type="text"
                value={wspPopup.phone}
                onChange={(e) =>
                  setWspPopup({ ...wspPopup, phone: e.target.value })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-green-500/50 transition-colors mb-5"
                placeholder="Ingresá el número..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setWspPopup(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWspConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Enviar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
