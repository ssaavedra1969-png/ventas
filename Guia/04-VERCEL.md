# 04 — Vercel

Configuración del deployment automático.

---

## Producción

**URL:** https://ventas-falpat.vercel.app

Cada `git push` a `main` despliega automáticamente.

---

## Dashboard

https://vercel.com/ssaavedra1969-png/ventas

Desde acá se puede ver:

| Sección | Qué muestra |
|---------|-------------|
| **Deployments** | Historial de builds, logs de error |
| **Environment Variables** | Las 6 variables del `.env.local` |
| **Domains** | Dominio personalizado (si se agrega) |
| **Analytics** | Estadísticas de visitas |
| **Logs** | Logs de serverless functions (si hay) |

---

## Configurar Vercel desde otra PC

Solo si querés hacer deploy manual o ver logs desde CLI:

```bash
npm i -g vercel
vercel login
vercel link     # vincular al proyecto ventas
vercel env pull # descargar .env.local desde Vercel (alternativa a copiarlo)
```

---

## Variables de entorno en Vercel

Ya están configuradas (las 6 del `.env.local`).
Si cambiás Firebase, actualizalas en:
Vercel Dashboard → Project → Settings → Environment Variables

---

## Build settings

| Configuración | Valor |
|---------------|-------|
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Node.js version | 20.x (por defecto) |
