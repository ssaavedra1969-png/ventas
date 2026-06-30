# Módulo: Productos

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `productos` |
| **Ubicación** | `src/modules/productos/` |
| **API pública** | `src/modules/productos/index.ts` |

## Dependencias

| Dependencia | Tipo |
|-------------|------|
| `shared/firebase.ts` | Infraestructura |
| `shared/db.ts` | Infraestructura |
| Ningún otro módulo | — |

## API Pública

### `getAllProductos(): Promise<Producto[]>`
- Firebase ordenado por `nombre`, fallback IndexedDB

### `createProducto(data: CreateProductoInput): Promise<string>`
- `addDoc` a Firebase, auto-calcula `precioSinIVA`

### `updateProducto(id: string, data: Partial<Producto>): Promise<void>`
- `updateDoc` a Firebase, recalcula `precioSinIVA` si cambia `valorUnitario`

### `deleteProducto(id: string): Promise<void>`
- `deleteDoc` Firebase → `localDelete` IndexedDB

### `createMultipleProductos(data[]): Promise<string[]>`
- `writeBatch` hasta 500

## Tipos (`types.ts`)

```ts
interface Producto {
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
```

## Diagnóstico rápido

| Síntoma | Causa | Dónde mirar |
|---------|-------|-------------|
| Error al crear producto | Firebase write falló | service.ts → createProducto |
| precioSinIVA incorrecto | No se recalcula al cambiar valorUnitario | service.ts → updateProducto |
| Productos no cargan | Firebase quota + IndexedDB vacía | service.ts → getAllProductos |
