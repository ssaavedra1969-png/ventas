export type { Salida } from '@/types'

export interface CreateSalidaInput {
  idRemito: string
  numeroRemito: number
  fecha: Date
  items: import('@/types').EntregaItem[]
  vehiculoPatente?: string
  vehiculoMarca?: string
  choferNombre?: string
  clienteData?: import('@/types').ClienteData
  remitoItems?: import('@/types').RemitoItem[]
}
