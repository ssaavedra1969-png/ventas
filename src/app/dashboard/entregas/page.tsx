'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAllRemitos, clearCache, agregarEntrega, eliminarEntrega } from '@/lib/firestore'
import type { Remito, RemitoItem, Entrega } from '@/types'
import {
  Truck,
  Search,
  Loader2,
  Plus,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Package,
  BarChart3,
  Zap,
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type ProductoConEntrega = RemitoItem & { entregado: number; pendiente: number }
type RemitoConEstado = Remito & {
  productosConEntrega: ProductoConEntrega[]
  totalPendiente: number
  completada: boolean
  enProgreso: boolean
}
type DayDelivery = { remito: RemitoConEstado; entrega: Entrega }
type DayData = {
  date: Date
  dateKey: string
  isCurrentMonth: boolean
  isToday: boolean
  deliveries: DayDelivery[]
  totalItems: number
  clientes: Set<string>
}

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

function toDate(v: Date | string | { toDate?: () => Date }): Date {
  if (v instanceof Date) return v
  if (typeof v === 'object' && v.toDate) return v.toDate()
  return new Date(v as string)
}

function buildCalendarDays(year: number, month: number): Date[] {
  const start = startOfWeek(startOfMonth(new Date(year, month)), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(new Date(year, month)), { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function EntregasPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mesActual, setMesActual] = useState(() => new Date().getMonth())
  const [añoActual, setAñoActual] = useState(() => new Date().getFullYear())
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalRemitoId, setModalRemitoId] = useState<string | null>(null)
  const [entregaFecha, setEntregaFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [entregaItems, setEntregaItems] = useState<{ idProducto: string; cantidad: string }[]>([])
  const [guardando, setGuardando] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteForRemito, setDeleteForRemito] = useState<string | null>(null)

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
        const completada = totalPendiente === 0
        const enProgreso = totalPendiente > 0 && totalPendiente < productosConEntrega.reduce((s, p) => s + p.cantidad, 0)
        return { ...r, productosConEntrega, totalPendiente, completada, enProgreso }
      })
  }, [remitos])

  const remitosFiltrados = useMemo(() => {
    if (!search) return remitosConEstado
    const s = search.toLowerCase()
    return remitosConEstado.filter(
      (r) =>
        r.clienteData.razonSocial.toLowerCase().includes(s) ||
        String(r.numeroRemito).includes(s)
    )
  }, [remitosConEstado, search])

  const calendarDays = useMemo(() => {
    return buildCalendarDays(añoActual, mesActual)
  }, [añoActual, mesActual])

  const dayDataMap = useMemo(() => {
    const map = new Map<string, DayData>()
    const today = format(new Date(), 'yyyy-MM-dd')

    for (const date of calendarDays) {
      const key = format(date, 'yyyy-MM-dd')
      map.set(key, {
        date,
        dateKey: key,
        isCurrentMonth: isSameMonth(date, new Date(añoActual, mesActual)),
        isToday: key === today,
        deliveries: [],
        totalItems: 0,
        clientes: new Set(),
      })
    }

    for (const r of remitosFiltrados) {
      if (!r.entregas) continue
      for (const entrega of r.entregas) {
        const d = toDate(entrega.fecha)
        const key = format(d, 'yyyy-MM-dd')
        const day = map.get(key)
        if (day) {
          day.deliveries.push({ remito: r, entrega })
          day.totalItems += entrega.items.reduce((s, i) => s + i.cantidad, 0)
          day.clientes.add(r.clienteData.razonSocial)
        }
      }
    }

    return map
  }, [calendarDays, remitosFiltrados, añoActual, mesActual])

  const statsMes = useMemo(() => {
    const monthDays = Array.from(dayDataMap.values()).filter(d => d.isCurrentMonth)
    const totalDeliveries = monthDays.reduce((s, d) => s + d.deliveries.length, 0)
    const totalItems = monthDays.reduce((s, d) => s + d.totalItems, 0)
    const daysWithDeliveries = monthDays.filter(d => d.deliveries.length > 0).length
    const remitosUnicos = new Set<string>()
    monthDays.forEach(d => d.deliveries.forEach(dd => remitosUnicos.add(dd.remito.id!)))
    const completadas = remitosConEstado.filter(r => r.completada).length
    const pendientes = remitosConEstado.filter(r => !r.completada).length
    return {
      totalDeliveries, totalItems, daysWithDeliveries,
      remitosUnicos: remitosUnicos.size,
      completadas, pendientes,
      enProgreso: remitosConEstado.filter(r => r.enProgreso).length,
      totalPendiente: remitosConEstado.reduce((s, r) => s + r.totalPendiente, 0),
    }
  }, [dayDataMap, remitosConEstado])

  const mesAnterior = () => {
    const prev = subMonths(new Date(añoActual, mesActual), 1)
    setAñoActual(prev.getFullYear())
    setMesActual(prev.getMonth())
  }

  const mesSiguiente = () => {
    const next = addMonths(new Date(añoActual, mesActual), 1)
    setAñoActual(next.getFullYear())
    setMesActual(next.getMonth())
  }

  const irAHoy = () => {
    const now = new Date()
    setAñoActual(now.getFullYear())
    setMesActual(now.getMonth())
    setDiaSeleccionado(format(now, 'yyyy-MM-dd'))
  }

  const toggleDia = (dateKey: string) => {
    setDiaSeleccionado(prev => prev === dateKey ? null : dateKey)
  }

  const abrirModalNuevaEntrega = (fecha?: string) => {
    setModalRemitoId(null)
    setEntregaFecha(fecha ?? format(new Date(), 'yyyy-MM-dd'))
    setEntregaItems([])
    setModalAbierto(true)
  }

  const seleccionarRemitoParaEntrega = (remitoId: string) => {
    const remito = remitosConEstado.find(r => r.id === remitoId)
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
      await agregarEntrega(modalRemitoId, { items, fecha: new Date(entregaFecha + 'T12:00:00') })
      toast.success('Entrega registrada')
      setModalAbierto(false)
      setModalRemitoId(null)
      clearCache('allRemitos')
      fetchData()
    } catch {
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

  const diaSeleccionadoData = diaSeleccionado ? dayDataMap.get(diaSeleccionado) : null

  return (
    <div className="space-y-6">
      {/* ─────── HEADER ─────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20">
            <CalendarDays className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Plan de Entregas</h1>
            <p className="text-[#B0B0D0] text-sm">Cronograma mensual de entregas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { clearCache('allRemitos'); fetchData() }}
            className="p-2 rounded-lg text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => abrirModalNuevaEntrega()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nueva Entrega</span>
          </button>
        </div>
      </div>

      {/* ─────── STATS ─────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Este Mes', value: statsMes.totalDeliveries, sub: 'entregas', color: 'text-amber-400', icon: CalendarDays },
          { label: 'Unidades', value: statsMes.totalItems, sub: 'productos', color: 'text-blue-400', icon: Package },
          { label: 'Días activos', value: statsMes.daysWithDeliveries, sub: `de ${calendarDays.filter(d => isSameMonth(d, new Date(añoActual, mesActual))).length} días`, color: 'text-emerald-400', icon: BarChart3 },
          { label: 'Remitos', value: statsMes.remitosUnicos, sub: 'con entregas', color: 'text-violet-400', icon: Truck },
          { label: 'Pendientes', value: statsMes.pendientes, sub: 'remitos', color: 'text-amber-400', icon: Clock },
          { label: 'En Progreso', value: statsMes.enProgreso, sub: 'parciales', color: 'text-blue-400', icon: Zap },
          { label: 'Completadas', value: statsMes.completadas, sub: 'remitos', color: 'text-emerald-400', icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-3 text-center">
            <s.icon className={`h-4 w-4 ${s.color} mx-auto mb-1`} />
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[#6B6B8A] leading-tight">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ─────── SEARCH ─────── */}
      <div className="relative max-w-md">
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

      {/* ─────── CALENDAR ─────── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#12122A]/50">
          <div className="flex items-center gap-1">
            <button
              onClick={mesAnterior}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-white transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={irAHoy} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-[#B0B0D0] hover:text-white transition-colors">
              Hoy
            </button>
            <button
              onClick={mesSiguiente}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-white transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-lg font-bold text-white">
            {MESES[mesActual]} <span className="text-[#6B6B8A] font-normal">{añoActual}</span>
          </h2>
          <div className="w-20" />
        </div>

        {/* Calendar Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mesActual}-${añoActual}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-white/5">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="px-1 py-2 text-center text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((date) => {
                const key = format(date, 'yyyy-MM-dd')
                const data = dayDataMap.get(key)
                const isSelected = diaSeleccionado === key
                const hasDeliveries = data ? data.deliveries.length > 0 : false
                const deliveryCount = data ? data.deliveries.length : 0
                const isCurrent = isSameMonth(date, new Date(añoActual, mesActual))
                const isTodayDate = isToday(date)

                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (isCurrent) toggleDia(key)
                    }}
                    className={`
                      relative min-h-[90px] sm:min-h-[110px] p-1.5 border-b border-r border-white/[0.03]
                      transition-all duration-200 group text-left
                      ${isCurrent ? 'cursor-pointer' : 'cursor-default'}
                      ${isSelected ? 'bg-[#6C3CE1]/10 z-10' : 'hover:bg-white/[0.02]'}
                    `}
                  >
                    {/* Day number */}
                    <div className={`
                      inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium mb-1
                      ${!isCurrent ? 'text-[#3A3A5A]' : ''}
                      ${isTodayDate ? 'bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] text-white shadow-lg shadow-[#6C3CE1]/25' : isCurrent ? 'text-[#B0B0D0]' : ''}
                    `}>
                      {format(date, 'd')}
                    </div>

                    {/* Delivery indicators */}
                    {hasDeliveries && isCurrent && (
                      <div className="space-y-0.5">
                        <div className="flex -space-x-1">
                          {data!.deliveries.slice(0, 4).map((dd, i) => {
                            const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500']
                            const isCompletada = dd.remito.completada
                            return (
                              <div
                                key={i}
                                className={`w-4 h-4 rounded-full ${colors[i % 4]} border border-[#0D0D1F] flex items-center justify-center ${isCompletada ? 'opacity-60' : ''}`}
                                title={`#${dd.remito.numeroRemito} - ${dd.remito.clienteData.razonSocial}`}
                              >
                                {isCompletada ? (
                                  <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                                ) : (
                                  <Package className="h-2 w-2 text-white" />
                                )}
                              </div>
                            )
                          })}
                          {data!.deliveries.length > 4 && (
                            <div className="w-4 h-4 rounded-full bg-[#2A2A4A] border border-[#0D0D1F] flex items-center justify-center">
                              <span className="text-[8px] text-[#6B6B8A] font-bold">+{data!.deliveries.length - 4}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#6B6B8A]">
                            {deliveryCount} entrega{deliveryCount !== 1 ? 's' : ''}
                          </span>
                          {data!.clientes.size > 0 && (
                            <>
                              <span className="text-[8px] text-[#3A3A5A]">·</span>
                              <span className="text-[10px] text-[#6B6B8A]">{data!.clientes.size} cli.</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hover preview */}
                    {hasDeliveries && isCurrent && (
                      <div className="absolute inset-x-0 bottom-full left-1/2 -translate-x-1/2 mb-1 w-[200px] hidden group-hover:block z-20">
                        <div className="bg-[#1A1A3A] border border-white/10 rounded-xl p-2 shadow-2xl shadow-black/50">
                          <p className="text-xs font-semibold text-white mb-1">
                            {format(date, "d 'de' MMMM", { locale: es })}
                          </p>
                          {data!.deliveries.slice(0, 3).map((dd) => (
                            <div key={`${dd.remito.id}-${dd.entrega.id}`} className="flex items-center gap-2 py-0.5">
                              <span className="text-[10px] font-mono text-[#6C3CE1]">#{dd.remito.numeroRemito}</span>
                              <span className="text-[10px] text-[#B0B0D0] truncate">{dd.remito.clienteData.razonSocial}</span>
                              <span className="text-[10px] text-[#6B6B8A] ml-auto">{dd.entrega.items.length} prod.</span>
                            </div>
                          ))}
                          {data!.deliveries.length > 3 && (
                            <p className="text-[10px] text-[#6B6B8A] text-center pt-1">+{data!.deliveries.length - 3} más</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Add button on hover for empty days */}
                    {isCurrent && !hasDeliveries && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirModalNuevaEntrega(key) }}
                          className="w-5 h-5 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#6B6B8A] hover:text-white transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─────── DAY DETAIL PANEL ─────── */}
      <AnimatePresence>
        {diaSeleccionado && diaSeleccionadoData && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-[#12122A]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold shadow-lg shadow-amber-500/20">
                  {format(diaSeleccionadoData.date, 'd')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white capitalize">
                    {format(diaSeleccionadoData.date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                  <p className="text-xs text-[#6B6B8A]">
                    {diaSeleccionadoData.deliveries.length} entrega{diaSeleccionadoData.deliveries.length !== 1 ? 's' : ''}
                    {' · '}{diaSeleccionadoData.totalItems} unidades
                    {' · '}{diaSeleccionadoData.clientes.size} cliente{diaSeleccionadoData.clientes.size !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => abrirModalNuevaEntrega(diaSeleccionado!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </button>
                <button
                  onClick={() => setDiaSeleccionado(null)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {diaSeleccionadoData.deliveries.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-[#3A3A5A] mx-auto mb-2" />
                  <p className="text-sm text-[#6B6B8A]">Sin entregas este día</p>
                  <button
                    onClick={() => abrirModalNuevaEntrega(diaSeleccionado!)}
                    className="mt-3 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    + Programar entrega
                  </button>
                </div>
              ) : (
                diaSeleccionadoData.deliveries.map((dd) => (
                  <DeliveryCard
                    key={`${dd.remito.id}-${dd.entrega.id}`}
                    remito={dd.remito}
                    entrega={dd.entrega}
                    onDelete={(entregaId) => {
                      setDeleteConfirm(entregaId)
                      setDeleteForRemito(dd.remito.id!)
                    }}
                    onAddMore={() => {
                      seleccionarRemitoParaEntrega(dd.remito.id!)
                      setModalAbierto(true)
                    }}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────── MODAL NUEVA ENTREGA ─────── */}
      <AnimatePresence>
        {modalAbierto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !guardando && setModalAbierto(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold text-white">Registrar Entrega</h3>
                <button
                  onClick={() => setModalAbierto(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-[#6B6B8A] mb-1">Fecha de entrega</label>
                  <input
                    type="date"
                    value={entregaFecha}
                    onChange={(e) => setEntregaFecha(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#12122A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                  />
                </div>

                {/* Remito selector (if none selected) */}
                {!modalRemitoId && (
                  <div>
                    <label className="block text-xs font-medium text-[#6B6B8A] mb-2">Seleccionar Remito</label>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {remitosConEstado
                        .filter((r) => !r.completada && r.totalPendiente > 0)
                        .map((r) => (
                          <button
                            key={r.id}
                            onClick={() => seleccionarRemitoParaEntrega(r.id!)}
                            className="w-full text-left px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                          >
                            <span className="text-xs font-mono text-[#6C3CE1]">#{r.numeroRemito}</span>
                            <span className="text-xs text-[#B0B0D0] ml-2">{r.clienteData.razonSocial}</span>
                            <span className="text-[10px] text-[#6B6B8A] ml-auto block">
                              {r.totalPendiente} pendiente{r.totalPendiente !== 1 ? 's' : ''}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Product items */}
                {modalRemitoId && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-[#6B6B8A]">Productos a entregar</label>
                      <button
                        onClick={() => { setModalRemitoId(null); setEntregaItems([]) }}
                        className="text-[10px] text-[#6C3CE1] hover:text-[#8B5CF6] transition-colors"
                      >
                        Cambiar remito
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {entregaItems.map((ei) => {
                        const remito = remitosConEstado.find((r) => r.id === modalRemitoId)
                        const prod = remito?.productosConEntrega.find((p) => p.idProducto === ei.idProducto)
                        if (!prod) return null
                        return (
                          <div key={ei.idProducto} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03]">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white truncate">{prod.nombreProducto}</p>
                              <p className="text-[10px] text-[#6B6B8A]">
                                Pendiente: {prod.pendiente} · Entregado: {prod.entregado}
                              </p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={prod.pendiente}
                              step="any"
                              value={ei.cantidad}
                              onChange={(e) =>
                                setEntregaItems((prev) =>
                                  prev.map((item) =>
                                    item.idProducto === ei.idProducto ? { ...item, cantidad: e.target.value } : item
                                  )
                                )
                              }
                              className="w-20 px-2 py-1 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-xs text-center focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 border-t border-white/5 flex justify-end gap-2">
                <button
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 rounded-xl text-sm text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarEntrega}
                  disabled={guardando || !modalRemitoId}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 flex items-center gap-2"
                >
                  {guardando ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4" />
                      Registrar Entrega
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────── DELETE CONFIRM ─────── */}
      <AnimatePresence>
        {deleteConfirm && deleteForRemito && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => { setDeleteConfirm(null); setDeleteForRemito(null) }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl w-full max-w-sm p-6 text-center"
            >
              <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Eliminar entrega</h3>
              <p className="text-sm text-[#6B6B8A] mb-6">¿Estás seguro? Esta acción no se puede deshacer.</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setDeleteConfirm(null); setDeleteForRemito(null) }}
                  className="px-4 py-2 rounded-xl text-sm text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleEliminarEntrega(deleteForRemito!, deleteConfirm!)}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-400 transition-colors shadow-lg shadow-red-500/20 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1] mx-auto mb-3" />
            <p className="text-sm text-[#B0B0D0]">Cargando entregas...</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── DeliveryCard ─── */
function DeliveryCard({
  remito,
  entrega,
  onDelete,
  onAddMore,
}: {
  remito: RemitoConEstado
  entrega: Entrega
  onDelete: (id: string) => void
  onAddMore: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${remito.completada ? 'bg-emerald-400' : remito.enProgreso ? 'bg-amber-400' : 'bg-blue-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#6C3CE1] font-semibold">#{remito.numeroRemito}</span>
            <span className="text-sm text-white truncate">{remito.clienteData.razonSocial}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#6B6B8A]">
            <span>{entrega.items.length} producto{entrega.items.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span>{entrega.items.reduce((s, i) => s + i.cantidad, 0)} unidades</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onAddMore() }}
            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-[#6B6B8A] hover:text-amber-400 transition-colors"
            title="Agregar más"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entrega.id) }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#6B6B8A] hover:text-red-400 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronRight className={`h-4 w-4 text-[#3A3A5A] transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pl-12 space-y-1">
              {entrega.items.map((item) => {
                const prod = remito.productosConEntrega.find((p) => p.idProducto === item.idProducto)
                const pendiente = prod ? prod.pendiente : 0
                return (
                  <div key={item.idProducto} className="flex items-center gap-2 text-xs">
                    <Package className="h-3 w-3 text-[#6B6B8A] shrink-0" />
                    <span className="text-[#B0B0D0] flex-1">{item.nombreProducto}</span>
                    <span className="text-white font-medium">{item.cantidad}</span>
                    <span className="text-[#6B6B8A]">/ {item.cantidad + pendiente}</span>
                    {pendiente === 0 ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    ) : pendiente > 0 && prod && prod.entregado > 0 ? (
                      <Clock className="h-3 w-3 text-amber-400" />
                    ) : null}
                  </div>
                )
              })}
              <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all"
                  style={{
                    width: `${remito.totalPendiente === 0
                      ? 100
                      : Math.round((1 - remito.totalPendiente / remito.productosConEntrega.reduce((s, p) => s + p.cantidad, 0)) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
