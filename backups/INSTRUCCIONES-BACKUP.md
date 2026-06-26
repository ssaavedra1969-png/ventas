# Procedimiento de Backup — FALPAT SRL

Este documento explica cómo realizar respaldos del sistema utilizando
los scripts de `backups/`.

Existen **dos tipos de backup independientes** que se generan en **carpetas separadas**:

| Backup | Carpeta generada | ¿Qué incluye? | ¿Cada cuánto? |
|--------|-----------------|---------------|---------------|
| **Datos** | `backups\datos-{timestamp}\` | Clientes, productos, vendedores, remitos, contadores (Firestore) | Diario / antes de cambios grandes |
| **Proyecto** | `backups\proyecto-{timestamp}\` | Código fuente, configuraciones, `.env.local` | Semanal / después de cambios de código |

El script **completo** (`backup.ps1`) ejecuta ambos en un solo paso, generando las dos carpetas.

---

## 📦 Backup completo (datos + proyecto)

### Requisito
`backups\service-account.json` debe existir (clave de servicio Firebase Admin).
Si falta, obtenerla desde Firebase Console → Project Settings → Service Accounts → Generate New Private Key.

### Cómo hacerlo

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup.ps1
```

### Resultado

Se crean **dos carpetas** con el mismo timestamp:

```
backups\
├── datos-2026-06-26_143000\
│   ├── firestore\
│   │   ├── clientes.json
│   │   ├── productos.json
│   │   ├── vendedores.json
│   │   ├── remitos.json
│   │   ├── contadores.json
│   │   └── service-account.json
│   └── manifest.json
│
└── proyecto-2026-06-26_143000\
    ├── source\
    │   ├── src\
    │   ├── scripts\
    │   ├── public\
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── next.config.mjs
    │   ├── tailwind.config.ts
    │   ├── vercel.json
    │   └── ...
    ├── env\
    │   └── .env.local
    └── manifest.json
```

Si solo se necesita respaldar datos (más rápido):

```powershell
.\backups\backup.ps1 -SkipFirestore
```
(Omitir Firestore es útil si ya se hizo un backup de datos recientemente y solo se tocó código.)

---

## 📦 Backup solo de DATOS

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup-datos.ps1
```

Genera: `backups\datos-{timestamp}\`

---

## 📦 Backup solo de PROYECTO

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup-proyecto.ps1
```

Genera: `backups\proyecto-{timestamp}\`

Excluye automáticamente `node_modules/`, `.next/`, `.git/`, `backups/`, `.vercel/`.

---

## 🔄 Resumen de comandos rápidos

| Acción | Comando |
|--------|---------|
| Backup completo (datos + proyecto) | `.\backups\backup.ps1` |
| Backup solo de DATOS | `.\backups\backup-datos.ps1` |
| Backup solo de PROYECTO | `.\backups\backup-proyecto.ps1` |
| Restaurar datos Firestore | `npm run restore -- ".\backups\datos-XXXX\firestore"` |
| Iniciar app local | `npm run dev` |
| Build producción | `npm run build` |
| Deploy a Vercel | `git push` (deploy automático) |

---

## ⚠️ Notas importantes

- **Service account**: `service-account.json` nunca debe subirse a git (ya está en `.gitignore`).
  Solo vive en `backups/` y dentro de los backups de datos.
- **Los datos son la fuente de verdad**: el código se regenera (GitHub, backup de proyecto),
  las dependencias se reinstalan con `npm install`. Pero los datos (clientes, productos, remitos)
  solo existen en Firestore. Por eso el backup de datos es el más crítico.
- **Frecuencia recomendada**:
  - Datos: diario, o antes de cualquier cambio de estructura
  - Proyecto: semanal, o después de cada cambio de código relevante
  - Completo: antes de migraciones, cambios de framework, o refactors grandes
- **Los backups se guardan localmente** en `backups/`. No se suben a git (están en `.gitignore`).
  Si se necesita almacenamiento externo, copiar las carpetas del backup a un drive externo o nube.
- **Verificar el backup**: después de ejecutar, revisar que los JSON tengan datos
  (abrir uno y verificar que no esté vacío o con `[]` solamente).
- **Timestamp compartido**: al usar `backup.ps1`, ambas carpetas (`datos-*` y `proyecto-*`)
  comparten el mismo timestamp para facilitar la correlación.
