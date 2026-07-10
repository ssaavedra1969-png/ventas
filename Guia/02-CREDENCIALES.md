# 02 — Credenciales

Todos los secretos y claves necesarias para que el proyecto funcione.

---

## Archivos que NO están en GitHub (hay que copiarlos a cada PC)

| Archivo | Contenido | ¿Para qué sirve? |
|---------|-----------|------------------|
| `.env.local` | Claves de Firebase Web SDK | Conecta la app con Firebase desde el navegador |
| `backups/service-account.json` | Clave privada de Firebase Admin | Permite backup/restore desde Node.js |

Dónde están en la PC original:

```
C:\AI\Antigravity\FALPAT Ventas\.env.local
C:\AI\Antigravity\FALPAT Ventas\backups\service-account.json
```

---

## Cómo regenerar `.env.local` (si perdés el archivo)

1. Andá a https://console.firebase.google.com/project/leafy-valor-410916
2. ⚙ → Configuración del proyecto → Tus apps
3. Seleccionar la app web → "Config"
4. Copiar todo el bloque JSON al archivo `.env.local`

### Contenido esperado de `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBRv7md_UZBBPKDWPOSd3bEOyEb3KRkNZA
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=leafy-valor-410916.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=leafy-valor-410916
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=leafy-valor-410916.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=762559566200
NEXT_PUBLIC_FIREBASE_APP_ID=1:762559566200:web:b4c942e5f66e957224f88d
```

---

## Cómo regenerar `service-account.json` (si perdés el archivo)

1. Andá a https://console.firebase.google.com/project/leafy-valor-410916
2. ⚙ → Configuración del proyecto → Cuentas de servicio
3. Botón "Generar nueva clave privada"
4. Descargar el JSON
5. Guardarlo en `backups/service-account.json`

---

## Variables de entorno en Vercel

En https://vercel.com/ssaavedra1969-png/ventas/settings/environment-variables
están configuradas las mismas 6 variables del `.env.local`.
No hace falta tocarlas.

---

## Usuarios de Firebase Auth

La autenticación es por Email/Password.
Los usuarios se crean desde Firebase Console:

1. https://console.firebase.google.com/project/leafy-valor-410916/authentication/users
2. "Agregar usuario"
3. Email + contraseña

No hay registro público — solo el admin puede crear usuarios.
