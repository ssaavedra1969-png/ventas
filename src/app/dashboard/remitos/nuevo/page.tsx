'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OldNuevoRemitoRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/presupuestos/nuevo')
  }, [router])

  return null
}
