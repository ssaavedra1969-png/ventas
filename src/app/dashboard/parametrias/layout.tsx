'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Package, UserCheck, Truck, SlidersHorizontal } from 'lucide-react'

const tabs = [
  { href: '/dashboard/parametrias/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/parametrias/productos', label: 'Productos', icon: Package },
  { href: '/dashboard/parametrias/vendedores', label: 'Vendedores', icon: UserCheck },
  { href: '/dashboard/parametrias/vehiculos', label: 'Vehículos', icon: Truck },
]

export default function ParametriasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-slate-400 to-zinc-400 shadow-lg">
          <SlidersHorizontal className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Parametrías</h1>
          <p className="text-[#B0B0D0] text-sm">Datos maestros del sistema</p>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-xl bg-[#12122A] border border-white/5 w-fit">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#6C3CE1]/20 to-[#00D4FF]/10 text-white border border-[#6C3CE1]/30 shadow-sm'
                  : 'text-[#B0B0D0] hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}
