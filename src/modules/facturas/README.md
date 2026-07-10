# Módulo: Facturas

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `facturas` |
| **Contador** | `contadores/factura_{year}` |
| **Ubicación** | `src/modules/facturas/` |
| **API pública** | `src/modules/facturas/index.ts` |

## Dependencias

| Dependencia | Tipo |
|-------------|------|
| `shared/firebase.ts` | Infraestructura |
| `shared/db.ts` | Infraestructura |
| Ningún otro módulo | — |

## ¿Quién depende de Facturas?

| Módulo/Página | ¿Qué usa? |
|--------------|-----------|
| `app/dashboard/remitos/page.tsx` | `createFactura()` al registrar factura |
| `app/dashboard/facturacion/page.tsx` | `getAllFacturas()`, `agregarPagoFactura()`, `eliminarPagoFactura()` |
| `app/dashboard/informes/page.tsx` | Estadísticas de facturación |

## API Pública

### `createFactura(data: CreateFacturaInput): Promise<Factura>`
- **Proceso:**
  1. `runTransaction` → contador `factura_{year}` → obtiene `numeroFacturaInterno`
  2. `addDoc` a Firebase `facturas/`
  3. `localSet` a IndexedDB
- **Campos:** `numeroFactura` (externo, ej: "0001-00001234"), `numeroFacturaInterno` (auto), `idRemito`, `numeroRemito`, datos del cliente, items, financiero
- **Estado inicial:** `pagos: []`, `totalPagado: 0`

### `getAllFacturas(): Promise<Factura[]>`
- **Origen:** Firebase query ordenado por `numeroFacturaInterno` desc
- **Fallback:** IndexedDB `facturas_cache`

### `getFactura(id: string): Promise<Factura | null>`
- **Origen:** Firebase `facturas/{id}`
- **Fallback:** IndexedDB

### `agregarPagoFactura(facturaId: string, pago: PagoInput): Promise<Pago>`
- **Proceso:** `getDoc` → agrega pago al array `pagos` → recalcula `totalPagado` → `updateDoc`
- **Validación:** Monto mayor a 0
- **Genera:** ID único con timestamp + random

### `eliminarPagoFactura(facturaId: string, pagoId: string): Promise<void>`
- **Proceso:** `getDoc` → filtra pago del array `pagos` → recalcula `totalPagado` → `updateDoc`

## Tipos (`types.ts`)

```ts
interface Factura {
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
```

## Diagnóstico rápido

| Síntoma | Causa | Dónde mirar |
|---------|-------|-------------|
| `Error al crear factura` | Contador `factura_{year}` no existe | Firestore Console: `contadores/factura_2026` |
| `Factura creada sin número interno` | Transaction falló parcialmente | Verificar documento en Firestore |
| `La factura no se vincula al remito` | `idRemito` no coincide | Comparar IDs en Firestore Console |
| `Error silencioso` | `createFactura()` tiene `.catch(() => {})` en página remitos | Revisar logs de página remitos |
| `Error al agregar pago a factura` | `agregarPagoFactura()` falló | Verificar que la factura existe en Firestore |
| `Pago no aparece en factura` | `updateDoc` no se ejecutó | Revisar consola del navegador |
