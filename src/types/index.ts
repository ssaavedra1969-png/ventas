export interface Cliente {
  id?: string
  cuit: string
  razonSocial: string
  direccion: string
  telefono: string
  tipoFactura: string
  createdAt?: Date
}

export interface Producto {
  id?: string
  nombre: string
  tipo: string
  medida: string
  valorUnitario: number
  stock?: number
  createdAt?: Date
}

export interface Vendedor {
  id?: string
  codigo: string
  nombre: string
  activo?: boolean
  createdAt?: Date
}

export interface RemitoItem {
  idProducto: string
  nombreProducto: string
  cantidad: number
  precioUnitario: number
  bonificacion?: number
  subtotal: number
}

export interface Remito {
  id?: string
  numeroRemito: number
  fecha: Date
  idCliente: string
  clienteData: {
    cuit: string
    razonSocial: string
    direccion: string
    telefono: string
    tipoFactura: string
  }
  vendedor?: {
    codigo: string
    nombre: string
  }
  items: RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
  estado: 'Pendiente' | 'Entregado' | 'Anulado'
  usuarioCreador?: string
  createdAt?: Date
  observaciones?: string
}

export interface DashboardStats {
  remitosMes: number
  totalFacturado: number
  ultimosRemitos: Remito[]
  clientesActivos: number
}

export interface EmpresaConfig {
  razonSocial: string
  cuit: string
  direccion: string
  telefono: string
  email: string
}
