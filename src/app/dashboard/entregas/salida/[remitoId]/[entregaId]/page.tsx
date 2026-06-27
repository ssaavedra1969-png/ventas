'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getRemito, getEmpresaConfig } from '@/lib/firestore'
import { getSalida } from '@/lib/salidas'
import type { Remito, EmpresaConfig, Entrega } from '@/types'
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
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'

function toDate(v: Date | string | { toDate?: () => Date }): Date {
  if (v instanceof Date) return v
  if (typeof v === 'object' && v?.toDate) return v.toDate()
  return new Date(v as string)
}

export default function EntregaSalidaPage() {
  const params = useParams()
  const router = useRouter()
  const [remito, setRemito] = useState<Remito | null>(null)
  const [entrega, setEntrega] = useState<Entrega | null>(null)
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params.remitoId || !params.entregaId) return

    async function load() {
      try {
        const [salida, empresa] = await Promise.all([
          getSalida(params.entregaId as string),
          getEmpresaConfig(),
        ])
        setEmpresa(empresa)

        if (salida) {
          // New flow: salida from salidas collection has everything
          setEntrega({
            id: salida.id!,
            fecha: salida.fecha,
            createdAt: salida.createdAt ?? new Date(),
            items: salida.items,
            vehiculoPatente: salida.vehiculoPatente,
            vehiculoMarca: salida.vehiculoMarca,
            choferNombre: salida.choferNombre,
          })
          if (salida.clienteData) {
            const cd = salida.clienteData
            setRemito({
              id: salida.idRemito,
              idCliente: cd.codigoCliente ?? '',
              numeroRemito: salida.numeroRemito,
              clienteData: {
                codigoCliente: cd.codigoCliente ?? '',
                razonSocial: cd.razonSocial ?? '',
                tipoDocumento: cd.tipoDocumento ?? '',
                numeroDocumento: cd.numeroDocumento ?? '',
                actividad: '',
                telefono: cd.telefono ?? '',
                domicilio: cd.domicilio ?? '',
                localidad: cd.localidad ?? '',
                condicionIVA: cd.condicionIVA ?? '',
              },
              items: salida.remitoItems ?? salida.items.map((i) => ({
                idProducto: i.idProducto,
                nombreProducto: i.nombreProducto,
                cantidad: i.cantidad,
                precioUnitario: 0,
                subtotal: 0,
              })),
              entregas: [],
              estado: 'A_Entregar',
              subtotalGeneral: 0,
              iva: 0,
              totalGeneral: 0,
              fecha: salida.fecha,
              createdAt: salida.createdAt,
            } as Remito)
          } else {
            setNotFound(true)
          }
          setLoading(false)
          return
        }

        // Fallback to legacy remito.entregas
        const r = await getRemito(params.remitoId as string)
        if (r) {
          setRemito(r)
          const ent = (r.entregas ?? []).find((en) => en.id === params.entregaId)
          if (ent) {
            setEntrega(ent)
          } else {
            setNotFound(true)
          }
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params.remitoId, params.entregaId])

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060612] flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Receipt className="h-10 w-10 text-[#6C3CE1]" />
          </motion.div>
          <p className="text-sm text-[#6B6B8A]">Cargando remito de salida...</p>
        </div>
      </div>
    )
  }

  if (notFound || !remito || !entrega) {
    return (
      <div className="min-h-screen bg-[#060612] flex items-center justify-center">
        <motion.div className="text-center" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Receipt className="h-16 w-16 text-[#6B6B8A] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Entrega no encontrada</h1>
          <p className="text-[#B0B0D0] mb-6">La entrega que buscás no existe o fue eliminada.</p>
          <button
            onClick={() => router.push('/dashboard/entregas')}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl btn-nebula text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Entregas
          </button>
        </motion.div>
      </div>
    )
  }

  function calcularEntregadoTotal(r: Remito, idProducto: string): number {
    if (!r.entregas?.length) return 0
    let total = 0
    for (const e of r.entregas) {
      for (const i of e.items) {
        if (i.idProducto === idProducto) total += i.cantidad
      }
    }
    return total
  }

  const fechaEntrega = format(toDate(entrega.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })
  const totalUnidades = entrega.items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <div className="min-h-screen bg-[#060612]">
      {/* ───── Toolbar ───── */}
      <div className="no-print bg-[#060612]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard/entregas')}
            className="inline-flex items-center gap-2 text-sm text-[#B0B0D0] hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Entregas
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* ───── Document ───── */}
      <div className="max-w-4xl mx-auto px-4 py-8">
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

              <div className="text-center sm:text-right shrink-0">
                <div className="inline-block px-6 py-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
                  <p className="text-[9px] text-amber-700 font-semibold uppercase tracking-[0.25em] mb-1">
                    Remito de Salida
                  </p>
                  <p className="text-base font-black tracking-tight text-gray-900">
                    N° {String(remito.numeroRemito).padStart(6, '0')}
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <div className="flex items-center gap-1.5 justify-end text-[10px] text-gray-600">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      {fechaEntrega}
                    </div>
                    <p className="text-[9px] text-gray-400 mt-0.5">
                      Entrega N° {entrega.id.slice(-6).toUpperCase()}
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
                <p className="text-xs text-gray-800">{remito.clienteData.condicionIVA || '—'}</p>
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
            </div>
          </div>

          {/* ════════ ITEMS ENTREGADOS ════════ */}
          <div className="px-8 sm:px-12 py-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-amber-600" />
              <h2 className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.2em]">Materiales Entregados</h2>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2 w-14">Cant.</th>
                  <th className="text-left text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2">Descripción</th>
                  <th className="text-right text-[9px] font-bold text-gray-600 uppercase tracking-wider pb-2 w-14">Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entrega.items.map((item, idx) => {
                  const entregadoTotal = calcularEntregadoTotal(remito, item.idProducto)
                  const itemRemito = remito.items.find((i) => i.idProducto === item.idProducto)
                  const pendiente = itemRemito ? Math.max(0, itemRemito.cantidad - entregadoTotal) : 0
                  return (
                    <tr key={idx} className="even:bg-amber-50/30">
                      <td className="py-2.5 text-xs font-mono font-bold text-gray-900">{item.cantidad}</td>
                      <td className="py-2.5 text-xs text-gray-800">{item.nombreProducto}</td>
                      <td className="py-2.5 text-xs font-mono text-right text-amber-700">{pendiente}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] text-gray-500 pt-2 border-t border-gray-100">
              <span>Total productos: <strong className="text-gray-800">{entrega.items.length}</strong></span>
              <span>Unidades entregadas: <strong className="text-gray-800">{totalUnidades}</strong></span>
              {entrega.vehiculoPatente && (
                <span>Vehículo: <strong className="text-gray-800">{entrega.vehiculoPatente}{entrega.vehiculoMarca ? ` (${entrega.vehiculoMarca})` : ''}</strong></span>
              )}
              {entrega.choferNombre && (
                <span>Chofer: <strong className="text-gray-800">{entrega.choferNombre}</strong></span>
              )}
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
                <strong>4.</strong> En caso de pérdida, robo, hurto, deterioro o destrucción de los materiales, el retirante deberá abonar el valor total de los mismos.
              </p>
              <p>
                <strong>5.</strong> El presente remito constituye título ejecutivo suficiente para reclamar la devolución de los materiales o el pago de su valor, conforme el Artículo 523 del Código Civil y Comercial de la Nación.
              </p>
              <p>
                <strong>6.</strong> El retirante autoriza a {empresa?.razonSocial || 'GRUPO FALPAT SRL'} a verificar el estado y destino de los materiales en cualquier momento.
              </p>
            </div>
          </div>

          {/* ════════ FIRMAS ════════ */}
          <div className="px-8 sm:px-12 py-6 border-t-2 border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <FileSignature className="h-4 w-4 text-amber-600" />
              <h2 className="text-[10px] font-bold text-amber-800 uppercase tracking-[0.2em]">Constancia de Recepción</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="text-center">
                <div className="border-t-2 border-gray-300 pt-2 mb-1">
                  <p className="text-xs font-semibold text-gray-800">
                    {empresa?.razonSocial || 'GRUPO FALPAT SRL'}
                  </p>
                  <p className="text-[10px] text-gray-500">Entregué Conforme</p>
                  <div className="mt-4 h-8" />
                  <p className="text-[10px] text-gray-400">Firma: ______________________</p>
                  <p className="text-[10px] text-gray-400">DNI: _______________________</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-300 pt-2 mb-1">
                  <p className="text-xs font-semibold text-gray-800">
                    {remito.clienteData.razonSocial}
                  </p>
                  <p className="text-[10px] text-gray-500">Recibí Conforme</p>
                  <div className="mt-4 h-8" />
                  <p className="text-[10px] text-gray-400">Firma: ______________________</p>
                  <p className="text-[10px] text-gray-400">DNI: _______________________</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center text-[9px] text-gray-400">
              <p>Fecha de entrega: {fechaEntrega}</p>
              <p className="mt-0.5">Documento generado electrónicamente — Válido como constancia de entrega</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
