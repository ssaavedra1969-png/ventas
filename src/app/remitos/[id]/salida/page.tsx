'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getRemito, getEmpresaConfig } from '@/lib/firestore'
import type { Remito, EmpresaConfig } from '@/types'
import {
  ArrowLeft,
  Printer,
  Phone,
  MapPin,
  Mail,
  Receipt,
  Calendar,
  Building2,
  UserCheck,
  Package,
  Scale,
  FileSignature,
  ChevronDown,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'

export default function RemitoSalidaPage() {
  const params = useParams()
  const router = useRouter()
  const [remito, setRemito] = useState<Remito | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fechaSalida, setFechaSalida] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [showDatePicker, setShowDatePicker] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!params.id) return
    Promise.all([
      getRemito(params.id as string),
      getEmpresaConfig(),
    ])
      .then(([r, e]) => {
        setEmpresa(e)
        if (r) setRemito(r)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.id])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060612] flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Receipt className="h-10 w-10 text-[#6C3CE1]" />
          </motion.div>
          <p className="text-sm text-[#6B6B8A]">Cargando remito...</p>
        </div>
      </div>
    )
  }

  if (notFound || !remito) {
    return (
      <div className="min-h-screen bg-[#060612] flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Receipt className="h-16 w-16 text-[#6B6B8A] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Remito no encontrado</h1>
          <p className="text-[#B0B0D0] mb-6">El remito que buscás no existe o fue eliminado.</p>
          <button
            onClick={() => router.push('/dashboard/remitos')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl btn-nebula text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </motion.div>
      </div>
    )
  }

  const condIVALabel: Record<string, string> = {
    RI: 'Responsable Inscripto',
    Monotributo: 'Monotributo',
    Exento: 'Exento',
    CF: 'Consumidor Final',
  }

  const totalItems = remito.items.reduce((s, i) => s + i.cantidad, 0)
  const fechaFormateada = format(new Date(fechaSalida + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: es })
  const remitoFecha = format(remito.fecha, "dd 'de' MMMM 'de' yyyy", { locale: es })

  return (
    <div className="min-h-screen bg-[#060612]">
      {/* ───── Toolbar ───── */}
      <div className="no-print bg-[#060612]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push(`/remitos/${params.id}`)}
            className="inline-flex items-center gap-2 text-sm text-[#B0B0D0] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Remito
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#B0B0D0] hover:text-white text-sm transition-colors"
              >
                <Calendar className="h-4 w-4 text-amber-400" />
                <span className="hidden sm:inline">{fechaFormateada}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
              </button>
              {showDatePicker && (
                <div className="absolute right-0 top-full mt-2 z-50 bg-[#1A1A3A] border border-white/10 rounded-xl p-3 shadow-2xl shadow-black/50">
                  <input
                    type="date"
                    value={fechaSalida}
                    onChange={(e) => { setFechaSalida(e.target.value); setShowDatePicker(false) }}
                    className="w-full px-3 py-2 rounded-lg bg-[#0D0D1F] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={() => { setFechaSalida(format(new Date(), 'yyyy-MM-dd')); setShowDatePicker(false) }}
                    className="mt-2 w-full text-center text-xs text-[#6B6B8A] hover:text-white transition-colors py-1"
                  >
                    Hoy
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* ───── Document ───── */}
      <div className="max-w-4xl mx-auto px-4 py-8" ref={printRef}>
        <div className="rounded-2xl overflow-hidden relative border border-gray-200 bg-white print-remito shadow-2xl shadow-black/20">

          {/* ─── WATERMARK ─── */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none overflow-hidden">
            <span
              className="text-[6rem] sm:text-[9rem] font-black uppercase tracking-[0.15em] text-[#a0a0a0] opacity-[0.06] -rotate-30 whitespace-nowrap"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              R E M I T O   D E   S A L I D A
            </span>
          </div>

          {/* ─── DECORATIVE TOP BAR ─── */}
          <div className="h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

          {/* ════════ CARATULA ════════ */}
          <div className="px-8 sm:px-12 pt-8 pb-6 border-b-2 border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between gap-6">

              {/* Company */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">
                    {empresa?.razonSocial || 'GRUPO FALPAT SRL'}
                  </h1>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
                      <Scale className="h-3 w-3 text-gray-400 shrink-0" />
                      CUIT: {empresa?.cuit || '30-71784388-2'}
                    </p>
                    {empresa?.direccion && (
                      <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                        {empresa.direccion}
                      </p>
                    )}
                    {empresa?.telefono && (
                      <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                        {empresa.telefono}
                      </p>
                    )}
                    {empresa?.email && (
                      <p className="text-[10px] text-gray-600 flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-gray-400 shrink-0" />
                        {empresa.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Document info */}
              <div className="text-center sm:text-right shrink-0">
                <div className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                  <p className="text-[9px] text-amber-700 font-semibold uppercase tracking-[0.25em] mb-1">
                    Remito de Salida
                  </p>
                  <p className="text-2xl font-black tracking-tight text-gray-900">
                    N° {String(remito.numeroRemito).padStart(6, '0')}
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <p className="text-[10px] text-gray-600">
                      <span className="text-gray-400">Retiro:</span> {fechaFormateada}
                    </p>
                    <p className="text-[9px] text-gray-400">
                      Remito: {remitoFecha}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ════════ CLIENTE ════════ */}
          <div className="px-8 sm:px-12 py-5 border-b-2 border-gray-200 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/50">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="h-4 w-4 text-amber-600" />
              <h2 className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.2em]">Datos del Destinatario</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-2">
              <div className="col-span-2 sm:col-span-4">
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Razón Social</p>
                <p className="text-sm font-bold text-gray-900">{remito.clienteData.razonSocial}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Documento</p>
                <p className="text-xs text-gray-800 font-mono">
                  {remito.clienteData.tipoDocumento
                    ? `${remito.clienteData.tipoDocumento} ${remito.clienteData.numeroDocumento}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Condición IVA</p>
                <p className="text-xs text-gray-800">{condIVALabel[remito.clienteData.condicionIVA] || remito.clienteData.condicionIVA || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Domicilio</p>
                <p className="text-xs text-gray-700">{remito.clienteData.domicilio || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Localidad</p>
                <p className="text-xs text-gray-700">{remito.clienteData.localidad || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Teléfono</p>
                <p className="text-xs text-gray-700">{remito.clienteData.telefono || '—'}</p>
              </div>
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Cód. Cliente</p>
                <p className="text-xs text-gray-800 font-mono font-medium">{remito.clienteData.codigoCliente || '—'}</p>
              </div>
              {remito.vendedor && (
                <div>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider font-medium">Vendedor</p>
                  <p className="text-xs text-gray-800">{remito.vendedor.nombre}</p>
                </div>
              )}
            </div>
          </div>

          {/* ════════ ITEMS ════════ */}
          <div className="px-8 sm:px-12 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-amber-600" />
              <h2 className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.2em]">Detalle de Materiales Retirados</h2>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2 w-14">Cantidad</th>
                  <th className="text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2">Descripción de los Materiales</th>
                  <th className="text-right text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2 w-16">Unidad</th>
                  <th className="text-right text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2 w-24">P. Unitario</th>
                  <th className="text-right text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2 w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remito.items.map((item, idx) => (
                  <tr key={idx} className="even:bg-amber-50/30">
                    <td className="py-2.5 text-xs font-mono font-bold text-gray-900">{item.cantidad}</td>
                    <td className="py-2.5 text-xs text-gray-800">{item.nombreProducto}</td>
                    <td className="py-2.5 text-xs font-mono text-gray-500 text-right">Unid.</td>
                    <td className="py-2.5 text-xs font-mono text-gray-600 text-right">${item.precioUnitario.toFixed(2)}</td>
                    <td className="py-2.5 text-xs font-mono text-gray-800 text-right font-semibold">${item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t-2 border-gray-200 mt-3 pt-3 ml-auto w-full sm:w-72 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Importe Neto Gravado</span>
                <span className="font-mono text-gray-800">${remito.subtotalGeneral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">IVA 21%</span>
                <span className="font-mono text-gray-800">${remito.iva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Valor Total de los Materiales</span>
                <span className="font-mono px-3 py-1 rounded-lg text-white text-sm bg-gradient-to-r from-amber-500 to-orange-500">
                  ${remito.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Items summary */}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-gray-500">
              <span>Total de items: <strong className="text-gray-800">{remito.items.length}</strong></span>
              <span>Unidades totales: <strong className="text-gray-800">{totalItems}</strong></span>
              <span>Productos: <strong className="text-gray-800">{remito.items.length}</strong></span>
            </div>
          </div>

          {/* ════════ LEGAL ─── CLAUSULAS ════════ */}
          <div className="px-8 sm:px-12 py-4 border-t-2 border-gray-200 bg-gradient-to-r from-amber-50/40 via-white to-orange-50/40">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-amber-600" />
              <h2 className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.2em]">Términos y Condiciones del Retiro</h2>
            </div>
            <div className="space-y-2 text-[10px] text-gray-600 leading-relaxed">
              <p>
                <strong>1.</strong> El retirante declara haber recibido los materiales detallados en el presente remito en calidad de depósito, comprometiéndose a su custodia y conservación hasta su posterior liquidación o devolución.
              </p>
              <p>
                <strong>2.</strong> Los materiales retirados son de propiedad de <strong>{empresa?.razonSocial || 'GRUPO FALPAT SRL'}</strong> hasta tanto se complete el proceso de facturación y pago total de la operación.
              </p>
              <p>
                <strong>3.</strong> El retirante se obliga a devolver los materiales en el mismo estado en que fueron recibidos, ante el simple requerimiento de la empresa, dentro del plazo de 48 horas.
              </p>
              <p>
                <strong>4.</strong> En caso de pérdida, robo, hurto, deterioro o destrucción de los materiales, el retirante deberá abonar el valor total de los mismos según el detalle de precios del presente remito.
              </p>
              <p>
                <strong>5.</strong> El presente remito constituye título ejecutivo suficiente para reclamar la devolución de los materiales o el pago de su valor, conforme el Artículo 523 del Código Civil y Comercial de la Nación.
              </p>
              <p>
                <strong>6.</strong> El retirante autoriza a <strong>{empresa?.razonSocial || 'GRUPO FALPAT SRL'}</strong> a verificar el estado y destino de los materiales en cualquier momento.
              </p>
            </div>
          </div>

          {/* ════════ OBSERVACIONES ════════ */}
          {remito.observaciones && (
            <div className="px-8 sm:px-12 py-4 border-t border-gray-200 bg-gray-50/50">
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.2em] mb-1">Observaciones</p>
              <p className="text-xs text-gray-700">{remito.observaciones}</p>
            </div>
          )}

          {/* ════════ FIRMAS ════════ */}
          <div className="px-8 sm:px-12 py-6 border-t-2 border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="h-4 w-4 text-amber-600" />
              <h2 className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.2em]">Constancia de Recepción</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Company signature */}
              <div className="text-center">
                <div className="border-t-2 border-gray-300 pt-2 mb-1">
                  <p className="text-xs font-semibold text-gray-800">
                    {empresa?.razonSocial || 'GRUPO FALPAT SRL'}
                  </p>
                  <p className="text-[10px] text-gray-500">Firma y Aclaración</p>
                  <div className="mt-4 h-8" />
                  <p className="text-[10px] text-gray-400">DNI: _______________________</p>
                </div>
              </div>

              {/* Client signature */}
              <div className="text-center">
                <div className="border-t-2 border-gray-300 pt-2 mb-1">
                  <p className="text-xs font-semibold text-gray-800">
                    {remito.clienteData.razonSocial}
                  </p>
                  <p className="text-[10px] text-gray-500">Recibí Conforme - Firma y Aclaración</p>
                  <div className="mt-4 h-8" />
                  <p className="text-[10px] text-gray-400">DNI: _______________________</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-[9px] text-gray-400">
              <p>Fecha de retiro: {fechaFormateada}</p>
              <p className="mt-0.5">
                Documento generado electrónicamente — Válido como constancia de entrega
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
