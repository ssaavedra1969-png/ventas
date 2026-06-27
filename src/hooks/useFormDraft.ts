'use client'

import { useEffect, useRef, useCallback } from 'react'
import { localGetMeta, localSetMeta } from '@/lib/db'

const DRAFT_KEY = 'remito_draft'
const DEBOUNCE_MS = 500

interface FormDraft {
  step: number
  selectedClienteId?: string
  selectedVendedorCodigo?: string
  items: unknown[]
  productSearch: string
  selectedProductoId?: string
  precioUnitario: number
  cantidad: number
  bonificacionValue: number
  editItemIndex: number | null
  observaciones: string
  savedAt: number
}

export function useFormDraft<T extends Record<string, unknown>>(
  formState: T,
  isReady: boolean,
  onRestore: (draft: FormDraft) => void
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredRef = useRef(false)

  useEffect(() => {
    if (restoredRef.current || !isReady) return
    restoredRef.current = true
    localGetMeta(DRAFT_KEY).then((raw) => {
      if (!raw) return
      const draft = raw as FormDraft
      const age = Date.now() - draft.savedAt
      if (age > 24 * 60 * 60 * 1000) return
      onRestore(draft)
    })
  }, [isReady, onRestore])

  const save = useCallback(() => {
    const draft: FormDraft = {
      step: formState.step as number,
      items: formState.items as unknown[],
      productSearch: formState.productSearch as string,
      selectedProductoId: formState.selectedProductoId as string | undefined,
      precioUnitario: formState.precioUnitario as number,
      cantidad: formState.cantidad as number,
      bonificacionValue: formState.bonificacionValue as number,
      editItemIndex: formState.editItemIndex as number | null,
      observaciones: formState.observaciones as string,
      selectedClienteId: formState.selectedClienteId as string | undefined,
      selectedVendedorCodigo: formState.selectedVendedorCodigo as string | undefined,
      savedAt: Date.now(),
    }
    localSetMeta(DRAFT_KEY, draft)
  }, [formState])

  useEffect(() => {
    if (!isReady) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, DEBOUNCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [save, isReady])

  const clearDraft = useCallback(async () => {
    await localSetMeta(DRAFT_KEY, null)
  }, [])

  return { clearDraft }
}
