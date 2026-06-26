# FALPAT Ventas — Guía Rápida para IA

## ⚠️ EL PROBLEMA CENTRAL

Firebase Spark plan (~50K lecturas/día). La **cuota se agota seguido**. Cuando pasa:
- **App SIGUE funcionando** 100% offline con IndexedDB
- Firebase falla silenciosamente → todo cae a IndexedDB
- Escrituras se encolan y sincronizan cuando la cuota vuelve
- El indicador `SyncStatus` en el header muestra online/offline

---

## ARQUITECTURA OFFLINE-FIRST

```
App → firestore.ts (try Firebase) → fallback → IndexedDB (idb)
                                     ↘ syncQueue (escrituras pendientes)
                                          ↘ syncManager (procesa cola cuando Firebase vuelve)
```

### Lectura (getAllRemitos, getClientes, etc.)
1. Firebase.getDocs → si falla → IndexedDB.getAll
2. Siempre guarda en caché IndexedDB después de leer de Firebase
3. Cache en memoria: 30s TTL (cache.ts) para evitar re-lecturas

### Escritura (crear/editar remito, cliente, etc.)
1. Guarda en IndexedDB primero
2. Encola operación en syncQueue (db.ts)
3. syncManager.processQueue() la envía a Firebase cuando está online

---

## FLUJO CUOTA AGOTADA → RECUPERACIÓN

### Cuando se agota la cuota (automático):
1. syncManager.checkConnectivity() falla → `_online = false`
2. Todas las lecturas van a IndexedDB
3. Todas las escrituras se guardan en IndexedDB + se encolan en syncQueue

### Cuando vuelve la cuota (automático):
1. syncManager.checkConnectivity() cada **60s** chequea Firebase
2. Si ok → procesa TODA la syncQueue
3. useBackgroundSync también chequea cada **120s** + al cambiar de pestaña
4. Limpia caché al terminar

### Fuerza bruta manual (si el auto-sync no alcanza):
```bash
npm run restore    # PUSH: backups/ → Firebase (814 docs)
```

---

## ARCHIVOS CLAVE

| Archivo | Rol |
|---------|-----|
| `src/lib/firestore.ts` | Capa principal: intenta Firebase, falla a IndexedDB |
| `src/lib/db.ts` | IndexedDB: stores, syncQueue, CRUD local |
| `src/lib/sync.ts` | `syncManager`: chequea conectividad cada 60s, procesa cola |
| `src/lib/cache.ts` | Caché en memoria con 30s TTL |
| `src/lib/firebase.ts` | Inicialización de Firebase client SDK |
| `src/hooks/useBackgroundSync.ts` | Hook: sync al volver a la pestaña + cada 120s |
| `src/components/SyncStatus.tsx` | Indicador visual online/offline con pending count |
| `scripts/import-firestore.mjs` | Restore: JSON → Firebase (usa service-account.json) |
| `scripts/export-firestore.mjs` | Backup: Firebase → JSON |
| `backups/service-account.json` | Clave de servicio Firebase Admin |
| `.env.local` | Config Firebase Web SDK (API key, etc.) |

---

## COMANDOS ÚTILES

```bash
npm run dev          # Desarrollo http://localhost:3000
npm run build        # Build producción
npm run backup       # Exporta Firebase → JSON (backups/*.json)
npm run restore      # Importa JSON → Firebase (USAR cuando la cuota no da)
npm run lint         # ESLint
```

---

## REGLAS PARA LA IA

1. **No toques funcionalidad existente sin pedido explícito**
2. **Ante duda de sync**: corré `npm run restore` (push local → Firebase)
3. **Siempre verificá con `npm run build`** antes de commitear
4. **Commit + push** siempre que toques código (deploy automático en Vercel)
5. **Backups**: los datos exportados NO se commitean (están en .gitignore)
6. **El restore script necesita** `backups/service-account.json` (ya existe)
7. Si Firebase falla en desarrollo → el problema es cuota, no el código

---

## Último: 26/06/2026

### Deploy
- URL: https://ventas-falpat.vercel.app
- Build OK

### Lo último
1. Remito de Salida movido a `/dashboard/entregas/salida/` (sidebar)
2. Fix import-firestore.mjs para firebase-admin v14
3. Restaurados 814 documentos a Firebase

### Contexto del proyecto
- Next.js 14.2 + React 18 + Firebase 12 + Tailwind
- IndexedDB (`idb`) para offline-first
- Framer Motion, Lucide icons, date-fns, Zod + react-hook-form, Sonner
- IVA: Factura A (RI/Monotributo) → IVA discriminado; Factura B (CF/Exento) → "IVA incluido"
- Pagos: array dentro del documento remito (Efectivo, Transferencia, Cheque, Débito, Crédito)
- AutocompleteInput requiere 2+ caracteres
