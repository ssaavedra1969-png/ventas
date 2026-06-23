# Procedimiento de Restauración — FALPAT SRL

Este documento explica cómo recuperar **todos los datos del sistema** a partir de un backup
realizado con `backup.ps1`.

---

## 📦 Contenido del backup

```
backup-2026-06-23_183551/
├── source/                  ← Código fuente completo de la app
│   ├── src/
│   ├── scripts/
│   ├── Clientes/
│   ├── Productos/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vercel.json
│   └── ...
├── env/
│   └── .env.local           ← Variables de entorno (API keys de Firebase)
├── firestore/               ← Datos exportados de Firestore
│   ├── clientes.json
│   ├── productos.json
│   ├── vendedores.json
│   ├── remitos.json
│   ├── contadores.json
│   └── service-account.json
└── manifest.json            ← Resumen del backup
```

---

## 🔁 Escenario 1: Restaurar solo los datos de Firestore

Usar cuando el código ya existe pero los datos se perdieron o corrompieron.

### Requisito previo

Tené el archivo `service-account.json` (clave privada de Firebase) en la raíz de `backups/`.

Si no lo tenés:
1. Andá a [Firebase Console](https://console.firebase.google.com)
2. Proyecto: **leafy-valor-410916**
3. ⚙️ Configuración del proyecto → **Cuentas de servicio**
4. Hacé clic en **"Generar nueva clave privada"**
5. Guardá el archivo como `backups/service-account.json`

### Paso a paso

1. Abrí **PowerShell** como administrador
2. Navegá a la carpeta del proyecto:
   ```powershell
   cd C:\AI\Antigravity\FALPAT Ventas
   ```
3. Identificá la carpeta del backup que querés restaurar, por ejemplo:
   ```
   C:\AI\Antigravity\FALPAT Ventas\backups\backup-2026-06-23_183551\
   ```
4. Ejecutá el comando de restauración apuntando a la carpeta `firestore` del backup:
   ```powershell
   npm run restore -- ".\backups\backup-2026-06-23_183551\firestore"
   ```
   Reemplazá la fecha por la del backup que quieras usar.

5. El script mostrará el progreso de cada colección:
   ```
   Restaurando clientes...
     → 15/15 documentos restaurados
   Restaurando productos...
     → 42/42 documentos restaurados
   ...
   ✓ Restauración completada: 123/123 documentos restaurados
   ```

   **Advertencia:** La restauración **sobrescribe** los documentos existentes con el
   mismo ID. Si un documento ya existe en Firestore con el mismo ID, será reemplazado.

---

## 🔁 Escenario 2: Restaurar todo (código + datos + deploy)

Usar cuando hay que reconstruir el sistema desde cero en una computadora nueva.

### Paso 1: Instalar herramientas necesarias

```powershell
# Instalar Node.js (versión 18 o superior)
# Descargar desde: https://nodejs.org/

# Instalar Git
# Descargar desde: https://git-scm.com/

# Verificar instalación
node --version    # Debe mostrar v18.x o superior
npm --version     # Debe mostrar 10.x o superior
git --version     # Debe mostrar 2.x o superior
```

### Paso 2: Clonar el repositorio

```powershell
cd C:\AI\Antigravity
git clone https://github.com/ssaavedra1969-png/ventas.git
cd ventas
```

### Paso 3: Restaurar el código desde el backup

Si no podés clonar (no hay internet o el repo se perdió), copiá la carpeta `source/`
del backup como reemplazo del proyecto:

```powershell
# Borrar lo clonado (si no hay repo, saltear este paso)
Remove-Item -Recurse -Force "C:\AI\Antigravity\FALPAT Ventas\*"

# Copiar el código del backup
Copy-Item -Recurse -Force ".\backups\backup-2026-06-23_183551\source\*" "C:\AI\Antigravity\FALPAT Ventas\"
```

### Paso 4: Restaurar variables de entorno

```powershell
Copy-Item ".\backups\backup-2026-06-23_183551\env\.env.local" "C:\AI\Antigravity\FALPAT Ventas\.env.local"
```

**Importante:** Si las credenciales de Firebase cambiaron (otra cuenta, otro proyecto),
actualizá el archivo `.env.local` con los nuevos valores. El formato es:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=1:...
```

### Paso 5: Instalar dependencias

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
npm install
```

### Paso 6: Restaurar datos de Firestore

Necesitás la clave de service account. Si no está en el backup, generala de nuevo
desde Firebase Console (ver "Requisito previo" en Escenario 1).

```powershell
# Copiar service-account.json al lugar esperado
Copy-Item ".\backups\backup-2026-06-23_183551\firestore\service-account.json" ".\backups\service-account.json"

# Restaurar datos
npm run restore -- ".\backups\backup-2026-06-23_183551\firestore"
```

### Paso 7: Verificar la app localmente

```powershell
npm run dev
```

Abrí en el navegador: http://localhost:3000
Verificá que:
- El dashboard cargue sin errores
- Los clientes, productos y vendedores estén visibles
- Los remitos existentes se vean correctamente

### Paso 8: Re-deploy a Vercel (opcional)

Si el deploy también se perdió:

```powershell
# Instalar Vercel CLI si no está
npm install -g vercel

# Hacer deploy
vercel --prod
```

O conectá el repositorio desde [Vercel Dashboard](https://vercel.com):
1. Importá el repositorio `ssaavedra1969-png/ventas`
2. Framework: **Next.js**
3. Variables de entorno: copiá las de `.env.local`
4. Deploy → la URL será: `https://ventas-falpat.vercel.app`

---

## 🧪 Verificación post-restauración (checklist)

Después de restaurar, marcá estos puntos:

- [ ] **Dashboard** carga sin errores
- [ ] **Clientes**: lista completa con CUIT, razón social, dirección, teléfono
- [ ] **Productos**: nombres, tipos, medidas, valores unitarios visibles
- [ ] **Vendedores**: códigos y nombres correctos
- [ ] **Remitos**: se abre la vista pública, items, vendedor, observaciones OK
- [ ] **Crear remito**: se puede seleccionar cliente + vendedor, agregar productos,
      vista previa con bonificación, generar remito y redirige correctamente
- [ ] **Importación Excel**: drag & drop, preview, resultado registro por registro

---

## ⚠️ Notas importantes

### Service account

La clave `service-account.json` **nunca debe subirse a git**. Ya está excluida en
`.gitignore`. Mantenela siempre fuera del repositorio, solo en `backups/`.

### Los datos de Firestore son la fuente de verdad

Todo lo que no está en Firestore se puede regenerar:
- El código se vuelve a bajar de GitHub
- Las dependencias se reinstalan con `npm install`
- El deploy se hace con `vercel --prod`

Pero los **datos** (clientes, productos, remitos, vendedores) solo existen en
Firestore. Por eso es crítico tener backups periódicos.

### Programa recordatorio de backups

Ejecutá este comando periódicamente (ej: cada viernes):

```powershell
cd C:\AI\Antigravity\FALPAT Ventas
.\backups\backup.ps1
```

Agendalo en Windows Task Scheduler para automatizarlo:
1. Abrí **Task Scheduler**
2. Crear tarea básica → nombre "Backup FALPAT"
3. Disparador: semanal, viernes 18:00
4. Acción: iniciar programa → `powershell.exe`
5. Argumentos: `-NoProfile -File "C:\AI\Antigravity\FALPAT Ventas\backups\backup.ps1"`

---

## 🔄 Resumen de comandos rápidos

| Acción | Comando |
|---|---|
| Hacer backup completo | `.\backups\backup.ps1` |
| Backup sin Firestore | `.\backups\backup.ps1 -SkipFirestore` |
| Restaurar datos Firestore | `npm run restore -- ".\backups\backup-XXXX\firestore"` |
| Iniciar app local | `npm run dev` |
| Build producción | `npm run build` |
| Deploy a Vercel | `vercel --prod` |
