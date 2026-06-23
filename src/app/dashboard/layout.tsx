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
  Sun,
  Moon,
  Settings,
} from 'lucide-react'
import { useState } from 'react'

const navigation = [
  {
    section: 'PRINCIPAL',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'GESTIÓN',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { href: '/dashboard/productos', label: 'Productos', icon: Package },
    ],
  },
  {
    section: 'REMITOS',
    items: [
      { href: '/dashboard/remitos/nuevo', label: 'Nuevo Remito', icon: PlusCircle },
      { href: '/dashboard/remitos', label: 'Listado', icon: FileText },
    ],
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A1A]">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0A0A1A]/95 border-r border-white/5 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6">
          <Link href="/dashboard">
            <div className="flex items-center gap-3 mb-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#6C3CE1]/20">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg leading-tight text-white">
                  FALPAT SRL
                </h2>
                <p className="text-xs text-[#6B6B8A]">Administración</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="h-[1px] w-full bg-white/5" />

        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {navigation.map((section) => (
            <div key={section.section}>
              <p className="text-xs font-semibold text-[#6B6B8A] uppercase tracking-wider px-3 mb-2">
                {section.section}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'text-white bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                            : 'text-[#B0B0D0] hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link href="/dashboard/configuracion">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer text-[#B0B0D0] hover:text-white hover:bg-white/5">
              <Settings className="h-4 w-4 shrink-0" />
              Configuración
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-white/5 bg-[#0A0A1A]/80 backdrop-blur-xl px-4 sm:px-6">
          <button
            className="md:hidden inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 text-white hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <Link href="/dashboard">
              <button
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-[#6B6B8A] hover:text-white hover:bg-white/5"
                title="Volver al menú principal"
              >
                <LayoutDashboard className="h-4 w-4" />
              </button>
            </Link>
            <div className="w-7 h-7 bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] rounded-lg flex items-center justify-center shadow-lg shadow-[#6C3CE1]/20">
              <LayoutDashboard className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">FALPAT SRL</span>
          </div>

          <div className="flex-1" />

          <button
            className="inline-flex items-center justify-center rounded-md h-9 w-9 text-[#B0B0D0] hover:text-white hover:bg-white/10"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
