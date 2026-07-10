# 01 — Setup PC Nueva

Cómo dejar el proyecto funcionando exactamente igual que en la PC original.

---

## Requisitos previos

Instalar en la PC nueva:

| Software | Versión | Descargar |
|----------|---------|-----------|
| Node.js | 18 o superior | https://nodejs.org/ |
| Git | cualquier versión | https://git-scm.com/ |
| Chrome o Edge | última | https://www.google.com/chrome/ |
| VS Code (opcional) | última | https://code.visualstudio.com/ |

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/ssaavedra1969-png/ventas.git
cd ventas
```

---

## Paso 2 — Copiar los archivos de credenciales

Copiar la carpeta **completa** de la PC original a la PC nueva (por USB):

```
PC original:
  📁 ventas/Guia/    ← todo, incluyendo confidencial/

PC nueva:
  📁 ventas/Guia/
```

O manualmente, copiar estos **2 archivos**:

```
Guia/confidencial/.env.local            →  ventas/.env.local
Guia/confidencial/service-account.json  →  ventas/backups/service-account.json
```

⚠️ **Estos archivos NO están en GitHub** porque contienen secretos.
Sin ellos, la app no puede conectarse a Firebase.

---

## Paso 3 — Instalar dependencias

```bash
npm install
```

---

## Paso 4 — ¡A trabajar!

```bash
npm run dev        # http://localhost:3000
npm run build      # Build de producción
```

---

## Setup automático

En PowerShell, parado en la carpeta `ventas`:

```powershell
.\scripts\setup-nueva-pc.ps1
```

Hace los pasos 1, 3 y 4 automáticamente y te guía con las credenciales.

---

## Alternativa: solo usar la app (sin instalar nada)

Si no necesitás modificar el código, directamente:

```
https://ventas-falpat.vercel.app
```

Instalala como app desde el icono ⊕ de Chrome/Edge para que quede en el escritorio.
