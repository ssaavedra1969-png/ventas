'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VehiculosRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/parametrias/vehiculos') }, [router])
  return null
}
