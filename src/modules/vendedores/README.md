# Módulo: Vendedores

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `vendedores` |
| **Ubicación** | `src/modules/vendedores/` |
| **API pública** | `src/modules/vendedores/index.ts` |

## Dependencias

| Dependencia | Tipo |
|-------------|------|
| `shared/firebase.ts` | Infraestructura |
| `shared/db.ts` | Infraestructura |
| Ningún otro módulo | — |

**Nota:** `getVendedoresStats()` lee desde `getAllRemitos()` para calcular estadísticas. Esta función es de lectura y se ejecuta en la página, no en el módulo.

## API Pública

### `getVendedores(): Promise<Vendedor[]>`
- Firebase ordenado por `nombre`, fallback IndexedDB

### `createVendedor(data): Promise<string>`
- `addDoc` a Firebase

### `updateVendedor(id, data): Promise<void>`
- `updateDoc` a Firebase

### `deleteVendedor(id): Promise<void>`
- `deleteDoc` Firebase → `localDelete` IndexedDB

### `vendedorCodigoExists(codigo, excludeId?): Promise<boolean>`
- Query por `codigo`, fallback IndexedDB

## Tipos (`types.ts`)

```ts
interface Vendedor {
  id?: string
  codigo: string
  nombre: string
  activo?: boolean
  createdAt?: Date
}
```

## Diagnóstico rápido

| Síntoma | Causa | Dónde mirar |
|---------|-------|-------------|
| Error al crear vendedor | Firebase write falló | service.ts → createVendedor |
| Código duplicado | No se validó correctamente | service.ts → vendedorCodigoExists |
| Estadísticas vacías | `getAllRemitos()` falló | Revisar firestore.ts legacy |
