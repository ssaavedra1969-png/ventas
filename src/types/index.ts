export interface Cliente {
  id?: string
  codigoCliente: string
  razonSocial: string
  tipoDocumento: string
  numeroDocumento: string
  actividad: string
  telefono: string
  domicilio: string
  localidad: string
  condicionIVA: string
  createdAt?: Date
}

export interface Producto {
  id?: string
  codigoProducto: string
  nombre: string
  tipo: string
  medida: string
  valorUnitario: number
  precioSinIVA: number
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

export interface Pago {
  id: string
  monto: number
  metodo: 'Efectivo' | 'Transferencia' | 'Cheque' | 'Debito' | 'Credito'
  referencia?: string
  fecha: Date
  createdAt: Date
}

export interface Remito {
  id?: string
  numeroRemito: number
  fecha: Date
  idCliente: string
  clienteData: {
    codigoCliente: string
    razonSocial: string
    tipoDocumento: string
    numeroDocumento: string
    actividad: string
    telefono: string
    domicilio: string
    localidad: string
    condicionIVA: string
  }
  vendedor?: {
    codigo: string
    nombre: string
  }
  items: RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
  estado: 'Enviado' | 'Aceptado' | 'Anulado' | 'En_Revision' | 'A_Entregar'
  usuarioCreador?: string
  createdAt?: Date
  observaciones?: string
  nroFactura?: string
  facturado?: boolean
  fechaFacturado?: Date
  facturaAnulada?: boolean
  nroNC?: string
  montoNC?: number
  pagos?: Pago[]
  totalPagado?: number
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
  telefonoAdmin?: string
}
