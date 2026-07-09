'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAllRemitos, updateRemitoEstado, updateRemitoNroFactura, updateRemitoNC } from '@/modules/legacy'
import { getEmpresaConfig } from '@/modules/configuracion'
import { getAllRemitosAprobados, updateRemitoAprobadoEstado } from '@/modules/remitos-aprobados'
import { createFactura } from '@/modules/facturas'
import type { Remito, RemitoAprobado, EmpresaConfig } from '@/types'
import {
  Truck,
  Printer,
  Search,
  Loader2,
  Filter,
  MessageCircle,
  CheckCircle2,
  Ban,
  FileSignature,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const ESTADOS = ['Aceptado', 'En_Revision', 'A_Entregar']

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case 'Aceptado':
      return 'bg-emerald-500/20 text-emerald-400'
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
    case 'Aceptado': return 'Aceptado'
    case 'En_Revision': return 'En Revisión'
    case 'A_Entregar': return 'A Despachar'
    default: return estado
  }
}

export default function RemitosPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [remitosAprobados, setRemitosAprobados] = useState<RemitoAprobado[]>([])
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [facturaInputs, setFacturaInputs] = useState<Record<string, string>>({})
  const [facturando, setFacturando] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [ncPopup, setNcPopup] = useState<{
    remitoId: string
    nroNC: string
    montoNC: number
    totalGeneral: number
  } | null>(null)
  const [wspPopup, setWspPopup] = useState<{
    remitoId: string
    phone: string
    tipo: 'remito'
  } | null>(null)

  useEffect(() => {
    getEmpresaConfig().then(setEmpresa).catch(() => {})
  }, [])

  const fetchRemitos = useCallback(async () => {
    setLoading(true)
    try {
      const [data, rems] = await Promise.all([
        getAllRemitos(),
        getAllRemitosAprobados(),
      ])
      setRemitos(data)
      setRemitosAprobados(rems)
    } catch {
      toast.error('Error al cargar remitos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRemitos()
  }, [fetchRemitos])

  const todos = useMemo(() => {
    const items: (Remito & { _fuente?: string })[] = []
    for (const r of remitos) {
      if (ESTADOS.includes(r.estado)) {
        items.push({ ...r, _fuente: 'legacy' })
      }
    }
    for (const r of remitosAprobados) {
      items.push({
        id: r.id,
        numeroRemito: r.numeroRemito,
        fecha: r.fecha,
        idCliente: r.idCliente,
        clienteData: r.clienteData,
        vendedor: r.vendedor,
        items: r.items,
        subtotalGeneral: r.subtotalGeneral,
        iva: r.iva,
        totalGeneral: r.totalGeneral,
        estado: r.estado,
        observaciones: r.observaciones,
        createdAt: r.createdAt,
        _fuente: 'remito_aprobado',
      } as unknown as Remito & { _fuente?: string })
    }
    return items
  }, [remitos, remitosAprobados])

  const filtrados = todos.filter((r) => {
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

  const handleCambiarEstado = async (id: string, estado: Remito['estado']) => {
    setUpdating(id)
    try {
      const item = todos.find((r) => r.id === id)
      if (item?._fuente === 'remito_aprobado') {
        await updateRemitoAprobadoEstado(id, estado as RemitoAprobado['estado'])
      } else {
        await updateRemitoEstado(id, estado)
      }
      toast.success(`Estado actualizado a "${getEstadoLabel(estado)}"`)
      fetchRemitos()
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(null)
    }
  }

  const handleGuardarFactura = async (id: string) => {
    const nro = facturaInputs[id]?.trim()
    if (!nro) return
    setFacturando(id)
    try {
      const item = todos.find((r) => r.id === id)
      if (item?._fuente === 'remito_aprobado') {
        await updateRemitoAprobadoEstado(id, 'Finalizado')
      } else {
        await updateRemitoNroFactura(id, nro)
      }
      if (item) {
        await createFactura({
          numeroFactura: nro,
          idRemito: id,
          numeroRemito: item.numeroRemito,
          fecha: item.fecha,
          idCliente: item.idCliente,
          clienteData: item.clienteData,
          items: item.items,
          subtotalGeneral: item.subtotalGeneral,
          iva: item.iva,
          totalGeneral: item.totalGeneral,
        }).catch(() => {})
      }
      toast.success(`Factura N° ${nro} registrada`)
      setFacturaInputs((prev) => ({ ...prev, [id]: '' }))
      fetchRemitos()
    } catch {
      toast.error('Error al guardar factura')
    } finally {
      setFacturando(null)
    }
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
      fetchRemitos()
    } catch {
      toast.error('Error al guardar Nota de Crédito')
    } finally {
      setFacturando(null)
    }
  }

  const handleWspConfirm = () => {
    if (!wspPopup) return
    const { remitoId, phone } = wspPopup
    const item = remitos.find((r) => r.id === remitoId)
    if (!item) return

    const cleanPhone = phone.replace(/\D/g, '')
    if (!cleanPhone) {
      toast.error('Ingresá un número de teléfono válido')
      return
    }
    const targetPhone = (empresa?.telefonoAdmin || phone).replace(/\D/g, '')
    const nroStr = String(item.numeroRemito).padStart(6, '0')
    const msg = encodeURIComponent(
      `🚚 REMITO N° ${nroStr}\nCliente: ${item.clienteData.razonSocial}\nTotal: $${item.totalGeneral.toFixed(2)}\nCompleto: ${window.location.origin}/remitos/${remitoId}`
    )
    window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank')
    setWspPopup(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Remitos</h1>
            <p className="text-[#B0B0D0] text-sm">Remitos aprobados para despacho</p>
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

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-[#6B6B8A]" />
          <span className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider">Filtros</span>
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
          <p className="text-xs text-[#6B6B8A]">Total Remitos</p>
          <p className="text-lg font-bold text-white">{filtrados.length}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-xs text-[#6B6B8A]">Pendientes</p>
          <p className="text-lg font-bold text-amber-400">{filtrados.filter((r) => r.estado === 'En_Revision' || r.estado === 'Aceptado').length}</p>
        </div>
        <div className="glass-card rounded-xl p-3 text-center">
          <p className="text-xs text-[#6B6B8A]">A Despachar</p>
          <p className="text-lg font-bold text-violet-400">{filtrados.filter((r) => r.estado === 'A_Entregar').length}</p>
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
            <Truck className="h-10 w-10 text-[#6B6B8A] mx-auto mb-3" />
            <p className="text-[#6B6B8A]">No hay remitos aprobados todavía</p>
            <p className="text-xs text-[#6B6B8A] mt-1">Aprobá presupuestos desde la sección Presupuestos</p>
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
                  <th className="text-center text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden md:table-cell">N° Factura</th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginated.map((remito) => (
                  <tr
                    key={remito.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/remitos/${remito.id}?from=remitos`}>
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
                        {(remito.estado === 'En_Revision' || remito.estado === 'Aceptado') && (
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
                                  title="Registrar factura"
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
                                title="Marcar como A Despachar"
                              >
                                {updating === remito.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}

                        {remito.estado === 'A_Entregar' && (
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
                                  title="Registrar factura"
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

                        <Link href={`/remitos/${remito.id}?from=remitos`}>
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
                  <label className="block text-xs font-medium text-[#B0B0D0] mb-1">N° de Nota de Crédito *</label>
                  <input
                    type="text"
                    value={ncPopup.nroNC}
                    onChange={(e) => setNcPopup({ ...ncPopup, nroNC: e.target.value })}
                    placeholder="Ej: NC-0001-2024"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#B0B0D0] mb-1">Monto *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={ncPopup.totalGeneral}
                    value={ncPopup.montoNC}
                    onChange={(e) =>
                      setNcPopup({ ...ncPopup, montoNC: parseFloat(e.target.value.replace(',', '.')) || 0 })
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
                <MessageCircle className="h-6 w-6 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-1 text-center">
                Enviar por WhatsApp
              </h2>
              <p className="text-sm text-[#B0B0D0] mb-4 text-center">
                Número de Administración
              </p>
              <input
                type="text"
                value={wspPopup.phone}
                onChange={(e) => setWspPopup({ ...wspPopup, phone: e.target.value })}
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
