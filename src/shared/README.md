# shared/ — Infraestructura Compartida

Este directorio contiene código de infraestructura que NO contiene lógica de negocio. Es el mínimo indispensable para que los módulos funcionen.

## Archivos

| Archivo | Propósito | Dependencias externas |
|---------|-----------|----------------------|
| `firebase.ts` | Inicializa Firebase client SDK (Firestore + Auth) | `firebase/app`, `firebase/firestore` |
| `db.ts` | IndexedDB: almacenamiento local genérico | `idb` |
| `sync.ts` | SyncManager: chequea conectividad online/offline | `firebase.ts`, `db.ts` |
| `components/` | Componentes UI compartidos (SyncStatus, etc.) | Framer Motion, lucide-react |

## Reglas

- **`shared/` NUNCA importa de `modules/`**
- **`shared/` NUNCA contiene nombres de colecciones** (eso es responsabilidad de cada módulo)
- **`shared/` NUNCA contiene lógica de negocio** (cálculos, validaciones, estados)

## firebase.ts

```ts
// Inicialización segura (solo browser, solo si hay API key)
// Exporta: db (Firestore) | undefined, auth (Auth) | undefined
```

## db.ts (IndexedDB)

```
Stores: clientes, productos, vendedores, remitos, remitos_facturados,
        remitos_aprobados, remitos_aprobados_cache, presupuestos,
        presupuestos_cache, facturas, facturas_cache, salidas,
        salidas_cache, contadores, configuracion, vehiculos, choferes,
        syncQueue, meta
```

Funciones: `localGetAll`, `localGet`, `localSet`, `localBulkSet`, `localDelete`, `localClear`

## sync.ts

```ts
class SyncManager {
  online: boolean
  start(intervalMs?: number): void
  stop(): void
  subscribe(callback: (online: boolean) => void): () => void
}
```
