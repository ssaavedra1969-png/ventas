'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getRemito, getEmpresaConfig } from '@/lib/firestore'
import type { Remito, EmpresaConfig } from '@/types'
import {
  ArrowLeft,
  Printer,
  Building2,
  Phone,
  MapPin,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

export default function RemitoViewPage() {
  const params = useParams()
  const [remito, setRemito] = useState<Remito | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params.id) return
    Promise.all([
      getRemito(params.id as string),
      getEmpresaConfig(),
    ])
      .then(([remitoData, empresaData]) => {
        setEmpresa(empresaData)
        if (remitoData) setRemito(remitoData)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Receipt className="h-10 w-10 text-[#6C3CE1]" />
          </motion.div>
          <p className="text-sm text-[#6B6B8A]">Cargando remito...</p>
        </div>
      </div>
    )
  }

  if (notFound || !remito) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Receipt className="h-16 w-16 text-[#6B6B8A] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Remito no encontrado</h1>
          <p className="text-[#B0B0D0] mb-6">El remito que buscás no existe o fue eliminado.</p>
          <Link href="/dashboard">
            <motion.span
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl btn-nebula text-sm font-medium cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </motion.span>
          </Link>
        </motion.div>
      </div>
    )
  }

  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-[#0A0A1A]">
      {/* Toolbar */}
      <motion.div
        className="no-print bg-[#0A0A1A]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard">
            <motion.span
              className="inline-flex items-center gap-2 text-sm text-[#B0B0D0] hover:text-white transition-colors cursor-pointer"
              whileHover={{ x: -4 }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </motion.span>
          </Link>
          <motion.button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-nebula text-sm font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </motion.button>
        </div>
      </motion.div>

      {/* Remito Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          className="rounded-2xl overflow-hidden relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Premium Document Container */}
          <div className="relative border border-white/10 rounded-2xl overflow-hidden bg-gradient-to-b from-[#12122A] to-[#0E0E22]">
            {/* Watermark */}
            <div className="watermark hidden sm:block">{empresa?.razonSocial || 'FALPAT SRL'}</div>

            {/* Decorative top bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#6C3CE1] via-[#00D4FF] to-[#6C3CE1]" />

            {/* Header */}
            <motion.div
              className="p-8 pb-6 border-b border-white/5 relative"
              variants={fadeUp}
              custom={0}
              initial="hidden"
              animate="visible"
            >
              <div className="flex flex-col items-center gap-4 mb-6">
                <motion.div
                  className="flex items-center gap-4"
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div
                    className="w-14 h-14 rounded-xl flex items-center justify-center relative overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)' }}
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Building2 className="h-7 w-7 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {empresa?.razonSocial || 'GRUPO FALPAT SRL'}
                    </h1>
                    <p className="text-sm text-[#6B6B8A]">CUIT: {empresa?.cuit || '30-71784388-2'}</p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="flex justify-center mb-6"
                variants={fadeUp}
                custom={1}
              >
                <motion.div
                  className="inline-block px-10 py-4 rounded-xl text-center relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(108,60,225,0.15), rgba(0,212,255,0.1))',
                    border: '1px solid rgba(108,60,225,0.2)',
                  }}
                  whileHover={{ scale: 1.03 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    animate={{ left: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-xs text-[#6B6B8A] uppercase tracking-[0.2em] mb-1">Remito</p>
                  <p className="text-4xl font-black tracking-tight text-white">
                    N° {String(remito.numeroRemito).padStart(6, '0')}
                  </p>
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <motion.div
                  className="flex items-center gap-2 text-[#6B6B8A]"
                  variants={fadeUp}
                  custom={2}
                >
                  <MapPin className="h-4 w-4 text-[#6C3CE1] shrink-0" />
                  {empresa?.direccion || 'Av. Ejemplo 1234'}
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 text-[#6B6B8A]"
                  variants={fadeUp}
                  custom={3}
                >
                  <Phone className="h-4 w-4 text-[#6C3CE1] shrink-0" />
                  {empresa?.telefono || '(011) 1234-5678'}
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 text-[#6B6B8A]"
                  variants={fadeUp}
                  custom={4}
                >
                  <Receipt className="h-4 w-4 text-[#6C3CE1] shrink-0" />
                  {format(remito.fecha, "d 'de' MMMM 'de' yyyy", { locale: es })}
                </motion.div>
              </div>
            </motion.div>

            {/* Cliente Data */}
            <motion.div
              className="px-8 py-6 border-b border-white/5 bg-white/[0.02]"
              variants={fadeUp}
              custom={5}
              initial="hidden"
              animate="visible"
            >
              <p className="text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6C3CE1]" />
                Datos del Cliente
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider">CUIT</p>
                  <p className="text-sm font-medium text-white">{remito.clienteData.cuit}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider">Razón Social</p>
                  <p className="text-sm font-medium text-white">{remito.clienteData.razonSocial}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider">Dirección</p>
                  <p className="text-sm text-[#B0B0D0]">{remito.clienteData.direccion}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider">Teléfono</p>
                  <p className="text-sm text-[#B0B0D0]">{remito.clienteData.telefono}</p>
                </div>
                {remito.vendedor && (
                  <div>
                    <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider">Vendedor</p>
                    <p className="text-sm font-medium text-white">
                      {remito.vendedor.nombre} <span className="text-[#6B6B8A]">({remito.vendedor.codigo})</span>
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Items Table */}
            <motion.div
              className="px-8 py-6"
              variants={fadeUp}
              custom={8}
              initial="hidden"
              animate="visible"
            >
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3 w-16">Cant.</th>
                    <th className="text-left text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3">Descripción</th>
                    <th className="text-right text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3">P. Unitario</th>
                    <th className="text-right text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3">Bonif.</th>
                    <th className="text-right text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {remito.items.map((item, index) => (
                    <motion.tr
                      key={index}
                      className="table-row-glass"
                      custom={index}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                    >
                      <td className="py-3 text-sm font-mono text-white">{item.cantidad}</td>
                      <td className="py-3 text-sm text-white">{item.nombreProducto}</td>
                      <td className="py-3 text-sm font-mono text-[#B0B0D0] text-right">${item.precioUnitario.toFixed(2)}</td>
                      <td className="py-3 text-sm font-mono text-[#B0B0D0] text-right">
                        {item.bonificacion ? `${item.bonificacion}%` : '—'}
                      </td>
                      <td className="py-3 text-sm font-mono text-white text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {/* Totales */}
              <motion.div
                className="border-t border-white/10 mt-4 pt-4 ml-auto w-full sm:w-72 space-y-2"
                variants={fadeUp}
                custom={10}
                initial="hidden"
                animate="visible"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B6B8A]">Subtotal</span>
                  <span className="font-mono text-white">${remito.subtotalGeneral.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B6B8A]">IVA (21%)</span>
                  <span className="font-mono text-white">${remito.iva.toFixed(2)}</span>
                </div>
                <motion.div
                  className="flex justify-between text-lg font-bold border-t border-white/10 pt-3"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="text-white">Total General</span>
                  <motion.span
                    className="font-mono px-4 py-1 rounded-lg text-white"
                    style={{
                      background: 'linear-gradient(135deg, rgba(108,60,225,0.2), rgba(0,212,255,0.15))',
                      border: '1px solid rgba(108,60,225,0.3)',
                    }}
                    animate={{
                      boxShadow: [
                        '0 0 10px rgba(108,60,225,0.1)',
                        '0 0 20px rgba(0,212,255,0.2)',
                        '0 0 10px rgba(108,60,225,0.1)',
                      ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    ${remito.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </motion.span>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Footer */}
            <motion.div
              className="px-8 py-6 border-t border-white/5 bg-white/[0.02]"
              variants={fadeUp}
              custom={12}
              initial="hidden"
              animate="visible"
            >
              {remito.observaciones && (
                <div className="mb-6">
                  <p className="text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6C3CE1]" />
                    Observaciones
                  </p>
                  <p className="text-sm text-[#B0B0D0]">{remito.observaciones}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                  <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider mb-1">Estado</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      remito.estado === 'Pendiente'
                        ? 'badge-pendiente'
                        : remito.estado === 'Entregado'
                          ? 'badge-entregado'
                          : 'badge-anulado'
                    }`}
                  >
                    {remito.estado}
                  </span>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-white/10 w-48 pt-2">
                    <p className="text-[10px] text-[#6B6B8A] uppercase tracking-wider">Firma y Acuse</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
