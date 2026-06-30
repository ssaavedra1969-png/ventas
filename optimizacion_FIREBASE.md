# Optimización de lecturas Firestore

> **Problema:** 46k/50k lecturas diarias en el plan Spark (gratuito).
> **Causa raíz:** Cada página obtiene TODOS los documentos de las colecciones via `useEffect` + `getDocs`, sin caché, en cada montada.
> **Objetivo:** Reducir lecturas a <15k/día para operar dentro del plan gratuito.

---

## Tarea 1: Persistencia offline (Firestore caché local)

**Esfuerzo:** 5 min · **Impacto:** ~70% menos lecturas · **Prioridad:** 🔴 Alta

Habilitar `enableMultiTabIndexedDbPersistence` en `src/lib/firebase.ts`. Así Firestore cachea documentos en IndexedDB del navegador; lecturas repetidas no cuentan en la cuota mientras el caché esté vigente.

- Archivo: `src/lib/firebase.ts`
- API: `enableMultiTabIndexedDbPersistence(db)` con `CACHE_SIZE_UNLIMITED`
- Solo en cliente (`typeof window !== 'undefined'`)

---

## Tarea 2: SWR / TanStack React Query

**Esfuerzo:** 2-3 hrs · **Impacto:** ~80% menos lecturas · **Prioridad:** 🔴 Alta

Reemplazar el patrón `'use client'` + `useEffect` + `useState` + `loadData()` por SWR. Así se evita refetch en cada montada de componente, se comparte caché entre páginas, y se usa stale-while-revalidate.

- Pasos:
  1. Instalar `swr`
  2. Crear hooks wrapper por colección: `useClientes()`, `useProductos()`, `useRemitos()`, etc.
  3. Migrar páginas una por una
- Config: `dedupingInterval: 60_000`, `revalidateOnFocus: false`

---

## Tarea 3: Paginación server-side con Firestore

**Esfuerzo:** 4-6 hrs · **Impacto:** ~90% menos lecturas en clientes/productos · **Prioridad:** 🟡 Media

Actualmente `getClientes()`, `getProductos()` traen **todos** los docs y filtran/paginan en cliente. Cambiar a queries paginadas nativas de Firestore con `limit()`, `orderBy()`, `startAfter()`.

- Archivo: `src/lib/firestore.ts`
- Funciones a modificar:
  - `getClientes(search, page)` → Firestore `limit(PAGE_SIZE)` + `startAfter`
  - `getProductos(search, page)` → igual
  - Agregar `getNextPage()` / manejo de `lastDoc`
- Mantener `getAllClientes()`, `getAllProductos()` solo donde sea estrictamente necesario (nuevo remito).

---

## Tarea 4: API Routes como proxy con caché en servidor

**Esfuerzo:** 3-4 hrs · **Impacto:** ~95% menos lecturas · **Prioridad:** 🟡 Media

Crear API routes con `firebase-admin` que cacheen resultados en un `Map` global con TTL (ej: 60s). El frontend llama a `/api/...` en vez de Firestore directo. Todas las visitas en 1 minuto comparten un solo fetch.

- Rutas a crear:
  - `src/app/api/clientes/route.ts`
  - `src/app/api/productos/route.ts`
  - `src/app/api/remitos/route.ts`
  - `src/app/api/dashboard/stats/route.ts`
- Cache con TTL en `Map` global
- Frontend cambia de `getDocs(...)` a `fetch('/api/clientes')`

---

## Tarea 5: Server Components para páginas estáticas

**Esfuerzo:** 2-3 hrs · **Impacto:** ~100% menos lecturas en esas vistas · **Prioridad:** 🟢 Baja

Páginas que no requieren interactividad en tiempo real (dashboard stats, vista pública de remito) pueden ser Server Components. La data se obtiene en servidor con `firebase-admin` y se sirve HTML estático.

- Candidatos:
  - `/dashboard` (stats)
  - `/remitos/[id]` (vista pública) — ya es solo lectura
- Usar patrón Server Component + `firebase-admin` directamente

---

## Tareas futuras (cuando escale)

| Tarea | Cuando |
|-------|--------|
| Migrar a plan Blaze (pay-as-you-go) — Firestore es < $0.20/100k lecturas | Cuando supere 100k lec/mes |
| Agregar Redis cache (Upstash free tier 10k req/día) | Cuando las API routes con Map no escalen |
| CDN caching con Vercel Edge Config | Cuando haya presupuesto |
| Migrar a base SQL (Postgres) con Hasura/GraphQL | Cuando el modelo relacional lo justifique |

---

## Prioridades resumidas

```
Semana 1:  🔴 Tarea 1 (persistencia) + Tarea 2 (SWR)
Semana 2:  🟡 Tarea 3 (paginación) + Tarea 4 (API routes)
Semana 3:  🟢 Tarea 5 (Server Components)
```
