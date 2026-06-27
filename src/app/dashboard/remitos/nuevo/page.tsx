'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFormDraft } from '@/hooks/useFormDraft'
import {
  getAllClientes,
  getAllProductos,
  getVendedores,
  createRemito,
  getEmpresaConfig,
  getTipoFactura,
  clearCache,
} from '@/lib/firestore'
import type { Cliente, Producto, RemitoItem, Vendedor, EmpresaConfig } from '@/types'
import {
  Search,
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  FileText,
  Check,
  AlertCircle,
  Pencil,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

export default function NuevoRemitoPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [saving, setSaving] = useState(false)

  // Step 1: Cliente selection
  const [clienteSearch, setClienteSearch] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [showClienteDropdown, setShowClienteDropdown] = useState(false)

  // Vendedor
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null)
  const [showVendedorDropdown, setShowVendedorDropdown] = useState(false)

  // Step 2: Items
  const [productSearch, setProductSearch] = useState('')
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [precioUnitario, setPrecioUnitario] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [bonificacionValue, setBonificacionValue] = useState(0)
  const [items, setItems] = useState<RemitoItem[]>([])
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [editItemIndex, setEditItemIndex] = useState<number | null>(null)

  // Empresa config
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)

  // Fecha del remito
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [fecha, setFecha] = useState(todayStr)

  // Step 3: Observaciones
  const [observaciones, setObservaciones] = useState('')

  const onRestore = useCallback((draft: {
    step: number; selectedClienteId?: string; selectedVendedorCodigo?: string;
    items: unknown[]; productSearch: string; selectedProductoId?: string;
    precioUnitario: number; cantidad: number; bonificacionValue: number;
    editItemIndex: number | null; observaciones: string; fecha?: string
  }) => {
    if (draft.step) setStep(draft.step)
    if (draft.selectedClienteId) {
      const c = clientes.find((x) => x.id === draft.selectedClienteId)
      if (c) setSelectedCliente(c)
    }
    if (draft.selectedVendedorCodigo) {
      const v = vendedores.find((x) => x.codigo === draft.selectedVendedorCodigo)
      if (v) setSelectedVendedor(v)
    }
    if (draft.items?.length) setItems(draft.items as RemitoItem[])
    if (draft.productSearch) setProductSearch(draft.productSearch)
    if (draft.selectedProductoId) {
      const p = productos.find((x) => x.id === draft.selectedProductoId)
      if (p) { setSelectedProducto(p); setPrecioUnitario(p.valorUnitario) }
    }
    if (draft.precioUnitario) setPrecioUnitario(draft.precioUnitario)
    if (draft.cantidad) setCantidad(draft.cantidad)
    if (draft.bonificacionValue) setBonificacionValue(draft.bonificacionValue)
    if (draft.editItemIndex !== null && draft.editItemIndex !== undefined) setEditItemIndex(draft.editItemIndex)
    if (draft.observaciones) setObservaciones(draft.observaciones)
    if (draft.fecha) setFecha(draft.fecha)
  }, [clientes, vendedores, productos])

  const { clearDraft } = useFormDraft(
    {
      step, selectedClienteId: selectedCliente?.id, selectedVendedorCodigo: selectedVendedor?.codigo,
      items, productSearch, selectedProductoId: selectedProducto?.id,
      precioUnitario, cantidad, bonificacionValue, editItemIndex, observaciones, fecha,
    },
    !loading,
    onRestore,
  )

  useEffect(() => {
    Promise.all([getAllClientes(), getAllProductos(), getVendedores(), getEmpresaConfig()])
      .then(([c, p, v, e]) => {
        setClientes(c)
        setProductos(p)
        setVendedores(v)
        setEmpresa(e)
      })
      .catch((err) => {
        console.error('Error al cargar datos:', err)
        setLoadingError('No se pudieron cargar los datos. Verificá que Firebase esté configurado correctamente.')
        toast.error('Error al cargar datos de Firebase')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredClientes = useMemo(() => {
    if (!clienteSearch) return clientes
    const s = clienteSearch.toLowerCase()
    return clientes.filter(
      (c) =>
        c.razonSocial.toLowerCase().includes(s) ||
        c.numeroDocumento.toLowerCase().includes(s) ||
        c.codigoCliente.toLowerCase().includes(s)
    )
  }, [clientes, clienteSearch])

  const filteredProductos = useMemo(() => {
    if (!productSearch) return productos
    const s = productSearch.toLowerCase()
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(s) ||
        p.tipo.toLowerCase().includes(s)
    )
  }, [productos, productSearch])

  const selectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setClienteSearch('')
    setShowClienteDropdown(false)
  }

  const selectProducto = (producto: Producto) => {
    setSelectedProducto(producto)
    setPrecioUnitario(producto.valorUnitario)
    setCantidad(1)
    setBonificacionValue(0)
    setProductSearch(producto.nombre)
    setShowProductDropdown(false)
    ;(document.activeElement as HTMLElement)?.blur()
  }

  const addItem = () => {
    if (!selectedProducto) {
      toast.error('Seleccioná un producto')
      return
    }
    if (cantidad < 1) {
      toast.error('La cantidad debe ser al menos 1')
      return
    }
    if (precioUnitario <= 0) {
      toast.error('El precio unitario debe ser mayor a 0')
      return
    }

    const bonif = bonificacionValue || 0
    const subtotal = precioUnitario * cantidad * (1 - bonif / 100)

    if (editItemIndex !== null) {
      const updated = [...items]
      updated[editItemIndex] = {
        idProducto: selectedProducto.id!,
        nombreProducto: selectedProducto.nombre,
        cantidad,
        precioUnitario,
        bonificacion: bonif,
        subtotal,
      }
      setItems(updated)
      setEditItemIndex(null)
      toast.success('Producto actualizado')
    } else {
      setItems([
        ...items,
        {
          idProducto: selectedProducto.id!,
          nombreProducto: selectedProducto.nombre,
          cantidad,
          precioUnitario,
          bonificacion: bonif,
          subtotal,
        },
      ])
    }
    setSelectedProducto(null)
    setProductSearch('')
    setPrecioUnitario(0)
    setCantidad(1)
    setBonificacionValue(0)
  }

  const startEditItem = (index: number) => {
    const item = items[index]
    const producto = productos.find((p) => p.id === item.idProducto)
    if (producto) {
      setSelectedProducto(producto)
      setPrecioUnitario(item.precioUnitario)
      setCantidad(item.cantidad)
      setBonificacionValue(item.bonificacion || 0)
      setProductSearch(producto.nombre)
      setEditItemIndex(index)
    }
  }

  const removeItem = (index: number) => {
    if (editItemIndex === index) {
      setEditItemIndex(null)
      setSelectedProducto(null)
      setProductSearch('')
      setPrecioUnitario(0)
      setCantidad(1)
      setBonificacionValue(0)
    }
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotalGeneral = useMemo(
    () => items.reduce((sum, item) => sum + item.subtotal, 0),
    [items]
  )
  const isFA = selectedCliente ? getTipoFactura(selectedCliente.condicionIVA) === 'A' : true
  const iva = isFA ? subtotalGeneral * 0.21 : 0
  const totalGeneral = isFA ? subtotalGeneral + iva : subtotalGeneral

  const handleGenerate = async () => {
    if (!selectedCliente) {
      toast.error('Seleccioná un cliente')
      return
    }
    if (items.length === 0) {
      toast.error('Agregá al menos un ítem')
      return
    }

    setSaving(true)
    try {
      const result = await createRemito({
        idCliente: selectedCliente.id!,
        clienteData: {
          codigoCliente: selectedCliente.codigoCliente,
          razonSocial: selectedCliente.razonSocial,
          tipoDocumento: selectedCliente.tipoDocumento || '',
          numeroDocumento: selectedCliente.numeroDocumento,
          actividad: selectedCliente.actividad || '',
          telefono: selectedCliente.telefono || '',
          domicilio: selectedCliente.domicilio || '',
          localidad: selectedCliente.localidad || '',
          condicionIVA: selectedCliente.condicionIVA || '',
        },
        vendedor: selectedVendedor ? { codigo: selectedVendedor.codigo, nombre: selectedVendedor.nombre } : undefined,
        items,
        fecha,
        observaciones,
      })
      clearDraft()
      toast.success(
        `Remito N° ${String(result.numeroRemito).padStart(6, '0')} creado exitosamente`
      )
      clearCache('allRemitos')
      router.push(`/remitos/${result.id}`)
    } catch {
      toast.error('Error al crear el remito')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedProducto && cantidad >= 1 && precioUnitario > 0) {
      e.preventDefault()
      addItem()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
      </div>
    )
  }

  if (loadingError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-xl p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error de conexión</h2>
          <p className="text-[#B0B0D0] mb-6">{loadingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-nebula inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-[#6C3CE1]" />
          <h1 className="text-2xl font-bold text-white">Nuevo Remito</h1>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s
                    ? 'btn-nebula'
                    : step > s
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/5 text-[#6B6B8A]'
                }`}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  step === s ? 'text-white' : 'text-[#6B6B8A]'
                }`}
              >
                {s === 1
                  ? 'Cliente'
                  : s === 2
                    ? 'Productos'
                    : 'Revisar'}
              </span>
              {s < 3 && (
                <ChevronRight className="h-4 w-4 text-[#6B6B8A]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Cliente */}
      {step === 1 && (
        <div className="glass-card rounded-xl p-6 space-y-4 animate-fadeInUp">
          <h2 className="text-lg font-semibold text-white">
            Seleccionar Cliente
          </h2>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
            <input
              type="text"
              placeholder="Buscar por CUIT o Razón Social..."
              value={clienteSearch}
              onChange={(e) => {
                setClienteSearch(e.target.value)
                setShowClienteDropdown(true)
                if (selectedCliente) setSelectedCliente(null)
              }}
              onFocus={() => setShowClienteDropdown(true)}
              onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
            />
            {showClienteDropdown && filteredClientes.length > 0 && (
              <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-60 overflow-y-auto rounded-xl bg-[#12122A] border border-white/5 shadow-xl">
                {filteredClientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    onClick={() => selectCliente(cliente)}
                    className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                  >
                    <span className="font-medium">{cliente.razonSocial}</span>
                    <span className="text-[#6B6B8A] ml-2">
                      {cliente.numeroDocumento}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCliente && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#6C3CE1]/10 to-[#00D4FF]/5 border border-[#6C3CE1]/20 animate-fadeInUp">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[#6B6B8A]">Cód. Cliente</p>
                  <p className="text-sm text-white font-mono">{selectedCliente.codigoCliente}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Razón Social</p>
                  <p className="text-sm text-white font-medium">{selectedCliente.razonSocial}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Documento</p>
                  <p className="text-sm text-white">
                    {selectedCliente.tipoDocumento} {selectedCliente.numeroDocumento}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Teléfono</p>
                  <p className="text-sm text-white">{selectedCliente.telefono || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Domicilio</p>
                  <p className="text-sm text-white">{selectedCliente.domicilio || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Localidad</p>
                  <p className="text-sm text-white">{selectedCliente.localidad || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Vendedor */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
              Vendedor (opcional)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscá un vendedor por nombre o código..."
                value={selectedVendedor ? `${selectedVendedor.nombre} (${selectedVendedor.codigo})` : ''}
                onChange={() => {
                  setSelectedVendedor(null)
                  setShowVendedorDropdown(true)
                }}
                onFocus={() => setShowVendedorDropdown(true)}
                onBlur={() => setTimeout(() => setShowVendedorDropdown(false), 200)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
              />
              {showVendedorDropdown && vendedores.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto rounded-xl bg-[#12122A] border border-white/5 shadow-xl">
                  {vendedores.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setSelectedVendedor(v)
                        setShowVendedorDropdown(false)
                        ;(document.activeElement as HTMLElement)?.blur()
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 flex items-center gap-3"
                    >
                      <span className="inline-block px-2 py-0.5 rounded bg-[#6C3CE1]/10 text-[#6C3CE1] text-xs font-mono font-bold">{v.codigo}</span>
                      <span>{v.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedVendedor && (
                <button
                  onClick={() => setSelectedVendedor(null)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B8A] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {vendedores.length === 0 && (
              <p className="text-xs text-[#6B6B8A] mt-1">No hay vendedores cargados. Agregalos desde Vendedores.</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedCliente}
              className="btn-nebula inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Continuar
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Items */}
      {step === 2 && (
        <div className="space-y-4 animate-fadeInUp">
          <div className="glass-card rounded-xl p-6 relative z-10">
            <h2 className="text-lg font-semibold text-white mb-4">
              Agregar Productos
            </h2>

            {/* Search + Selected Product Preview */}
            <div className="space-y-4" onKeyDown={handleKeyDown}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
                <input
                  type="text"
                  placeholder="Buscá un producto por nombre o tipo..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                    if (selectedProducto && e.target.value !== selectedProducto.nombre) {
                      setSelectedProducto(null)
                      setPrecioUnitario(0)
                      setEditItemIndex(null)
                    }
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowProductDropdown(false), 200)
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                />
                {productos.length === 0 && !loading && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl bg-[#12122A] border border-white/5 shadow-xl p-4 text-center">
                    <p className="text-sm text-[#6B6B8A]">No hay productos en el catálogo.</p>
                    <p className="text-xs text-[#6B6B8A] mt-1">Primero agregá productos desde la sección Productos.</p>
                  </div>
                )}
                {showProductDropdown && filteredProductos.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-60 overflow-y-auto rounded-xl bg-[#12122A] border border-white/5 shadow-xl">
                    {filteredProductos.map((producto) => (
                      <button
                        key={producto.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          selectProducto(producto)
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {producto.nombre}
                          </span>
                          <span className="text-[#6B6B8A] font-mono">
                            ${producto.valorUnitario.toFixed(2)} /{' '}
                            {producto.medida}
                          </span>
                        </div>
                        <span className="text-xs text-[#6B6B8A]">
                          {producto.tipo}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {showProductDropdown && filteredProductos.length === 0 && productos.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl bg-[#12122A] border border-white/5 shadow-xl p-4 text-center">
                    <p className="text-sm text-[#6B6B8A]">No se encontraron productos con ese nombre.</p>
                  </div>
                )}
              </div>

              {/* Selected Product Preview */}
              {selectedProducto && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#6C3CE1]/10 to-[#00D4FF]/5 border border-[#6C3CE1]/20 animate-fadeInUp">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-white">{selectedProducto.nombre}</p>
                      <p className="text-xs text-[#6B6B8A]">{selectedProducto.tipo} · {selectedProducto.medida}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProducto(null)
                        setPrecioUnitario(0)
                        setCantidad(1)
                        setBonificacionValue(0)
                        setProductSearch('')
                        setEditItemIndex(null)
                      }}
                      className="text-[#6B6B8A] hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs text-[#6B6B8A] mb-1">Precio Unitario ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={precioUnitario}
                        onChange={(e) => setPrecioUnitario(parseFloat(e.target.value.replace(',', '.')) || 0)}
                            className="w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[#6B6B8A] mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={cantidad}
                            onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B6B8A] mb-1">Bonificación (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={bonificacionValue}
                        onChange={(e) => setBonificacionValue(parseFloat(e.target.value.replace(',', '.')) || 0)}
                        className="w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                      />
                    </div>
                    <div className="flex items-end">
                      <div>
                        <p className="text-xs text-[#6B6B8A] mb-1">Subtotal</p>
                        <p className="text-lg font-bold text-white font-mono">
                          ${(precioUnitario * cantidad * (1 - (bonificacionValue || 0) / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={addItem}
                        className="w-full btn-nebula inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                      >
                        {editItemIndex !== null ? (
                          <>Actualizar</>
                        ) : (
                          <><Plus className="h-4 w-4" /> Agregar</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 ? (
            <div className="glass-card rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                        Producto
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                        Cant.
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                        P. Unit.
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                        Bonif.
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                        Subtotal
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                        IVA 21%
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item, index) => {
                      const ivaLinea = isFA ? item.subtotal * 0.21 : 0
                      return (
                      <tr key={index} className={`hover:bg-white/5 transition-colors ${editItemIndex === index ? 'bg-[#6C3CE1]/5' : ''}`}>
                        <td className="px-4 py-3 text-sm text-white">
                          {item.nombreProducto}
                        </td>
                        <td className="px-4 py-3 text-sm text-white text-right font-mono">
                          {item.cantidad}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#B0B0D0] text-right font-mono hidden sm:table-cell">
                          ${item.precioUnitario.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#B0B0D0] text-right font-mono hidden sm:table-cell">
                          {item.bonificacion ? `${item.bonificacion}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-white text-right font-mono">
                          ${item.subtotal.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#B0B0D0] text-right font-mono hidden sm:table-cell">
                          {isFA ? `$${ivaLinea.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEditItem(index)}
                              className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-[#00D4FF] transition-colors"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => removeItem(index)}
                              className="p-1.5 rounded-lg text-[#6B6B8A] hover:text-red-400 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="border-t border-white/5 p-4 space-y-2">
                {isFA ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B0B0D0]">Importe Neto Gravado</span>
                      <span className="text-white font-mono">${subtotalGeneral.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B0B0D0]">IVA 21%</span>
                      <span className="text-white font-mono">${iva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-dashed border-white/10 pt-1">
                      <span className="text-[#B0B0D0]">Importe Total</span>
                      <span className="text-white font-mono">${totalGeneral.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B0B0D0]">Subtotal</span>
                      <span className="text-white font-mono">${subtotalGeneral.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-[#6B6B8A] text-right">IVA incluido</p>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-white/5 pt-2">
                  <span className="text-white">Total General</span>
                  <span className="text-white font-mono">${totalGeneral.toFixed(2)}</span>
                </div>
              </div>

              {/* Total items count */}
              <div className="border-t border-white/5 px-4 py-2 text-xs text-[#6B6B8A]">
                {items.length} producto{items.length !== 1 ? 's' : ''} agregado{items.length !== 1 ? 's' : ''}
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <AlertCircle className="h-8 w-8 text-[#6B6B8A] mx-auto mb-3" />
              <p className="text-[#6B6B8A]">
                No hay productos agregados todavía.
              </p>
              <p className="text-xs text-[#6B6B8A] mt-1">
                Buscá un producto, ingresá la cantidad y presioná Enter o
                &quot;Agregar&quot;.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={items.length === 0}
              className="btn-nebula inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              Revisar
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Generate */}
      {step === 3 && (
        <div className="space-y-4 animate-fadeInUp">
          <div className="glass-card rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Vista Previa del Remito
              </h2>
              <span className="text-xs text-[#6B6B8A]">{items.length} producto{items.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Company Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 rounded-xl bg-white/5">
              <div>
                <p className="text-lg font-bold text-white">{empresa?.razonSocial || 'GRUPO FALPAT SRL'}</p>
                <p className="text-xs text-[#6B6B8A]">CUIT: {empresa?.cuit || '30-71784388-2'}</p>
              </div>
              <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-2">
                <div>
                  <p className="text-xs text-[#6B6B8A] uppercase tracking-wider mb-1">Fecha</p>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/5 text-white text-sm font-mono focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                  />
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A] uppercase tracking-wider">Remito</p>
                  <p className="text-xl font-bold text-white">N° ---</p>
                </div>
              </div>
            </div>

            {/* Cliente */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#6C3CE1]/10 to-[#00D4FF]/5 border border-[#6C3CE1]/20">
              <p className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-3">
                Datos del Cliente
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs text-[#6B6B8A]">Cód. Cliente</p>
                  <p className="text-sm font-mono font-medium text-white">{selectedCliente?.codigoCliente}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Documento</p>
                  <p className="text-sm font-medium text-white">
                    {selectedCliente?.tipoDocumento} {selectedCliente?.numeroDocumento}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Razón Social</p>
                  <p className="text-sm font-medium text-white">{selectedCliente?.razonSocial}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Teléfono</p>
                  <p className="text-sm text-[#B0B0D0]">{selectedCliente?.telefono || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Domicilio</p>
                  <p className="text-sm text-[#B0B0D0]">{selectedCliente?.domicilio || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Localidad</p>
                  <p className="text-sm text-[#B0B0D0]">{selectedCliente?.localidad || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B8A]">Vendedor</p>
                  <p className="text-sm font-medium text-white">
                    {selectedVendedor ? `${selectedVendedor.nombre} (${selectedVendedor.codigo})` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table - Editable */}
            <div>
              <p className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider mb-3">
                Productos
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-2.5 w-14">
                        Cant.
                      </th>
                      <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-2.5">
                        Descripción
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-2.5 w-24">
                        P. Unitario
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-2.5 w-20">
                        Bonif.
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-2.5 w-28">
                        Subtotal
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-2.5 w-24">
                        IVA 21%
                      </th>
                      <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 py-2.5 w-16">
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item, index) => {
                      const bonif = item.bonificacion || 0
                      const ivaLinea = isFA ? item.subtotal * 0.21 : 0
                      return (
                      <tr key={index} className="hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => {
                              const qty = Math.max(1, parseInt(e.target.value) || 1)
                              const updated = [...items]
                              updated[index] = { ...item, cantidad: qty, subtotal: item.precioUnitario * qty * (1 - bonif / 100) }
                              setItems(updated)
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/5 text-white text-sm font-mono text-center focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-white">
                          {item.nombreProducto}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={item.precioUnitario}
                            onChange={(e) => {
                              const price = parseFloat(e.target.value.replace(',', '.')) || 0
                              const updated = [...items]
                              updated[index] = { ...item, precioUnitario: price, subtotal: price * item.cantidad * (1 - bonif / 100) }
                              setItems(updated)
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/5 text-white text-sm font-mono text-right focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={bonif}
                            onChange={(e) => {
                              const b = parseFloat(e.target.value.replace(',', '.')) || 0
                              const updated = [...items]
                              updated[index] = { ...item, bonificacion: b, subtotal: item.precioUnitario * item.cantidad * (1 - b / 100) }
                              setItems(updated)
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-[#0A0A1A] border border-white/5 text-white text-sm font-mono text-right focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-white text-right font-mono">
                          ${item.subtotal.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-sm text-[#B0B0D0] text-right font-mono">
                          {isFA ? `$${ivaLinea.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 rounded-lg text-[#6B6B8A] hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totales */}
              <div className="ml-auto w-full sm:w-72 mt-4 space-y-1.5 p-4 rounded-xl bg-gradient-to-r from-[#6C3CE1]/10 to-[#00D4FF]/5 border border-[#6C3CE1]/20">
                {isFA ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B0B0D0]">Importe Neto Gravado</span>
                      <span className="text-white font-mono">${subtotalGeneral.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B0B0D0]">IVA 21%</span>
                      <span className="text-white font-mono">${iva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-dashed border-white/10 pt-1">
                      <span className="text-[#B0B0D0]">Importe Total</span>
                      <span className="text-white font-mono">${totalGeneral.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B0B0D0]">Subtotal</span>
                      <span className="text-white font-mono">${subtotalGeneral.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-[#6B6B8A] text-right">IVA incluido</p>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold border-t border-white/5 pt-2">
                  <span className="text-white">Total General</span>
                  <span className="text-white font-mono">${totalGeneral.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-[#B0B0D0] mb-1">
                Observaciones (opcional)
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas adicionales..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver a Productos
            </button>
            <button
              onClick={handleGenerate}
              disabled={saving || items.length === 0}
              className="btn-nebula inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Generar Remito
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
