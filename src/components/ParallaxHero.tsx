'use client'

import { useRef, useMemo } from 'react'
import { useScroll, useTransform, motion } from 'framer-motion'
import { Building2 } from 'lucide-react'

function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        duration: Math.random() * 10 + 10,
        delay: Math.random() * 5,
      })),
    []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: 0.08,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, p.id % 2 === 0 ? 15 : -15, 0],
            opacity: [0.08, 0.2, 0.08],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function GlowOrbs() {
  return (
    <>
      <motion.div
        className="absolute top-1/4 -left-20 w-72 h-72 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(108,60,225,0.15) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </>
  )
}

interface Props {
  remitosMes?: number
  clientesActivos?: number
  totalFacturado?: number
}

export default function ParallaxHero({ remitosMes, clientesActivos, totalFacturado }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const bgY = useTransform(scrollYProgress, [0, 1], [0, 40])
  const cardOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])
  const cardY = useTransform(scrollYProgress, [0, 0.6], [0, -40])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.4, 0.8], [0.45, 0.3, 0.6])

  return (
    <div
      ref={sectionRef}
      className="relative min-h-[360px] overflow-hidden rounded-2xl mb-8"
    >
      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0"
        style={{ y: bgY }}
      >
        <div
          className="w-full h-[110%] bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260430_115327_3f256636-9e63-4885-8d0b-09317dc2b0a5.png&w=1280&q=85)',
          }}
        />
      </motion.div>

      {/* Overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,26,0.3) 0%, rgba(10,10,26,0.6) 50%, rgba(10,10,26,0.9) 100%)',
          opacity: overlayOpacity,
        }}
      />

      {/* Glow Orbs */}
      <GlowOrbs />

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Foreground Card */}
      <motion.div
        className="absolute inset-x-0 top-0 w-full z-30 pt-8 sm:pt-16 px-4"
        style={{ opacity: cardOpacity, y: cardY }}
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="backdrop-blur-2xl rounded-2xl sm:rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(12,12,30,0.88) 0%, rgba(16,16,38,0.82) 100%)',
              border: '1px solid rgba(108,60,225,0.15)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(108,60,225,0.05) inset',
            }}
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Main Content */}
            <div className="p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Logo */}
                <motion.div
                  className="flex items-center gap-3 shrink-0"
                  whileHover={{ scale: 1.02 }}
                >
                  <motion.div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)',
                    }}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      GRUPO FALPAT SRL
                    </h1>
                    <p className="text-xs sm:text-sm text-white/75 tracking-wider uppercase">
                      Administración
                    </p>
                  </div>
                </motion.div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-4 sm:gap-6 ml-auto">
                  {[
                    { label: 'Remitos del Mes', value: remitosMes ?? 0 },
                    { label: 'Clientes Activos', value: clientesActivos ?? 0 },
                    { label: 'Total Facturado', value: totalFacturado !== undefined ? `$${totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '$0.00' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      className="text-center"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                    >
                      <p className="text-[10px] text-white/60 uppercase tracking-[0.15em]">
                        {stat.label}
                      </p>
                      <p className="text-sm font-semibold text-white/95 font-mono">
                        {stat.value}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Tagline */}
              <motion.div
                className="mt-6 pt-6 border-t border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center gap-3">
                  <p className="text-sm text-white/70 tracking-wide">
                    Panel de Administración
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Bottom Bar */}
            <div className="px-6 sm:px-10 py-3 border-t border-white/5" style={{ background: 'rgba(8,8,22,0.5)' }}>
              <p className="text-[10px] text-white/50 tracking-wider">
                Sistema de Gestión Integral
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
