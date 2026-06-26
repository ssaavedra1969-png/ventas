'use client'

import { useEffect, useState } from 'react'
import { getAllVehiculos, createVehiculo, deleteVehiculo, getAllChoferes, createChofer, updateChofer, deleteChofer, importVehiculos, importChoferes } from '@/lib/firestore'
import type { Vehiculo, Chofer } from '@/types'
import { Truck, User, Plus, Pencil, Trash2, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [choferes, setChoferes] = useState<Chofer[]>([])
  const [loading, setLoading] = useState(true)

  // Importar desde Excel incrustado
  const [importando, setImportando] = useState(false)
  const [importResults, setImportResults] = useState<{ label: string; ok: boolean; error?: string }[] | null>(null)

  // Nuevo vehículo
  const [nuevaPatente, setNuevaPatente] = useState('')
  const [nuevaMarca, setNuevaMarca] = useState('')
  const [creandoVehiculo, setCreandoVehiculo] = useState(false)
  const [showFormVehiculo, setShowFormVehiculo] = useState(false)

  // Chofer
  const [editChoferId, setEditChoferId] = useState<string | null>(null)
  const [choferNombre, setChoferNombre] = useState('')
  const [choferDoc, setChoferDoc] = useState('')
  const [choferTel, setChoferTel] = useState('')
  const [showFormChofer, setShowFormChofer] = useState(false)
  const [guardandoChofer, setGuardandoChofer] = useState(false)
  const [importandoChoferes, setImportandoChoferes] = useState(false)
  const [importChoferesResults, setImportChoferesResults] = useState<{ label: string; ok: boolean; error?: string }[] | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [v, c] = await Promise.all([getAllVehiculos(), getAllChoferes()])
      setVehiculos(v)
      setChoferes(c)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const VEHICULOS_INCRUSTADOS = [
    { patente: 'AC361ME', marca: 'Scania' },
    { patente: 'AD330CI', marca: 'Scania' },
    { patente: 'AE192RP', marca: 'Scania' },
    { patente: 'AE335KK', marca: 'Randon' },
    { patente: 'AE344VR', marca: 'Mercedes Benz' },
    { patente: 'AE355LN', marca: 'Scania' },
    { patente: 'AE449YV', marca: 'Mercedes Benz' },
    { patente: 'AE449YW', marca: 'Mercedes Benz' },
    { patente: 'AE947GR', marca: 'Mercedes Benz' },
    { patente: 'AE947GS', marca: 'Mercedes Benz' },
    { patente: 'AF170SV', marca: 'Mercedes Benz' },
    { patente: 'AF206GB', marca: 'Scania' },
    { patente: 'AF606JL', marca: 'Scania' },
    { patente: 'AF804RU', marca: 'Mercedes Benz' },
    { patente: 'AG148TK', marca: 'Scania' },
    { patente: 'AG269DZ', marca: 'Mercedes Benz' },
    { patente: 'AG276BQ', marca: 'Mercedes Benz' },
    { patente: 'AG388HP', marca: 'Mercedes Benz' },
    { patente: 'AG469YL', marca: 'Mercedes Benz' },
    { patente: 'AG719TT', marca: 'Mercedes Benz' },
    { patente: 'AG851RW', marca: 'Mercedes Benz' },
    { patente: 'AG976PD', marca: 'Mercedes Benz' },
    { patente: 'AG976PE', marca: 'Mercedes Benz' },
    { patente: 'AG976PG', marca: 'Mercedes Benz' },
    { patente: 'AH052ZD', marca: 'Mercedes Benz' },
    { patente: 'AH052ZE', marca: 'Mercedes Benz' },
    { patente: 'AH125AF', marca: 'Scania' },
    { patente: 'HOA036', marca: 'Volkswagen' },
    { patente: 'LEC583', marca: 'Mercedes Benz' },
    { patente: 'PCS413', marca: 'Mercedes Benz' },
  ]

  const handleImportar = async () => {
    setImportando(true)
    setImportResults(null)
    try {
      const alreadyImported = new Set(vehiculos.map(v => v.patente.toUpperCase()))
      const toImport = VEHICULOS_INCRUSTADOS.filter(v => !alreadyImported.has(v.patente.toUpperCase()))
      if (toImport.length === 0) {
        toast.info('Todos los vehículos ya están importados')
        setImportResults([])
        return
      }
      const results = await importVehiculos(toImport)
      const ok = results.filter(r => r.ok).length
      const fail = results.filter(r => !r.ok).length
      setImportResults(results)
      if (fail === 0) toast.success(`${ok} vehículos importados`)
      else toast.warning(`${ok} importados, ${fail} fallaron`)
      await loadData()
    } catch {
      toast.error('Error al importar')
    } finally {
      setImportando(false)
    }
  }

  const handleCrearVehiculo = async () => {
    if (!nuevaPatente.trim() || !nuevaMarca.trim()) {
      toast.error('Completá patente y marca')
      return
    }
    setCreandoVehiculo(true)
    try {
      await createVehiculo({ patente: nuevaPatente.trim().toUpperCase(), marca: nuevaMarca.trim() })
      toast.success('Vehículo agregado')
      setNuevaPatente('')
      setNuevaMarca('')
      setShowFormVehiculo(false)
      await loadData()
    } catch {
      toast.error('Error al crear vehículo')
    } finally {
      setCreandoVehiculo(false)
    }
  }

  const handleEliminarVehiculo = async (id: string) => {
    try {
      await deleteVehiculo(id)
      toast.success('Vehículo eliminado')
      await loadData()
    } catch {
      toast.error('Error al eliminar vehículo')
    }
  }

  const handleGuardarChofer = async () => {
    if (!choferNombre.trim()) {
      toast.error('El nombre del chofer es obligatorio')
      return
    }
    setGuardandoChofer(true)
    try {
      if (editChoferId) {
        await updateChofer(editChoferId, { nombre: choferNombre.trim(), documento: choferDoc.trim() || undefined, telefono: choferTel.trim() || undefined })
        toast.success('Chofer actualizado')
      } else {
        await createChofer({ nombre: choferNombre.trim(), documento: choferDoc.trim() || undefined, telefono: choferTel.trim() || undefined })
        toast.success('Chofer creado')
      }
      setChoferNombre('')
      setChoferDoc('')
      setChoferTel('')
      setEditChoferId(null)
      setShowFormChofer(false)
      await loadData()
    } catch {
      toast.error('Error al guardar chofer')
    } finally {
      setGuardandoChofer(false)
    }
  }

  const handleEditarChofer = (c: Chofer) => {
    setEditChoferId(c.id ?? null)
    setChoferNombre(c.nombre)
    setChoferDoc(c.documento ?? '')
    setChoferTel(c.telefono ?? '')
    setShowFormChofer(true)
  }

  const handleEliminarChofer = async (id: string) => {
    try {
      await deleteChofer(id)
      toast.success('Chofer eliminado')
      await loadData()
    } catch {
      toast.error('Error al eliminar chofer')
    }
  }

  const handleImportarChoferes = async () => {
    const input = prompt('Ingresá los nombres de los choferes (uno por línea):')
    if (!input || !input.trim()) return
    const lines = input.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return
    setImportandoChoferes(true)
    setImportChoferesResults(null)
    try {
      const toImport = lines.map(nombre => ({ nombre }))
      const results = await importChoferes(toImport)
      const ok = results.filter(r => r.ok).length
      const fail = results.filter(r => !r.ok).length
      setImportChoferesResults(results)
      if (fail === 0) toast.success(`${ok} choferes importados`)
      else toast.warning(`${ok} importados, ${fail} fallaron`)
      await loadData()
    } catch {
      toast.error('Error al importar choferes')
    } finally {
      setImportandoChoferes(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Truck className="h-10 w-10 text-[#6C3CE1] mx-auto" />
          </motion.div>
          <p className="text-sm text-[#6B6B8A]">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Vehículos y Choferes</h1>
          <p className="text-sm text-[#6B6B8A]">{vehiculos.length} vehículos · {choferes.length} choferes</p>
        </div>
        <button
          onClick={handleImportar}
          disabled={importando}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
        >
          {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Importar vehículos
        </button>
      </div>

      {/* Import results */}
      <AnimatePresence>
        {importResults && importResults.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden"
          >
            <div className="p-3 max-h-40 overflow-y-auto space-y-1">
              {importResults.map(r => (
                <div key={r.label} className="flex items-center gap-2 text-xs">
                  {r.ok
                    ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    : <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                  }
                  <span className="text-[#B0B0D0]">{r.label}</span>
                  {!r.ok && <span className="text-red-400">{r.error}</span>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── VEHÍCULOS ─── */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Vehículos</h2>
              <span className="text-[10px] text-[#6B6B8A]">{vehiculos.length}</span>
            </div>
            <button
              onClick={() => setShowFormVehiculo(!showFormVehiculo)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <AnimatePresence>
            {showFormVehiculo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-white/5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Patente"
                      value={nuevaPatente}
                      onChange={(e) => setNuevaPatente(e.target.value.toUpperCase())}
                      className="px-3 py-1.5 rounded-lg bg-[#12122A] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50 placeholder-[#3A3A5A]"
                    />
                    <input
                      placeholder="Marca"
                      value={nuevaMarca}
                      onChange={(e) => setNuevaMarca(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[#12122A] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50 placeholder-[#3A3A5A]"
                    />
                  </div>
                  <button
                    onClick={handleCrearVehiculo}
                    disabled={creandoVehiculo}
                    className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium hover:from-amber-400 hover:to-orange-400 transition-all disabled:opacity-50"
                  >
                    {creandoVehiculo ? 'Guardando...' : 'Agregar'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {vehiculos.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#6B6B8A]">
                No hay vehículos. Importalos desde el botón superior o agregalos manualmente.
              </div>
            ) : (
              vehiculos.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Truck className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-white flex-1">{v.patente}</span>
                  <span className="text-[10px] text-[#6B6B8A]">{v.marca}</span>
                  <button
                    onClick={() => { if (confirm(`Eliminar ${v.patente}?`)) handleEliminarVehiculo(v.id!) }}
                    className="p-1 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── CHOFERES ─── */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-white">Choferes</h2>
              <span className="text-[10px] text-[#6B6B8A]">{choferes.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleImportarChoferes}
                disabled={importandoChoferes}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-emerald-400 transition-colors"
                title="Importar choferes"
              >
                {importandoChoferes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </button>
              <button
                onClick={() => { setShowFormChofer(!showFormChofer); setEditChoferId(null); setChoferNombre(''); setChoferDoc(''); setChoferTel('') }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFormChofer && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-white/5 space-y-2">
                  <input
                    placeholder="Nombre del chofer *"
                    value={choferNombre}
                    onChange={(e) => setChoferNombre(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#12122A] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50 placeholder-[#3A3A5A]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Documento"
                      value={choferDoc}
                      onChange={(e) => setChoferDoc(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[#12122A] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50 placeholder-[#3A3A5A]"
                    />
                    <input
                      placeholder="Teléfono"
                      value={choferTel}
                      onChange={(e) => setChoferTel(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-[#12122A] border border-white/5 text-white text-xs focus:outline-none focus:border-[#6C3CE1]/50 placeholder-[#3A3A5A]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowFormChofer(false); setEditChoferId(null) }}
                      className="flex-1 py-1.5 rounded-lg text-xs text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarChofer}
                      disabled={guardandoChofer}
                      className="flex-[2] py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 text-white text-xs font-medium hover:from-sky-400 hover:to-blue-400 transition-all disabled:opacity-50"
                    >
                      {guardandoChofer ? 'Guardando...' : editChoferId ? 'Actualizar' : 'Agregar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Import results choferes */}
          <AnimatePresence>
            {importChoferesResults && importChoferesResults.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 max-h-40 overflow-y-auto space-y-1 border-b border-white/5">
                  {importChoferesResults.map(r => (
                    <div key={r.label} className="flex items-center gap-2 text-xs">
                      {r.ok
                        ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                        : <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                      }
                      <span className="text-[#B0B0D0]">{r.label}</span>
                      {!r.ok && <span className="text-red-400">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {choferes.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[#6B6B8A]">
                No hay choferes. Agregalos manualmente.
              </div>
            ) : (
              choferes.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{c.nombre}</p>
                    {(c.documento || c.telefono) && (
                      <p className="text-[10px] text-[#6B6B8A]">
                        {[c.documento, c.telefono].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditarChofer(c)}
                      className="p-1 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-sky-400 transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => { if (confirm(`Eliminar a ${c.nombre}?`)) handleEliminarChofer(c.id!) }}
                      className="p-1 rounded-lg hover:bg-white/5 text-[#6B6B8A] hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
