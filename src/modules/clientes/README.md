# Módulo: Clientes

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `clientes` |
| **Ubicación del código** | `src/modules/clientes/` |
| **API pública** | `src/modules/clientes/index.ts` |
| **Servicio (CRUD)** | `src/modules/clientes/service.ts` |
| **Tipos** | `src/modules/clientes/types.ts` |
| **Documentación** | `src/modules/clientes/README.md` |

## Dependencias

| Dependencia | Tipo | ¿Por qué? |
|-------------|------|-----------|
| `shared/firebase.ts` | Infraestructura | Obtener instancia `db` de Firestore |
| `shared/db.ts` | Infraestructura | IndexedDB fallback para lecturas |
| `shared/sync.ts` | Infraestructura | Verificar conectividad online/offline |
| Ningún otro módulo | — | Clientes NO depende de productos, vendedores, etc. |

## ¿Quién depende de Clientes?

| Módulo/Página | ¿Qué usa de Clientes? |
|--------------|----------------------|
| `modules/presupuestos/service.ts` | Lee datos del cliente al crear presupuesto |
| `modules/remitos-aprobados/service.ts` | Lee datos del cliente al crear remito_aprobado |
| `modules/facturas/service.ts` | Lee datos del cliente al crear factura |
| `modules/salidas/service.ts` | Almacena `clienteData` como referencia |
| `app/dashboard/remitos/nuevo/page.tsx` | `getAllClientes()` para selector de cliente |
| `app/dashboard/informes/page.tsx` | Estadísticas de clientes activos |

**Regla:** Otros módulos NUNCA escriben en la colección `clientes`. Solo leen.

## API Pública (exportada por `index.ts`)

### `getAllClientes(): Promise<Cliente[]>`
- **Origen:** Firebase `clientes` collection, ordenado por `razonSocial`
- **Fallback:** IndexedDB store `clientes`
- **Error común:** Firebase quota excedida → falla silenciosamente a IndexedDB
- **Si IndexedDB también falla:** Retorna `[]`, se loguea a console

### `getCliente(id: string): Promise<Cliente | null>`
- **Origen:** Firebase `clientes/{id}`
- **Fallback:** IndexedDB `localGet('clientes', id)`
- **Retorna:** `null` si no existe en Firebase ni IndexedDB

### `createCliente(data: Omit<Cliente, 'id' | 'codigoCliente' | 'createdAt'>): Promise<string>`
- **Proceso:**
  1. `runTransaction` sobre `contadores/cliente` → obtiene próximo `codigoCliente`
  2. `addDoc` a Firebase `clientes`
  3. `localSet` a IndexedDB
- **Si Firebase falla:** Lanza error (`toast.error("Error al crear cliente en Firebase")`)
- **Si contador falla:** Lanza error (no crea cliente con código duplicado)
- **Retorna:** `id` del documento creado

### `updateCliente(id: string, data: Partial<Cliente>): Promise<void>`
- **Proceso:** `updateDoc` a Firebase → `localSet` a IndexedDB
- **Si Firebase falla:** Lanza error
- **No actualiza:** `codigoCliente`, `id`

### `deleteCliente(id: string): Promise<void>`
- **Proceso:** `deleteDoc` a Firebase → `localDelete` a IndexedDB
- **Si Firebase falla:** Lanza error

### `clienteExists(numeroDocumento: string, excludeId?: string): Promise<boolean>`
- **Origen:** Firebase query `where('numeroDocumento', '==', numeroDocumento)`
- **Fallback:** IndexedDB `localGetAll` + filter manual
- **Uso:** Prevenir duplicados al crear/actualizar

### `createMultipleClientes(data: Omit<Cliente, 'id' | 'codigoCliente' | 'createdAt'>[]): Promise<string[]>`
- **Proceso:** `writeBatch` → hasta 500 clientes por lote
- **Fallback:** Crea uno por uno si batch falla
- **Retorna:** Array de IDs creados

### `searchClientes(query: string): Promise<Cliente[]>`
- **Origen:** Firebase query con filtro (nombre o documento)
- **Uso:** Autocomplete en formularios

## Tipos (`types.ts`)

```ts
interface Cliente {
  id?: string
  codigoCliente: string
  razonSocial: string
  tipoDocumento: string
  numeroDocumento: string
  actividad: string
  telefono: string
  domicilio: string
  localidad: string
  condicionIVA: string  // 'CF' | 'Exento' | 'RI' | 'Monotributo'
  createdAt?: Date
}
```

Constantes exportadas:
- `CONDICIONES_IVA: string[]` — Solo las 4 condiciones válidas
- `CONDIVA_LABEL: Record<string, string>` — Mapa condición → label human-readable

## Flujo de datos

```
createCliente(data)
  → Firebase: runTransaction(contadores/cliente) → addDoc(clientes/)
  → IndexedDB: localSet('clientes', doc)
  → Retorna: id del documento

getAllClientes()
  → Firebase: getDocs(clientes/) ordenado por razonSocial
  → Éxito: localBulkSet('clientes', data) → retorna data
  → Fallo: localGetAll('clientes') → retorna cache (o [])

updateCliente(id, data)
  → Firebase: updateDoc(clientes/{id})
  → IndexedDB: localSet('clientes', {...old, ...data})

deleteCliente(id)
  → Firebase: deleteDoc(clientes/{id})
  → IndexedDB: localDelete('clientes', id)
```

## Diagnóstico rápido de errores

| Síntoma | Causa probable | Dónde mirar |
|---------|---------------|-------------|
| `Error al crear cliente` | Firebase quota excedida o red caída | `service.ts` → createCliente |
| `Error de código duplicado` | `runTransaction` falló (contador corrupto) | `service.ts` → getNextCodigoCliente |
| `Clientes no se cargan` | Firebase quota + IndexedDB vacía | `service.ts` → getAllClientes |
| `Error al actualizar cliente` | Documento no existe o permiso | `service.ts` → updateCliente |
| `El filtro de clientes no funciona` | Firebase query error o cache corrupto | Entra a IndexedDB desde DevTools |
| `Cliente existe pero no aparece` | Cache de IndexedDB desactualizado | Eliminar IndexedDB > Refresh |

## Firebase Console — Consultas útiles

```js
// Ver clientes
db.collection("clientes").orderBy("razonSocial").limit(10).get()

// Ver contador actual
db.doc("contadores/cliente").get()

// Buscar cliente por documento
db.collection("clientes").where("numeroDocumento", "==", "20-12345678-9").get()
```

## Estructura del documento en Firestore

```json
{
  "codigoCliente": "C-001",
  "razonSocial": "Cliente Ejemplo SRL",
  "tipoDocumento": "CUIT",
  "numeroDocumento": "20-12345678-9",
  "actividad": "Comercio",
  "telefono": "3492-123456",
  "domicilio": "Av. Ejemplo 123",
  "localidad": "Rafaela",
  "condicionIVA": "RI",
  "createdAt": "Timestamp"
}
```
