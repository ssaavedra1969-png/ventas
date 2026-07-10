# Módulo: Remitos Aprobados

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `remitos_aprobados` |
| **Contador** | `contadores/remito_aprobado_{year}` |
| **Ubicación** | `src/modules/remitos-aprobados/` |
| **API pública** | `src/modules/remitos-aprobados/index.ts` |

## Dependencias

| Dependencia | Tipo | ¿Por qué? |
|-------------|------|-----------|
| `shared/firebase.ts` | Infraestructura | Instancia de Firestore |
| `shared/db.ts` | Infraestructura | IndexedDB fallback |
| **NO depende de presupuestos** | — | Recibe datos de presupuesto como parámetro directo |

**Nota:** Aunque `createRemitoFromPresupuesto()` toma datos de un presupuesto, el módulo no importa `modules/presupuestos/` — recibe un objeto plano. La dependencia es **en la página** (`remitos/page.tsx`), no en el módulo.

## ¿Quién depende de RemitosAprobados?

| Módulo/Página | ¿Qué usa? |
|--------------|-----------|
| `modules/facturas/service.ts` | Se vincula vía `idRemito` |
| `modules/salidas/service.ts` | Se vincula vía `idRemito` |
| `app/dashboard/remitos/page.tsx` | `getAllRemitosAprobados()`, `createRemitoFromPresupuesto()` |
| `app/dashboard/informes/page.tsx` | Estadísticas de remitos |

## Pipeline: Ciclo de vida

```
Presupuesto "Aprobado"
    ↓  createRemitoFromPresupuesto(presupuesto)
RemitoAprobado "En_Revision"
    ↓  (cambio a A_Entregar desde página remitos)
RemitoAprobado "A_Entregar"
    ↓  createFactura()
Factura
    ↓  createSalida()
Salida
```

## API Pública

### `createRemitoFromPresupuesto(data: CreateRemitoInput): Promise<RemitoAprobado>`
- **Parámetro:** Objeto plano con datos del presupuesto (no importa el tipo Presupuesto)
- **Proceso:**
  1. `runTransaction` → contador `remito_aprobado_{year}`
  2. `addDoc` a Firebase `remitos_aprobados/`
  3. `localSet` a IndexedDB
- **Estado inicial:** `'En_Revision'`
- **Campos copiados:** clienteData, items, subtotalGeneral, iva, totalGeneral, observaciones
- **Campos nuevos:** `numeroRemito`, `numeroPresupuestoOriginal` (link al presupuesto origen)

### `getAllRemitosAprobados(): Promise<RemitoAprobado[]>`
- **Origen:** Firebase query ordenado por `numeroRemito` desc
- **Fallback:** IndexedDB `remitos_aprobados_cache`

### `getRemitoAprobado(id: string): Promise<RemitoAprobado | null>`
- **Origen:** Firebase `remitos_aprobados/{id}`
- **Fallback:** IndexedDB

### `updateRemitoAprobadoEstado(id: string, estado: string): Promise<void>`
- **Estados válidos:** `'En_Revision'`, `'A_Entregar'`, `'Finalizado'`, `'Anulado'`
- **Proceso:** `updateDoc` Firebase → `localSet` IndexedDB

### `updateRemitoAprobadoFacturacion(id: string, nroFactura: string): Promise<void>`
- **Proceso:** `updateDoc` Firebase con `nroFactura`, `facturado: true`, `fechaFacturado`, `estado: 'Finalizado'` → `localSet` IndexedDB
- **Uso:** Se llama al facturar un remito_aprobado desde la UI de Remitos

## Tipos (`types.ts`)

```ts
interface RemitoAprobado {
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
  nroFactura?: string
  facturado?: boolean
  fechaFacturado?: Date
  createdAt?: Date
}
```

## Diagnóstico rápido

| Síntoma | Causa probable | Dónde mirar |
|---------|---------------|-------------|
| `Error al generar remito` | Contador `remito_aprobado_{year}` no existe | Firestore Console: `contadores/remito_aprobado_2026` |
| `El remito no aparece` | Filtro de página solo muestra ciertos estados | Verificar `estado` del documento |
| `numeroPresupuestoOriginal incorrecto` | Presupuesto no pasó correctamente | Ver `createRemitoFromPresupuesto()` en página |
| `Error al aprobar presupuesto` | `createRemitoFromPresupuesto()` OK pero `updatePresupuestoEstado()` falló | Revisar logs de la página remitos |
