'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getRemito } from '@/lib/firestore'
import type { Remito } from '@/types'
import {
  ArrowLeft,
  Printer,
  Loader2,
  Building2,
  Phone,
  MapPin,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function RemitoViewPage() {
  const params = useParams()
  const [remito, setRemito] = useState<Remito | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params.id) return
    getRemito(params.id as string)
      .then((data) => {
        if (data) {
          setRemito(data)
        } else {
          setNotFound(true)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (notFound || !remito) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Remito no encontrado
          </h1>
          <p className="text-gray-500 mb-6">
            El remito que buscás no existe o fue eliminado.
          </p>
          <Link href="/dashboard">
            <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </span>
          </Link>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar - hidden when printing */}
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard">
            <span className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Volver al Dashboard
            </span>
          </Link>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Remito Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    GRUPO FALPAT SRL
                  </h1>
                  <p className="text-sm text-gray-500">
                    CUIT: 30-71784388-2
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="inline-block px-4 py-2 bg-gray-900 text-white rounded-xl">
                  <p className="text-xs text-gray-400">REMITO</p>
                  <p className="text-2xl font-bold">
                    N° {remito.numeroRemito}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                Av. Ejemplo 1234
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                (011) 1234-5678
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Receipt className="h-4 w-4 text-gray-400 shrink-0" />
                {format(remito.fecha, "d 'de' MMMM 'de' yyyy", {
                  locale: es,
                })}
              </div>
            </div>
          </div>

          {/* Cliente Data */}
          <div className="px-8 py-6 border-b border-gray-200 bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Datos del Cliente
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">CUIT</p>
                <p className="text-sm font-medium text-gray-900">
                  {remito.clienteData.cuit}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Razón Social</p>
                <p className="text-sm font-medium text-gray-900">
                  {remito.clienteData.razonSocial}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Dirección</p>
                <p className="text-sm text-gray-700">
                  {remito.clienteData.direccion}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Teléfono</p>
                <p className="text-sm text-gray-700">
                  {remito.clienteData.telefono}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8 py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3 w-16">
                    Cant.
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">
                    Descripción
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">
                    P. Unitario
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider pb-3">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {remito.items.map((item, index) => (
                  <tr key={index}>
                    <td className="py-3 text-sm font-mono text-gray-900">
                      {item.cantidad}
                    </td>
                    <td className="py-3 text-sm text-gray-900">
                      {item.nombreProducto}
                    </td>
                    <td className="py-3 text-sm font-mono text-gray-700 text-right">
                      ${item.precioUnitario.toFixed(2)}
                    </td>
                    <td className="py-3 text-sm font-mono text-gray-900 text-right font-medium">
                      ${item.subtotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="border-t-2 border-gray-200 mt-4 pt-4 space-y-2 ml-auto w-full sm:w-72">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-mono text-gray-900">
                  ${remito.subtotalGeneral.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA (21%)</span>
                <span className="font-mono text-gray-900">
                  ${remito.iva.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total General</span>
                <span className="font-mono text-gray-900">
                  ${remito.totalGeneral.toLocaleString('es-AR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-gray-50/50">
            {remito.observaciones && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Observaciones
                </p>
                <p className="text-sm text-gray-700">
                  {remito.observaciones}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Estado</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    remito.estado === 'Pendiente'
                      ? 'bg-yellow-100 text-yellow-700'
                      : remito.estado === 'Entregado'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {remito.estado}
                </span>
              </div>
              <div className="text-center">
                <div className="border-t-2 border-gray-300 w-48 pt-2">
                  <p className="text-xs text-gray-400">Firma y Acuse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
