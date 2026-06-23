import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

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
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#12122A',
              border: '1px solid rgba(255,255,255,0.05)',
              color: '#F0F0F5',
            },
          }}
        />
      </body>
    </html>
  )
}
