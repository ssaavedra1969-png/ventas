# FALPAT Ventas - Session State

## Último: 25/06/2026

### Deploy actual
- URL: https://ventas-falpat.vercel.app
- Build OK, compilación sin errores

### Últimos backups
- `backups\datos-2026-06-25_165449\` (495 clientes, 314 productos, 3 vendedores, 3 remitos, 2 contadores)
- `backups\proyecto-2026-06-25_165449\`

### Lo último que se hizo
1. **Bug de IVA corregido y deployado** — `valorUnitario` e `item.subtotal` son precios sin IVA. El código hacía `subtotal / 1.21` como si incluyeran IVA. Fix:
   - `iva = subtotal * 0.21` (en vez de `subtotal - subtotal/1.21`)
   - `totalGeneral = subtotal + iva`
   - `Importe Neto Gravado` = `subtotalGeneral` (sin dividir)
   - Archivos tocados: `firestore.ts`, `nuevo/page.tsx`, `[id]/page.tsx`
2. **Export Firestore arreglado** — adaptado a firebase-admin v14 (`getFirestore`, `Timestamp`, `DocumentReference` importados de `firebase-admin/firestore`)

### Pendiente / En Progreso
- Bug de pagos: "Error al registrar pago" en facturación — esperando que el usuario pruebe y reporte el error de consola (F12)
- Sincronización multiusuario para clientes (onSnapshot)
- Persistencia formulario nuevo remito al navegar entre secciones

### A tener en cuenta
- Firebase Spark plan (~50K lecturas/día) — se optimizó a getDocs + caché en memoria con 30s TTL
- `onSnapshot` reemplazado por `getDocs` + botón "Actualizar"
- No tocar funcionalidad existente sin pedido explícito
- AutocompleteInput requiere 2+ caracteres
- IVA: Factura A (RI/Monotributo) → IVA discriminado; Factura B (CF/Exento) → "IVA incluido"
- Pagos: array dentro del documento remito (Efectivo, Transferencia, Cheque, Débito, Crédito)
