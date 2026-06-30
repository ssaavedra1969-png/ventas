'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  createCliente,
  updateCliente,
  deleteCliente,
  clienteExists,
  clearCache,
  getClientes,
  getAllClientes,
  createMultipleClientes,
  CONDICIONES_IVA,
  CONDIVA_LABEL,
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
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Upload,
  Download,
  RefreshCw,
} from 'lucide-react'
import BulkUploadModal from '@/components/BulkUploadModal'
import AutocompleteInput from '@/components/AutocompleteInput'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { useBackgroundSync } from '@/hooks/useBackgroundSync'

interface ClienteForm {
  razonSocial: string
  tipoDocumento: string
  numeroDocumento: string
  actividad: string
  telefono: string
  domicilio: string
  localidad: string
  condicionIVA: string
}

const emptyForm: ClienteForm = {
  razonSocial: '',
  tipoDocumento: '',
  numeroDocumento: '',
  actividad: '',
  telefono: '',
  domicilio: '',
  localidad: '',
  condicionIVA: '',
}

export default function ClientesPage() {
  const [allClientes, setAllClientes] = useState<Cliente[]>([])
  const [paginatedClientes, setPaginatedClientes] = useState<Cliente[]>([])
  const [totalClientes, setTotalClientes] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20
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

  // Load paginated data from Firebase (limit 20)
  const loadClientesPage = useCallback(async (p: number, searchTerm?: string) => {
    setLoading(true)
    try {
      const result = await getClientes(searchTerm || undefined, p, pageSize)
      setPaginatedClientes(result.data)
      setTotalClientes(result.total)
      setTotalPages(result.totalPages)
    } catch (err) {
      console.error('Error loading clientes:', err)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load full list for autocomplete and export (lazy, only when needed)
  const loadFullClientes = useCallback(async () => {
    try {
      const data = await getAllClientes()
      setAllClientes(data)
    } catch {
      // Silently fail; full list is non-critical
    }
  }, [])

  // Load paginated on mount and when page/search changes
  useEffect(() => {
    loadClientesPage(page, debouncedSearch)
  }, [page, debouncedSearch, loadClientesPage])

  // Load full list once in background for autocomplete/export
  useEffect(() => {
    loadFullClientes()
  }, [loadFullClientes])

  const syncClientes = useCallback(() => {
    clearCache('allClientes')
    loadClientesPage(page, debouncedSearch)
    loadFullClientes()
  }, [loadClientesPage, loadFullClientes, page, debouncedSearch])

  useBackgroundSync(syncClientes, 600000, !loading)

  const validate = (): boolean => {
    return true
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const exists = await clienteExists(form.numeroDocumento, editId ?? undefined)
      if (exists) {
        toast.error('Ya existe un cliente con ese número de documento')
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
      loadClientesPage(1, debouncedSearch)
      loadFullClientes()
    } catch (err) {
      console.error('Error saving cliente:', err)
      toast.error('Error al guardar el cliente')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cliente: Cliente) => {
    setForm({
      razonSocial: cliente.razonSocial || '',
      tipoDocumento: cliente.tipoDocumento || '',
      numeroDocumento: cliente.numeroDocumento || '',
      actividad: cliente.actividad || '',
      telefono: cliente.telefono || '',
      domicilio: cliente.domicilio || '',
      localidad: cliente.localidad || '',
      condicionIVA: cliente.condicionIVA || '',
    })
    setEditId(cliente.id ?? null)
    setErrors({})
    setModalOpen(true)
  }

  const [sortField, setSortField] = useState<string>('codigoCliente')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const clientesSort = useMemo(() => {
    if (!paginatedClientes) return []
    return [...paginatedClientes].sort((a, b) => {
      const aVal = a[sortField as keyof Cliente]
      const bVal = b[sortField as keyof Cliente]
      let cmp = 0
      const aStr = String(aVal ?? '')
      const bStr = String(bVal ?? '')
      const aNum = parseFloat(aStr)
      const bNum = parseFloat(bStr)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        cmp = aNum - bNum
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal
      } else {
        cmp = aStr.localeCompare(bStr, 'es', { sensitivity: 'base' })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [paginatedClientes, sortField, sortDir])

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp className="inline h-3 w-3 ml-1 text-[#4A4A6A]" />
    return sortDir === 'asc'
      ? <ChevronUp className="inline h-3 w-3 ml-1 text-[#6C3CE1]" />
      : <ChevronDown className="inline h-3 w-3 ml-1 text-[#6C3CE1]" />
  }

  const sugerenciasRazonSocial = allClientes.map((c) => c.razonSocial).filter(Boolean)
  const sugerenciasNumeroDocumento = allClientes.map((c) => c.numeroDocumento).filter(Boolean)

  const handleExport = async () => {
    try {
      const data = await getAllClientes()
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(
        data.map((c) => ({
          'Cód. Cliente': c.codigoCliente,
          'Razón Social': c.razonSocial,
          'Tipo Doc.': c.tipoDocumento,
          'Número': c.numeroDocumento,
          'Actividad': c.actividad,
          'Teléfono': c.telefono,
          'Domicilio': c.domicilio,
          'Localidad': c.localidad,
          'Cond. IVA': c.condicionIVA,
        }))
      )
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
      XLSX.writeFile(wb, `clientes_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Clientes exportados correctamente')
    } catch (err) {
      console.error('Error exporting clientes:', err)
      toast.error('Error al exportar')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCliente(id)
      toast.success('Cliente eliminado exitosamente')
      setDeleteConfirm(null)
      loadClientesPage(1, debouncedSearch)
      loadFullClientes()
    } catch (err) {
      console.error('Error deleting cliente:', err)
      toast.error('Error al eliminar el cliente')
    }
  }

  const openCreateModal = () => {
    setForm(emptyForm)
    setEditId(null)
    setErrors({})
    setModalOpen(true)
  }

  const mapCondicionIVA = (v: string): string => {
    const s = (v || '').toLowerCase().trim()
    if (s.includes('responsable inscripto') || s === 'ri') return 'RI'
    if (s.includes('exento')) return 'Exento'
    if (s.includes('monotributo')) return 'Monotributo'
    if (s.includes('consumidor final') || s === 'cf') return 'CF'
    if (['ri', 'exento', 'monotributo', 'cf'].includes(s)) return s
    return v || 'CF'
  }

  const handleBulkUpload = async (data: Record<string, unknown>[]) => {
    const items = data.map((row) => ({
      codigoCliente: String(row['ID cliente'] ?? row.codigoCliente ?? row['Cód. cliente'] ?? '').padStart(5, '0'),
      razonSocial: String(row['Razon social'] ?? row.razonSocial ?? row['Razón social'] ?? ''),
      tipoDocumento: String(row['Tipo de documento'] ?? row.tipoDocumento ?? row['Tipo Doc.'] ?? ''),
      numeroDocumento: String(row['Numero de documento'] ?? row.numeroDocumento ?? row['Número'] ?? row['Numero'] ?? ''),
      actividad: String(row['Actividad'] ?? row.actividad ?? ''),
      telefono: String(row['Telefono'] ?? row.telefono ?? row['Teléfono'] ?? ''),
      domicilio: String(row['Domicilio'] ?? row.domicilio ?? ''),
      localidad: String(row['Localidad'] ?? row.localidad ?? ''),
      condicionIVA: mapCondicionIVA(String(row['Condicion de IVA'] ?? row.condicionIVA ?? row['Condición de IVA'] ?? '')),
    }))
    const result = await createMultipleClientes(items)
    loadClientesPage(1, debouncedSearch)
    loadFullClientes()
    return result
  }

  const clientesExampleData = [
    { 'ID cliente': '00001', 'Razon social': 'GRUPO FALPAT SRL', 'Tipo de documento': 'C.U.I.T.', 'Numero de documento': '30-71784388-2', 'Actividad': '', 'Domicilio': 'Av. Corrientes 1234', 'Localidad': 'CABA', 'Condicion de IVA': 'RI' },
    { 'ID cliente': '00002', 'Razon social': 'MATERIALES DEL SUR SA', 'Tipo de documento': 'C.U.I.T.', 'Numero de documento': '30-23456789-0', 'Actividad': '', 'Domicilio': 'Av. Rivadavia 5678', 'Localidad': 'CABA', 'Condicion de IVA': 'RI' },
  ]

  const condIVAAbrev = (v: string) => CONDIVA_LABEL[v] || v

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
            onClick={syncClientes}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-[#B0B0D0] hover:text-white hover:bg-white/5 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-white/10 text-[#B0B0D0] hover:text-white hover:bg-white/5 transition-colors"
            title="Descargar Excel"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
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
          placeholder="Buscar por Razón Social, N° Documento o Cód. Cliente..."
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
        ) : clientesSort.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#6B6B8A]">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('codigoCliente')}>
                    <SortIcon field="codigoCliente" /> Código
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-white select-none" onClick={() => toggleSort('razonSocial')}>
                    <SortIcon field="razonSocial" /> Razón Social
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 hidden md:table-cell cursor-pointer hover:text-white select-none" onClick={() => toggleSort('tipoDocumento')}>
                    <SortIcon field="tipoDocumento" /> T. Doc
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 hidden md:table-cell cursor-pointer hover:text-white select-none" onClick={() => toggleSort('numeroDocumento')}>
                    <SortIcon field="numeroDocumento" /> N° Documento
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 hidden lg:table-cell cursor-pointer hover:text-white select-none" onClick={() => toggleSort('domicilio')}>
                    <SortIcon field="domicilio" /> Domicilio
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 hidden lg:table-cell cursor-pointer hover:text-white select-none" onClick={() => toggleSort('localidad')}>
                    <SortIcon field="localidad" /> Localidad
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 hidden lg:table-cell cursor-pointer hover:text-white select-none" onClick={() => toggleSort('telefono')}>
                    <SortIcon field="telefono" /> Teléfono
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3 hidden xl:table-cell cursor-pointer hover:text-white select-none" onClick={() => toggleSort('condicionIVA')}>
                    <SortIcon field="condicionIVA" /> Cond. IVA
                  </th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clientesSort.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-3 py-3 text-sm text-white font-mono">
                      {cliente.codigoCliente}
                    </td>
                    <td className="px-3 py-3 text-sm text-white font-medium">
                      {cliente.razonSocial}
                    </td>
                    <td className="px-3 py-3 text-sm text-[#B0B0D0] hidden md:table-cell">
                      {cliente.tipoDocumento}
                    </td>
                    <td className="px-3 py-3 text-sm text-white font-mono hidden md:table-cell">
                      {cliente.numeroDocumento}
                    </td>
                    <td className="px-3 py-3 text-sm text-[#B0B0D0] hidden lg:table-cell">
                      {cliente.domicilio}
                    </td>
                    <td className="px-3 py-3 text-sm text-[#B0B0D0] hidden lg:table-cell">
                      {cliente.localidad}
                    </td>
                    <td className="px-3 py-3 text-sm text-[#B0B0D0] hidden lg:table-cell">
                      {cliente.telefono}
                    </td>
                    <td className="px-3 py-3 text-sm hidden xl:table-cell">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-white/5 text-[#B0B0D0] border border-white/10">
                        {condIVAAbrev(cliente.condicionIVA)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-right">
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
              {totalClientes} clientes - Página {page} de {totalPages}
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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl glass-card rounded-2xl p-6 animate-fadeInUp my-auto">
            <div className="flex items-center justify-between mb-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {/* Razón Social */}
              <div>
                <AutocompleteInput
                  label="Razón Social"
                  value={form.razonSocial}
                  onChange={(v) => setForm({ ...form, razonSocial: v })}
                  suggestions={sugerenciasRazonSocial}
                  placeholder="Nombre del cliente"
                  className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${
                    errors.razonSocial ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.razonSocial && (
                  <p className="text-xs text-red-400 mt-1">{errors.razonSocial}</p>
                )}
              </div>

              {/* Tipo Documento */}
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Tipo de Documento</label>
                <select
                  value={form.tipoDocumento}
                  onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${
                    errors.tipoDocumento ? 'border-red-500/50' : 'border-white/5'
                  } text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors appearance-none`}
                >
                  <option value="">Seleccionar...</option>
                  <option value="C.U.I.T.">C.U.I.T.</option>
                  <option value="C.U.I.L.">C.U.I.L.</option>
                  <option value="D.N.I.">D.N.I.</option>
                  <option value="L.E.">L.E.</option>
                  <option value="L.C.">L.C.</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
                {errors.tipoDocumento && (
                  <p className="text-xs text-red-400 mt-1">{errors.tipoDocumento}</p>
                )}
              </div>

              {/* Número Documento */}
              <div>
                <AutocompleteInput
                  label="Número de Documento"
                  value={form.numeroDocumento}
                  onChange={(v) => setForm({ ...form, numeroDocumento: v })}
                  suggestions={sugerenciasNumeroDocumento}
                  placeholder="XX-XXXXXXXX-X o DNI"
                  className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${
                    errors.numeroDocumento ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.numeroDocumento && (
                  <p className="text-xs text-red-400 mt-1">{errors.numeroDocumento}</p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Teléfono</label>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="Número de teléfono"
                  className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${
                    errors.telefono ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.telefono && (
                  <p className="text-xs text-red-400 mt-1">{errors.telefono}</p>
                )}
              </div>

              {/* Domicilio */}
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Domicilio</label>
                <input
                  type="text"
                  value={form.domicilio}
                  onChange={(e) => setForm({ ...form, domicilio: e.target.value })}
                  placeholder="Domicilio completo"
                  className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${
                    errors.domicilio ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.domicilio && (
                  <p className="text-xs text-red-400 mt-1">{errors.domicilio}</p>
                )}
              </div>

              {/* Localidad */}
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Localidad</label>
                <input
                  type="text"
                  value={form.localidad}
                  onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                  placeholder="Localidad"
                  className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${
                    errors.localidad ? 'border-red-500/50' : 'border-white/5'
                  } text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors`}
                />
                {errors.localidad && (
                  <p className="text-xs text-red-400 mt-1">{errors.localidad}</p>
                )}
              </div>

              {/* Actividad */}
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Actividad</label>
                <input
                  type="text"
                  value={form.actividad}
                  onChange={(e) => setForm({ ...form, actividad: e.target.value })}
                  placeholder="Actividad del cliente"
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                />
              </div>

              {/* Condición IVA */}
              <div>
                <label className="block text-sm font-medium text-[#B0B0D0] mb-1">Condición de IVA</label>
                <select
                  value={form.condicionIVA}
                  onChange={(e) => setForm({ ...form, condicionIVA: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border ${
                    errors.condicionIVA ? 'border-red-500/50' : 'border-white/5'
                  } text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors appearance-none`}
                >
                  <option value="">Seleccionar...</option>
                  {CONDICIONES_IVA.map((c) => (
                    <option key={c} value={c}>{CONDIVA_LABEL[c]}</option>
                  ))}
                </select>
                {errors.condicionIVA && (
                  <p className="text-xs text-red-400 mt-1">{errors.condicionIVA}</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
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
        description="Seleccioná un archivo Excel con los datos de los clientes para importarlos."
        templateHeaders={['ID cliente', 'Razon social', 'Tipo de documento', 'Numero de documento', 'Actividad', 'Domicilio', 'Localidad', 'Condicion de IVA']}
        exampleData={clientesExampleData}
        onUpload={handleBulkUpload}
        onRefresh={() => { loadClientesPage(1, debouncedSearch); loadFullClientes() }}
      />
    </div>
  )
}
