# FALPAT Ventas

Sistema de gestión comercial: presupuestos, remitos, facturación, salidas y cobranza.

**Producción:** https://ventas-falpat.vercel.app

---

## Índice

- [1. Usar la app desde cualquier PC (sin instalar nada)](#1-usar-la-app-desde-cualquier-pc-sin-instalar-nada)
- [2. Setup completo para nueva PC (desarrollo)](#2-setup-completo-para-nueva-pc-desarrollo)
- [3. Arquitectura](#3-arquitectura)
- [4. Comandos útiles](#4-comandos-%C3%BAtiles)
- [5. Backup y restore](#5-backup-y-restore)
- [6. Solución de problemas](#6-soluci%C3%B3n-de-problemas)

---

## 1. Usar la app desde cualquier PC (sin instalar nada)

Solo abrí Chrome o Edge y entrá a:

**https://ventas-falpat.vercel.app**

No necesitás instalar nada, clonar repos, ni configurar claves. Todos los datos están en Firebase, el código en Vercel. Funciona igual en cualquier PC con internet.

**Opcional — Instalar como app de escritorio (PWA):**
1. En Chrome/Edge, abrí https://ventas-falpat.vercel.app
2. Hacé click en el icono ⊕ de la barra de direcciones (o ⋮ → Instalar)
3. Se crea un acceso directo en el escritorio. La app funciona incluso sin internet (lectura offline).

---

## 2. Setup completo para nueva PC (desarrollo)

### Requisitos previos

- **Node.js 18+** — [descargar](https://nodejs.org/)
- **Git** — [descargar](https://git-scm.com/)
- Opcional: **PowerShell 5.1+** (viene con Windows 10/11)

### Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/ssaavedra1969-png/ventas.git
cd ventas
```

### Paso 2 — Copiar archivos de credenciales

Desde la PC original, copiá estos **2 archivos** (por USB, Google Drive, etc.):

| Archivo | Destino | Contiene |
|---------|---------|----------|
| `.env.local` | `ventas/.env.local` | Claves Firebase Web SDK |
| `backups/service-account.json` | `ventas/backups/service-account.json` | Clave privada Firebase Admin |

> ⚠️ **No se pueden descargar del repo** porque están en `.gitignore` (contienen secretos).

### Paso 3 — Instalar dependencias

```bash
npm install
```

### Paso 4 — Iniciar

```bash
npm run dev        # http://localhost:3000
# o
npm run build      # build producción
```

### Setup automático

Ejecutá este script en la nueva PC (hace los pasos 1, 3 y 4 automáticamente):

```powershell
# En PowerShell como Administrador
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/ssaavedra1969-png/ventas/main/scripts/setup-nueva-pc.ps1'))
```

O descargalo manualmente y ejecutalo:

```powershell
.\scripts\setup-nueva-pc.ps1
```

---

## 3. Arquitectura

### Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (React, TypeScript, Tailwind CSS) |
| Backend | Firebase Firestore (serverless) |
| Cache local | IndexedDB (via idb library) |
| Hosting | Vercel (deploy automático desde GitHub) |
| Autenticación | Firebase Auth |
| PWA | Service Worker + Manifest |

### Flujo de datos

```
App → Firebase (primario)
        → si falla → IndexedDB (lectura offline)
        ↘ escrituras directas a Firebase (sin cola)
```

### Límite de cuota (Spark plan)

Firebase Spark plan: ~50.000 lecturas/día. Si se agota:
- **Lecturas**: caen automáticamente a IndexedDB (offline)
- **Escrituras**: fallan con error visible (el usuario debe reintentar)
- El indicador SyncStatus en el header muestra online/offline

---

## 4. Comandos útiles

```bash
npm run dev          # Desarrollo http://localhost:3000
npm run build        # Build producción
npm run lint         # ESLint
npm run backup       # Exporta Firebase → JSON
npm run restore      # Importa JSON → Firebase
npm run migrate      # Migración one-shot (legacy → nuevas colecciones)
```

---

## 5. Backup y restore

```bash
# Backup completo (datos + proyecto)
npm run backup

# Restaurar datos desde backup
npm run restore -- "ruta/al/backup/firestore"

# Resetear datos (vaciar presupuestos/remitos/facturas/salidas)
node scripts/reset-data.mjs --force
```

El backup se guarda en `backups/datos-AAAA-MM-DD_HHMMSS/` con timestamp.

---

## 6. Solución de problemas

### Firebase quota exceeded

Si Firebase rechaza lecturas/escrituras:
1. Esperar a que se restablezca la cuota (suele ser cada 24h)
2. Las lecturas caen automáticamente a IndexedDB
3. Las escrituras reintentar manualmente
4. Usar `npm run restore` como fuerza bruta si es urgente

### Build falla

```bash
npm run build        # Ver el error exacto
npm run lint         # Ver errores de ESLint
```

### Error "Failed to read source code"

Problema de encoding del archivo. Revisar que el archivo esté en UTF-8 sin BOM.

---

## Vercel

El deploy es automático: cada `git push` a `main` despliega en Vercel.

**URL producción:** https://ventas-falpat.vercel.app

### Configurar Vercel desde otra PC (solo si querés deployar)

```bash
npm i -g vercel
vercel login
vercel link       # vincular al proyecto existente
vercel env pull   # descargar .env.local desde Vercel (opcional)
```

Las variables de entorno en Vercel ya están configuradas (las mismas que en `.env.local`).

### Dashboard Vercel

https://vercel.com/ssaavedra1969-png/ventas

Ahí podés ver logs de builds, dominios, variables de entorno y analíticas.

---

## GitHub

**Repositorio:** https://github.com/ssaavedra1969-png/ventas

Para pushear desde otra PC necesitás configurar autenticación:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

Luego elegí un método:

| Método | Cómo |
|--------|------|
| **Personal Access Token** (recomendado) | GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens. Usar como contraseña al hacer `git push`. |
| **SSH** | `ssh-keygen -t ed25519` → copiar `~/.ssh/id_ed25519.pub` → GitHub → Settings → SSH and GPG keys → New SSH key |
| **GitHub CLI** | `winget install GitHub.cli` → `gh auth login` |

---

## Firebase

**Consola:** https://console.firebase.google.com/project/leafy-valor-410916

### Configuración actual

| Recurso | Detalle |
|---------|---------|
| Plan | Spark (gratuito) — ~50K lecturas/día |
| Proyecto | `leafy-valor-410916` |
| Auth | Email/Password (usuarios creados manualmente) |
| Firestore | Colecciones: clientes, productos, vendedores, remitos, contadores, presupuestos, remitos_aprobados, facturas, salidas, vehiculos, choferes |

### Cómo regenerar credenciales (si perdés los archivos)

#### Web SDK (`.env.local`):
1. Firebase Console → ⚙ → Configuración del proyecto → Tus apps
2. Seleccionar la app web → "Config" → copiar las claves

#### Admin SDK (`service-account.json`):
1. Firebase Console → ⚙ → Configuración del proyecto → Cuentas de servicio
2. "Generar nueva clave privada" → descargar JSON
3. Guardar en `backups/service-account.json`

---

## Archivos que NO están en el repo (hay que copiarlos)

| Archivo | Por qué está en .gitignore | Cómo obtenerlo en otra PC |
|---------|---------------------------|---------------------------|
| `.env.local` | Contiene claves de Firebase | Copiarlo desde la PC original, o regenerar desde Firebase Console |
| `backups/service-account.json` | Es una clave privada de Firebase Admin | Copiarlo desde la PC original, o regenerar desde Firebase Console |

---

## Archivos clave del proyecto

| Archivo | Rol |
|---------|------|
| `src/lib/firestore.ts` | Firebase-first: Firebase primario, IndexedDB fallback |
| `src/lib/db.ts` | IndexedDB: stores, CRUD local |
| `src/lib/realtime.ts` | onSnapshot centralizado (ref-counting, persistente por sesión) |
| `src/hooks/useRealtime.ts` | Hook React para tiempo real |
| `src/lib/local-first.ts` | Lecturas local-first con TTL de 5 min |
| `src/lib/sync.ts` | Chequeo de conectividad cada 60s |
| `scripts/reset-data.mjs` | Reset completo de datos transaccionales |
| `scripts/setup-nueva-pc.ps1` | Bootstrap automático para PC nueva |
| `AGENTS.md` | Guía técnica para IA y desarrolladores |
| `.env.local` | Claves Firebase Web SDK **(.gitignore)** |
| `backups/service-account.json` | Clave Firebase Admin **(.gitignore)** |

---

## Licencia

Uso interno — FALPAT SRL
