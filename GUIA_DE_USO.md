# Guía de Uso — FALPAT Ventas

## Índice

1. [Estructura general](#1-estructura-general)
2. [Dashboard — Panel principal](#2-dashboard--panel-principal)
3. [Parametrías — Datos maestros](#3-parametrías--datos-maestros)
4. [Presupuestos](#4-presupuestos)
5. [Remitos](#5-remitos)
6. [Facturación](#6-facturación)
7. [Salidas (Entregas)](#7-salidas-entregas)
8. [Ver documento compartido](#8-ver-documento-compartido)
9. [Informes](#9-informes)
10. [Flujo completo resumido](#10-flujo-completo-resumido)

---

## 1. Estructura general

### Barra lateral (menú principal)

La navegación se organiza en secciones:

```
PRINCIPAL
  Dashboard            → Panel con estadísticas del mes

PARAMETRÍAS
  Parametrías          → Clientes, Productos, Vendedores, Vehículos, Choferes

COMERCIAL
  Nuevo Presupuesto    → Crear presupuesto paso a paso
  Presupuestos         → Lista de presupuestos enviados/aprobados/anulados
  Remitos              → Lista de remitos con estados y facturación
  Facturación          → Gestión de cobranza y pagos

LOGÍSTICA
  Salidas              → Calendario de entregas / planificación

INFORMES
  Informes             → Estadísticas generales

CONFIGURACIÓN
  Configuración        → Datos de la empresa
```

### Header

En la parte superior se muestra el **SyncStatus** (indicador verde = conectado, rojo = sin conexión). La app funciona offline para lectura; las escrituras requieren conexión.

---

## 2. Dashboard — Panel principal

**Ruta:** `/dashboard`

### Qué ves al entrar

Tres tarjetas con efecto 3D:

| Tarjeta | Muestra |
|---------|---------|
| **Remitos del Mes** | Cantidad de remitos creados en el mes actual |
| **Total Facturado** | Suma total facturada (con animación de conteo) |
| **Clientes Activos** | Cantidad total de clientes registrados |

### Presupuestos Pendientes

Si hay presupuestos en estado **Enviado** (pendientes de aprobación), aparece una sección con:
- Un badge con la cantidad
- Hasta 5 presupuestos listados con: número, cliente y total
- Botón **"Ver todos"** que lleva a la página de Presupuestos

### Últimos Remitos

Lista los últimos 5 remitos (tanto legacy como aprobados) con:
- Número de remito, cliente, CUIT
- Estado (Revisión / A Despachar / etc.)
- Estado de cobranza: **Pendiente** (rojo) / **Parcial** (amarillo) / **Pagado** (verde)
- Total y N° de factura si aplica
- Cada fila es un link al detalle del documento

---

## 3. Parametrías — Datos maestros

**Ruta:** `/dashboard/parametrias`

Desde acá se accede a 5 subpáginas. Todas se actualizan en **tiempo real**: cuando alguien agrega o edita un registro, el cambio se ve al instante sin recargar.

### 3.1 Clientes

**Ruta:** `/dashboard/parametrias/clientes`

**Qué hacer acá:** Administrar los clientes.

**Campos del formulario:**
- Código (se genera automáticamente al crear)
- Razón Social
- Tipo de Documento (CUIT/DNI)
- Número de Documento
- Actividad
- Domicilio
- Localidad
- Teléfono
- Condición de IVA: `RI` (Responsable Inscripto), `CF` (Consumidor Final), `Monotributo`, `Exento`

**Acciones disponibles:**
- **Nuevo Cliente** — botón violeta arriba a la derecha
- **Editar** (lápiz) — modificar datos de un cliente existente
- **Eliminar** (tacho rojo) — borrar cliente (requiere confirmación)
- **Excel** — exportar todos los clientes a un archivo Excel
- **Carga Masiva** — importar clientes desde Excel
- **Buscar** — campo de búsqueda por razón social o código
- **Ordenar** — click en cualquier columna para ordenar (asc/desc)

> **Nota:** `condicionIVA` es clave porque determina si el presupuesto lleva IVA detallado (Factura A) o incluido (Factura B).

### 3.2 Productos

**Ruta:** `/dashboard/parametrias/productos`

**Qué hacer acá:** Administrar el catálogo de productos.

**Campos:**
- Código Producto (5 dígitos)
- Nombre
- Tipo (Aglomerados, Herrería, Electricidad, Pinturería, Sanitarios, Cemento, Arena/Piedra, Hierros, Madera, Pisos, Techos, Otros)
- Medida (Kg, Unidad, m3, Litro, Metro, m2, Bolsa, Pallet)
- Precio C/IVA (con IVA incluido)
- Precio S/IVA (se calcula automático = C/IVA / 1.21)
- Stock

**Acciones:** mismas que Clientes (Nuevo, Editar, Eliminar, Excel, Carga Masiva, Buscar, Ordenar).

### 3.3 Vendedores

**Ruta:** `/dashboard/parametrias/vendedores`

**Qué hacer acá:** Administrar vendedores y ver su rendimiento.

**Campos:** Código (ej: AG, JC), Nombre

**Sección de estadísticas:**
- Al hacer click en **"Estadísticas"** (botón con gráfico), se muestra el rendimiento de cada vendedor:
  - Remitos totales, facturado, ítems vendidos
  - Último remito (fecha)
  - Ranking con trofeo
  - Barra de rendimiento relativo
  - Desglose por estado de remitos

### 3.4 Vehículos

**Ruta:** `/dashboard/parametrias/vehiculos`

**Qué hacer acá:** Registrar los vehículos usados para entregas.

- **Importar vehículos** — carga los 30 vehículos predefinidos de la flota (Scania, Mercedes Benz, etc.)
- **Agregar** — formulario inline para añadir patente + marca
- **Eliminar** (tacho rojo) — requiere confirmación con `confirm()`

### 3.5 Choferes

**Ruta:** `/dashboard/parametrias/vehiculos` (misma página, columna derecha)

**Qué hacer acá:** Registrar choferes para las entregas.

- **Importar choferes** — botón de upload, pide ingresar nombres (uno por línea)
- **Agregar / Editar** — nombre, documento, teléfono
- **Eliminar** (tacho rojo)

---

## 4. Presupuestos

### 4.1 Crear nuevo presupuesto

**Ruta:** `/dashboard/presupuestos/nuevo`

**Pantalla paso a paso (3 pasos):**

#### Paso 1 — Seleccionar Cliente y Vendedor

**Qué ves:**
- Campo de búsqueda de cliente con autocompletado
- Al seleccionar un cliente se ve su información (razón social, CUIT, domicilio, condición IVA)
- Selector de vendedor (opcional)

**Qué hacer:**
1. Empezá a escribir el nombre del cliente → se despliega el menú de sugerencias
2. Hacé click en el cliente deseado → se muestra su info
3. Si aplica, seleccioná un vendedor
4. Click **"Siguiente"**

> **Importante:** La condición de IVA del cliente define el tipo de factura:
> - `RI` o `Monotributo` → Factura A → IVA 21% detallado
> - `CF` o `Exento` → Factura B → IVA incluido en el precio

#### Paso 2 — Agregar productos

**Qué ves:**
- Campo de búsqueda de producto con autocompletado
- Formulario: producto seleccionado, cantidad, precio unitario, bonificación (%)
- Tabla de ítems agregados (producto, cantidad, precio unitario, bonif %, subtotal)

**Qué hacer:**
1. Buscar producto por nombre → seleccionar del menú
2. Ajustar cantidad (por defecto 1)
3. El precio unitario se carga automático desde el producto
4. Opcional: aplicar bonificación (descuento en % sobre el precio unitario)
5. Click **"Agregar"** → el producto aparece en la tabla
6. Para editar un ítem ya agregado: click en el lápiz
7. Para eliminar: click en el tacho rojo
8. Click **"Siguiente"**

#### Paso 3 — Revisar y confirmar

**Qué ves:**
- Resumen: cliente, fecha, cantidad de ítems
- Tabla de todos los ítems (editable individualmente)
- Totales: Subtotal, IVA, Total General
- Campo de observaciones (opcional)
- Botón **"Generar Presupuesto"**

**Qué hacer:**
1. Verificá que todo esté correcto
2. Opcional: agregá observaciones
3. Opcional: cambiá la fecha (por defecto hoy)
4. Click en **"Generar Presupuesto"**

> **Tip:** Si cerrás la página sin terminar, el borrador se guarda automáticamente y se restaura cuando volvés.

### 4.2 Lista de Presupuestos

**Ruta:** `/dashboard/presupuestos`

**Qué ves:**
- Tabla con columnas: N°, Fecha, Cliente, Total, Estado, Acción
- Paginación (20 por página) con botones Anterior/Siguiente
- Filtro de búsqueda por cliente
- Contadores de total de presupuestos

**Estados de presupuesto:**

| Estado | Significado | Acciones disponibles |
|--------|-------------|---------------------|
| **Enviado** | Pendiente de aprobación | ✅ Aprobar, ❌ Anular, 📤 WhatsApp, 🖨️ Ver |
| **Aprobado** | Aceptado → convertido a remito | ❌ Anular, 🖨️ Ver |
| **Anulado** | Cancelado | Solo ver |

**Acciones por presupuesto:**

- **✅ Aprobar** (solo en Enviado): abre un modal de confirmación. Al confirmar:
  1. Se crea automáticamente un **Remito Aprobado** en estado `En_Revision`
  2. El presupuesto pasa a `Aprobado`
  3. Te redirige a la página de Remitos

- **❌ Anular**: abre modal de confirmación. El presupuesto pasa a `Anulado`.

- **📤 WhatsApp**: abre un popup con el número de teléfono del cliente y un mensaje prearmado con el link del presupuesto. Lo podés editar antes de enviar.

- **🖨️ Ver**: abre la página de detalle del documento (vista imprimible).

---

## 5. Remitos

**Ruta:** `/dashboard/remitos`

Acá se gestionan los remitos aprobados (tanto los nuevos creados desde presupuestos como los legacy).

**Qué ves:**
- Tabla con columnas: N°, Fecha, Cliente, Total, Estado, N° Factura, Acción
- Paginación (20 por página)
- Filtro de búsqueda por cliente

### Estados de remito

| Estado | Significado | Acciones disponibles |
|--------|-------------|---------------------|
| **En_Revisión** | Recién creado desde presupuesto | Marcar "A Despachar", Registrar Factura, WhatsApp |
| **A_Despachar** | Listo para entrega | Registrar Factura, Ver |
| **Enviado** (legacy) | Presupuesto legacy | (ver presupuestos) |
| **Aceptado** (legacy) | Cliente aceptó | Marcar "A Despachar", Registrar Factura |
| **Finalizado** | Facturado y completado | Ver |
| **Anulado** | Cancelado | Solo ver |

### Acciones principales

**📤 WhatsApp** — igual que en presupuestos, envía el link del remito.

**✅ Marcar como "A Despachar"** — cambia el estado a `A_Entregar`. Disponible cuando el remito está en `En_Revision` o `Aceptado`.

**💰 Registrar Factura** — campo inline donde se escribe el número de factura real (ej: "A-0001-2026") y se clickea el botón de guardar. Esto:
1. Crea la **Factura** en la colección de facturas con número secuencial interno
2. Marca el remito como `facturado: true`
3. Si es remito aprobado, lo pasa a estado `Finalizado`

**🧾 Ver Factura** — cuando ya está facturado, muestra el número de factura y permite:

**❌ Nota de Crédito** (solo si está facturado y no anulado):
1. Click en el botón del banco
2. Ingresar N° de Nota de Crédito y Monto
3. Confirma → el remito se marca como `facturaAnulada: true`

**🖨️ Ver** — link al detalle del documento imprimible.

---

## 6. Facturación

**Ruta:** `/dashboard/facturacion`

### Resumen

Tres tarjetas en la parte superior:
- **Total Facturado** — suma de todos los remitos facturados
- **Total Cobrado** — suma de todos los pagos registrados
- **Pendiente** — diferencia (Total Facturado - Total Cobrado)

### Lista de remitos facturados

Cada fila es expandible (click para abrir/cerrar).

**Vista contraída:**
- N° de remito, fecha, cliente
- Factura N°, Total, Pagado, Saldo
- Badge de estado de cobranza: **Pendiente** / **Parcial** / **Pagado**

**Vista expandida:**

1. **Pagos existentes** — listado de pagos registrados con:
   - Monto (con color según estado)
   - Método de pago (Efectivo, Transferencia, Cheque, Débito, Crédito)
   - Referencia (opcional)
   - Fecha
   - Botón eliminar (tacho rojo)

2. **Registrar nuevo pago:**
   - **Monto** — ingresar el valor
   - **Método** — seleccionar del menú desplegable
   - **Referencia** (opcional) — ej: número de transferencia
   - Click "Agregar Pago"

### Búsqueda

Buscador que filtra por: cliente, CUIT, N° Factura, N° Remito.

---

## 7. Salidas (Entregas)

**Ruta:** `/dashboard/entregas`

Esta es la vista más compleja. Es un **calendario de planificación de entregas**.

### Sección superior — Remitos Pendientes

Tarjetas horizontales desplazables que muestran los remitos que aún tienen productos pendientes de entregar.

Cada tarjeta muestra:
- N° de remito y nombre del cliente
- Barra de progreso (cantidad entregada / total)
- Botón **"Programar Salida"**

### Barra de estadísticas

8 indicadores del mes actual:
- **Salidas** — cantidad total del mes
- **Unidades** — suma de ítems despachados
- **Días activos** — días con al menos una salida
- **Remitos** — remitos con al menos una salida
- **Pendientes** — remitos con productos sin entregar
- **En Progreso** — remitos con entregas parciales
- **Completadas** — remitos completamente entregados
- **Avance %** — porcentaje de avance general

### Calendario mensual

**Navegación:**
- Flechas izquierda/derecha para cambiar de mes
- Botón **"Hoy"** para volver al mes actual

**Días con entregas:**
- Muestran puntos de colores (cada remito tiene un color asignado)
- Al hacer hover: tooltip con remito, cliente, hora, cantidad de productos
- Al hacer click: se abre el panel de detalle del día

**Días sin entregas:**
- Tienen un botón "+" para crear una salida rápida

### Panel de detalle del día

Al hacer click en un día del calendario, se muestra debajo el detalle con:
- Fecha seleccionada, cantidad de salidas, unidades y clientes
- Botón **"Agregar"** para nueva salida
- Cada salida existente se muestra como una **DeliveryCard** con:
  - N° de remito y nombre del cliente
  - Vehículo (patente + marca) y chofer
  - Productos despachados con cantidades
  - Hora de entrega
  - Botones: **Agregar más**, **Editar**, **Imprimir** (remito de salida), **Eliminar**

### Registrar una nueva salida

Al hacer click en **"Programar Salida"** (desde tarjeta pendiente) o **"Agregar"** (desde panel de día):

**Modal — "Registrar Salida":**

1. **Fecha** — selector de fecha (por defecto el día seleccionado)
2. **Remito** — selector que solo muestra remitos con productos pendientes. Al seleccionar:
   - Se cargan automáticamente los productos con su cantidad pendiente
   - Cada producto muestra: nombre, cantidad sugerida (pendiente), campo editable
3. **Vehículo** — selector con patente + marca (desde la lista de vehículos)
4. **Chofer** — selector con nombre (desde la lista de choferes)
5. **Hora de entrega** — campo de texto (opcional)

**Qué hace al guardar:**
1. Crea la **Salida** en la colección `salidas` con número secuencial por remito (S-001, S-002, etc.)
2. Si el remito tenía entregas embebidas (legacy), también actualiza ese sistema
3. El calendario se actualiza automáticamente

### Imprimir remito de salida

Al hacer click en **Imprimir** se abre una página con el "Remito de Salida" que incluye:
- Datos de la empresa (FALPAT SRL)
- Datos del cliente
- Productos despachados (con columna de pendiente)
- Vehículo y chofer
- Términos legales
- Espacios para firmas
- Marca de agua "REMITO DE SALIDA"

---

## 8. Ver documento compartido

**Ruta:** `/remitos/[id]` (pública)

Esta página unifica la vista de cualquier documento: presupuesto, remito legacy, o remito aprobado.

**Qué ves:**
- Encabezado de la empresa (FALPAT SRL, CUIT, dirección, teléfono, email)
- Tipo de documento con badge de color:
  - **PRESUPUESTO** (si es un presupuesto)
  - **REMITO** (para remitos)
  - **A DESPACHAR** (cuando está listo para entrega)
- Número de documento y fecha
- Vendedor asignado
- Información del cliente en una tarjeta
- Tabla de ítems (código, nombre, cantidad, precio unitario, bonificación, subtotal)
- Totales (subtotal, IVA, total general)
- Historial de pagos (si los hay)
- Observaciones

**Acciones:**
- **← Volver** — navega según de dónde se accedió (presupuestos, remitos, etc.)
- **🖨️ Imprimir / PDF** — formato apto para impresión
- **📤 WhatsApp** — compartir por WhatsApp (solo para presupuestos)
- **🚛 Remito de Salida** — si no es presupuesto, lleva a planificar la salida

---

## 9. Informes

**Ruta:** `/dashboard/informes`

Página de estadísticas generales con gráficos y resúmenes del negocio.

---

## 10. Flujo completo resumido

```
1. PARAMETRÍAS           → Cargar clientes, productos, vendedores, vehículos, choferes
                              (se hace una sola vez al inicio)

2. NUEVO PRESUPUESTO      → Paso 1: Seleccionar cliente + vendedor
                            Paso 2: Agregar productos con cantidades y precios
                            Paso 3: Revisar y confirmar
                            → Presupuesto se crea en estado "Enviado"

3. LISTA PRESUPUESTOS     → Ver presupuestos enviados
                            ✅ Aprobar → se genera automáticamente un Remito Aprobado
                                         en estado "En_Revisión"

4. LISTA REMITOS          → Ver remitos en revisión
                            ✅ Marcar "A Despachar" cuando esté listo
                            💰 Registrar número de factura real

5. FACTURACIÓN            → Ver remitos facturados
                            💵 Registrar pagos (Efectivo, Transferencia, etc.)
                            ❌ Nota de Crédito si se anula la factura

6. PLAN DE SALIDAS        → Ver calendario
                            🚛 Programar salidas para los remitos "A Despachar"
                            Seleccionar vehículo y chofer
                            Definir cantidades a despachar
                            🖨️ Imprimir remito de salida para entregar al cliente
```

### Resumen de números secuenciales

| Documento | Numeración | Ejemplo |
|-----------|-----------|---------|
| Presupuesto | Por año: contador global | `P-000001` (2026) |
| Remito Aprobado | Por año: contador global | `R-000001` (2026) |
| Factura | La ingresa el usuario + interno auto | `A-0001-2026` / interno: 1 |
| Salida | Por remito: S-001, S-002... | `S-001` para el remito X |

### Conceptos clave

- **IVA**: se calcula automático según la condición de IVA del cliente
- **Bonificación**: descuento porcentual sobre el precio unitario de un producto
- **SyncStatus**: indicador verde = conectado a Firebase, rojo = sin conexión
- **Tiempo real**: todos los datos maestros (clientes, productos, vendedores, vehículos, choferes) se actualizan automáticamente sin recargar
- **Offline**: la app funciona para lectura incluso sin conexión (usa IndexedDB). Las escrituras requieren conexión
