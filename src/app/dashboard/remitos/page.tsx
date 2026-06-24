'use client'

import { useEffect, useState, useCallback } from 'react'
import { getRemitos, updateRemitoEstado, getEmpresaConfig } from '@/lib/firestore'
import type { Remito, EmpresaConfig } from '@/types'
import {
  FileText,
  Search,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Filter,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Truck,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'presupuestos' | 'remitos'

const ESTADOS_PRESUPUESTOS = ['Enviado', 'Aceptado', 'Anulado']
const ESTADOS_REMITOS = ['En_Revision', 'A_Entregar']

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'Enviado':
      return 'bg-blue-500/20 text-blue-400'
    case 'Aceptado':
      return 'bg-emerald-500/20 text-emerald-400'
    case 'Anulado':
      return 'bg-red-500/20 text-red-400'
    case 'En_Revision':
      return 'bg-amber-500/20 text-amber-400'
    case 'A_Entregar':
      return 'bg-violet-500/20 text-violet-400'
    default:
      return 'bg-white/5 text-[#B0B0D0]'
  }
}

const getEstadoLabel = (estado: string) => {
  switch (estado) {
    case 'Enviado': return 'Enviado'
    case 'Aceptado': return 'Aceptado'
    case 'Anulado': return 'Anulado'
    case 'En_Revision': return 'En Revisión'
    case 'A_Entregar': return 'A Entregar'
    default: return estado
  }
}

export default function RemitosPage() {
  const [tab, setTab] = useState<Tab>('presupuestos')
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [anularConfirm, setAnularConfirm] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    getEmpresaConfig().then(setEmpresa).catch(() => {})
  }, [])

  const loadRemitos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getRemitos()
      setRemitos(data)
    } catch {
      toast.error('Error al cargar remitos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRemitos()
  }, [loadRemitos])

  const filtrados = remitos.filter((r) => {
    const estadosValidos = tab === 'presupuestos' ? ESTADOS_PRESUPUESTOS : ESTADOS_REMITOS
    if (!estadosValidos.includes(r.estado)) return false
    if (filtroCliente) {
      const s = filtroCliente.toLowerCase()
      if (!r.clienteData.razonSocial.toLowerCase().includes(s) &&
          !r.clienteData.cuit.toLowerCase().includes(s)) return false
    }
    if (filtroFecha) {
      const d = format(r.fecha, 'yyyy-MM-dd')
      if (d !== filtroFecha) return false
    }
    return true
  })

  const handleCambiarEstado = async (id: string, estado: Remito['estado']) => {
    setUpdating(id)
    try {
      await updateRemitoEstado(id, estado)
      toast.success(`Estado actualizado a "${getEstadoLabel(estado)}"`)
      setAnularConfirm(null)
      loadRemitos()
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(null)
    }
  }

  const handleWsp = (phone: string, id: string, nro: number, cliente: string, total: number, tipo: 'presupuesto' | 'remito', adminPhone?: string) => {
    const targetPhone = tipo === 'remito' ? (adminPhone || phone) : phone
    const cleanPhone = targetPhone.replace(/\D/g, '')
    const nroStr = String(nro).padStart(6, '0')
    const header = tipo === 'presupuesto'
      ? `📋 PRESUPUESTO N° ${nroStr}`
      : `🚚 REMITO N° ${nroStr}`
    const msg = encodeURIComponent(
      `${header}\nCliente: ${cliente}\nTotal: $${total.toFixed(2)}\nCompleto: ${window.location.origin}/remitos/${id}`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank')

    if (tipo === 'presupuesto') {
      handleCambiarEstado(id, 'Enviado')
    } else {
      handleCambiarEstado(id, 'A_Entregar')
    }
  }

  const getTotalPorEstado = (estados: string[]) =>
    filtrados
      .filter((r) => estados.includes(r.estado))
      .reduce((sum, r) => sum + r.totalGeneral, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-[#6C3CE1]" />
        <div>
          <h1 className="text-2xl font-bold text-white">Listado</h1>
          <p className="text-[#B0B0D0] text-sm">
            {tab === 'presupuestos' ? 'Presupuestos generados' : 'Remitos para entrega'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('presupuestos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'presupuestos'
              ? 'bg-gradient-to-r from-[#6C3CE1] to-[#00D4FF] text-white shadow-lg'
              : 'text-[#B0B0D0] hover:text-white hover:bg-white/5'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Presupuestos
          <span className="text-[10px] opacity-70">
            ({remitos.filter((r) => ESTADOS_PRESUPUESTOS.includes(r.estado)).length})
          </span>
        </button>
        <button
          onClick={() => setTab('remitos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'remitos'
              ? 'bg-gradient-to-r from-[#6C3CE1] to-[#00D4FF] text-white shadow-lg'
              : 'text-[#B0B0D0] hover:text-white hover:bg-white/5'
          }`}
        >
          <Truck className="h-4 w-4" />
          Remitos
          <span className="text-[10px] opacity-70">
            ({remitos.filter((r) => ESTADOS_REMITOS.includes(r.estado)).length})
          </span>
        </button>
      </div>

      {/* Filters */}
      <motion.div
        className="glass-card rounded-xl p-4"
        key={tab}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
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
      </motion.div>

      {/* Stats */}
      <AnimatePresence mode="wait">
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          key={`stats-${tab}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'presupuestos' ? (
            <>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#6B6B8A]">Total Presupuestos</p>
                <p className="text-lg font-bold text-white">{filtrados.length}</p>
                <p className="text-xs font-mono text-white">
                  ${getTotalPorEstado(ESTADOS_PRESUPUESTOS).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
                <p className="text-xs text-[#6B6B8A]">Aceptados</p>
                <p className="text-lg font-bold text-emerald-400">{filtrados.filter((r) => r.estado === 'Aceptado').length}</p>
                <p className="text-xs font-mono text-emerald-400">
                  ${getTotalPorEstado(['Aceptado']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#6B6B8A]">Anulados</p>
                <p className="text-lg font-bold text-red-400">{filtrados.filter((r) => r.estado === 'Anulado').length}</p>
                <p className="text-xs font-mono text-red-400">
                  ${getTotalPorEstado(['Anulado']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#6B6B8A]">Total Remitos</p>
                <p className="text-lg font-bold text-white">{filtrados.length}</p>
                <p className="text-xs font-mono text-white">
                  ${getTotalPorEstado(ESTADOS_REMITOS).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#6B6B8A]">En Revisión</p>
                <p className="text-lg font-bold text-amber-400">{filtrados.filter((r) => r.estado === 'En_Revision').length}</p>
                <p className="text-xs font-mono text-amber-400">
                  ${getTotalPorEstado(['En_Revision']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-xs text-[#6B6B8A]">A Entregar</p>
                <p className="text-lg font-bold text-violet-400">{filtrados.filter((r) => r.estado === 'A_Entregar').length}</p>
                <p className="text-xs font-mono text-violet-400">
                  ${getTotalPorEstado(['A_Entregar']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center" />
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* List */}
      <motion.div
        className="glass-card rounded-xl overflow-hidden"
        key={`list-${tab}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-10 w-10 text-[#6B6B8A] mx-auto mb-3" />
            <p className="text-[#6B6B8A]">
              {tab === 'presupuestos'
                ? 'No hay presupuestos aún'
                : 'No hay remitos para entregar'}
            </p>
          </div>
        ) : (
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
                {filtrados.map((remito) => (
                  <tr
                    key={remito.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/remitos/${remito.id}`}>
                        <span className="text-sm font-bold text-white hover:text-[#6C3CE1] transition-colors">
                          #{String(remito.numeroRemito).padStart(6, '0')}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#B0B0D0]">
                      {format(remito.fecha, 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {remito.clienteData.razonSocial}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-mono hidden sm:table-cell">
                      ${remito.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(remito.estado)}`}
                      >
                        {getEstadoLabel(remito.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Presupuestos tab actions */}
                        {tab === 'presupuestos' && remito.estado === 'Enviado' && (
                          <>
                            <button
                              onClick={() =>
                                handleWsp(
                                  remito.clienteData.telefono,
                                  remito.id!,
                                  remito.numeroRemito,
                                  remito.clienteData.razonSocial,
                                  remito.totalGeneral,
                                  'presupuesto'
                                )
                              }
                              disabled={updating === remito.id}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                              title="Enviar por WhatsApp al cliente"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCambiarEstado(remito.id!, 'Aceptado')}
                              disabled={updating === remito.id}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                              title="Marcar como aceptado"
                            >
                              {updating === remito.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => setAnularConfirm(remito.id ?? null)}
                              disabled={updating === remito.id}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              title="Anular presupuesto"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {tab === 'presupuestos' && remito.estado === 'Aceptado' && (
                          <span className="text-[10px] text-emerald-400/60 italic mr-1">→ Remitos</span>
                        )}

                        {tab === 'presupuestos' && remito.estado === 'Anulado' && (
                          <span className="text-[10px] text-red-400/60 italic mr-1">Anulado</span>
                        )}

                        {/* Remitos tab actions */}
                        {tab === 'remitos' && remito.estado === 'En_Revision' && (
                          <>
                            <button
                              onClick={() =>
                                handleWsp(
                                  remito.clienteData.telefono,
                                  remito.id!,
                                  remito.numeroRemito,
                                  remito.clienteData.razonSocial,
                                  remito.totalGeneral,
                                  'remito',
                                  empresa?.telefonoAdmin
                                )
                              }
                              disabled={updating === remito.id}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                              title="Enviar por WhatsApp a Administración"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleCambiarEstado(remito.id!, 'A_Entregar')}
                              disabled={updating === remito.id}
                              className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-50"
                              title="Marcar como A Entregar"
                            >
                              {updating === remito.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Truck className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}

                        {tab === 'remitos' && remito.estado === 'A_Entregar' && (
                          <span className="text-[10px] text-violet-400/60 italic mr-1">Listo</span>
                        )}

                        <Link href={`/remitos/${remito.id}`}>
                          <ChevronRight className="h-4 w-4 text-[#6B6B8A] hover:text-white transition-colors" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

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
                  onClick={() => handleCambiarEstado(anularConfirm, 'Anulado')}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
                >
                  Anular
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
