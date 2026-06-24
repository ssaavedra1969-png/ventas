'use client'

import { useEffect, useState } from 'react'
import { getEmpresaConfig, saveEmpresaConfig } from '@/lib/firestore'
import type { EmpresaConfig } from '@/types'
import { Building2, Save, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export default function ConfiguracionPage() {
  const [data, setData] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getEmpresaConfig()
      .then(setData)
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (field: keyof EmpresaConfig, value: string) => {
    if (!data) return
    setData({ ...data, [field]: value })
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true)
    try {
      await saveEmpresaConfig(data)
      toast.success('Configuración guardada correctamente')
    } catch {
      toast.error('Error al guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#6C3CE1]/20 to-[#00D4FF]/10 border border-[#6C3CE1]/20">
          <Building2 className="h-6 w-6 text-[#6C3CE1]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="text-[#B0B0D0] text-sm">
            Datos de la empresa que aparecen en los remitos
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="h-5 w-5 text-[#6C3CE1]" />
          <h2 className="text-lg font-semibold text-white">
            Datos del Encabezado
          </h2>
        </div>

        <div className="space-y-5">
          {/* Razón Social */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0D0] mb-1.5">
              Razón Social
            </label>
            <input
              type="text"
              value={data?.razonSocial || ''}
              onChange={(e) => handleChange('razonSocial', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors input-nebula"
              placeholder="GRUPO FALPAT SRL"
            />
          </div>

          {/* CUIT */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0D0] mb-1.5">
              CUIT
            </label>
            <input
              type="text"
              value={data?.cuit || ''}
              onChange={(e) => handleChange('cuit', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors input-nebula"
              placeholder="30-71784388-2"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0D0] mb-1.5">
              Dirección
            </label>
            <input
              type="text"
              value={data?.direccion || ''}
              onChange={(e) => handleChange('direccion', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors input-nebula"
              placeholder="Av. Ejemplo 1234"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0D0] mb-1.5">
              Teléfono
            </label>
            <input
              type="text"
              value={data?.telefono || ''}
              onChange={(e) => handleChange('telefono', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors input-nebula"
              placeholder="(011) 1234-5678"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0D0] mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={data?.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors input-nebula"
              placeholder="info@falpat.com"
            />
          </div>

          {/* WhatsApp Admin */}
          <div>
            <label className="block text-sm font-medium text-[#B0B0D0] mb-1.5">
              WhatsApp Administración
            </label>
            <input
              type="text"
              value={data?.telefonoAdmin || ''}
              onChange={(e) => handleChange('telefonoAdmin', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors input-nebula"
              placeholder="(011) 1234-5678"
            />
            <p className="text-[10px] text-[#6B6B8A] mt-1">
              Número al que se enviarán los remitos desde la sección Remitos via WhatsApp
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <motion.button
              onClick={handleSave}
              disabled={saving || !data}
              className="btn-nebula inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Preview card */}
      <motion.div
        className="glass-card rounded-xl p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="h-4 w-4 text-[#6C3CE1]" />
          <h3 className="text-sm font-semibold text-white">Vista previa del encabezado</h3>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{data?.razonSocial || '—'}</p>
              <p className="text-xs text-[#6B6B8A]">CUIT: {data?.cuit || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#B0B0D0]">
            <span>{data?.direccion || '—'}</span>
            <span>{data?.telefono || '—'}</span>
            <span>{data?.email || '—'}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
