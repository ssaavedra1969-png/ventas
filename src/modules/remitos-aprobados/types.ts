export type { RemitoAprobado } from '@/types'

export interface CreateRemitoInput {
  id: string
  numeroPresupuesto: number
  fecha: Date
  idCliente: string
  clienteData: import('@/types').ClienteData
  vendedor?: import('@/types').VendedorInfo
  items: import('@/types').RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
  observaciones?: string
}
