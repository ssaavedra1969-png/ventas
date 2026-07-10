# 06 — Estado de los Datos

Situación actual de la base de datos y cómo hacer backup/restore.

---

## Estado actual (post-reset 09/07/2026)

| Colección | Documentos | Notas |
|-----------|------------|-------|
| clientes | 496 | Cargados |
| productos | 311 | Cargados |
| vendedores | 3 | Cargados |
| vehiculos | 0 | Vacío (importar desde la app) |
| choferes | 0 | Vacío (importar desde la app) |
| presupuestos | 0 | ✅ Listo para empezar |
| remitos | 0 | ✅ Listo para empezar |
| remitos_aprobados | 0 | ✅ Listo para empezar |
| facturas | 0 | ✅ Listo para empezar |
| salidas | 0 | ✅ Listo para empezar |

Contadores:

| ID | Valor |
|----|-------|
| cliente | 2115 |
| presupuesto_2026 | 0 |
| factura_2026 | 0 |
| remito_2026 | 0 |
| remito_aprobado_2026 | 0 |

---

## Backup

```bash
npm run backup
```

Guarda en: `backups/datos-AAAA-MM-DD_HHMMSS/`

Incluye todas las colecciones + copia de `service-account.json`.
También respalda el código fuente completo.

---

## Restore

```bash
npm run restore -- "ruta/al/backup/firestore"
```

⚠️ **Sobrescribe TODOS los datos** en Firebase con los del backup.
Usar con cuidado.

---

## Reset (vaciar datos de prueba)

```bash
node scripts/reset-data.mjs --force
```

Elimina: presupuestos, remitos, remitos_aprobados, facturas, salidas.
Resetea contadores a 0.
**Conserva:** clientes, productos, vendedores, vehiculos, choferes.

---

## Migración (legacy → nuevo formato)

```bash
npm run migrate
```

Convierte datos del formato anterior al actual. Ya está ejecutada.
