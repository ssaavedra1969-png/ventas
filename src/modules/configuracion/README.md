# Módulo: Configuración

## Identidad del módulo

| Campo | Valor |
|-------|-------|
| **Colección Firebase** | `configuracion` (documento único: `empresa`) |
| **Ubicación** | `src/modules/configuracion/` |
| **API pública** | `src/modules/configuracion/index.ts` |

## Dependencias

- `shared/firebase.ts` — instancia de Firestore
- `shared/db.ts` — IndexedDB fallback
- Ningún otro módulo

## ¿Quién depende de Configuración?

| Módulo/Página | ¿Qué usa? |
|--------------|-----------|
| `modules/presupuestos/service.ts` | `getTipoFactura()` para calcular IVA |
| `modules/clientes/service.ts` | `CONDICIONES_IVA`, `getIvaRate()` |
| `app/dashboard/remitos/page.tsx` | `getEmpresaConfig()` para WhatsApp admin |
| `app/dashboard/remitos/nuevo/page.tsx` | `getEmpresaConfig()` + `getTipoFactura()` |
| `app/dashboard/configuracion/page.tsx` | `getEmpresaConfig()` + `saveEmpresaConfig()` |

## API Pública

### `getEmpresaConfig(): Promise<EmpresaConfig>`
- **Origen:** Firebase `configuracion/empresa`
- **Fallback:** IndexedDB `configuracion` store
- **Si no existe:** Retorna defaults (razonSocial vacía, etc.)

### `saveEmpresaConfig(data: EmpresaConfig): Promise<void>`
- **Proceso:** `setDoc(configuracion/empresa, data)`
- **Si Firebase falla:** Lanza error (no encola)

### `getTipoFactura(condicionIVA: string): 'A' | 'B'`
- **Síncrono:** No llama a Firebase
- **Lógica:** `RI` o `Monotributo` → `'A'`, sino → `'B'`

### `getIvaRate(condicionIVA: string): number`
- **Síncrono:** Retorna 0.21 (tasa fija IVA)

## Constantes exportadas

```ts
CONDICIONES_IVA = ['CF', 'Exento', 'RI', 'Monotributo']
CONDIVA_LABEL = { CF: 'Consumidor Final', Exento: 'Exento', RI: 'Resp. Inscripto', Monotributo: 'Monotributo' }
```

## Diagnóstico rápido

| Síntoma | Causa | Dónde mirar |
|---------|-------|-------------|
| Error "No se puede guardar config" | Firebase write falló | `service.ts` → saveEmpresaConfig |
| IVA incorrecto en presupuesto | `getTipoFactura` con condición desconocida | `service.ts` → getTipoFactura |
| Teléfono admin no aparece en WhatsApp | `empresa.telefonoAdmin` no está configurado | Firestore Console: `configuracion/empresa` |
