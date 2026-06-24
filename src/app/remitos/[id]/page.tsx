'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getRemito, getEmpresaConfig } from '@/lib/firestore'
import type { Remito, EmpresaConfig } from '@/types'
import {
  ArrowLeft,
  Printer,
  Phone,
  MapPin,
  Mail,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'

const esPresupuesto = (estado: string) => estado !== 'Entregado'

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

  const presupuesto = esPresupuesto(remito.estado)
  const handlePrint = () => window.print()

  return (
    <div className="min-h-screen bg-[#0A0A1A]">
      {/* Toolbar */}
      <div className="no-print bg-[#0A0A1A]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard">
            <span className="inline-flex items-center gap-2 text-sm text-[#B0B0D0] hover:text-white transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </span>
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-nebula text-sm font-medium"
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-2xl overflow-hidden relative border border-white/10 bg-gradient-to-b from-[#12122A] to-[#0E0E22]">
          {/* PRESUPUESTO watermark */}
          {presupuesto && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
              <span
                className="text-[10rem] sm:text-[14rem] font-black uppercase tracking-[0.15em] opacity-[0.04] text-orange-400 rotate-[-25deg] whitespace-nowrap"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                PRESUPUESTO
              </span>
            </div>
          )}

          {/* Decorative top bar */}
          <div className="h-1.5 bg-gradient-to-r from-[#6C3CE1] via-[#00D4FF] to-[#6C3CE1]" />

          {/* ─── HEADER ─── */}
          <div className="px-8 pt-8 pb-6 border-b border-white/5">
            <div className="flex flex-col sm:flex-row justify-between gap-6">
              {/* Company Info */}
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)' }}
                >
                  <Receipt className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {empresa?.razonSocial || 'GRUPO FALPAT SRL'}
                  </h1>
                  <p className="text-sm text-[#6B6B8A]">CUIT: {empresa?.cuit || '30-71784388-2'}</p>
                  <div className="mt-2 space-y-1">
                    {empresa?.direccion && (
                      <p className="text-xs text-[#6B6B8A] flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {empresa.direccion}
                      </p>
                    )}
                    {empresa?.telefono && (
                      <p className="text-xs text-[#6B6B8A] flex items-center gap-1.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        {empresa.telefono}
                      </p>
                    )}
                    {empresa?.email && (
                      <p className="text-xs text-[#6B6B8A] flex items-center gap-1.5">
                        <Mail className="h-3 w-3 shrink-0" />
                        {empresa.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Info */}
              <div className="text-left sm:text-right shrink-0">
                <div
                  className="inline-block px-6 py-3 rounded-xl text-center"
                  style={{
                    background: presupuesto
                      ? 'linear-gradient(135deg, rgba(255,165,0,0.12), rgba(255,200,0,0.08))'
                      : 'linear-gradient(135deg, rgba(108,60,225,0.15), rgba(0,212,255,0.1))',
                    border: presupuesto
                      ? '1px solid rgba(255,165,0,0.2)'
                      : '1px solid rgba(108,60,225,0.2)',
                  }}
                >
                  <p className="text-[10px] text-[#6B6B8A] uppercase tracking-[0.2em] mb-0.5">
                    {presupuesto ? 'Presupuesto' : 'Remito'}
                  </p>
                  <p className="text-2xl font-black tracking-tight text-white">
                    N° {String(remito.numeroRemito).padStart(6, '0')}
                  </p>
                  <p className="text-[10px] text-[#6B6B8A] mt-1">
                    {format(remito.fecha, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── CLIENT DATA ─── */}
          <div className="px-8 py-5 border-b border-white/5 bg-white/[0.015]">
            <p className="text-[9px] font-semibold text-[#6B6B8A] uppercase tracking-[0.2em] mb-3">
              Datos del Cliente
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider">CUIT</p>
                <p className="font-medium text-white">{remito.clienteData.cuit}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider">Razón Social</p>
                <p className="font-medium text-white">{remito.clienteData.razonSocial}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider">Dirección</p>
                <p className="text-[#B0B0D0]">{remito.clienteData.direccion}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider">Teléfono</p>
                <p className="text-[#B0B0D0]">{remito.clienteData.telefono}</p>
              </div>
              <div>
                <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider">T. FAC</p>
                <p className="font-medium text-white">{remito.clienteData.tipoFactura || '—'}</p>
              </div>
              {remito.vendedor && (
                <div>
                  <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider">Vendedor</p>
                  <p className="font-medium text-white">
                    {remito.vendedor.nombre} <span className="text-[#6B6B8A]">({remito.vendedor.codigo})</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── ITEMS TABLE ─── */}
          <div className="px-8 py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-[9px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3 w-14">Cant.</th>
                  <th className="text-left text-[9px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3">Descripción</th>
                  <th className="text-right text-[9px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3 w-28">P. Unitario</th>
                  <th className="text-right text-[9px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3 w-16">Bonif.</th>
                  <th className="text-right text-[9px] font-semibold text-[#6B6B8A] uppercase tracking-wider pb-3 w-28">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {remito.items.map((item, index) => (
                  <tr key={index} className="bg-white/[0.015]">
                    <td className="py-2.5 text-sm font-mono text-white">{item.cantidad}</td>
                    <td className="py-2.5 text-sm text-white">{item.nombreProducto}</td>
                    <td className="py-2.5 text-sm font-mono text-[#B0B0D0] text-right">${item.precioUnitario.toFixed(2)}</td>
                    <td className="py-2.5 text-sm font-mono text-[#B0B0D0] text-right">
                      {item.bonificacion ? `${item.bonificacion}%` : '—'}
                    </td>
                    <td className="py-2.5 text-sm font-mono text-white text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-white/10 mt-4 pt-4 ml-auto w-full sm:w-64 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-[#6B6B8A]">Subtotal</span>
                <span className="font-mono text-white">${remito.subtotalGeneral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6B6B8A]">IVA (21%)</span>
                <span className="font-mono text-white">${remito.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2.5">
                <span className="text-white">Total General</span>
                <span
                  className="font-mono px-3 py-1 rounded-lg text-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(108,60,225,0.2), rgba(0,212,255,0.15))',
                    border: '1px solid rgba(108,60,225,0.3)',
                  }}
                >
                  ${remito.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div className="px-8 py-5 border-t border-white/5 bg-white/[0.015]">
            {remito.observaciones && (
              <div className="mb-5">
                <p className="text-[9px] font-semibold text-[#6B6B8A] uppercase tracking-[0.2em] mb-2">
                  Observaciones
                </p>
                <p className="text-sm text-[#B0B0D0]">{remito.observaciones}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider mb-1.5">Estado</p>
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
                  <p className="text-[9px] text-[#6B6B8A] uppercase tracking-wider">Firma y Acuse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
