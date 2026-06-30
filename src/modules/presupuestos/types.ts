export type { Presupuesto } from '@/types'

export interface CreatePresupuestoInput {
  idCliente: string
  clienteData: import('@/types').ClienteData
  vendedor?: import('@/types').VendedorInfo
  items: import('@/types').RemitoItem[]
  fecha?: string
  observaciones?: string
}
