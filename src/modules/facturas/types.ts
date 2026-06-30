export type { Factura } from '@/types'

export interface CreateFacturaInput {
  numeroFactura: string
  idRemito: string
  numeroRemito: number
  fecha: Date
  idCliente: string
  clienteData: import('@/types').ClienteData
  items: import('@/types').RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
}
