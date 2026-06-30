import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ADMINISTRACION de FALPAT SRL',
  description: 'Sistema de gestión - REMITOS y PRESUPUESTOS',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen`}>
        <ErrorBoundary>
          <div className="relative z-10">
            {children}
          </div>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(18, 18, 42, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(108, 60, 225, 0.2)',
              color: '#F0F0F5',
              borderRadius: '12px',
            },
            duration: 3000,
          }}
        />
      </body>
    </html>
  )
}
