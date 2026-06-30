'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ParametriasPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard/parametrias/clientes') }, [router])
  return null
}
