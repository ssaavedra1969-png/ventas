'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  getVendedores,
  createVendedor,
  updateVendedor,
  deleteVendedor,
  vendedorCodigoExists,
  getAllRemitos,
  clearCache,
} from '@/lib/firestore'
import type { Vendedor, Remito } from '@/types'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  X,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  FileText,
  DollarSign,
  Package,
  Clock,
  BarChart3,
  Medal,
  Minus,
} from 'lucide-react'
import { toast } from 'sonner'

interface VendedorForm {
  codigo: string
  nombre: string
}

const emptyForm: VendedorForm = { codigo: '', nombre: '' }

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(n: number): string {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
}

function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [allRemitos, setAllRemitos] = useState<Remito[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<VendedorForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedVendedorId, setSelectedVendedorId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [v, r] = await Promise.all([
        getVendedores(),
        getAllRemitos(),
      ])
      setVendedores(v)
      setAllRemitos(r)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filteredVendedores = useMemo(() => {
    if (!search) return vendedores
    const s = search.toLowerCase()
    return vendedores.filter(
      (v) => v.nombre.toLowerCase().includes(s) || v.codigo.toLowerCase().includes(s)
    )
  }, [vendedores, search])

  const selectedVendedor = useMemo(
    () => vendedores.find((v) => v.id === selectedVendedorId) ?? null,
    [vendedores, selectedVendedorId]
  )

  // ─── Stats per vendedor ─────────────────────────────────────────

  const stats = useMemo(() => {
    const map = new Map<string, {
      remitos: Remito[]
      totalVendido: number
      totalPagado: number
      totalPendiente: number
      productosVendidos: number
      porEstado: Record<string, number>
      porMes: Record<string, { cantidad: number; monto: number }>
    }>()

    // Inicializar
    vendedores.forEach((v) => {
      if (v.id) map.set(v.id, {
        remitos: [],
        totalVendido: 0,
        totalPagado: 0,
        totalPendiente: 0,
        productosVendidos: 0,
        porEstado: {},
        porMes: {},
      })
    })

    allRemitos.forEach((r) => {
      const cod = r.vendedor?.codigo
      if (!cod) return
      const vendedor = vendedores.find((v) => v.codigo === cod)
      if (!vendedor?.id) return
      const s = map.get(vendedor.id)
      if (!s) return

      s.remitos.push(r)
      s.totalVendido += r.totalGeneral

      const pagado = r.totalPagado ?? 0
      s.totalPagado += pagado
      s.totalPendiente += r.totalGeneral - pagado

      const prods = r.items.reduce((sum, item) => sum + item.cantidad, 0)
      s.productosVendidos += prods

      s.porEstado[r.estado] = (s.porEstado[r.estado] ?? 0) + 1

      const mk = getMonthKey(r.fecha)
      if (!s.porMes[mk]) s.porMes[mk] = { cantidad: 0, monto: 0 }
      s.porMes[mk].cantidad++
      s.porMes[mk].monto += r.totalGeneral
    })

    return map
  }, [vendedores, allRemitos])

  // Ranking
  const ranking = useMemo(() => {
    return vendedores
      .map((v) => ({
        vendedor: v,
        ...(stats.get(v.id ?? '') ?? {
          remitos: [] as Remito[],
          totalVendido: 0,
          totalPagado: 0,
          totalPendiente: 0,
          productosVendidos: 0,
          porEstado: {} as Record<string, number>,
          porMes: {} as Record<string, { cantidad: number; monto: number }>,
        }),
      }))
      .sort((a, b) => b.totalVendido - a.totalVendido)
  }, [vendedores, stats])

  const selectedStats = selectedVendedorId ? stats.get(selectedVendedorId) : null

  // ─── Form handlers ──────────────────────────────────────────────

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.codigo.trim()) errs.codigo = 'El código es obligatorio'
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const exists = await vendedorCodigoExists(form.codigo, editId ?? undefined)
      if (exists) {
        toast.error('Ya existe un vendedor con ese código')
        setSaving(false)
        return
      }
      if (editId) {
        await updateVendedor(editId, form)
        toast.success('Vendedor actualizado')
      } else {
        await createVendedor(form)
        toast.success('Vendedor creado')
      }
      setEditId(null)
      setForm(emptyForm)
      setErrors({})
      clearCache('allRemitos')
      loadData()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (v: Vendedor) => {
    setForm({ codigo: v.codigo, nombre: v.nombre })
    setEditId(v.id ?? null)
    setErrors({})
  }

  const handleCancelForm = () => {
    setEditId(null)
    setForm(emptyForm)
    setErrors({})
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteVendedor(id)
      toast.success('Vendedor eliminado')
      setDeleteConfirm(null)
      clearCache('allRemitos')
      loadData()
      if (selectedVendedorId === id) setSelectedVendedorId(null)
    } catch {
      toast.error('Error al eliminar')
    }
  }

  // ─── Medal helpers ──────────────────────────────────────────────

  const rankingMedal = (pos: number) => {
    if (pos === 0) return { icon: Medal, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    if (pos === 1) return { icon: Medal, color: 'text-gray-300', bg: 'bg-gray-400/10' }
    if (pos === 2) return { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-600/10' }
    return { icon: Minus, color: 'text-[#6B6B8A]', bg: 'bg-white/5' }
  }

  // ─── Estado helpers ─────────────────────────────────────────────

  const estadoLabel: Record<string, string> = {
    Enviado: 'Presupuesto',
    Aceptado: 'Aceptado',
    Anulado: 'Anulado',
    En_Revision: 'Revisión',
    A_Entregar: 'A Entregar',
  }

  const estadoColor: Record<string, string> = {
    Enviado: 'text-blue-400 bg-blue-500/10',
    Aceptado: 'text-emerald-400 bg-emerald-500/10',
    Anulado: 'text-red-400 bg-red-500/10',
    En_Revision: 'text-amber-400 bg-amber-500/10',
    A_Entregar: 'text-violet-400 bg-violet-500/10',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* ─── LEFT PANEL: Gestión de Vendedores ─────────────────── */}
      <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-[#6C3CE1]" />
            {editId ? 'Editar Vendedor' : 'Nuevo Vendedor'}
          </h2>

          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-[#B0B0D0] mb-1">Código *</label>
              <input
                type="text"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="Ej: AG"
                maxLength={5}
                className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${errors.codigo ? 'border-red-500/50' : 'border-white/5'} text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors uppercase`}
              />
              {errors.codigo && <p className="text-[10px] text-red-400 mt-0.5">{errors.codigo}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-[#B0B0D0] mb-1">Nombre *</label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: AGUSTIVA"
                className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${errors.nombre ? 'border-red-500/50' : 'border-white/5'} text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
              />
              {errors.nombre && <p className="text-[10px] text-red-400 mt-0.5">{errors.nombre}</p>}
            </div>
          </div>

          <div className="flex gap-2">
            {editId && (
              <button
                onClick={handleCancelForm}
                disabled={saving}
                className="flex-1 px-3 py-2 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-xs font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 btn-nebula px-3 py-2 rounded-xl text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : editId ? (
                <>
                  <Pencil className="h-3.5 w-3.5" />
                  Guardar
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Crear
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lista de Vendedores */}
        <div className="glass-card rounded-xl flex flex-col flex-1 overflow-hidden">
          <div className="p-3 border-b border-white/5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B6B8A]" />
              <input
                type="text"
                placeholder="Buscar vendedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-lg bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-xs focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredVendedores.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-8 w-8 text-[#6B6B8A] mx-auto mb-2" />
                <p className="text-xs text-[#6B6B8A]">No hay vendedores</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredVendedores.map((v) => {
                  const s = stats.get(v.id ?? '')
                  const isSelected = selectedVendedorId === v.id
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVendedorId(v.id ?? null)}
                      className={classNames(
                        'w-full text-left px-3 py-2.5 transition-colors hover:bg-white/[0.03]',
                        isSelected && 'bg-[#6C3CE1]/10 border-l-2 border-[#6C3CE1]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#6C3CE1]/10 text-[#6C3CE1] text-[10px] font-mono font-bold shrink-0">
                            {v.codigo}
                          </span>
                          <span className="text-sm text-white font-medium truncate">{v.nombre}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {s && (
                            <span className="text-[10px] text-[#6B6B8A] font-mono">
                              {formatCurrency(s.totalVendido)}
                            </span>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(v) }}
                            className="p-1 rounded-lg text-[#6B6B8A] hover:text-[#00D4FF] hover:bg-white/5 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(v.id ?? null) }}
                            className="p-1 rounded-lg text-[#6B6B8A] hover:text-red-400 hover:bg-white/5 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL: Estadísticas ─────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-5">
        {selectedVendedor && selectedStats ? (
          <>
            {/* Header */}
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] flex items-center justify-center text-white font-bold text-sm font-mono">
                  {selectedVendedor.codigo}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedVendedor.nombre}</h2>
                  <p className="text-xs text-[#6B6B8A]">{selectedStats.remitos.length} remitos</p>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] text-[#B0B0D0] uppercase tracking-wider">Vendido</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">{formatCurrency(selectedStats.totalVendido)}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[10px] text-[#B0B0D0] uppercase tracking-wider">Remitos</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">{selectedStats.remitos.length}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[10px] text-[#B0B0D0] uppercase tracking-wider">Productos</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">{selectedStats.productosVendidos}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-[10px] text-[#B0B0D0] uppercase tracking-wider">Pendiente</span>
                  </div>
                  <p className="text-lg font-bold text-white font-mono">{formatCurrency(selectedStats.totalPendiente)}</p>
                </div>
              </div>
            </div>

            {/* Remitos por Estado */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#6C3CE1]" />
                Remitos por Estado
              </h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(selectedStats.porEstado).length === 0 ? (
                  <p className="text-xs text-[#6B6B8A]">Sin remitos</p>
                ) : (
                  Object.entries(selectedStats.porEstado)
                    .sort(([, a], [, b]) => b - a)
                    .map(([estado, count]) => (
                      <div
                        key={estado}
                        className={classNames(
                          'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2',
                          estadoColor[estado] ?? 'text-[#B0B0D0] bg-white/5'
                        )}
                      >
                        <span>{estadoLabel[estado] ?? estado}</span>
                        <span className="font-bold">{count}</span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Timeline / últimos remitos del vendedor */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#6C3CE1]" />
                Evolución Mensual
              </h3>
              {Object.keys(selectedStats.porMes).length === 0 ? (
                <p className="text-xs text-[#6B6B8A]">Sin actividad</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(selectedStats.porMes)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .slice(-6)
                    .map(([mes, d]) => {
                      const [y, m] = mes.split('-')
                      const label = `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
                      return (
                        <div key={mes} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                          <span className="text-xs text-[#B0B0D0] w-20 shrink-0">{label}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#6C3CE1] to-[#00D4FF]"
                              style={{ width: `${Math.min(100, (d.monto / selectedStats.totalVendido) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-white font-mono w-24 text-right">{formatCurrency(d.monto)}</span>
                          <span className="text-[10px] text-[#6B6B8A] w-12 text-right">{d.cantidad} und.</span>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Últimos remitos del vendedor */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#6C3CE1]" />
                Últimos Remitos
              </h3>
              {selectedStats.remitos.length === 0 ? (
                <p className="text-xs text-[#6B6B8A]">Sin remitos</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedStats.remitos
                    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
                    .slice(0, 10)
                    .map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                        <span className="text-[10px] font-mono font-bold text-white w-16 shrink-0">
                          #{String(r.numeroRemito).padStart(6, '0')}
                        </span>
                        <span className="text-xs text-[#B0B0D0] flex-1 truncate">{r.clienteData.razonSocial}</span>
                        <span className="text-xs text-white font-mono">{formatCurrency(r.totalGeneral)}</span>
                        <span className={classNames(
                          'text-[10px] px-1.5 py-0.5 rounded-md',
                          estadoColor[r.estado] ?? 'text-[#B0B0D0] bg-white/5'
                        )}>
                          {estadoLabel[r.estado] ?? r.estado}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Ranking General */}
            <div className="glass-card rounded-xl p-5">
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Medal className="h-5 w-5 text-[#6C3CE1]" />
                Ranking de Vendedores
              </h2>

              {ranking.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-10 w-10 text-[#6B6B8A] mx-auto mb-2" />
                  <p className="text-sm text-[#6B6B8A]">No hay vendedores cargados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 py-2 text-[10px] text-[#6B6B8A] uppercase tracking-wider font-semibold">
                    <span className="w-8 text-center">#</span>
                    <span className="flex-1">Vendedor</span>
                    <span className="w-20 text-right">Vendido</span>
                    <span className="w-16 text-right">Remitos</span>
                    <span className="w-16 text-right">Productos</span>
                    <span className="w-20 text-right">Cobrado</span>
                    <span className="w-20 text-right">Pendiente</span>
                  </div>
                  {ranking.map((r, i) => {
                    const m = rankingMedal(i)
                    const Icon = m.icon
                    return (
                      <div
                        key={r.vendedor.id}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer border border-transparent hover:border-[#6C3CE1]/10"
                        onClick={() => setSelectedVendedorId(r.vendedor.id ?? null)}
                      >
                        <div className={classNames('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', m.bg)}>
                          <Icon className={classNames('h-4 w-4', m.color)} />
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-[#6C3CE1]/10 text-[#6C3CE1] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                            {r.vendedor.codigo}
                          </span>
                          <span className="text-sm text-white font-medium truncate">{r.vendedor.nombre}</span>
                        </div>
                        <span className="text-sm text-white font-mono w-20 text-right">{formatCurrency(r.totalVendido)}</span>
                        <span className="text-xs text-[#B0B0D0] font-mono w-16 text-right">{r.remitos.length}</span>
                        <span className="text-xs text-[#B0B0D0] font-mono w-16 text-right">{r.productosVendidos}</span>
                        <span className="text-xs text-emerald-400 font-mono w-20 text-right">{formatCurrency(r.totalPagado)}</span>
                        <span className="text-xs text-amber-400 font-mono w-20 text-right">{formatCurrency(r.totalPendiente)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Resumen global */}
            {ranking.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-[#B0B0D0] uppercase tracking-wider mb-3">Total General</h3>
                  <p className="text-2xl font-bold text-white font-mono">
                    {formatCurrency(ranking.reduce((s, r) => s + r.totalVendido, 0))}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#6B6B8A]">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                      {formatCurrency(ranking.reduce((s, r) => s + r.totalPagado, 0))}
                    </span>
                    <span>cobrado</span>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-[#B0B0D0] uppercase tracking-wider mb-3">Remitos Totales</h3>
                  <p className="text-2xl font-bold text-white font-mono">
                    {ranking.reduce((s, r) => s + r.remitos.length, 0)}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#6B6B8A]">
                    <Package className="h-3 w-3 text-violet-400" />
                    <span className="text-violet-400 font-medium">
                      {ranking.reduce((s, r) => s + r.productosVendidos, 0)}
                    </span>
                    <span>productos</span>
                  </div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-[#B0B0D0] uppercase tracking-wider mb-3">Pendiente Total</h3>
                  <p className="text-2xl font-bold text-white font-mono">
                    {formatCurrency(ranking.reduce((s, r) => s + r.totalPendiente, 0))}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#6B6B8A]">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span className="text-amber-400 font-medium">
                      {ranking.filter((r) => r.totalPendiente > 0).length} vendedores
                    </span>
                    <span>con deuda</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Delete Confirm Modal ──────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-fadeInUp text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">¿Eliminar Vendedor?</h2>
            <p className="text-sm text-[#B0B0D0] mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
