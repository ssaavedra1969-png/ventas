# 07 — Arquitectura

Cómo está construida la aplicación.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|------------|---------|
| Framework | Next.js | 14.2 |
| Lenguaje | TypeScript | 5.x |
| UI | Tailwind CSS | 3.x |
| Icons | Lucide React | última |
| Base de datos | Firebase Firestore | Web SDK v10+ |
| Cache local | IndexedDB (librería `idb`) | 8.x |
| Hosting | Vercel | — |
| Control de versiones | Git + GitHub | — |

---

## Estructura del proyecto (carpetas principales)

```
ventas/
├── src/
│   ├── app/               # Páginas (Next.js App Router)
│   │   ├── dashboard/     # Zona protegida de la app
│   │   │   ├── manual/    # Manual de usuario interactivo
│   │   │   ├── parametrias/  # Clientes, Productos, etc.
│   │   │   ├── presupuestos/ # Gestión de presupuestos
│   │   │   ├── remitos/      # Gestión de remitos
│   │   │   ├── facturacion/  # Cobranza
│   │   │   ├── entregas/     # Calendario de salidas
│   │   │   └── informes/     # Estadísticas
│   │   └── presupuesto/   # Vista pública de presupuesto
│   ├── components/        # Componentes React compartidos
│   ├── hooks/             # Hooks personalizados
│   │   ├── useRealtime.ts # Hook para tiempo real
│   └── lib/               # Lógica de negocio y datos
│       ├── firebase.ts    # Inicialización Firebase
│       ├── firestore.ts   # CRUD Firebase-first
│       ├── db.ts          # IndexedDB
│       ├── realtime.ts    # onSnapshot centralizado
│       ├── local-first.ts # Lecturas local-first
│       └── sync.ts        # Monitor de conectividad
├── scripts/               # Scripts de Node.js
│   ├── export-firestore.mjs  # Backup
│   ├── import-firestore.mjs  # Restore
│   ├── reset-data.mjs        # Reset datos
│   └── setup-nueva-pc.ps1    # Bootstrap PC nueva
├── backups/               # Backups (en .gitignore)
├── public/                # Archivos estáticos
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service Worker
│   └── manual/            # Capturas de pantalla del manual
└── Guia/                  # Esta documentación
```

---

## Flujo de datos

```
                    ┌──────────────────┐
                    │   Navegador      │
                    │  (React/Next.js) │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   Firebase       │
                    │  (Firestore)     │ ← PRIMARIO
                    └────────┬─────────┘
                             │ (si falla)
                    ┌────────▼─────────┐
                    │   IndexedDB      │
                    │  (local cache)   │ ← FALLBACK solo lectura
                    └──────────────────┘
```

### Lectura (clientes, productos, etc.)
1. Firebase vía `onSnapshot` (tiempo real)
2. Si Firebase falla → IndexedDB (lectura offline)
3. El listener `onSnapshot` vive toda la sesión (no se reinicia al navegar)

### Escritura (crear/editar remito, cliente, etc.)
1. Firebase directo (`addDoc` / `updateDoc` / `deleteDoc`)
2. Si Firebase falla → error visible al usuario
3. No hay cola de reintentos → el usuario debe reintentar

---

## Tiempo real

| Colección | Método | Cuándo se activa |
|-----------|--------|------------------|
| clientes | `onSnapshot` | Primera visita a Clientes (vive toda la sesión) |
| productos | `onSnapshot` | Primera visita a Productos |
| vendedores | `onSnapshot` | Primera visita a Vendedores |
| vehiculos | `onSnapshot` | Primera visita a Vehículos |
| choferes | `onSnapshot` | Primera visita a Vehículos |
| presupuestos, remitos, facturas, salidas | `getDocs` con `limit(20)` | Cada carga de página |

Los `onSnapshot` cuestan **1 lectura la primera vez** y **0 lecturas** por actualizaciones.
Al ser persistentes por sesión, navegar entre páginas no genera lecturas extras.

---

## PWA (Progressive Web App)

La app se puede instalar en el escritorio desde Chrome/Edge:

1. Abrir https://ventas-falpat.vercel.app
2. Click en el icono ⊕ de la barra de direcciones
3. Se crea un acceso directo

### Capacidades offline
- **Lectura:** funciona sin internet (usa IndexedDB)
- **Escritura:** requiere conexión (Firebase directo)

---

## Deploy

Cada `git push` a `main` → Vercel build automático → producción actualizada.
