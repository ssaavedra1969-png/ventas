'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getVendedores,
  createVendedor,
  updateVendedor,
  deleteVendedor,
  vendedorCodigoExists,
  getVendedoresStats,
} from '@/modules/vendedores'
import type { Vendedor } from '@/types'
import type { VendedorStats } from '@/modules/vendedores'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  X,
  AlertTriangle,
  UserCheck,
  Receipt,
  DollarSign,
  Package,
  Calendar,
  BarChart3,
  Trophy,
  Eye,
  EyeOff,
} from 'lucide-react'
import BulkUploadModal from '@/components/BulkUploadModal'
import { createMultipleVendedores } from '@/modules/vendedores'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface VendedorForm {
  codigo: string
  nombre: string
}

const emptyForm: VendedorForm = { codigo: '', nombre: '' }

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [stats, setStats] = useState<VendedorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<VendedorForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bulkOpen, setBulkOpen] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [vendedoresData, statsData] = await Promise.all([
        getVendedores(),
        getVendedoresStats(),
      ])
      setVendedores(vendedoresData)
      setStats(statsData)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const filtered = vendedores.filter((v) => {
    if (!search) return true
    const s = search.toLowerCase()
    return v.nombre.toLowerCase().includes(s) || v.codigo.toLowerCase().includes(s)
  })

  const statsByCodigo = new Map(stats.map((s) => [s.codigo, s]))

  const totalRemitos = stats.reduce((sum, s) => sum + s.totalRemitos, 0)
  const totalFacturado = stats.reduce((sum, s) => sum + s.totalFacturado, 0)
  const totalItems = stats.reduce((sum, s) => sum + s.totalItems, 0)
  const topVendedor = stats.length > 0 ? stats.reduce((a, b) => a.totalFacturado > b.totalFacturado ? a : b) : null

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
      setModalOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setErrors({})
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
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteVendedor(id)
      toast.success('Vendedor eliminado')
      setDeleteConfirm(null)
      loadData()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    const items = data.map((row) => ({
      codigo: String(row.codigo ?? ''),
      nombre: String(row.nombre ?? ''),
    }))
    return await createMultipleVendedores(items)
  }

  const vendedoresExampleData = [
    { codigo: 'AG', nombre: 'AGUSTIVA' },
    { codigo: 'JC', nombre: 'JUAN CARLOS' },
    { codigo: 'MR', nombre: 'MARTÍN RODRÍGUEZ' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendedores</h1>
          <p className="text-[#B0B0D0] text-sm">Gestión de vendedores y estadísticas de rendimiento</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-[#B0B0D0] hover:text-white hover:bg-white/5 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Carga Masiva
          </button>
          <button
            onClick={() => { setForm(emptyForm); setEditId(null); setErrors({}); setModalOpen(true) }}
            className="btn-nebula inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nuevo Vendedor
          </button>
        </div>
      </div>

      {/* Resumen global */}
      {!loading && stats.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card rounded-xl px-4 py-3">
            <p className="text-[#B0B0D0] text-xs mb-0.5">Total Remitos</p>
            <p className="text-white text-lg font-bold font-mono">{totalRemitos}</p>
          </div>
          <div className="glass-card rounded-xl px-4 py-3">
            <p className="text-[#B0B0D0] text-xs mb-0.5">Total Facturado</p>
            <p className="text-white text-lg font-bold font-mono">
              ${totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="glass-card rounded-xl px-4 py-3">
            <p className="text-[#B0B0D0] text-xs mb-0.5">Items Vendidos</p>
            <p className="text-white text-lg font-bold font-mono">{totalItems.toLocaleString('es-AR')}</p>
          </div>
          <div className="glass-card rounded-xl px-4 py-3">
            <p className="text-[#B0B0D0] text-xs mb-0.5">Top Vendedor</p>
            <p className="text-white text-lg font-bold truncate">
              {topVendedor ? (
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  {topVendedor.nombre}
                </span>
              ) : '-'}
            </p>
          </div>
        </div>
      )}

      {/* Buscador + toggle estadisticas */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
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
        <button
          onClick={() => setShowStats(!showStats)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            showStats
              ? 'border-[#6C3CE1]/50 text-white bg-[#6C3CE1]/10'
              : 'border-white/10 text-[#B0B0D0] hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Estadísticas
          {showStats ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>

      {/* Tabla de vendedores */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : vendedores.length === 0 ? (
          <div className="text-center py-20">
            <UserCheck className="h-12 w-12 text-[#6B6B8A] mx-auto mb-3" />
            <p className="text-[#6B6B8A]">No hay vendedores cargados</p>
            <p className="text-xs text-[#6B6B8A] mt-1">Agregá vendedores para asignar comisiones en los remitos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Código</th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Nombre</th>
                  <th className="text-center text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Remitos</th>
                  <th className="text-center text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Facturado</th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((v) => {
                  const s = statsByCodigo.get(v.codigo)
                  return (
                    <tr key={v.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-[#6C3CE1]/10 text-[#6C3CE1] text-xs font-mono font-bold">
                          {v.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{v.nombre}</td>
                      <td className="px-4 py-3 text-center">
                        {s ? (
                          <span className="text-sm text-white font-mono">{s.totalRemitos}</span>
                        ) : (
                          <span className="text-xs text-[#6B6B8A]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s ? (
                          <span className="text-sm text-white font-mono">
                            ${s.totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="text-xs text-[#6B6B8A]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(v)} className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-[#00D4FF] hover:bg-white/5 transition-colors">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(v.id ?? null)} className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-red-400 hover:bg-white/5 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Estadísticas detalladas por vendedor */}
      {showStats && !loading && stats.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#6C3CE1]" />
            <h2 className="text-lg font-semibold text-white">Rendimiento por Vendedor</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((s) => {
              const maxFacturado = stats[0]?.totalFacturado || 1
              const pct = (s.totalFacturado / maxFacturado) * 100
              const estadoLabels: Record<string, string> = {
                Enviado: 'Enviado',
                Aceptado: 'Aceptado',
                Anulado: 'Anulado',
                En_Revision: 'Revisión',
                A_Entregar: 'A Entregar',
              }
              return (
                <div key={s.codigo} className="glass-card rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-[#6C3CE1]/10 text-[#6C3CE1] text-xs font-mono font-bold">
                          {s.codigo}
                        </span>
                        <h3 className="text-base font-semibold text-white">{s.nombre}</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-yellow-400">
                      <Trophy className="h-4 w-4" />
                      <span className="font-mono">#{stats.indexOf(s) + 1}</span>
                    </div>
                  </div>

                  {/* Barra de rendimiento relativo */}
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        background: 'linear-gradient(90deg, #6C3CE1, #00D4FF)',
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[#B0B0D0] text-xs mb-1">
                        <Receipt className="h-3 w-3" />
                        Remitos
                      </div>
                      <p className="text-white font-bold font-mono">{s.totalRemitos}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[#B0B0D0] text-xs mb-1">
                        <DollarSign className="h-3 w-3" />
                        Facturado
                      </div>
                      <p className="text-white font-bold font-mono text-sm">
                        ${s.totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[#B0B0D0] text-xs mb-1">
                        <Package className="h-3 w-3" />
                        Items
                      </div>
                      <p className="text-white font-bold font-mono">{s.totalItems.toLocaleString('es-AR')}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-[#B0B0D0] text-xs mb-1">
                        <Calendar className="h-3 w-3" />
                        Último remito
                      </div>
                      <p className="text-white font-bold font-mono text-xs">
                        {s.ultimoRemito
                          ? format(s.ultimoRemito, "d MMM yyyy", { locale: es })
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Estados */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(s.remitosPorEstado).map(([estado, count]) => (
                      <span
                        key={estado}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          estado === 'Anulado'
                            ? 'bg-red-500/10 text-red-400'
                            : estado === 'Aceptado'
                            ? 'bg-green-500/10 text-green-400'
                            : estado === 'En_Revision'
                            ? 'bg-yellow-500/10 text-yellow-400'
                            : estado === 'A_Entregar'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-[#6C3CE1]/10 text-[#6C3CE1]'
                        }`}
                      >
                        {estadoLabels[estado] || estado}
                        <span className="font-mono">{count}</span>
                      </span>
                    ))}
                  </div>

                  {/* Promedio */}
                  {s.totalRemitos > 0 && (
                    <div className="text-[10px] text-[#6B6B8A]">
                      Promedio por remito: $
                      {(s.totalFacturado / s.totalRemitos).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      {' · '}
                      Remito más alto: ${s.remitoMasAlto.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) { setModalOpen(false); setEditId(null); setForm(emptyForm); setErrors({}) } }} />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{editId ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h2>
              <button onClick={() => { setModalOpen(false); setEditId(null); setForm(emptyForm); setErrors({}) }} className="text-[#6B6B8A] hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Código *</label>
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                  placeholder="Ej: AG"
                  maxLength={5}
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${errors.codigo ? 'border-red-500/50' : 'border-white/5'} text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors uppercase`}
                />
                {errors.codigo && <p className="text-xs text-red-400 mt-1">{errors.codigo}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: AGUSTIVA"
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${errors.nombre ? 'border-red-500/50' : 'border-white/5'} text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModalOpen(false); setEditId(null); setForm(emptyForm); setErrors({}) }} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 btn-nebula px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editId ? 'Guardar Cambios' : 'Crear Vendedor'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Carga Masiva de Vendedores"
        description="Subí un Excel con los vendedores (columnas: codigo, nombre)."
        templateHeaders={['codigo', 'nombre']}
        exampleData={vendedoresExampleData}
        onUpload={handleBulkUpload}
        onRefresh={loadData}
      />
    </div>
  )
}
