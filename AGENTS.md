# FALPAT Ventas - Session State

## Último: 26/06/2026

### Deploy actual
- URL: https://ventas-falpat.vercel.app
- Build OK, compilación sin errores

### Últimos backups
- `backups\datos-2026-06-25_165449\` (495 clientes, 314 productos, 3 vendedores, 3 remitos, 2 contadores)
- `backups\proyecto-2026-06-25_165449\`

### Lo último que se hizo
1. **Remito de Salida movido a Entregas** — página movida de `/entregas/salida/[remitoId]/[entregaId]` a `/dashboard/entregas/salida/[remitoId]/[entregaId]` (dentro del dashboard, con sidebar). Sacado el icono FileText del listado de remitos. Botón Printer en cada DeliveryCard del calendario.
2. **Bug pagos fix**: 4 arreglos — validación NaN cliente/server, catch relee IndexedDB, variable stale corregida
3. **Persistencia formulario remito**: hook `useFormDraft` con IndexedDB, debounce 500ms, auto-limpieza
4. **Background sync clientes**: `useBackgroundSync` con polling 2min + visibilitychange
5. **Lint fixes**: imports no usados eliminados, dependencias useMemo corregidas
6. **Rediseño Plan de Entregas**: cards pendientes con scroll y progreso, 10 colores únicos por remito, stats animadas, hover previews 220px

### Setup en otra PC
```bash
git clone https://github.com/ssaavedra1969-png/ventas.git
cd ventas
npm install
```

Copiar `.env.example` a `.env.local` y completar las credenciales de Firebase (las mismas de siempre). Luego:
```bash
npm run dev     # desarrollo http://localhost:3000
npm run build   # build producción
```

### A tener en cuenta
- Firebase Spark plan (~50K lecturas/día) — se optimizó a getDocs + caché en memoria con 30s TTL
- `onSnapshot` reemplazado por `getDocs` + botón "Actualizar"
- **Offline-first**: IndexedDB (`idb`) como capa local. Firebase falla → usa datos locales. Escrituras offline se encolan y sincronizan automáticamente cuando Firebase vuelve. Indicador SyncStatus en el header.
- No tocar funcionalidad existente sin pedido explícito
- AutocompleteInput requiere 2+ caracteres
- IVA: Factura A (RI/Monotributo) → IVA discriminado; Factura B (CF/Exento) → "IVA incluido"
- Pagos: array dentro del documento remito (Efectivo, Transferencia, Cheque, Débito, Crédito)
