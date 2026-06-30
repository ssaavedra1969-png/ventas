export {
  getClientes,
  getAllClientes,
  getCliente,
  createCliente,
  updateCliente,
  deleteCliente,
  clienteExists,
  createMultipleClientes,
} from './service'
export { clearCache } from '@/lib/cache'
export type { Cliente } from './types'
export { CONDICIONES_IVA, CONDIVA_LABEL, condicaToLabel } from './types'
