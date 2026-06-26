'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAllRemitos, updateRemitoEstado, updateRemitoNroFactura, updateRemitoNC, getEmpresaConfig } from '@/lib/firestore'
import type { Remito, EmpresaConfig } from '@/types'
import {
  FileText,
  Printer,
  Search,
  Loader2,
  AlertTriangle,
  Filter,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Truck,
  Send,
  Smartphone,
  FileSignature,
  Ban,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type Tab = 'presupuestos' | 'remitos'

const ESTADOS_PRESUPUESTOS = ['Enviado', 'Anulado']
const ESTADOS_REMITOS = ['Aceptado', 'En_Revision', 'A_Entregar'] // Aceptado por backward compat

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
  const [aceptarConfirm, setAceptarConfirm] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [facturaInputs, setFacturaInputs] = useState<Record<string, string>>({})
  const [facturando, setFacturando] = useState<string | null>(null)
  const [ncPopup, setNcPopup] = useState<{
    remitoId: string
    nroNC: string
    montoNC: number
    totalGeneral: number
  } | null>(null)
  const [wspPopup, setWspPopup] = useState<{
    remitoId: string
    phone: string
    tipo: 'presupuesto' | 'remito'
  } | null>(null)

  useEffect(() => {
    getEmpresaConfig().then(setEmpresa).catch(() => {})
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('tab')
    if (t === 'presupuestos' || t === 'remitos') {
      setTab(t)
    }
  }, [])

  const fetchRemitos = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const data = await getAllRemitos(force)
      setRemitos(data)
    } catch {
      toast.error('Error al cargar remitos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRemitos()
  }, [fetchRemitos])

  const filtrados = remitos.filter((r) => {
    const estadosValidos = tab === 'presupuestos' ? ESTADOS_PRESUPUESTOS : ESTADOS_REMITOS
    if (!estadosValidos.includes(r.estado)) return false
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

  const handleCambiarEstado = async (id: string, estado: Remito['estado']) => {
    setUpdating(id)
    try {
      await updateRemitoEstado(id, estado)
      toast.success(`Estado actualizado a "${getEstadoLabel(estado)}"`)
      setAnularConfirm(null)
      setAceptarConfirm(null)
      fetchRemitos(true)
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(null)
    }
  }

  const handleAceptarPresupuesto = (id: string) => {
    setAceptarConfirm(id)
  }

  const confirmarAceptar = () => {
    if (!aceptarConfirm) return
    handleCambiarEstado(aceptarConfirm, 'En_Revision')
  }

  const handleGuardarNC = async () => {
    if (!ncPopup) return
    if (!ncPopup.nroNC.trim()) {
      toast.error('Ingresá el número de Nota de Crédito')
      return
    }
    if (ncPopup.montoNC <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    setFacturando(ncPopup.remitoId)
    try {
      await updateRemitoNC(ncPopup.remitoId, ncPopup.nroNC.trim(), ncPopup.montoNC)
      toast.success('Nota de Crédito registrada')
      setNcPopup(null)
      fetchRemitos(true)
    } catch {
      toast.error('Error al guardar Nota de Crédito')
    } finally {
      setFacturando(null)
    }
  }

  const handleGuardarFactura = async (id: string) => {
    const nro = facturaInputs[id]?.trim()
    if (!nro) return
    setFacturando(id)
    try {
      await updateRemitoNroFactura(id, nro)
      toast.success(`Factura N° ${nro} registrada`)
      setFacturaInputs((prev) => ({ ...prev, [id]: '' }))
      fetchRemitos(true)
    } catch {
      toast.error('Error al guardar factura')
    } finally {
      setFacturando(null)
    }
  }

  const handleWspConfirm = () => {
    if (!wspPopup) return
    const { remitoId, phone, tipo } = wspPopup
    const remito = remitos.find((r) => r.id === remitoId)
    if (!remito) return

    const cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone) {
      toast.error('Ingresá un número de teléfono válido')
      return
    }
    const targetPhone = tipo === 'remito' ? (empresa?.telefonoAdmin || phone).replace(/\D/g, '') : cleanPhone
    const nroStr = String(remito.numeroRemito).padStart(6, '0')
    const header = tipo === 'presupuesto'
      ? `📋 PRESUPUESTO N° ${nroStr}`
      : `🚚 REMITO N° ${nroStr}`
    const msg = encodeURIComponent(
      `${header}\nCliente: ${remito.clienteData.razonSocial}\nTotal: $${remito.totalGeneral.toFixed(2)}\nCompleto: ${window.location.origin}/remitos/${remitoId}`
    )
    window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank')
    setWspPopup(null)
  }

  const getTotalPorEstado = (estados: string[]) =>
    filtrados
      .filter((r) => estados.includes(r.estado))
      .reduce((sum, r) => sum + r.totalGeneral, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-[#6C3CE1]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Listado</h1>
            <p className="text-[#B0B0D0] text-sm">
              {tab === 'presupuestos' ? 'Presupuestos generados' : 'Remitos para entrega'}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchRemitos(true)}
          className="p-2 rounded-lg text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
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
                <p className="text-xs text-[#6B6B8A]">Anulados</p>
                <p className="text-lg font-bold text-red-400">{filtrados.filter((r) => r.estado === 'Anulado').length}</p>
                <p className="text-xs font-mono text-red-400">
                  ${getTotalPorEstado(['Anulado']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center" />
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
                <p className="text-xs text-[#6B6B8A]">Aceptados</p>
                <p className="text-lg font-bold text-emerald-400">{filtrados.filter((r) => r.estado === 'Aceptado').length}</p>
                <p className="text-xs font-mono text-emerald-400">
                  ${getTotalPorEstado(['Aceptado']).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
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
                  <th className="text-center text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden md:table-cell">N° Factura</th>
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
                      <Link href={`/remitos/${remito.id}?from=${tab}`}>
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
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`text-xs font-mono ${remito.nroFactura ? 'text-emerald-400' : 'text-[#4A4A6A]'}`}>
                        {remito.nroFactura || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Presupuestos tab actions */}
                        {tab === 'presupuestos' && remito.estado === 'Enviado' && (
                          <>
                            <button
                              onClick={() =>
                                setWspPopup({
                                  remitoId: remito.id!,
                                  phone: remito.clienteData.telefono,
                                  tipo: 'presupuesto',
                                })
                              }
                              disabled={updating === remito.id}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                              title="Enviar por WhatsApp al cliente"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleAceptarPresupuesto(remito.id!)}
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

                        {tab === 'presupuestos' && remito.estado === 'Anulado' && (
                          <span className="text-[10px] text-red-400/60 italic mr-1">Anulado</span>
                        )}

                        {/* Remitos tab actions */}
                        {tab === 'remitos' && (remito.estado === 'En_Revision' || remito.estado === 'Aceptado') && (
                          <>
                            <button
                              onClick={() =>
                                setWspPopup({
                                  remitoId: remito.id!,
                                  phone: empresa?.telefonoAdmin || remito.clienteData.telefono,
                                  tipo: 'remito',
                                })
                              }
                              disabled={updating === remito.id}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                              title="Enviar por WhatsApp a Ventas"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                            {!remito.facturado && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="N° Factura"
                                  value={facturaInputs[remito.id!] ?? ''}
                                  onChange={(e) =>
                                    setFacturaInputs((prev) => ({ ...prev, [remito.id!]: e.target.value }))
                                  }
                                  className="w-20 px-2 py-1 rounded-lg bg-[#0A0A1A] border border-white/10 text-white text-xs text-center focus:outline-none focus:border-violet-500/50 transition-colors"
                                />
                                <button
                                  onClick={() => handleGuardarFactura(remito.id!)}
                                  disabled={facturando === remito.id || !facturaInputs[remito.id!]?.trim()}
                                  className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
                                  title="Creación de factura"
                                >
                                  {facturando === remito.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FileSignature className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            )}
                            {remito.estado !== 'Aceptado' && (
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
                            )}
                          </>
                        )}

                        {tab === 'remitos' && remito.estado === 'A_Entregar' && (
                          <>
                            {!remito.facturado && !remito.facturaAnulada && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="N° Factura"
                                  value={facturaInputs[remito.id!] ?? ''}
                                  onChange={(e) =>
                                    setFacturaInputs((prev) => ({ ...prev, [remito.id!]: e.target.value }))
                                  }
                                  className="w-20 px-2 py-1 rounded-lg bg-[#0A0A1A] border border-white/10 text-white text-xs text-center focus:outline-none focus:border-violet-500/50 transition-colors"
                                />
                                <button
                                  onClick={() => handleGuardarFactura(remito.id!)}
                                  disabled={facturando === remito.id || !facturaInputs[remito.id!]?.trim()}
                                  className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
                                  title="Creación de factura"
                                >
                                  {facturando === remito.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <FileSignature className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            )}
                            {remito.facturado && !remito.facturaAnulada && (
                              <>
                                <span className="text-[10px] text-emerald-400/60 mr-1">
                                  Facturado N° {remito.nroFactura}
                                </span>
                                <button
                                  onClick={() =>
                                    setNcPopup({
                                      remitoId: remito.id!,
                                      nroNC: '',
                                      montoNC: remito.totalGeneral,
                                      totalGeneral: remito.totalGeneral,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                                  title="Anular factura"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {remito.facturaAnulada && (
                              <span className="text-[10px] text-red-400/60 mr-1">
                                Anulada N/C {remito.nroNC} ${remito.montoNC?.toFixed(2)}
                              </span>
                            )}
                          </>
                        )}

                        <Link href={`/remitos/${remito.id}?from=${tab}`}>
                          <Printer className="h-4 w-4 text-[#6B6B8A] hover:text-white transition-colors" />
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

      {/* Aceptar Presupuesto Confirmation */}
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
                Presupuesto Aprobado
              </h2>
              <p className="text-sm text-[#B0B0D0] mb-6">
                Se generará Remito/Factura
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
                  disabled={updating === aceptarConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {updating === aceptarConfirm ? (
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

      {/* NC (Nota de Crédito) Popup */}
      <AnimatePresence>
        {ncPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setNcPopup(null)}
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
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Ban className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 text-center">
                Anular Factura
              </h2>
              <p className="text-sm text-[#B0B0D0] mb-4 text-center">
                Ingresá los datos de la Nota de Crédito
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#B0B0D0] mb-1">
                    N° de Nota de Crédito *
                  </label>
                  <input
                    type="text"
                    value={ncPopup.nroNC}
                    onChange={(e) => setNcPopup({ ...ncPopup, nroNC: e.target.value })}
                    placeholder="Ej: NC-0001-2024"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B0B0D0] mb-1">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={ncPopup.totalGeneral}
                    value={ncPopup.montoNC}
                    onChange={(e) =>
                      setNcPopup({ ...ncPopup, montoNC: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                  <p className="text-[10px] text-[#6B6B8A] mt-1">
                    {ncPopup.montoNC >= ncPopup.totalGeneral
                      ? 'Anulación total'
                      : `Anulación parcial (${((ncPopup.montoNC / ncPopup.totalGeneral) * 100).toFixed(0)}% del total)`}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setNcPopup(null)}
                  disabled={facturando === ncPopup.remitoId}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarNC}
                  disabled={facturando === ncPopup.remitoId}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {facturando === ncPopup.remitoId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Ban className="h-4 w-4" />
                      Anular Factura
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
                Enviar por WhatsApp
              </h2>
              <p className="text-sm text-[#B0B0D0] mb-4 text-center">
                {wspPopup.tipo === 'presupuesto'
                  ? 'Número del cliente'
                  : 'Número de Administración'}
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
