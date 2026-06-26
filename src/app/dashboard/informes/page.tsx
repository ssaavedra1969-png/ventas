'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { getAllRemitos, clearCache } from '@/lib/firestore'
import type { Remito } from '@/types'
import {
  BarChart3,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Filter,
  X,
  ChevronDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const ESTADOS = ['Enviado', 'Aceptado', 'Anulado', 'En_Revision', 'A_Entregar']

function toDate(v: Date | string | { toDate?: () => Date }): Date {
  if (v instanceof Date) return v
  if (typeof v === 'object' && v?.toDate) return v.toDate()
  return new Date(v as string)
}

function formatDate(v: Date | string | { toDate?: () => Date } | undefined): string {
  if (!v) return '—'
  try {
    return format(toDate(v), 'dd/MM/yyyy', { locale: es })
  } catch {
    return '—'
  }
}

function formatCurrency(n: number | undefined): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

const condIVALabel: Record<string, string> = {
  RI: 'Resp. Inscripto',
  Monotributo: 'Monotributo',
  Exento: 'Exento',
  CF: 'Cons. Final',
}

const estadoBadge: Record<string, string> = {
  Enviado: 'bg-blue-500/20 text-blue-400',
  Aceptado: 'bg-emerald-500/20 text-emerald-400',
  Anulado: 'bg-red-500/20 text-red-400',
  En_Revision: 'bg-amber-500/20 text-amber-400',
  A_Entregar: 'bg-violet-500/20 text-violet-400',
}

type Filtros = {
  fechaDesde: string
  fechaHasta: string
  cliente: string
  vendedor: string
  estado: string
  facturado: string
}

export default function InformesPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<Filtros>({
    fechaDesde: '',
    fechaHasta: '',
    cliente: '',
    vendedor: '',
    estado: '',
    facturado: '',
  })
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getAllRemitos(true)
      setRemitos(r)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const vendedoresUnicos = useMemo(() => {
    const set = new Set<string>()
    remitos.forEach(r => r.vendedor?.nombre && set.add(r.vendedor.nombre))
    return Array.from(set).sort()
  }, [remitos])

  const remitosFiltrados = useMemo(() => {
    return remitos.filter((r) => {
      if (filtros.fechaDesde) {
        const d = toDate(r.fecha)
        if (d < new Date(filtros.fechaDesde + 'T00:00:00')) return false
      }
      if (filtros.fechaHasta) {
        const d = toDate(r.fecha)
        if (d > new Date(filtros.fechaHasta + 'T23:59:59')) return false
      }
      if (filtros.cliente) {
        const s = filtros.cliente.toLowerCase()
        if (!r.clienteData.razonSocial.toLowerCase().includes(s) &&
            !r.clienteData.numeroDocumento.includes(s)) return false
      }
      if (filtros.vendedor && r.vendedor?.nombre !== filtros.vendedor) return false
      if (filtros.estado && r.estado !== filtros.estado) return false
      if (filtros.facturado === 'facturado' && !r.facturado) return false
      if (filtros.facturado === 'no_facturado' && r.facturado) return false
      if (filtros.facturado === 'anulado' && !r.facturaAnulada) return false
      return true
    })
  }, [remitos, filtros])

  const stats = useMemo(() => {
    const t = remitosFiltrados
    return {
      cantidad: t.length,
      subtotal: t.reduce((s, r) => s + (r.subtotalGeneral ?? 0), 0),
      iva: t.reduce((s, r) => s + (r.iva ?? 0), 0),
      total: t.reduce((s, r) => s + (r.totalGeneral ?? 0), 0),
      pagado: t.reduce((s, r) => s + (r.totalPagado ?? 0), 0),
      saldo: t.reduce((s, r) => s + ((r.totalGeneral ?? 0) - (r.totalPagado ?? 0)), 0),
      facturados: t.filter(r => r.facturado).length,
      anulados: t.filter(r => r.facturaAnulada).length,
      entregas: t.reduce((s, r) => s + (r.entregas?.length ?? 0), 0),
    }
  }, [remitosFiltrados])

  const limpiarFiltros = () => {
    setFiltros({ fechaDesde: '', fechaHasta: '', cliente: '', vendedor: '', estado: '', facturado: '' })
  }

  const hayFiltros = Object.values(filtros).some(Boolean)

  const filas = useMemo(() => {
    return remitosFiltrados.map((r) => {
      const pagos = r.pagos ?? []
      const entregas = r.entregas ?? []
      const refPagos = pagos
        .filter(p => p.referencia)
        .map(p => `${p.metodo}: ${p.referencia}`)
        .join(' | ') || '—'
      const idsEntrega = entregas
        .map(e => e.id.slice(-6).toUpperCase())
        .join(', ') || '—'
      const facturaDisplay = r.facturado
        ? `Rto #${r.numeroRemito} → Fact ${r.nroFactura || 'S/N'}`
        : r.facturaAnulada
          ? `Rto #${r.numeroRemito} → NC ${r.nroNC || 'S/N'}`
          : `Rto #${r.numeroRemito} → —`
      return {
        numeroRemito: r.numeroRemito,
        fecha: formatDate(r.fecha),
        cliente: r.clienteData.razonSocial,
        documento: r.clienteData.tipoDocumento
          ? `${r.clienteData.tipoDocumento} ${r.clienteData.numeroDocumento}`
          : r.clienteData.numeroDocumento,
        localidad: r.clienteData.localidad || '—',
        condicionIVA: condIVALabel[r.clienteData.condicionIVA] || r.clienteData.condicionIVA || '—',
        vendedor: r.vendedor?.nombre || '—',
        estado: r.estado,
        subtotal: r.subtotalGeneral ?? 0,
        iva: r.iva ?? 0,
        total: r.totalGeneral ?? 0,
        nroFactura: r.facturado ? (r.nroFactura || 'S/N') : '—',
        fechaFactura: r.facturado ? formatDate(r.fechaFacturado) : '—',
        facturaDisplay,
        totalPagado: r.totalPagado ?? 0,
        saldo: (r.totalGeneral ?? 0) - (r.totalPagado ?? 0),
        metodosPago: pagos.map(p => p.metodo).filter((v, i, a) => a.indexOf(v) === i).join(', ') || '—',
        cantidadPagos: pagos.length,
        refPagos,
        cantidadEntregas: entregas.length,
        estadoEntregas: entregas.length > 0
          ? entregas.length === r.items.length ? 'Completa' : 'Parcial'
          : 'Sin entregas',
        idsEntrega,
        items: r.items.length,
        nroNC: r.facturaAnulada ? (r.nroNC || 'S/N') : '—',
        montoNC: r.facturaAnulada ? (r.montoNC ?? 0) : 0,
      }
    })
  }, [remitosFiltrados])

  const handleExportXLSX = () => {
    try {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(
        filas.map((f) => ({
          'N° Remito': f.numeroRemito,
          'Fecha': f.fecha,
          'Cliente': f.cliente,
          'Documento': f.documento,
          'Localidad': f.localidad,
          'Cond. IVA': f.condicionIVA,
          'Vendedor': f.vendedor,
          'Estado': f.estado,
          'Subtotal': f.subtotal,
          'IVA': f.iva,
          'Total': f.total,
          'Factura / Referencias': f.facturaDisplay,
          'N° Factura': f.nroFactura,
          'Fecha Factura': f.fechaFactura,
          'Total Pagado': f.totalPagado,
          'Saldo': f.saldo,
          'Métodos de Pago': f.metodosPago,
          'Ref. Pagos': f.refPagos,
          'Cant. Pagos': f.cantidadPagos,
          'Cant. Entregas': f.cantidadEntregas,
          'IDs Entrega': f.idsEntrega,
          'Estado Entregas': f.estadoEntregas,
          'Items': f.items,
          'N° NC': f.nroNC,
          'Monto NC': f.montoNC,
        }))
      )
      XLSX.utils.book_append_sheet(wb, ws, 'Informe')
      XLSX.writeFile(wb, `informe_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Informe exportado correctamente')
    } catch {
      toast.error('Error al exportar')
    }
  }

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <BarChart3 className="h-10 w-10 text-[#6C3CE1] mx-auto" />
          </motion.div>
          <p className="text-sm text-[#6B6B8A]">Cargando informe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Informes</h1>
          <p className="text-sm text-[#6B6B8A]">
            {remitosFiltrados.length} de {remitos.length} remitos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { clearCache('allRemitos'); fetchData() }}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#B0B0D0] hover:text-white transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportXLSX}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors text-sm font-medium"
            title="Imprimir"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
        <button
          onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#B0B0D0] hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {hayFiltros && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#6C3CE1]/20 text-[10px] text-[#6C3CE1] font-medium">
                {Object.values(filtros).filter(Boolean).length}
              </span>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${filtrosAbiertos ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {filtrosAbiertos && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#6B6B8A] mb-1 uppercase tracking-wider">Fecha desde</label>
                  <input
                    type="date"
                    value={filtros.fechaDesde}
                    onChange={(e) => setFiltros(p => ({ ...p, fechaDesde: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#6B6B8A] mb-1 uppercase tracking-wider">Fecha hasta</label>
                  <input
                    type="date"
                    value={filtros.fechaHasta}
                    onChange={(e) => setFiltros(p => ({ ...p, fechaHasta: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#6B6B8A] mb-1 uppercase tracking-wider">Cliente</label>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={filtros.cliente}
                    onChange={(e) => setFiltros(p => ({ ...p, cliente: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50 placeholder:text-[#3A3A5A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#6B6B8A] mb-1 uppercase tracking-wider">Vendedor</label>
                  <select
                    value={filtros.vendedor}
                    onChange={(e) => setFiltros(p => ({ ...p, vendedor: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50"
                  >
                    <option value="">Todos</option>
                    {vendedoresUnicos.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#6B6B8A] mb-1 uppercase tracking-wider">Estado</label>
                  <select
                    value={filtros.estado}
                    onChange={(e) => setFiltros(p => ({ ...p, estado: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50"
                  >
                    <option value="">Todos</option>
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#6B6B8A] mb-1 uppercase tracking-wider">Facturación</label>
                  <select
                    value={filtros.facturado}
                    onChange={(e) => setFiltros(p => ({ ...p, facturado: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50"
                  >
                    <option value="">Todos</option>
                    <option value="facturado">Facturado</option>
                    <option value="no_facturado">No facturado</option>
                    <option value="anulado">Anulado (NC)</option>
                  </select>
                </div>
              </div>
              {hayFiltros && (
                <div className="px-4 pb-4">
                  <button
                    onClick={limpiarFiltros}
                    className="inline-flex items-center gap-1 text-xs text-[#6B6B8A] hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Limpiar filtros
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Remitos', value: stats.cantidad, color: 'text-white' },
          { label: 'Subtotal', value: formatCurrency(stats.subtotal), color: 'text-[#B0B0D0]' },
          { label: 'IVA', value: formatCurrency(stats.iva), color: 'text-amber-400' },
          { label: 'Total', value: formatCurrency(stats.total), color: 'text-emerald-400' },
          { label: 'Pagado', value: formatCurrency(stats.pagado), color: 'text-sky-400' },
          { label: 'Saldo', value: formatCurrency(stats.saldo), color: stats.saldo > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: 'Fact/Anul', value: `${stats.facturados}/${stats.anulados}`, color: 'text-[#B0B0D0]' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2">
            <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider">{s.label}</p>
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="no-print rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden" ref={printRef}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">N°</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Fecha</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Doc.</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Localidad</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Vendedor</th>
                <th className="text-left px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Estado</th>
                <th className="text-right px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Total</th>
                <th className="text-center px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Factura</th>
                <th className="text-right px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Pagado</th>
                <th className="text-right px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Saldo</th>
                <th className="text-center px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Pagos</th>
                <th className="text-center px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Entregas</th>
                <th className="text-center px-3 py-2.5 font-semibold text-[#6B6B8A] uppercase tracking-wider">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filas.map((f) => (
                <tr key={f.numeroRemito} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 font-mono font-bold text-white">#{f.numeroRemito}</td>
                  <td className="px-3 py-2.5 text-[#B0B0D0]">{f.fecha}</td>
                  <td className="px-3 py-2.5 text-white truncate max-w-[180px]" title={f.cliente}>{f.cliente}</td>
                  <td className="px-3 py-2.5 text-[#6B6B8A] font-mono">{f.documento}</td>
                  <td className="px-3 py-2.5 text-[#6B6B8A]">{f.localidad}</td>
                  <td className="px-3 py-2.5 text-[#B0B0D0]">{f.vendedor}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${estadoBadge[f.estado] || 'bg-white/5 text-[#B0B0D0]'}`}>
                      {f.estado === 'En_Revision' ? 'En Revisión' : f.estado === 'A_Entregar' ? 'A Entregar' : f.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-400 font-medium">{formatCurrency(f.total)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {f.nroFactura !== '—' ? (
                      <span className="text-[10px] text-sky-400 font-mono" title={f.facturaDisplay}>{f.facturaDisplay}</span>
                    ) : f.nroNC !== '—' ? (
                      <span className="text-[10px] text-red-400 font-mono" title={`NC: ${f.nroNC} - $${f.montoNC.toFixed(2)}`}>{f.facturaDisplay}</span>
                    ) : (
                      <span className="text-[10px] text-[#3A3A5A]">{f.facturaDisplay}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-sky-400">{formatCurrency(f.totalPagado)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-medium" style={{ color: f.saldo > 0 ? '#f87171' : '#34d399' }}>
                    {formatCurrency(f.saldo)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#6B6B8A]">
                    {f.cantidadPagos > 0 ? (
                      <span title={`${f.metodosPago}${f.refPagos !== '—' ? `\n${f.refPagos}` : ''}`}>{f.cantidadPagos}</span>
                    ) : (
                      <span className="text-[#3A3A5A]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {f.cantidadEntregas > 0 ? (
                      <span className="text-amber-400" title={`${f.estadoEntregas}\n${f.idsEntrega}`}>{f.cantidadEntregas}</span>
                    ) : (
                      <span className="text-[#3A3A5A]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[#6B6B8A]">{f.items}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-10 text-center text-sm text-[#6B6B8A]">
                    {hayFiltros ? 'No hay remitos que coincidan con los filtros' : 'No hay remitos cargados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print version */}
      <div className="print-only hidden">
        <style>{`
          @media print {
            body { background: white; color: black; font-size: 9pt; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; font-size: 8pt; }
            th { background: #f5f5f5; font-weight: 600; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            h1 { font-size: 14pt; margin-bottom: 4px; }
            .stats { font-size: 8pt; margin-bottom: 8px; color: #666; }
          }
        `}</style>
        <h1>Informe de Remitos</h1>
        <p className="stats">
          {remitosFiltrados.length} remitos · {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}
          {hayFiltros && ' · Con filtros aplicados'}
        </p>
        <table>
          <thead>
            <tr>
              <th>N°</th><th>Fecha</th><th>Cliente</th><th>Doc.</th><th>Localidad</th>
              <th>Vendedor</th><th>Estado</th><th>Total</th><th>Factura</th>
              <th>Pagado</th><th>Saldo</th><th>Pagos</th><th>Entregas</th><th>Items</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.numeroRemito}>
                <td>#{f.numeroRemito}</td>
                <td>{f.fecha}</td>
                <td>{f.cliente}</td>
                <td>{f.documento}</td>
                <td>{f.localidad}</td>
                <td>{f.vendedor}</td>
                <td>{f.estado}</td>
                <td style={{ textAlign: 'right' }}>${f.total.toFixed(2)}</td>
                <td style={{ fontSize: '7pt' }}>{f.facturaDisplay}</td>
                <td style={{ textAlign: 'right' }}>${f.totalPagado.toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>${f.saldo.toFixed(2)}</td>
                <td style={{ textAlign: 'center' }} title={f.refPagos !== '—' ? f.refPagos : undefined}>{f.cantidadPagos}</td>
                <td style={{ textAlign: 'center' }} title={f.idsEntrega !== '—' ? f.idsEntrega : undefined}>{f.cantidadEntregas}</td>
                <td style={{ textAlign: 'center' }}>{f.items}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="stats" style={{ marginTop: 8 }}>
          Totales: Subtotal ${stats.subtotal.toFixed(2)} · IVA ${stats.iva.toFixed(2)} · Total ${stats.total.toFixed(2)} · Pagado ${stats.pagado.toFixed(2)} · Saldo ${stats.saldo.toFixed(2)}
        </p>
      </div>
    </div>
  )
}
