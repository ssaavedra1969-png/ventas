'use client'

import { useEffect, useState } from 'react'
import { getDashboardStats } from '@/lib/firestore'
import type { Remito } from '@/types'
import {
  FileText,
  DollarSign,
  Users,
  Receipt,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    remitosMes: number
    totalFacturado: number
    clientesActivos: number
    ultimosRemitos: Remito[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C3CE1]" />
      </div>
    )
  }

  const cards = [
    {
      title: 'Remitos del Mes',
      value: stats?.remitosMes ?? 0,
      icon: FileText,
      color: 'from-[#6C3CE1] to-[#00D4FF]',
      bg: 'bg-[#6C3CE1]/10',
    },
    {
      title: 'Total Facturado',
      value: `$${(stats?.totalFacturado ?? 0).toLocaleString('es-AR', {
        minimumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'from-[#00D4FF] to-[#00FF88]',
      bg: 'bg-[#00D4FF]/10',
    },
    {
      title: 'Clientes Activos',
      value: stats?.clientesActivos ?? 0,
      icon: Users,
      color: 'from-[#FF6B6B] to-[#FFB347]',
      bg: 'bg-[#FF6B6B]/10',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl glass-card p-8">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#6C3CE1]/5 rounded-full blur-[150px]" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase rounded-full border border-[#6C3CE1]/30 bg-[#6C3CE1]/10 text-[#6C3CE1] animate-neon-pulse">
              <Receipt className="h-3 w-3" />
              FALPAT SRL
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
            Panel de Administración
          </h1>
          <p className="text-[#B0B0D0] text-lg max-w-xl">
            Gestión de remitos, clientes y productos.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className={`glass-card rounded-xl p-6 animate-fadeInUp stagger-${i + 1}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.bg}`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div
                className={`h-1 w-16 rounded-full bg-gradient-to-r ${card.color}`}
              />
            </div>
            <p className="text-[#B0B0D0] text-sm mb-1">{card.title}</p>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Últimos Remitos */}
      <div className="glass-card rounded-xl p-6 animate-fadeInUp stagger-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            Últimos Remitos
          </h2>
          <Link href="/dashboard/remitos">
            <span className="text-sm text-[#6C3CE1] hover:text-[#00D4FF] transition-colors inline-flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        </div>

        {stats?.ultimosRemitos.length === 0 ? (
          <p className="text-[#6B6B8A] text-center py-8">
            No hay remitos todavía.
          </p>
        ) : (
          <div className="space-y-3">
            {stats?.ultimosRemitos.map((remito) => (
              <Link
                key={remito.id}
                href={`/remitos/${remito.id}`}
              >
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] flex items-center justify-center text-white font-bold text-sm">
                      {remito.numeroRemito}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {remito.clienteData.razonSocial}
                      </p>
                      <p className="text-xs text-[#6B6B8A]">
                        {format(remito.fecha, "d 'de' MMM 'de' yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                      ${remito.totalGeneral.toLocaleString('es-AR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        remito.estado === 'Pendiente'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : remito.estado === 'Entregado'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {remito.estado}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
