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

export interface EntregaItem {
  idProducto: string
  nombreProducto: string
  cantidad: number
}

export interface Entrega {
  id: string
  fecha: Date
  createdAt: Date
  items: EntregaItem[]
  vehiculoPatente?: string
  vehiculoMarca?: string
  choferNombre?: string
}

export interface Vehiculo {
  id?: string
  patente: string
  marca: string
  createdAt?: Date
}

export interface Chofer {
  id?: string
  nombre: string
  documento?: string
  telefono?: string
  activo?: boolean
  createdAt?: Date
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
  entregas?: Entrega[]
}

export interface DashboardStats {
  remitosMes: number
  totalFacturado: number
  ultimosRemitos: Remito[]
  clientesActivos: number
}

export interface ClienteData {
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

export interface VendedorInfo {
  codigo: string
  nombre: string
}

export interface Presupuesto {
  id?: string
  numeroPresupuesto: number
  fecha: Date
  idCliente: string
  clienteData: ClienteData
  vendedor?: VendedorInfo
  items: RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
  estado: 'Enviado' | 'Aprobado' | 'Anulado'
  observaciones?: string
  createdAt?: Date
}

export interface RemitoAprobado {
  id?: string
  numeroRemito: number
  numeroPresupuestoOriginal: number
  fecha: Date
  idCliente: string
  clienteData: ClienteData
  vendedor?: VendedorInfo
  items: RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
  estado: 'En_Revision' | 'A_Entregar' | 'Finalizado' | 'Anulado'
  observaciones?: string
  usuarioCreador?: string
  createdAt?: Date
}

export interface Factura {
  id?: string
  numeroFactura: string
  numeroFacturaInterno: number
  idRemito: string
  numeroRemito: number
  fecha: Date
  idCliente: string
  clienteData: ClienteData
  items: RemitoItem[]
  subtotalGeneral: number
  iva: number
  totalGeneral: number
  pagos?: Pago[]
  totalPagado?: number
  facturaAnulada?: boolean
  nroNC?: string
  montoNC?: number
  createdAt?: Date
}

export interface Salida {
  id?: string
  numeroSalida: number
  idRemito: string
  numeroRemito: number
  fecha: Date
  items: EntregaItem[]
  vehiculoPatente?: string
  vehiculoMarca?: string
  choferNombre?: string
  clienteData?: {
    razonSocial: string
    tipoDocumento?: string
    numeroDocumento?: string
    condicionIVA?: string
    domicilio?: string
    localidad?: string
    telefono?: string
    codigoCliente?: string
  }
  remitoItems?: RemitoItem[]
  createdAt?: Date
}

export interface EmpresaConfig {
  razonSocial: string
  cuit: string
  direccion: string
  telefono: string
  email: string
  telefonoAdmin?: string
}
