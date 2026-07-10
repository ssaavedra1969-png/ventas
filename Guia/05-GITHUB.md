# 05 — GitHub

Configuración del repositorio y cómo trabajar con él.

---

## Repositorio

| Propiedad | Valor |
|-----------|-------|
| URL | https://github.com/ssaavedra1969-png/ventas |
| Rama principal | `main` |
| Dueño | `ssaavedra1969-png` |

---

## Clonar en una PC nueva

```bash
git clone https://github.com/ssaavedra1969-png/ventas.git
cd ventas
```

---

## Autenticación para pushear

En cada PC nueva hay que configurar identidad y método de acceso:

### 1. Identidad

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 2. Método de acceso

Elegir uno:

#### Opción A: Personal Access Token (recomendado)

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. "Generate new token" → seleccionar solo el repo `ventas` con permisos `Contents: Write`
3. Copiar el token
4. Usar como contraseña cuando git lo pida

#### Opción B: SSH

```bash
ssh-keygen -t ed25519
cat ~/.ssh/id_ed25519.pub
```

Copiar la clave pública a: GitHub → Settings → SSH and GPG keys → New SSH key

#### Opción C: GitHub CLI

```bash
winget install GitHub.cli   # Windows
gh auth login               # Login por navegador
```

---

## Flujo de trabajo diario

```bash
git pull            # bajar cambios de otros
# ... trabajar ...
git add -A
git commit -m "qué cambió"
git push            # deploy automático a Vercel
```

---

## Archivos ignorados por Git (`.gitignore`)

No se suben al repositorio:

| Archivo | Motivo |
|---------|--------|
| `.env.local` | Claves de Firebase |
| `backups/service-account.json` | Clave privada Firebase Admin |
| `backups/datos-*/` | Backups de datos (grandes) |
| `backups/proyecto-*/` | Backups de proyecto |
| `backups/*.json` | Exportaciones temporales |
| `.next/` | Build output |
| `node_modules/` | Dependencias |
