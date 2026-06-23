'use client'

import { useEffect, useState } from 'react'
import { getDashboardStats } from '@/lib/firestore'
import type { Remito } from '@/types'
import {
  FileText,
  DollarSign,
  Users,
  ArrowRight,
  TrendingUp,
  Receipt,
  Building2,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import TiltCard from '@/components/TiltCard'
import AnimatedCounter from '@/components/AnimatedCounter'
import ParallaxHero from '@/components/ParallaxHero'
import FreedomSection from '@/components/FreedomSection'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemAnim = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

const cardColors = [
  { from: '#6C3CE1', to: '#00D4FF', label: 'from-[#6C3CE1] to-[#00D4FF]' },
  { from: '#00D4FF', to: '#00FF88', label: 'from-[#00D4FF] to-[#00FF88]' },
  { from: '#FF6B6B', to: '#FFB347', label: 'from-[#FF6B6B] to-[#FFB347]' },
]

function Sparkline({ color }: { color: string }) {
  const points = Array.from({ length: 20 }, () => Math.random() * 30 + 10)
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const w = 80
  const h = 24
  const path = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * h}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6 opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={path}
      />
    </svg>
  )
}

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
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Building2 className="h-10 w-10 text-[#6C3CE1]" />
          </motion.div>
          <p className="text-sm text-[#6B6B8A]">Cargando panel...</p>
        </div>
      </div>
    )
  }

  const cards = [
    {
      title: 'Remitos del Mes',
      value: stats?.remitosMes ?? 0,
      icon: FileText,
      color: cardColors[0],
      decimals: 0,
      suffix: '',
    },
    {
      title: 'Total Facturado',
      value: stats?.totalFacturado ?? 0,
      icon: DollarSign,
      color: cardColors[1],
      decimals: 2,
      suffix: '',
    },
    {
      title: 'Clientes Activos',
      value: stats?.clientesActivos ?? 0,
      icon: Users,
      color: cardColors[2],
      decimals: 0,
      suffix: '',
    },
  ]

  return (
    <motion.div
      className="space-y-8"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Parallax Hero */}
      <ParallaxHero />

      {/* Hero Section */}
      <motion.div variants={itemAnim}>
        <div className="relative overflow-hidden rounded-2xl p-8 glass-card">
          <div className="absolute inset-0 bg-grid opacity-30" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#6C3CE1]/8 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#00D4FF]/5 rounded-full blur-[150px]" />
          <div className="relative z-10">
            <motion.div
              className="flex items-center gap-2 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] uppercase rounded-full border border-[#6C3CE1]/30 bg-[#6C3CE1]/10 text-[#6C3CE1] animate-pulse-glow">
                <Receipt className="h-3 w-3" />
                FALPAT SRL
              </span>
            </motion.div>
            <motion.h1
              className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Panel de Administración
            </motion.h1>
            <motion.p
              className="text-[#B0B0D0] text-lg max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Gestión de remitos, clientes y productos.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={itemAnim}
      >
        {cards.map((card, i) => (
          <TiltCard key={card.title} maxTilt={10} scale={1.02}>
            <motion.div
              className="rounded-xl p-6 glass-card overflow-hidden relative"
              variants={itemAnim}
            >
              <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
                <card.icon className="w-full h-full" />
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <motion.div
                    className="p-3 rounded-xl relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${card.color.from}20, ${card.color.to}10)`,
                    }}
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <card.icon
                      className="h-6 w-6"
                      style={{ color: card.color.from }}
                    />
                  </motion.div>
                  <motion.div
                    className="h-1 w-16 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${card.color.from}, ${card.color.to})`,
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                  />
                </div>
                <p className="text-[#B0B0D0] text-sm mb-1">{card.title}</p>
                <div className="flex items-end gap-2">
                  <motion.h3
                    className="text-3xl font-bold text-white font-mono"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    {card.title === 'Total Facturado' ? (
                      <>
                        ${(stats?.totalFacturado ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </>
                    ) : (
                      <AnimatedCounter
                        value={card.value}
                        decimals={card.decimals}
                        suffix={card.suffix}
                      />
                    )}
                  </motion.h3>
                  <motion.div
                    className="flex items-center gap-1 text-xs mb-1"
                    style={{ color: card.color.to }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                  >
                    <TrendingUp className="h-3 w-3" />
                    <span>+12%</span>
                  </motion.div>
                </div>
                <div className="mt-3">
                  <Sparkline color={card.color.from} />
                </div>
              </div>
            </motion.div>
          </TiltCard>
        ))}
      </motion.div>

      {/* Últimos Remitos */}
      <motion.div
        className="rounded-xl p-6 glass-card"
        variants={itemAnim}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#6C3CE1]" />
            Últimos Remitos
          </h2>
          <Link href="/dashboard/remitos">
            <motion.span
              className="text-sm text-[#6C3CE1] hover:text-[#00D4FF] transition-colors inline-flex items-center gap-1 cursor-pointer"
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </motion.span>
          </Link>
        </div>

        {stats?.ultimosRemitos.length === 0 ? (
          <motion.p
            className="text-[#6B6B8A] text-center py-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            No hay remitos todavía.
          </motion.p>
        ) : (
          <div className="space-y-2">
            {stats?.ultimosRemitos.map((remito, i) => (
              <motion.div
                key={remito.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
              >
                <Link href={`/remitos/${remito.id}`}>
                  <motion.div
                    className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer border border-white/5 hover:border-[#6C3CE1]/20"
                    whileHover={{ x: 4, backgroundColor: 'rgba(108,60,225,0.04)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <div className="flex items-center gap-4">
                      <motion.div
                        className="w-16 h-10 rounded-lg flex items-center justify-center text-white font-bold text-[11px] font-mono tracking-wider relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)' }}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        {String(remito.numeroRemito).padStart(6, '0')}
                      </motion.div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {remito.clienteData.razonSocial}
                        </p>
                        <p className="text-xs text-[#6B6B8A]">
                          {format(remito.fecha, "d 'de' MMM 'de' yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white font-mono">
                        ${remito.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
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
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* FreedomSection */}
      <FreedomSection />
    </motion.div>
  )
}
