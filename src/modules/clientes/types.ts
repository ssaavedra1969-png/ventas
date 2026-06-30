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

export const CONDICIONES_IVA = ['CF', 'Exento', 'RI', 'Monotributo']

export const CONDIVA_LABEL: Record<string, string> = {
  CF: 'Consumidor Final (CF) - Factura B',
  Exento: 'Exento de IVA - Factura B',
  RI: 'Responsable Inscripto (con IVA) - Factura A',
  Monotributo: 'Monotributista (con IVA) - Factura A',
}

export function condicaToLabel(v: string): string {
  return CONDIVA_LABEL[v] || v
}
