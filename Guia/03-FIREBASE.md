# 03 — Firebase

Configuración y detalles del proyecto Firebase.

---

## Proyecto

| Propiedad | Valor |
|-----------|-------|
| ID del proyecto | `leafy-valor-410916` |
| Plan | **Spark** (gratuito) |
| Límite Spark | ~50.000 lecturas / ~20.000 escrituras / ~20.000 eliminaciones por día |
| Región | `us-central` (por defecto) |

---

## Colecciones en Firestore

| Colección | Tipo de datos | Docs actuales | ¿Se puede resetear? |
|-----------|---------------|---------------|---------------------|
| `clientes` | Maestros | 496 | ❌ No |
| `productos` | Maestros | 311 | ❌ No |
| `vendedores` | Maestros | 3 | ❌ No |
| `vehiculos` | Maestros | 0 | ❌ No |
| `choferes` | Maestros | 0 | ❌ No |
| `presupuestos` | Transaccional | 0 | ✅ Sí (`reset-data.mjs`) |
| `remitos` (legacy) | Transaccional | 0 | ✅ Sí |
| `remitos_aprobados` | Transaccional | 0 | ✅ Sí |
| `facturas` | Transaccional | 0 | ✅ Sí |
| `salidas` | Transaccional | 0 | ✅ Sí |
| `contadores` | Sistema | 5 docs | ❌ Solo reset específico |

### Documentos de `contadores`

| ID | Campo | Valor |
|---|-------|-------|
| `cliente` | `{ ultimo: 2115 }` | No tocar |
| `presupuesto_2026` | `{ ultimo: 0 }` | Se incrementa solo |
| `factura_2026` | `{ ultimo: 0 }` | Se incrementa solo |
| `remito_2026` | `{ ultimo: 0 }` | Se incrementa solo |
| `remito_aprobado_2026` | `{ ultimo: 0 }` | Se incrementa solo |

---

## Límite de cuota — ¿Qué pasa cuando se agota?

| Operación | Comportamiento |
|-----------|----------------|
| **Lectura** (getDocs) | Error → cae automáticamente a IndexedDB (datos locales) |
| **Tiempo real** (onSnapshot) | Sigue funcionando sin consumo después del primer snapshot |
| **Escritura** (addDoc, updateDoc, deleteDoc) | Error → toast al usuario "Error en Firebase" → debe reintentar manualmente |
| **Contadores** (runTransaction) | Error → falla toda la operación (no hay número duplicado) |

### ¿Cómo saber si se agotó la cuota?

El indicador `SyncStatus` en el header se pone **rojo**.

### ¿Qué hacer?

1. Esperar a que se restablezca (suele ser cada 24h)
2. Las lecturas ya están cubiertas por IndexedDB
3. Para escrituras urgentes: `npm run restore` desde la PC local

---

## Firebase Admin SDK

Se usa solo para backup/restore desde scripts Node.js.
Requiere `backups/service-account.json`.

| Script | Función |
|--------|---------|
| `scripts/export-firestore.mjs` | Firebase → JSON |
| `scripts/import-firestore.mjs` | JSON → Firebase |
| `scripts/reset-data.mjs` | Vaciar colecciones transaccionales |
