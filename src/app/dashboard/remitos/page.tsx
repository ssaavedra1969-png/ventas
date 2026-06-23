'use client'

import { useEffect, useState, useCallback } from 'react'
import { getRemitos, updateRemitoEstado } from '@/lib/firestore'
import type { Remito } from '@/types'
import {
  FileText,
  Search,
  Loader2,
  ChevronRight,
  AlertTriangle,
  Filter,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

export default function RemitosPage() {
  const [remitos, setRemitos] = useState<Remito[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState('')
  const [anularConfirm, setAnularConfirm] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const loadRemitos = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (filtroCliente) filters.cliente = filtroCliente
      if (filtroEstado !== 'todos') filters.estado = filtroEstado

      const data = await getRemitos(filters)
      setRemitos(data)
    } catch {
      toast.error('Error al cargar remitos')
    } finally {
      setLoading(false)
    }
  }, [filtroCliente, filtroEstado])

  useEffect(() => {
    loadRemitos()
  }, [loadRemitos])

  const handleCambiarEstado = async (
    id: string,
    estado: 'Entregado' | 'Anulado'
  ) => {
    setUpdating(id)
    try {
      await updateRemitoEstado(id, estado)
      toast.success(
        estado === 'Entregado'
          ? 'Remito marcado como entregado'
          : 'Remito anulado'
      )
      setAnularConfirm(null)
      loadRemitos()
    } catch {
      toast.error('Error al actualizar el estado')
    } finally {
      setUpdating(null)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'Entregado':
        return 'bg-green-500/20 text-green-400'
      case 'Anulado':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-white/5 text-[#B0B0D0]'
    }
  }

  const getTotalPorEstado = (estado: string) =>
    remitos
      .filter((r) => estado === 'todos' || r.estado === estado)
      .reduce((sum, r) => sum + r.totalGeneral, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-[#6C3CE1]" />
        <div>
          <h1 className="text-2xl font-bold text-white">Remitos</h1>
          <p className="text-[#B0B0D0] text-sm">
            Listado de remitos
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-[#6B6B8A]" />
          <span className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider">
            Filtros
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B8A]" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white placeholder-[#6B6B8A] text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
            />
          </div>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Entregado">Entregado</option>
            <option value="Anulado">Anulado</option>
          </select>

          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0A0A1A] border border-white/5 text-white text-sm focus:outline-none focus:border-[#6C3CE1]/50 transition-colors"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Todos', count: remitos.length, total: getTotalPorEstado('todos'), color: 'text-white' },
          { label: 'Pendientes', count: remitos.filter((r) => r.estado === 'Pendiente').length, total: getTotalPorEstado('Pendiente'), color: 'text-yellow-400' },
          { label: 'Entregados', count: remitos.filter((r) => r.estado === 'Entregado').length, total: getTotalPorEstado('Entregado'), color: 'text-green-400' },
          { label: 'Anulados', count: remitos.filter((r) => r.estado === 'Anulado').length, total: getTotalPorEstado('Anulado'), color: 'text-red-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
            <p className="text-xs text-[#6B6B8A]">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.count}</p>
            <p className={`text-xs font-mono ${stat.color}`}>
              ${stat.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
          </div>
        ) : remitos.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-10 w-10 text-[#6B6B8A] mx-auto mb-3" />
            <p className="text-[#6B6B8A]">No se encontraron remitos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    N° Remito
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Fecha
                  </th>
                  <th className="text-left text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Cliente
                  </th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                    Total
                  </th>
                  <th className="text-center text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Estado
                  </th>
                  <th className="text-right text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-4 py-3">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {remitos.map((remito) => (
                  <tr
                    key={remito.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/remitos/${remito.id}`}>
                        <span className="text-sm font-bold text-white hover:text-[#6C3CE1] transition-colors">
                          #{String(remito.numeroRemito).padStart(6, '0')}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#B0B0D0]">
                      {format(remito.fecha, 'dd/MM/yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {remito.clienteData.razonSocial}
                    </td>
                    <td className="px-4 py-3 text-sm text-white text-right font-mono hidden sm:table-cell">
                      ${remito.totalGeneral.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(remito.estado)}`}
                      >
                        {remito.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {remito.estado === 'Pendiente' && (
                          <>
                            <button
                              onClick={() =>
                                handleCambiarEstado(remito.id!, 'Entregado')
                              }
                              disabled={updating === remito.id}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                              {updating === remito.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Entregar'
                              )}
                            </button>
                            <button
                              onClick={() =>
                                setAnularConfirm(remito.id ?? null)
                              }
                              disabled={updating === remito.id}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              Anular
                            </button>
                          </>
                        )}
                        <Link href={`/remitos/${remito.id}`}>
                          <ChevronRight className="h-4 w-4 text-[#6B6B8A] hover:text-white transition-colors" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Anular Confirmation */}
      {anularConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAnularConfirm(null)}
          />
          <div className="relative w-full max-w-sm glass-card rounded-2xl p-6 animate-fadeInUp text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">
              ¿Anular Remito?
            </h2>
            <p className="text-sm text-[#B0B0D0] mb-6">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAnularConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/5 text-[#B0B0D0] hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() =>
                  handleCambiarEstado(anularConfirm, 'Anulado')
                }
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium transition-colors"
              >
                Anular Remito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
