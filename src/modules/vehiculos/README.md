# Módulo: Vehículos

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colecciones Firebase** | `vehiculos`, `choferes` |
| **Ubicación** | `src/modules/vehiculos/` |
| **API pública** | `src/modules/vehiculos/index.ts` |

## Dependencias

| Dependencia | Tipo |
|-------------|------|
| `shared/firebase.ts` | Infraestructura |
| `shared/db.ts` | Infraestructura |
| Ningún otro módulo | — |

## API Pública — Vehículos

### `getAllVehiculos(): Promise<Vehiculo[]>`
### `createVehiculo(data): Promise<string>`
### `deleteVehiculo(id): Promise<void>`
### `importVehiculos(data[]): Promise<void>`

## API Pública — Choferes

### `getAllChoferes(): Promise<Chofer[]>`
### `createChofer(data): Promise<string>`
### `updateChofer(id, data): Promise<void>`
### `deleteChofer(id): Promise<void>`
### `importChoferes(data[]): Promise<void>`

## Tipos (`types.ts`)

```ts
interface Vehiculo {
  id?: string
  patente: string
  marca: string
  createdAt?: Date
}

interface Chofer {
  id?: string
  nombre: string
  documento?: string
  telefono?: string
  activo?: boolean
  createdAt?: Date
}
```

## Diagnóstico rápido

| Síntoma | Causa | Dónde mirar |
|---------|-------|-------------|
| Vehículos no cargan | Firebase quota | service.ts → getAllVehiculos |
| Error al importar vehículos | Batch demasiado grande | service.ts → importVehiculos |
| Chofer no aparece en selector | Firestore offline | service.ts → getAllChoferes |
