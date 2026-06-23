'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  clienteExists,
} from '@/lib/firestore'
import type { Cliente } from '@/types'
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
import { createMultipleClientes } from '@/lib/firestore'
import { toast } from 'sonner'

interface ClienteForm {
  cuit: string
  razonSocial: string
  direccion: string
  telefono: string
}

const emptyForm: ClienteForm = {
  cuit: '',
  razonSocial: '',
  direccion: '',
  telefono: '',
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ClienteForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [bulkOpen, setBulkOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadClientes = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getClientes(debouncedSearch, page)
      setClientes(result.data)
      setTotalPages(result.totalPages)
      setTotal(result.total)
    } catch {
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, page])

  useEffect(() => {
    loadClientes()
  }, [loadClientes])

  const validate = (): boolean => {
    const errs: Partial<ClienteForm> = {}
    if (!form.cuit.trim()) errs.cuit = 'El CUIT es obligatorio'
    if (!form.razonSocial.trim()) errs.razonSocial = 'La razón social es obligatoria'
    if (!form.direccion.trim()) errs.direccion = 'La dirección es obligatoria'
    if (!form.telefono.trim()) errs.telefono = 'El teléfono es obligatorio'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const exists = await clienteExists(form.cuit, editId ?? undefined)
      if (exists) {
        toast.error('Ya existe un cliente con ese CUIT')
        setSaving(false)
        return
      }

      if (editId) {
        await updateCliente(editId, form)
        toast.success('Cliente actualizado exitosamente')
      } else {
        await createCliente(form)
        toast.success('Cliente creado exitosamente')
      }
      setModalOpen(false)
      setEditId(null)
      setForm(emptyForm)
      setErrors({})
      loadClientes()
    } catch {
      toast.error('Error al guardar el cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setForm({
      cuit: cliente.cuit,
      razonSocial: cliente.razonSocial,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
    })
    setEditId(cliente.id ?? null)
    setErrors({})
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCliente(id)
      toast.success('Cliente eliminado exitosamente')
      setDeleteConfirm(null)
      loadClientes()
    } catch {
      toast.error('Error al eliminar el cliente')
    }
  }

  const openCreateModal = () => {
    setForm(emptyForm)
    setEditId(null)
    setErrors({})
    setModalOpen(true)
  }

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    const items = data.map((row) => ({
      cuit: String(row.cuit ?? ''),
      razonSocial: String(row.razonSocial ?? ''),
      direccion: String(row.direccion ?? ''),
      telefono: String(row.telefono ?? ''),
    }))
    return await createMultipleClientes(items)
  }

  const clientesExampleData = [
    { cuit: '30-12345678-9', razonSocial: 'GRUPO FALPAT SRL', direccion: 'Av. Corrientes 1234, CABA', telefono: '011-4567-8901' },
    { cuit: '30-23456789-0', razonSocial: 'MATERIALES DEL SUR SA', direccion: 'Av. Rivadavia 5678, CABA', telefono: '011-5678-9012' },
    { cuit: '27-34567890-1', razonSocial: 'CONSTRUCCIONES NORTE SRL', direccion: 'Av. Cabildo 4321, CABA', telefono: '011-6789-0123' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-[#B0B0D0] text-sm">Gestión de clientes</p>
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
            onClick={openCreateModal}
            className="btn-nebula inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
        <input
          type="text"
          placeholder="Buscar por CUIT o Razón Social..."
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

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6B6B8A]">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    CUIT
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Razón Social
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Dirección
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                    Teléfono
                  </th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white">
                      {cliente.cuit}
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {cliente.razonSocial}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#B0B0D0] hidden md:table-cell">
                      {cliente.direccion}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#B0B0D0] hidden md:table-cell">
                      {cliente.telefono}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-[#00D4FF] hover:bg-white/5 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(cliente.id ?? null)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-sm text-[#6B6B8A]">
              {total} clientes - Página {page} de {totalPages}
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
                {editId ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                  CUIT *
                </label>
                <input
                  type="text"
                  value={form.cuit}
                  onChange={(e) =>
                    setForm({ ...form, cuit: e.target.value })
                  }
                  placeholder="XX-XXXXXXXX-X"
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                    errors.cuit ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.cuit && (
                  <p className="text-xs text-red-400 mt-1">{errors.cuit}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                  Razón Social *
                </label>
                <input
                  type="text"
                  value={form.razonSocial}
                  onChange={(e) =>
                    setForm({ ...form, razonSocial: e.target.value })
                  }
                  placeholder="Nombre del cliente"
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                    errors.razonSocial ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.razonSocial && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.razonSocial}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                  Dirección *
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  placeholder="Dirección completa"
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                    errors.direccion ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.direccion && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.direccion}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                  Teléfono *
                </label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                  placeholder="Número de teléfono"
                  className={`w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border ${
                    errors.telefono ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.telefono && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.telefono}
                  </p>
                )}
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
                  'Crear Cliente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
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
              ¿Eliminar Cliente?
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
        title="Carga Masiva de Clientes"
        description="Seleccioná un archivo Excel con los datos de los clientes para importarlos de a uno o en lote."
        templateHeaders={['cuit', 'razonSocial', 'direccion', 'telefono']}
        exampleData={clientesExampleData}
        onUpload={handleBulkUpload}
        onRefresh={loadClientes}
      />
    </div>
  )
}
