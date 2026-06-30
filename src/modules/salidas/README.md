# Módulo: Salidas

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `salidas` |
| **Contador** | **No usa contador** — cuenta salidas existentes por remito (query `max + 1`) |
| **Ubicación** | `src/modules/salidas/` |
| **API pública** | `src/modules/salidas/index.ts` |

## Dependencias

| Dependencia | Tipo |
|-------------|------|
| `shared/firebase.ts` | Infraestructura |
| `shared/db.ts` | Infraestructura |
| Ningún otro módulo | — |

## ¿Quién depende de Salidas?

| Módulo/Página | ¿Qué usa? |
|--------------|-----------|
| `app/dashboard/entregas/page.tsx` | `createSalida()`, `getAllSalidas()`, `getSalida()`, `deleteSalida()` |
| `app/dashboard/entregas/salida/[remitoId]/[entregaId]/page.tsx` | `getSalida()` (vista impresión) |
| `app/dashboard/informes/page.tsx` | Estadísticas de salidas/entregas |

## API Pública

### `createSalida(data: CreateSalidaInput): Promise<Salida>`
- **Proceso:**
  1. Cuenta salidas existentes para el mismo `idRemito` (Firestore query `where('idRemito', '==', id)`)
  2. `numeroSalida = max + 1` (por ej: S-001, S-002)
  3. `addDoc` a Firebase `salidas/`
  4. `localSet` a IndexedDB (con catch silencioso)
- **Nota:** No usa `runTransaction` — el número puede tener huecos si hay concurrencia

### `getAllSalidas(): Promise<Salida[]>`
- **Origen:** Firebase query ordenado por `createdAt` desc
- **Fallback:** IndexedDB `salidas_cache` (solo si Firebase falla)

### `getSalidasByRemito(remitoId: string): Promise<Salida[]>`
- **Origen:** Firebase query `where('idRemito', '==', remitoId)` ordenado por `numeroSalida`

### `getSalida(id: string): Promise<Salida | null>`
- **Origen:** Firebase `salidas/{id}`
- **Fallback:** IndexedDB

### `deleteSalida(id: string): Promise<void>`
- **Proceso:** `deleteDoc` Firebase → `localDelete` IndexedDB

## Tipos (`types.ts`)

```ts
interface Salida {
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
  remitoItems?: RemitoItem[]  // snapshot del remito al momento de la salida
  createdAt?: Date
}
```

## Flujo de datos: Progreso de entregas

La página `entregas/page.tsx` calcula el progreso así:

```
por cada remito:
  entregado = sum(legacy.entregas[].items[].cantidad) + sum(salidas[].items[].cantidad)
  pendiente = remito.items[].cantidad - entregado
```

## Diagnóstico rápido

| Síntoma | Causa | Dónde mirar |
|---------|-------|-------------|
| `Error al crear salida` | Firebase write falló | `service.ts` → createSalida |
| `Número de salida repetido` | Concurrencia (dos usuarios crean salida al mismo tiempo) | Query `where('idRemito', '==', X)` en Console |
| `Salida no aparece en calendario` | Fecha incorrecta o Firebase offline | Verificar `fecha` field en Firestore |
| `Progreso de entrega incorrecto` | `calcEntregado` no suma correctamente | Revisar match por `numeroRemito` |
| `Error al eliminar salida` | Documento ya eliminado o permiso | `service.ts` → deleteSalida |
