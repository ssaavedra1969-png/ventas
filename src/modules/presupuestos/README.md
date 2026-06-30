# Módulo: Presupuestos

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `presupuestos` |
| **Contador** | `contadores/presupuesto_{year}` |
| **Ubicación** | `src/modules/presupuestos/` |
| **API pública** | `src/modules/presupuestos/index.ts` |

## Dependencias

| Dependencia | Tipo | ¿Por qué? |
|-------------|------|-----------|
| `shared/firebase.ts` | Infraestructura | Instancia de Firestore |
| `shared/db.ts` | Infraestructura | IndexedDB fallback |
| `modules/configuracion/service.ts` | **Lectura** | `getTipoFactura()` para IVA |
| Ningún otro módulo | — | No depende de clientes, productos, etc. (recibe datos como parámetros) |

## ¿Quién depende de Presupuestos?

| Módulo/Página | ¿Qué usa? |
|--------------|-----------|
| `modules/remitos-aprobados/service.ts` | Crea remito_aprobado desde un presupuesto |
| `app/dashboard/remitos/nuevo/page.tsx` | `createPresupuesto()` al generar nuevo presupuesto |
| `app/dashboard/remitos/page.tsx` | `getAllPresupuestos()`, `updatePresupuestoEstado()` |

## Pipeline: Ciclo de vida del presupuesto

```
Estado: "Enviado"
    ↓  Usuario hace clic en "Aceptar" (en página remitos)
    ↓  1. createRemitoFromPresupuesto(presupuesto)
    ↓  2. updatePresupuestoEstado(id, "Aprobado")
Estado: "Aprobado"  ← oculto de listados (filtro solo muestra Enviado/Anulado)
    ↓
Estado: "Anulado"   ← si el usuario cancela
```

## API Pública

### `createPresupuesto(data: CreatePresupuestoInput): Promise<Presupuesto>`
- **Proceso:**
  1. `runTransaction` → contador `presupuesto_{year}` → obtiene `numeroPresupuesto`
  2. Calcula `tipoFactura` via `getTipoFactura(cliente.condicionIVA)`
  3. Calcula IVA según tipo de factura
  4. `addDoc` a Firebase `presupuestos/`
  5. `localSet` a IndexedDB
- **Estado inicial:** `'Enviado'`
- **Si contador falla:** Lanza error (no crea presupuesto sin número)

### `getAllPresupuestos(): Promise<Presupuesto[]>`
- **Origen:** Firebase query ordenado por `numeroPresupuesto` desc
- **Fallback:** IndexedDB store `presupuestos_cache`

### `getPresupuesto(id: string): Promise<Presupuesto | null>`
- **Origen:** Firebase `presupuestos/{id}`
- **Fallback:** IndexedDB

### `updatePresupuestoEstado(id: string, estado: 'Aprobado' | 'Anulado'): Promise<void>`
- **Proceso:** `updateDoc` a Firebase → `localSet` a IndexedDB
- **No permite:** Volver a `'Enviado'` una vez aprobado o anulado

### `deletePresupuesto(id: string): Promise<void>`
- **Proceso:** `deleteDoc` Firebase → `localDelete` IndexedDB
- **Advertencia:** No usar si ya tiene remito_aprobado vinculado

## Tipos (`types.ts`)

```ts
interface Presupuesto {
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
```

## Diagnóstico rápido

| Síntoma | Causa probable | Dónde mirar |
|---------|---------------|-------------|
| `Error al crear presupuesto` | Firebase quota + contador falló | `service.ts` → createPresupuesto (línea ~40) |
| `Error de numeración` | Contador `presupuesto_2026` no existe o corrupto | Firestore Console: `contadores/presupuesto_2026` |
| `IVA incorrecto` | `getTipoFactura()` recibe condición IVA inesperada | `modules/configuracion/service.ts` |
| `Presupuesto no aparece en lista` | Filtro solo muestra `'Enviado'` / `'Anulado'` | Verificar `estado` del documento en Firestore |
| `Error al aprobar` | `createRemitoFromPresupuesto()` falló | `modules/remitos-aprobados/service.ts` |

## Firebase Console — Consultas útiles

```js
// Ver todos los presupuestos del año
db.collection("presupuestos").orderBy("numeroPresupuesto", "desc").limit(20).get()

// Ver contador actual
db.doc("contadores/presupuesto_2026").get()

// Ver presupuestos por estado
db.collection("presupuestos").where("estado", "==", "Enviado").get()
```
