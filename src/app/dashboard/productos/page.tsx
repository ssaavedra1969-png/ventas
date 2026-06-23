'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from '@/lib/firestore'
import type { Producto } from '@/types'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Upload,
} from 'lucide-react'
import BulkUploadModal from '@/components/BulkUploadModal'
import { createMultipleProductos } from '@/lib/firestore'
import { toast } from 'sonner'

const tipos = [
  'Aglomerados',
  'Herrería',
  'Electricidad',
  'Pinturería',
  'Sanitarios',
  'Cemento',
  'Arena/Piedra',
  'Hierros',
  'Madera',
  'Pisos',
  'Techos',
  'Otros',
]

const medidas = ['Kg', 'Unidad', 'm3', 'Litro', 'Metro', 'm2', 'Bolsa', 'Pallet']

interface ProductoForm {
  nombre: string
  tipo: string
  medida: string
  valorUnitario: number
  stock: number
}

const emptyForm: ProductoForm = {
  nombre: '',
  tipo: '',
  medida: '',
  valorUnitario: 0,
  stock: 0,
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductoForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bulkOpen, setBulkOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadProductos = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getProductos(debouncedSearch, page)
      setProductos(result.data)
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    loadProductos()
  }, [loadProductos])

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    const items = data.map((row) => ({
      nombre: String(row.nombre ?? ''),
      tipo: String(row.tipo ?? ''),
      medida: String(row.medida ?? ''),
      valorUnitario: Number(row.valorUnitario) || 0,
      stock: Number(row.stock) || 0,
    }))
    return await createMultipleProductos(items)
  }

  const productosExampleData = [
    { nombre: 'Cemento Portland CPC 50kg', tipo: 'Cemento', medida: 'Bolsa', valorUnitario: 4850, stock: 200 },
    { nombre: 'Varilla de hierro diámetro 8mm', tipo: 'Hierros', medida: 'Kg', valorUnitario: 890, stock: 500 },
    { nombre: 'Pintura látex interior 20L', tipo: 'Pinturería', medida: 'Litro', valorUnitario: 3200, stock: 80 },
  ]

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (!form.tipo) errs.tipo = 'El tipo es obligatorio'
    if (!form.medida) errs.medida = 'La medida es obligatoria'
    if (form.valorUnitario <= 0) errs.valorUnitario = 'El valor debe ser mayor a 0'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editId) {
        await updateProducto(editId, form)
        toast.success('Producto actualizado exitosamente')
      } else {
        await createProducto(form)
        toast.success('Producto creado exitosamente')
      }
      setModalOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setErrors({})
      loadProductos()
    } catch {
      toast.error('Error al guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (producto: Producto) => {
    setForm({
      nombre: producto.nombre,
      tipo: producto.tipo,
      medida: producto.medida,
      valorUnitario: producto.valorUnitario,
      stock: producto.stock ?? 0,
    })
    setEditId(producto.id ?? null)
    setErrors({})
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProducto(id)
      toast.success('Producto eliminado exitosamente')
      setDeleteConfirm(null)
      loadProductos()
    } catch {
      toast.error('Error al eliminar el producto')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-[#B0B0D0] text-sm">Catálogo de productos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-[#B0B0D0] hover:text-white hover:bg-white/5 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Carga Masiva
          </button>
          <button
            onClick={() => {
              setForm(emptyForm)
              setEditId(null)
              setErrors({})
              setModalOpen(true)
            }}
            className="btn-nebula inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
        <input
          type="text"
          placeholder="Buscar por nombre o tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#12122A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6B6B8A]">No se encontraron productos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Nombre
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Medida
                  </th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    V. Unitario
                  </th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Stock
                  </th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {productos.map((producto) => (
                  <tr
                    key={producto.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {producto.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#B0B0D0] hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-full bg-[#6C3CE1]/10 text-[#6C3CE1] text-xs">
                        {producto.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#B0B0D0] hidden md:table-cell">
                      {producto.medida}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-mono">
                      ${producto.valorUnitario.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right hidden md:table-cell">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          (producto.stock ?? 0) > 0
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {producto.stock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(producto)}
                          className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-[#00D4FF] hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(producto.id ?? null)}
                          className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-red-400 hover:bg-white/5 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-sm text-[#6B6B8A]">
              {total} productos - Página {page} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!saving) {
                setModalOpen(false)
                setEditId(null)
                setForm(emptyForm)
                setErrors({})
              }
            }}
          />
          <div className="relative w-full max-w-md glass-card rounded-2xl p-6 animate-fadeInUp">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => {
                  if (!saving) {
                    setModalOpen(false)
                    setEditId(null)
                    setForm(emptyForm)
                    setErrors({})
                  }
                }}
                className="text-[#6B6B8A] hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                  placeholder="Ej: Cemento Portland"
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                    errors.nombre ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.nombre && (
                  <p className="text-xs text-red-400 mt-1">{errors.nombre}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                    Tipo *
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                      errors.tipo ? 'border-red-500/50' : 'border-white/5'
                    } text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                  >
                    <option value="">Seleccionar</option>
                    {tipos.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {errors.tipo && (
                    <p className="text-xs text-red-400 mt-1">{errors.tipo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                    Medida *
                  </label>
                  <select
                    value={form.medida}
                    onChange={(e) =>
                      setForm({ ...form, medida: e.target.value })
                    }
                    className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                      errors.medida ? 'border-red-500/50' : 'border-white/5'
                    } text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                  >
                    <option value="">Seleccionar</option>
                    {medidas.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {errors.medida && (
                    <p className="text-xs text-red-400 mt-1">
                      {errors.medida}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                    Valor Unitario ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valorUnitario}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        valorUnitario: parseFloat(e.target.value) || 0,
                      })
                    }
                    className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                      errors.valorUnitario
                        ? 'border-red-500/50'
                        : 'border-white/5'
                    } text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                  />
                  {errors.valorUnitario && (
                    <p className="text-xs text-red-400 mt-1">
                      {errors.valorUnitario}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalOpen(false)
                  setEditId(null)
                  setForm(emptyForm)
                  setErrors({})
                }}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-nebula px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : editId ? (
                  'Guardar Cambios'
                ) : (
                  'Crear Producto'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-fadeInUp text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              ¿Eliminar Producto?
            </h2>
            <p className="text-sm text-[#B0B0D0] mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Carga Masiva de Productos"
        description="Seleccioná un archivo Excel con los datos de los productos para importarlos de a uno o en lote."
        templateHeaders={['nombre', 'tipo', 'medida', 'valorUnitario', 'stock']}
        exampleData={productosExampleData}
        onUpload={handleBulkUpload}
        onRefresh={loadProductos}
      />
    </div>
  )
}
