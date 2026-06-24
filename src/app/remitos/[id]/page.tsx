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

const esPresupuesto = (estado: string) =>
  ['Enviado', 'Aceptado', 'Anulado'].includes(estado)

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

  const estadoLabel: Record<string, string> = {
    Enviado: 'Enviado',
    Aceptado: 'Aceptado',
    Anulado: 'Anulado',
    En_Revision: 'En Revisión',
    A_Entregar: 'A Entregar',
  }

  const estadoColor: Record<string, string> = {
    Enviado: 'bg-blue-100 text-blue-800 border border-blue-200',
    Aceptado: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    Anulado: 'bg-red-100 text-red-800 border border-red-200',
    En_Revision: 'bg-amber-100 text-amber-800 border border-amber-200',
    A_Entregar: 'bg-violet-100 text-violet-800 border border-violet-200',
  }

  const ivaRate = remito.subtotalGeneral > 0
    ? ((remito.iva / remito.subtotalGeneral) * 100).toFixed(1)
    : '0.0'
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
        <div className="rounded-2xl overflow-hidden relative border border-gray-200 bg-[#E8E8E8]">
          {/* PRESUPUESTO watermark */}
          {presupuesto && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
              <span
                className="text-[5rem] sm:text-[7rem] font-black uppercase tracking-[0.2em] text-[#a0a0a0] opacity-20 rotate-[-30deg] whitespace-nowrap"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                P R E S U P U E S T O
              </span>
            </div>
          )}

          {/* Decorative top bar */}
          <div className="h-1 bg-gradient-to-r from-[#6C3CE1] via-[#00D4FF] to-[#6C3CE1]" />

          {/* ─── HEADER ─── */}
          <div className="px-8 pt-6 pb-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              {/* Company Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)' }}
                >
                  <Receipt className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm font-bold text-gray-800 truncate">
                    {empresa?.razonSocial || 'GRUPO FALPAT SRL'}
                  </h1>
                  <p className="text-[10px] text-gray-500">CUIT: {empresa?.cuit || '30-71784388-2'}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0 mt-0.5">
                    {empresa?.direccion && (
                      <span className="text-[9px] text-gray-500 inline-flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {empresa.direccion}
                      </span>
                    )}
                    {empresa?.telefono && (
                      <span className="text-[9px] text-gray-500 inline-flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5 shrink-0" />
                        {empresa.telefono}
                      </span>
                    )}
                    {empresa?.email && (
                      <span className="text-[9px] text-gray-500 inline-flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5 shrink-0" />
                        {empresa.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Info */}
              <div className="text-left sm:text-right shrink-0">
                <div
                  className="inline-block px-4 py-2 rounded-lg text-center"
                  style={{
                    background: presupuesto
                      ? 'linear-gradient(135deg, rgba(255,165,0,0.15), rgba(255,200,0,0.1))'
                      : 'linear-gradient(135deg, rgba(108,60,225,0.12), rgba(0,212,255,0.08))',
                    border: presupuesto
                      ? '1px solid rgba(255,165,0,0.25)'
                      : '1px solid rgba(108,60,225,0.2)',
                  }}
                >
                  <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em] mb-0.5">
                    {presupuesto ? 'Presupuesto' : 'Remito'}
                  </p>
                  <p className="text-lg font-black tracking-tight text-gray-900">
                    N° {String(remito.numeroRemito).padStart(6, '0')}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">
                    {format(remito.fecha, "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── CLIENT DATA ─── */}
          <div className="px-8 py-3 border-b border-gray-200 bg-gray-100/50">
            <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-2">
              Datos del Cliente
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-xs">
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider">CUIT</p>
                <p className="font-medium text-gray-800">{remito.clienteData.cuit}</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider">Razón Social</p>
                <p className="font-medium text-gray-800">{remito.clienteData.razonSocial}</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider">Dirección</p>
                <p className="text-gray-600">{remito.clienteData.direccion}</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider">Teléfono</p>
                <p className="text-gray-600">{remito.clienteData.telefono}</p>
              </div>
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider">T. FAC</p>
                <p className="font-medium text-gray-800">{remito.clienteData.tipoFactura || '—'}</p>
              </div>
              {remito.vendedor && (
                <div>
                  <p className="text-[8px] text-gray-500 uppercase tracking-wider">Vendedor</p>
                  <p className="font-medium text-gray-800">
                    {remito.vendedor.nombre} <span className="text-gray-500">({remito.vendedor.codigo})</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ─── ITEMS TABLE ─── */}
          <div className="px-8 py-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-[8px] font-semibold text-gray-500 uppercase tracking-wider pb-2 w-12">Cant.</th>
                  <th className="text-left text-[8px] font-semibold text-gray-500 uppercase tracking-wider pb-2">Descripción</th>
                  <th className="text-right text-[8px] font-semibold text-gray-500 uppercase tracking-wider pb-2 w-24">P. Unitario</th>
                  <th className="text-right text-[8px] font-semibold text-gray-500 uppercase tracking-wider pb-2 w-14">Bonif.</th>
                  <th className="text-right text-[8px] font-semibold text-gray-500 uppercase tracking-wider pb-2 w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remito.items.map((item, index) => (
                  <tr key={index} className="even:bg-gray-100/50">
                    <td className="py-2 text-xs font-mono text-gray-800">{item.cantidad}</td>
                    <td className="py-2 text-xs text-gray-800">{item.nombreProducto}</td>
                    <td className="py-2 text-xs font-mono text-gray-500 text-right">${item.precioUnitario.toFixed(2)}</td>
                    <td className="py-2 text-xs font-mono text-gray-500 text-right">
                      {item.bonificacion ? `${item.bonificacion}%` : '—'}
                    </td>
                    <td className="py-2 text-xs font-mono text-gray-800 text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-gray-200 mt-3 pt-3 ml-auto w-full sm:w-56 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono text-gray-800">${remito.subtotalGeneral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">IVA ({ivaRate}%)</span>
                <span className="font-mono text-gray-800">${remito.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total General</span>
                <span
                  className="font-mono px-2.5 py-0.5 rounded-lg text-white text-xs"
                  style={{
                    background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)',
                  }}
                >
                  ${remito.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* ─── FOOTER ─── */}
          <div className="px-8 py-4 border-t border-gray-200 bg-gray-100/50">
            {remito.observaciones && (
              <div className="mb-4">
                <p className="text-[8px] font-semibold text-gray-500 uppercase tracking-[0.2em] mb-1">
                  Observaciones
                </p>
                <p className="text-xs text-gray-600">{remito.observaciones}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium ${estadoColor[remito.estado] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}
                >
                  {estadoLabel[remito.estado] || remito.estado}
                </span>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-200 w-44 pt-1.5">
                  <p className="text-[8px] text-gray-500 uppercase tracking-wider">Firma y Acuse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
