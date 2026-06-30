# Módulo: Legacy (Remitos antiguos)

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `remitos` (legacy) |
| **Ubicación** | `src/modules/legacy/` |
| **Estado** | ⚠️ **En deprecación** — solo lectura para informes |
| **API pública** | `src/modules/legacy/index.ts` |

## Dependencias

| Dependencia | Tipo |
|-------------|------|
| `shared/firebase.ts` | Infraestructura |
| `shared/db.ts` | Infraestructura |
| Ningún otro módulo | — |

## ¿Por qué existe?

Antes de la migración, los remitos, presupuestos, pagos y entregas vivían **todo en una sola colección** `remitos`. Cada documento tenía:
- Datos de remito
- `entregas[]` inline (ahora reemplazado por colección `salidas`)
- `pagos[]` inline (ahora asociado a `facturas`)
- Estados como `'Enviado'`, `'Aceptado'`, `'En_Revision'`, `'A_Entregar'`, `'Anulado'`

## API Pública (solo lectura)

### `getAllRemitos(): Promise<Remito[]>`
- Firebase ordenado por `numeroRemito` desc
- Fallback IndexedDB `remitos`
- **No permite** creación/actualización de remitos legacy (solo los nuevos presupuestos → remitos_aprobados)

### `getRemito(id: string): Promise<Remito | null>`
- Lectura individual

## Funciones legacy NO migradas (aún en firestore.ts original)

Estas funciones existen en `firestore.ts` y solo se usan donde el código legacy las necesita. **No se moverán al módulo legacy** — se eliminarán cuando se complete la migración:

- `agregarPago()` / `eliminarPago()` → reemplazado por pagos en facturas
- `agregarEntrega()` / `eliminarEntrega()` / `actualizarEntrega()` → reemplazado por salidas
- `updateRemitoEstado()` / `updateRemitoNroFactura()` / `updateRemitoNC()` → se eliminan cuando legacy se deprecie
- `createRemito()` → reemplazado por presupuestos + remitos_aprobados

## Plan de migración

1. ✅ Presupuestos migrados a colección propia
2. ✅ Remitos Aprobados migrados a colección propia
3. ✅ Facturas migradas a colección propia
4. ✅ Salidas migradas a colección propia
5. ⬜ Página `remitos/page.tsx` dividida en presupuestos + remitos_aprobados
6. ⬜ Datos legacy migrados a nuevas colecciones
7. ⬜ Eliminar `firestore.ts`
8. ⬜ Eliminar colección `remitos` de Firebase

## Diagnóstico rápido

| Síntoma | Causa | Dónde mirar |
|---------|-------|-------------|
| Datos duplicados entre legacy y nuevo | Migración incompleta | Comparar Firebase Console: `remitos` vs `remitos_aprobados` |
| Pagos no aparecen en factura | Pago está en legacy pero no migrado | Revisar `remitos/{id}/pagos[]` |
| Progreso de entrega incorrecto | `calcEntregado` suma legacy + salidas | Revisar match por `numeroRemito` |
