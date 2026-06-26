'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  PlusCircle,
  Menu,
  Settings,
  UserCheck,
  Building2,
  ChevronRight,
  DollarSign,
  Truck,
  BarChart3,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SyncStatus from '@/components/SyncStatus'
import { syncManager } from '@/lib/sync'

const navigation = [
  {
    section: 'PRINCIPAL',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-violet-400 to-indigo-400' },
    ],
  },
  {
    section: 'GESTIÓN',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users, gradient: 'from-blue-400 to-cyan-400' },
      { href: '/dashboard/productos', label: 'Productos', icon: Package, gradient: 'from-amber-400 to-orange-400' },
      { href: '/dashboard/vendedores', label: 'Vendedores', icon: UserCheck, gradient: 'from-emerald-400 to-teal-400' },
      { href: '/dashboard/facturacion', label: 'Facturación', icon: DollarSign, gradient: 'from-green-400 to-emerald-400' },
      { href: '/dashboard/entregas', label: 'Entregas', icon: Truck, gradient: 'from-amber-400 to-yellow-400' },
    ],
  },
  {
    section: 'REMITOS',
    items: [
      { href: '/dashboard/remitos/nuevo', label: 'Nuevo Remito', icon: PlusCircle, gradient: 'from-pink-400 to-rose-400' },
      { href: '/dashboard/remitos', label: 'Listado', icon: FileText, gradient: 'from-sky-400 to-blue-400' },
    ],
  },
  {
    section: 'INFORMES',
    items: [
      { href: '/dashboard/informes', label: 'Informes', icon: BarChart3, gradient: 'from-purple-400 to-violet-400' },
    ],
  },
]

function NavItem({ item, pathname, onClick }: { item: typeof navigation[0]['items'][0]; pathname: string; onClick: () => void }) {
  const isActive = pathname === item.href
  return (
    <Link href={item.href} onClick={onClick} className="block relative">
      <motion.div
        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300 cursor-pointer overflow-hidden ${
          isActive
            ? 'text-white'
            : 'text-[#B0B0D0] hover:text-white'
        }`}
        whileHover={{ x: 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isActive && (
          <motion.div
            layoutId="navBg"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#6C3CE1]/15 to-[#00D4FF]/10 border border-[#6C3CE1]/20"
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <div className="relative z-10 flex items-center gap-3 w-full">
          <motion.div
            className={`p-1.5 rounded-lg relative ${
              isActive
                ? 'bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] shadow-lg shadow-[#6C3CE1]/25'
                : 'bg-white/5'
            }`}
            whileHover={{ scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <item.icon className="h-4 w-4" />
            {isActive && (
              <motion.div
                className="absolute -inset-1 rounded-lg bg-gradient-to-br from-[#6C3CE1]/30 to-[#00D4FF]/30 blur-sm -z-10"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
          <span className="truncate font-medium">{item.label}</span>
          {isActive && (
            <motion.div
              className="ml-auto w-1 h-5 rounded-full bg-gradient-to-b from-[#6C3CE1] to-[#00D4FF]"
              layoutId="activeIndicator"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
        </div>
      </motion.div>
    </Link>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [clock, setClock] = useState('')

  useEffect(() => {
    syncManager.start()

    const update = () => {
      const now = new Date()
      setClock(
        now.toLocaleDateString('es-AR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' - ' +
          now.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
          })
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => {
      clearInterval(id)
      syncManager.stop()
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#060612]">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-white/5 overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      >
        {/* Sidebar Glass Background */}
        <div className="absolute inset-0 bg-[#060612]/95 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#6C3CE1]/5 via-transparent to-[#00D4FF]/3 pointer-events-none" />

        {/* Sidebar Content */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="p-5">
            <Link href="/dashboard">
              <motion.div
                className="flex items-center gap-3 cursor-pointer group"
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)',
                  }}
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <Building2 className="h-5 w-5 text-white relative z-10" />
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
                    animate={{ opacity: [0, 0.3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
                <div>
                  <h2 className="font-bold text-lg leading-tight text-white">
                    FALPAT SRL
                  </h2>
                  <p className="text-[10px] text-[#6B6B8A] tracking-[0.15em] uppercase">
                    Administración
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#6B6B8A] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </Link>
          </div>

          <div className="h-px mx-5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-5 overflow-y-auto overflow-x-hidden">
            {navigation.map((section) => (
              <div key={section.section}>
                <motion.p
                  className="text-[10px] font-semibold text-[#6B6B8A] uppercase tracking-[0.2em] px-3 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  {section.section}
                </motion.p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onClick={() => setSidebarOpen(false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div className="p-3 border-t border-white/5 space-y-1">
            {/* Profile */}
            <motion.div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group"
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] flex items-center justify-center text-xs font-bold text-white">
                  FS
                </div>
                <motion.div
                  className="absolute -inset-0.5 rounded-full border border-[#6C3CE1]/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">FALPAT SRL</p>
                <p className="text-[10px] text-[#6B6B8A] truncate">Administrador</p>
              </div>
            </motion.div>

            {/* Settings */}
            <Link href="/dashboard/configuracion">
              <motion.div
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer text-[#6B6B8A] hover:text-white"
                whileHover={{ x: 4 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Configuración</span>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <motion.header
          className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/5 bg-[#060612]/80 backdrop-blur-xl px-4 sm:px-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 text-white hover:bg-white/10 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/dashboard">
              <motion.button
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-[#6B6B8A] hover:text-white hover:bg-white/5 transition-colors"
                title="Volver al menú principal"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <LayoutDashboard className="h-4 w-4" />
              </motion.button>
            </Link>
            <motion.div
              className="w-7 h-7 rounded-lg flex items-center justify-center shadow-lg relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #6C3CE1, #00D4FF)' }}
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-white" />
              <motion.div
                className="absolute inset-0 bg-white/20"
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            <span className="font-semibold text-sm text-white">FALPAT SRL</span>
          </div>

          <div className="flex-1" />

          <SyncStatus />

          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-xs text-[#6B6B8A]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="w-3 h-3 rounded-full bg-green-400"
              animate={{
                opacity: [1, 0.3, 1],
                backgroundColor: ['#22c55e', '#3b82f6', '#a855f7', '#22c55e'],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            {clock}
          </motion.div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
