# FALPAT Ventas — Guía Rápida para IA

## ⚠️ EL PROBLEMA CENTRAL

Firebase Spark plan (~50K lecturas/día). La **cuota se agota seguido**. Cuando pasa:
- **App SIGUE funcionando** para lecturas: Firebase falla → IndexedDB como fallback
- **Escrituras fallan con error visible** (sin encolar): usuario debe reintentar
- El indicador `SyncStatus` en el header muestra online/offline

---

## ARQUITECTURA FIREBASE-FIRST

```
App → firestore.ts → Firebase (primario) → fallback → IndexedDB (solo lectura si Firebase falla)
                      ↘ escrituras directas a Firebase, error si no hay conexión
```

### Lectura (getAllRemitos, getClientes, etc.)
1. Firebase directo (sin cache en memoria ni staleness)
2. Guarda copia en IndexedDB tras cada lectura exitosa
3. Si Firebase falla → IndexedDB.getAll (lectura offline)

### Escritura (crear/editar remito, cliente, etc.)
1. Firebase directo (addDoc / updateDoc / deleteDoc)
2. Guarda copia en IndexedDB post-escritura exitosa
3. Si Firebase falla → lanza error (no encola, no syncQueue)

### SyncQueue / Escrituras diferidas
- **Eliminadas completamente** de todas las funciones CRUD
- No hay encolamiento ni reintento automático de escrituras
- `npm run restore` sigue siendo el salvavidas manual para restauración masiva

---

## FLUJO CUOTA AGOTADA → RECUPERACIÓN

### Cuando se agota la cuota (automático):
1. Firebase.getDocs/getAddDoc/etc. falla con error
2. Lecturas: caen a IndexedDB (getAll de caché local)
3. Escrituras: lanzan error → toast al usuario "Error al crear/actualizar en Firebase"
4. El usuario debe reintentar manualmente cuando la cuota se restablezca

### Cuando vuelve la cuota:
1. Las lecturas vuelven a Firebase automáticamente (próximo getAll)
2. Las escrituras reintentadas por el usuario funcionan
3. syncManager.checkConnectivity() cada **5min** detecta conectividad

### Fuerza bruta manual:
```bash
npm run restore    # PUSH: backups/ → Firebase (814 docs)
```

---

## ARCHIVOS CLAVE

| Archivo | Rol |
|---------|------|
| `src/lib/firestore.ts` | **Firebase-first**: Firebase primario, IndexedDB fallback de lectura |
| `src/lib/db.ts` | IndexedDB: stores, CRUD local (sin syncQueue activa) |
| `src/lib/presupuestos.ts` | CRUD presupuestos con contador `contadores/presupuesto_2026` |
| `src/lib/remitos-aprobados.ts` | CRUD remitos aprobados con `createRemitoFromPresupuesto` |
| `src/lib/facturas.ts` | CRUD facturas con contador `contadores/factura_2026` |
| `src/lib/salidas.ts` | CRUD salidas con numeración por remito (S-001/002) |
| `src/lib/sync.ts` | `syncManager`: chequea conectividad cada 60s |
| `src/lib/cache.ts` | Caché en memoria (solo usada donde queda código legacy) |
| `src/lib/firebase.ts` | Inicialización de Firebase client SDK |
| `src/hooks/useBackgroundSync.ts` | Hook: sync al volver a la pestaña + cada 120s |
| `src/components/SyncStatus.tsx` | Indicador visual online/offline |
| `scripts/import-firestore.mjs` | Restore: JSON → Firebase (usa service-account.json) |
| `scripts/export-firestore.mjs` | Backup: Firebase → JSON |
| `scripts/migrate.mjs` | Migración one-shot: remitos legacy → colecciones nuevas |
| `backups/service-account.json` | Clave de servicio Firebase Admin |
| `.env.local` | Config Firebase Web SDK (API key, etc.) |

---

## COMANDOS ÚTILES

```bash
npm run dev          # Desarrollo http://localhost:3000
npm run build        # Build producción
npm run backup       # Exporta Firebase → JSON (backups/*.json)
npm run restore      # Importa JSON → Firebase (USAR cuando la cuota no da)
npm run migrate      # Migración one-shot: remitos legacy → nuevas colecciones
npm run lint         # ESLint
```

---

## REGLAS PARA LA IA

1. **No toques funcionalidad existente sin pedido explícito**
2. **Ante duda de datos**: verificar Firebase Console directamente
3. **Siempre verificá con `npm run build`** antes de commitear
4. **Commit + push** siempre que toques código (deploy automático en Vercel)
5. **Backups**: los datos exportados NO se commitean (están en .gitignore)
6. **El restore script necesita** `backups/service-account.json` (ya existe)
7. Si Firebase falla en desarrollo → puede ser cuota o error de red; revisar console
8. **NO reintroducir syncQueue ni escrituras diferidas** sin consultar

---

## Último: 10/07/2026

### Deploy
- URL: https://ventas-falpat.vercel.app
- Build OK

### Lo último — Fix cobranza completa para flujo nuevo (3 bugs críticos)

1. **Bug 1 - nroFactura en remitos_aprobados**: `handleGuardarFactura` ahora guarda `nroFactura`, `facturado: true` y `fechaFacturado` en el documento de `remitos_aprobados` al facturar desde la UI de Remitos
2. **Bug 2 - Cobranza habilitada para facturas**: Se crearon `agregarPagoFactura` y `eliminarPagoFactura` que escriben en la colección `facturas`. La página de Facturación ahora rutea pagos correctamente según el tipo de item
3. **Bug 3 - Sincronización de pagos**: Los pagos ahora se registran en la colección correcta (remitos legacy vs facturas nuevas), eliminando la desincronización

### Guía completa para nueva PC

Toda la documentación de setup, credenciales, Firebase, Vercel y GitHub está en:

```
Guia/00-INDEX.md
```

En una PC nueva: clonar repo, copiar `.env.local` + `service-account.json`, `npm install`, `npm run dev`.

---

## Notas técnicas importantes
- `createSalida` cuenta salidas existentes via query (`numeroSalida = max + 1`)
- `localSet`/`localGet` en stores nuevas protegidos con `.catch(() => null)`
- Si Firebase falla en escritura → toast error al usuario. Sin encolamiento.
- `getCountFromServer` usado para conteo de clientes en dashboard (1 lectura vs N lecturas)
