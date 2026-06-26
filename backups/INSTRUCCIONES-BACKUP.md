# Procedimiento de Backup — FALPAT SRL

Este documento explica cómo realizar respaldos del sistema utilizando
los scripts de `backups/`.

Existen **dos tipos de backup independientes**:

| Backup | ¿Qué incluye? | ¿Cada cuánto? |
|--------|---------------|---------------|
| **Datos** (`backup-datos.ps1`) | Clientes, productos, vendedores, remitos, contadores (Firestore) | Diario / antes de cambios grandes |
| **Proyecto** (`backup-proyecto.ps1`) | Código fuente, configuraciones, `.env.local` | Semanal / después de cambios de código |
| **Completo** (`backup.ps1`) | Ambos anteriores en un solo paso | Antes de migraciones o refactors grandes |

---

## 📦 Backup de DATOS

Contenido:
```
datos-YYYY-MM-DD_HHmmss/
├── firestore/
│   ├── clientes.json
│   ├── productos.json
│   ├── vendedores.json
│   ├── remitos.json
│   ├── contadores.json
│   └── service-account.json
└── manifest.json
```

### Requisito
`backups/service-account.json` debe existir (es la clave de servicio de Firebase Admin).
Si falta, obtenerla desde Firebase Console → Project Settings → Service Accounts → Generate New Private Key.

### Cómo hacerlo

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup-datos.ps1
```

Esto crea una carpeta `backups\datos-{fecha}\` con los JSON exportados.

### Salida esperada
```
========================================
  FALPAT SRL - Backup de DATOS
========================================
Destino: C:\AI\Antigravity\FALPAT Ventas\backups\datos-2026-06-26_143000

[1/3] Copiando service-account.json...
  service-account.json copiado.
[2/3] Exportando datos de Firestore...
  Exportadas 5 colecciones (495 clientes, 311 productos, ...)
  Datos exportados correctamente.
[3/3] Generando manifiesto...
  Manifiesto generado.

========================================
  BACKUP DE DATOS COMPLETADO
========================================
  Destino: C:\AI\Antigravity\FALPAT Ventas\backups\datos-2026-06-26_143000
  Tamaño:  XYZ KB
```

---

## 📦 Backup de PROYECTO

Contenido:
```
proyecto-YYYY-MM-DD_HHmmss/
├── source/
│   ├── src/
│   ├── scripts/
│   ├── Clientes/
│   ├── Productos/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── vercel.json
│   └── ...
├── env/
│   └── .env.local
└── manifest.json
```

### Cómo hacerlo

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup-proyecto.ps1
```

Esto excluye automáticamente `node_modules/`, `.next/`, `.git/`, `backups/`, `.vercel/`.

---

## 📦 Backup COMPLETO (datos + proyecto)

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup.ps1
```

También puede omitirse la exportación de Firestore si no se necesita:

```powershell
.\backups\backup.ps1 -SkipFirestore
```

---

## 🔄 Resumen de comandos rápidos

| Acción | Comando |
|--------|---------|
| Backup de DATOS | `.\backups\backup-datos.ps1` |
| Backup de PROYECTO | `.\backups\backup-proyecto.ps1` |
| Backup completo | `.\backups\backup.ps1` |
| Restaurar datos Firestore | `npm run restore -- ".\backups\datos-XXXX\firestore"` |
| Iniciar app local | `npm run dev` |
| Build producción | `npm run build` |
| Deploy a Vercel | `git push` (deploy automático) |

---

## ⚠️ Notas importantes

- **Service account**: `service-account.json` nunca debe subirse a git (ya está en `.gitignore`).
  Solo vive en `backups/` y en los backups de datos.
- **Los datos son la fuente de verdad**: el código se regenera (GitHub, backup de proyecto),
  las dependencias se reinstalan con `npm install`. Pero los datos (clientes, productos, remitos)
  solo existen en Firestore. Por eso el backup de datos es el más crítico.
- **Frecuencia recomendada**:
  - Datos: diario, o antes de cualquier cambio de estructura
  - Proyecto: semanal, o después de cada cambio de código relevante
  - Completo: antes de migraciones, cambios de framework, o refactors grandes
- **Los backups se guardan localmente** en `backups/`. No se suben a git (están en `.gitignore`).
  Si se necesita almacenamiento externo, copiar la carpeta del backup a un drive externo o nube.
- **Verificar el backup**: después de ejecutar el script, revisar que los JSON tengan datos
  (abrir uno y verificar que no esté vacío o con `[]` solamente).
