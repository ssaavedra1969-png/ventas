# Procedimiento de Restauración — FALPAT SRL

Este documento explica cómo recuperar el sistema a partir de los backups
realizados con los scripts de `backups/`.

Existen **dos backups independientes**:

| Backup | ¿Qué incluye? | ¿Cada cuánto? |
|--------|---------------|---------------|
| **Datos** (`backup-datos.ps1`) | Clientes, productos, vendedores, remitos, contadores (Firestore) | Diario / antes de cambios grandes |
| **Proyecto** (`backup-proyecto.ps1`) | Código fuente, configuraciones, `.env.local` | Semanal / después de cambios de código |

---

## 📦 Backup de DATOS

Contenido:
```
datos-2026-06-24_143000/
├── firestore/
│   ├── clientes.json
│   ├── productos.json
│   ├── vendedores.json
│   ├── remitos.json
│   ├── contadores.json
│   └── service-account.json
└── manifest.json
```

### Cómo hacerlo

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup-datos.ps1
```

### Cómo restaurar

Requisito: tener `service-account.json` en `backups/`.

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
npm run restore -- ".\backups\datos-2026-06-24_143000\firestore"
```

Reemplazá la fecha por la del backup que quieras usar.

**Advertencia:** Sobrescribe los documentos existentes con el mismo ID.

---

## 📦 Backup de PROYECTO

Contenido:
```
proyecto-2026-06-24_143000/
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

### Cómo restaurar (desde otra PC o desde cero)

#### Paso 1: Instalar herramientas

```powershell
# Node.js 18+ desde https://nodejs.org/
# Git desde https://git-scm.com/

node --version   # v18.x o superior
npm --version    # 10.x o superior
```

#### Paso 2: Copiar el proyecto

```powershell
# Crear carpeta destino
mkdir C:\AI\Antigravity\FALPAT Ventas

# Copiar el source del backup
Copy-Item -Recurse -Force ".\proyecto-2026-06-24_143000\source\*" "C:\AI\Antigravity\FALPAT Ventas\"

# Copiar variables de entorno
Copy-Item ".\proyecto-2026-06-24_143000\env\.env.local" "C:\AI\Antigravity\FALPAT Ventas\.env.local"
```

#### Paso 3: Instalar dependencias

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
npm install
```

#### Paso 4: Restaurar datos (opcional, si también se perdieron)

```powershell
# Copiar service-account.json del backup de datos
Copy-Item ".\datos-2026-06-24_143000\firestore\service-account.json" ".\backups\service-account.json"

# Restaurar datos
npm run restore -- ".\datos-2026-06-24_143000\firestore"
```

#### Paso 5: Verificar

```powershell
npm run dev
Abrir http://localhost:3000
```

#### Paso 6: Re-deploy a Vercel (opcional)

```powershell
vercel --prod
```

---

## 🧪 Checklist de verificación post-restauración

- [ ] **Dashboard** carga sin errores
- [ ] **Clientes**: lista con CUIT, razón social, dirección, teléfono
- [ ] **Productos**: nombres, tipos, medidas, valores unitarios
- [ ] **Vendedores**: códigos y nombres
- [ ] **Remitos**: vista pública funciona, items correctos
- [ ] **Facturación**: pagos y estados visibles
- [ ] **Crear remito**: selección de cliente + vendedor + productos

---

## ⚠️ Notas importantes

### Service account
`service-account.json` **nunca debe subirse a git**. Ya está excluido en `.gitignore`.
Mantenelo siempre solo en `backups/`.

### Los datos son la fuente de verdad
El código se puede regenerar (GitHub, backup de proyecto). Las dependencias se reinstalan
con `npm install`. Pero los **datos** (clientes, productos, remitos) solo existen en
Firestore. Por eso el backup de datos es el más crítico.

---

## 🔄 Resumen de comandos rápidos

| Acción | Comando |
|--------|---------|
| Backup de DATOS | `.\backups\backup-datos.ps1` |
| Backup de PROYECTO | `.\backups\backup-proyecto.ps1` |
| Backup completo (original) | `.\backups\backup.ps1` |
| Restaurar datos Firestore | `npm run restore -- ".\backups\datos-XXXX\firestore"` |
| Iniciar app local | `npm run dev` |
| Build producción | `npm run build` |
| Deploy a Vercel | `vercel --prod` |
