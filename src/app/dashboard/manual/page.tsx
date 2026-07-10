'use client'

const s = (name: string) => `/manual/${name}.png`

const styles = {
  page: 'max-w-5xl mx-auto py-8 px-4 sm:px-6',
  header: 'mb-10 pb-6 border-b border-white/5',
  sectionNum: 'text-xs font-semibold text-[#6C3CE1] uppercase tracking-[0.15em] mb-2',
  h2: 'text-3xl font-bold text-white mb-2',
  h2desc: 'text-[#B0B0D0] max-w-3xl',
  h3: 'text-2xl font-semibold text-white mt-10 mb-4',
  h4: 'text-lg font-semibold text-white mt-8 mb-3',
  p: 'text-sm text-[#B0B0D0] leading-relaxed mb-4',
  ul: 'text-sm text-[#B0B0D0] leading-relaxed mb-4 space-y-1.5 list-disc list-inside',
  ol: 'text-sm text-[#B0B0D0] leading-relaxed mb-4 space-y-1.5 list-decimal list-inside',
  table: 'w-full text-sm mb-6 border-collapse',
  th: 'text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#6B6B8A] border-b border-white/5 bg-white/[0.02]',
  td: 'px-4 py-2.5 border-b border-white/5 text-[#B0B0D0]',
  img: 'w-full rounded-xl border border-white/5 bg-[#12122A] my-6',
  caption: 'text-xs text-[#6B6B8A] italic mt-1 mb-6 text-center',
  info: 'rounded-xl p-5 my-6 border-l-4 border-[#6C3CE1] bg-gradient-to-r from-[#6C3CE1]/10 to-[#00D4FF]/5',
  warning: 'rounded-xl p-5 my-6 border-l-4 border-[#FFB347] bg-gradient-to-r from-[#FFB347]/10 to-[#FF6B6B]/5',
  success: 'rounded-xl p-5 my-6 border-l-4 border-[#00FF88] bg-gradient-to-r from-[#00FF88]/10 to-[#00D4FF]/5',
  badge: (c: string) => `inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${c}`,
  flow: 'flex flex-wrap items-center justify-center gap-2 my-8 p-8 bg-white/[0.02] rounded-2xl border border-white/5',
  step: 'relative pl-16 p-5 mb-4 rounded-xl bg-white/[0.02] border border-white/5',
  stepNum: 'absolute left-4 top-5 w-9 h-9 rounded-full bg-gradient-to-br from-[#6C3CE1] to-[#00D4FF] flex items-center justify-center text-base font-bold text-white',
}

type SectionProps = { num: string; title: string; desc: string; children: React.ReactNode }

function Section({ num, title, desc, children }: SectionProps) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p className={styles.sectionNum}>{num}</p>
        <h2 className={styles.h2}>{title}</h2>
        <p className={styles.h2desc}>{desc}</p>
      </div>
      {children}
    </div>
  )
}

function Info({ children, type = 'info' }: { children: React.ReactNode; type?: 'info' | 'warning' | 'success' }) {
  const cls = type === 'warning' ? styles.warning : type === 'success' ? styles.success : styles.info
  return <div className={cls}>{children}</div>
}

function Badge({ label, color }: { label: string; color: string }) {
  return <span className={styles.badge(color)}>{label}</span>
}

export default function ManualPage() {
  return (
    <div className="space-y-4">
      {/* Cover */}
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-radial from-[#6C3CE1]/20 to-transparent top-[-200px] right-[-200px] pointer-events-none" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-radial from-[#00D4FF]/10 to-transparent bottom-[-100px] left-[-100px] pointer-events-none" />
        <span className="inline-block px-6 py-2 rounded-full bg-[#6C3CE1]/20 border border-[#6C3CE1]/30 text-[#00D4FF] text-sm mb-8">
          Sistema de Gesti&oacute;n Comercial
        </span>
        <h1 className="text-5xl sm:text-6xl font-extrabold mb-5 bg-gradient-to-r from-[#6C3CE1] via-[#00D4FF] to-[#00FF88] bg-clip-text text-transparent">
          FALPAT Ventas
        </h1>
        <p className="text-xl text-[#B0B0D0] mb-8 font-light">
          Manual de Usuario &mdash; Desde el presupuesto hasta la entrega
        </p>
        <p className="text-sm text-[#6B6B8A]">
          Versi&oacute;n 1.0 &nbsp;&middot;&nbsp; Julio 2026 &nbsp;&middot;&nbsp; FALPAT SRL
        </p>
      </div>

      {/* 1. ESTRUCTURA */}
      <Section num="Cap&iacute;tulo 1" title="Estructura del Sistema" desc="FALPAT Ventas es un sistema web de gesti&oacute;n comercial que cubre el ciclo completo de ventas: desde la creaci&oacute;n de presupuestos hasta la planificaci&oacute;n de entregas y el cobro.">
        <h3 className={styles.h3}>Barra lateral de navegaci&oacute;n</h3>
        <p className={styles.p}>Al ingresar al sistema, la barra lateral izquierda organiza todas las secciones en grupos funcionales: <strong>PRINCIPAL</strong> (Dashboard), <strong>PARAMETR&Iacute;AS</strong> (Clientes, Productos, Vendedores, Veh&iacute;culos, Choferes), <strong>COMERCIAL</strong> (Nuevo Presupuesto, Presupuestos, Remitos, Facturaci&oacute;n), <strong>LOG&Iacute;STICA</strong> (Salidas), <strong>INFORMES</strong> e <strong>SISTEMA</strong> (Manual).</p>

        <img src={s('01-dashboard')} alt={'Dashboard'} className={styles.img} />
        <p className={styles.caption}>Figura 1.1 &mdash; Panel principal al iniciar sesi&oacute;n</p>

        <Info type={'info'}>
          <h4 className={styles.h4}>Sincronizaci&oacute;n en tiempo real</h4>
          <p className={styles.p}>Todos los datos maestros (clientes, productos, vendedores, veh&iacute;culos, choferes) se actualizan autom&aacute;ticamente. Cuando un usuario crea o modifica un registro, los cambios aparecen al instante en todas las pantallas sin necesidad de recargar.</p>
        </Info>

        <Info type={'warning'}>
          <h4 className={styles.h4}>Conectividad</h4>
          <p className={styles.p}>El indicador <strong>SyncStatus</strong> en la barra superior muestra si hay conexi&oacute;n (verde = conectado, rojo = sin conexi&oacute;n). La app permite leer datos offline, pero las escrituras requieren conexi&oacute;n.</p>
        </Info>
      </Section>

      {/* 2. DASHBOARD */}
      <Section num="Cap&iacute;tulo 2" title="Dashboard &mdash; Panel Principal" desc="El Dashboard es la primera pantalla al ingresar. Proporciona una visi&oacute;n general del negocio con indicadores clave, alertas de presupuestos pendientes y acceso r&aacute;pido a los &uacute;ltimos remitos.">
        <h3 className={styles.h3}>Indicadores del mes</h3>
        <p className={styles.p}>Tres tarjetas con efecto 3D muestran: <strong>Remitos del Mes</strong> (cantidad), <strong>Total Facturado</strong> (suma) y <strong>Clientes Activos</strong> (total registrados).</p>

        <h3 className={styles.h3}>Presupuestos Pendientes</h3>
        <p className={styles.p}>Si hay presupuestos en estado <Badge label={'Enviado'} color="bg-[#6C3CE1]/20 text-[#8B5CF6]" /> se muestra la cantidad y un listado con enlace al detalle.</p>

        <h3 className={styles.h3}>&Uacute;ltimos Remitos</h3>
        <p className={styles.p}>Lista los 5 remitos m&aacute;s recientes con: n&uacute;mero, cliente, estado, cobranza (<Badge label={'Pendiente'} color="bg-red-500/20 text-red-400" /> <Badge label={'Pagado'} color="bg-emerald-500/20 text-emerald-400" /> <Badge label={'Parcial'} color="bg-amber-500/20 text-amber-400" />), total y factura.</p>
      </Section>

      {/* 3. PARAMETRIAS */}
      <Section num="Cap&iacute;tulo 3" title="Parametr&iacute;as &mdash; Datos Maestros" desc="Contienen los datos fundamentales del sistema. Se accede desde Parametr&iacute;as en el men&uacute;, que a su vez contiene 5 subp&aacute;ginas.">
        <h3 className={styles.h3}>3.1 Clientes</h3>
        <img src={s('02-clientes')} alt={'Clientes'} className={styles.img} />
        <p className={styles.caption}>Figura 3.1 &mdash; Lista de clientes con b&uacute;squeda, paginaci&oacute;n y acciones</p>

        <p className={styles.p}><strong>Campos:</strong> C&oacute;digo (autom&aacute;tico), Raz&oacute;n Social, Tipo Documento (CUIT/DNI), N&uacute;mero, Actividad, Domicilio, Localidad, Tel&eacute;fono, <strong>Condici&oacute;n IVA</strong> (RI / CF / Monotributo / Exento).</p>

        <Info type={'success'}>
          <h4 className={styles.h4}>Condici&oacute;n de IVA &mdash; Clave para la facturaci&oacute;n</h4>
          <p className={styles.p}><strong>RI / Monotributo</strong> &rarr; Factura A &rarr; IVA 21% detallado. <strong>CF / Exento</strong> &rarr; Factura B &rarr; IVA incluido.</p>
        </Info>

        <p className={styles.p}><strong>Acciones:</strong> Nuevo, Editar, Eliminar, Excel, Carga Masiva, Buscar, Ordenar por columnas.</p>

        <h3 className={styles.h3}>3.2 Productos</h3>
        <img src={s('03-productos')} alt={'Productos'} className={styles.img} />
        <p className={styles.caption}>Figura 3.2 &mdash; Cat&aacute;logo de productos con ordenamiento</p>
        <p className={styles.p}><strong>Campos:</strong> C&oacute;digo (5 d&iacute;gitos), Nombre, Tipo (12 categor&iacute;as), Medida (8 tipos), Precio C/IVA, Precio S/IVA (autom&aacute;tico), Stock.</p>

        <h3 className={styles.h3}>3.3 Vendedores</h3>
        <img src={s('04-vendedores')} alt={'Vendedores'} className={styles.img} />
        <p className={styles.caption}>Figura 3.3 &mdash; Vendedores con panel de estad&iacute;sticas</p>
        <p className={styles.p}><strong>Campos:</strong> C&oacute;digo (ej: AG, JC), Nombre. <strong>Estad&iacute;sticas:</strong> al activar el toggle se ve rendimiento con remitos, facturado, items, ranking y barra de rendimiento.</p>

        <h3 className={styles.h3}>3.4 Veh&iacute;culos y Choferes</h3>
        <img src={s('05-vehiculos')} alt="Veh&iacute;culos y Choferes" className={styles.img} />
        <p className={styles.caption}>Figura 3.4 &mdash; Veh&iacute;culos (izquierda) y Choferes (derecha)</p>
        <p className={styles.p}><strong>Veh&iacute;culos:</strong> Importar flota predefinida (30 veh&iacute;culos), agregar patente/marca, eliminar. <strong>Choferes:</strong> Importar por lista, agregar/editar nombre/documento/tel&eacute;fono, eliminar. Se usan al programar salidas.</p>
      </Section>

      {/* 4. PRESUPUESTOS */}
      <Section num="Cap&iacute;tulo 4" title={'Presupuestos'} desc="Creaci&oacute;n de cotizaciones mediante asistente de 3 pasos, y gesti&oacute;n posterior (aprobar, anular, compartir por WhatsApp).">
        <h3 className={styles.h3}>4.1 Crear nuevo presupuesto</h3>

        <div className={styles.step}>
          <div className={styles.stepNum}>1</div>
          <h4 className={styles.h4}>Seleccionar Cliente y Vendedor</h4>
          <img src={s('06-presupuesto-nuevo')} alt="Paso 1" className={styles.img} />
          <p className={styles.caption}>Figura 4.1 &mdash; B&uacute;squeda de cliente con autocompletado</p>
          <p className={styles.p}>Campo de b&uacute;squeda con autocompletado. Al seleccionar un cliente se muestra su informaci&oacute;n (raz&oacute;n social, CUIT, domicilio, condici&oacute;n IVA). Opcional: seleccionar vendedor. Click <strong>Siguiente</strong>.</p>
        </div>

        <div className={styles.step}>
          <div className={styles.stepNum}>2</div>
          <h4 className={styles.h4}>Agregar Productos</h4>
          <p className={styles.p}>Buscador de productos con autocompletado. Por cada producto: cantidad, precio unitario (autom&aacute;tico), bonificaci&oacute;n (% opcional). Bot&oacute;n <strong>Agregar</strong>. Tabla de &iacute;tems con edici&oacute;n y eliminaci&oacute;n. Click <strong>Siguiente</strong>.</p>
        </div>

        <div className={styles.step}>
          <div className={styles.stepNum}>3</div>
          <h4 className={styles.h4}>Revisar y Confirmar</h4>
          <p className={styles.p}>Resumen con cliente, fecha, items, <strong>Subtotal</strong>, <strong>IVA</strong> (seg&uacute;n condici&oacute;n del cliente), <strong>Total General</strong>. Campo de observaciones opcional. Bot&oacute;n <strong>Generar Presupuesto</strong> &rarr; estado <Badge label={'Enviado'} color="bg-[#6C3CE1]/20 text-[#8B5CF6]" />.</p>
        </div>

        <Info type={'success'}>
          <h4 className={styles.h4}>Borrador autom&aacute;tico</h4>
          <p className={styles.p}>Si cerr&aacute;s la p&aacute;gina sin terminar, el borrador se guarda y restaura autom&aacute;ticamente al volver.</p>
        </Info>

        <h3 className={styles.h3}>4.2 Lista de Presupuestos</h3>
        <img src={s('07-presupuestos-lista')} alt="Lista presupuestos" className={styles.img} />
        <p className={styles.caption}>Figura 4.2 &mdash; Lista con paginaci&oacute;n y acciones por estado</p>

        <p className={styles.p}><strong>Estados:</strong></p>
        <ul className={styles.ul}>
          <li><Badge label={'Enviado'} color="bg-[#6C3CE1]/20 text-[#8B5CF6]" /> &rarr; Aprobar &middot; Anular &middot; WhatsApp &middot; Ver</li>
          <li><Badge label={'Aprobado'} color="bg-[#00D4FF]/20 text-[#00D4FF]" /> &rarr; Anular &middot; Ver</li>
          <li><Badge label={'Anulado'} color="bg-red-500/20 text-red-400" /> &rarr; Ver</li>
        </ul>

        <h4 className={styles.h4}>Aprobar presupuesto</h4>
        <p className={styles.p}>Al confirmar, el sistema <strong>crea autom&aacute;ticamente un Remito Aprobado</strong> en estado <em>En_Revisi&oacute;n</em>. El presupuesto pasa a <Badge label={'Aprobado'} color="bg-[#00D4FF]/20 text-[#00D4FF]" /> y redirige a Remitos.</p>

        <h4 className={styles.h4}>WhatsApp</h4>
        <p className={styles.p}>Popup con n&uacute;mero del cliente y mensaje prearmado con enlace del presupuesto. Se puede editar antes de enviar.</p>
      </Section>

      {/* 5. REMITOS */}
      <Section num="Cap&iacute;tulo 5" title={'Remitos'} desc="Gesti&oacute;n de todos los remitos aprobados: transiciones de estado, registro de facturas y notas de cr&eacute;dito.">
        <img src={s('08-remitos')} alt={'Remitos'} className={styles.img} />
        <p className={styles.caption}>Figura 5.1 &mdash; Lista de remitos con acciones contextuales</p>

        <h4 className={styles.h4}>Estados</h4>
        <ul className={styles.ul}>
          <li><Badge label="En_Revisi&oacute;n" color="bg-amber-500/20 text-amber-400" /> &rarr; Reci&eacute;n creado desde presupuesto</li>
          <li><Badge label={'A_Despachar'} color="bg-emerald-500/20 text-emerald-400" /> &rarr; Listo para entrega</li>
          <li><Badge label={'Finalizado'} color="bg-emerald-500/20 text-emerald-400" /> &rarr; Facturado y completado</li>
          <li><Badge label={'Anulado'} color="bg-red-500/20 text-red-400" /> &rarr; Cancelado</li>
        </ul>

        <h4 className={styles.h4}>Marcar como &quot;A Despachar&quot;</h4>
        <p className={styles.p}>Cuando est&aacute; en <Badge label="En_Revisi&oacute;n" color="bg-amber-500/20 text-amber-400" /> o <Badge label={'Aceptado'} color="bg-blue-500/20 text-blue-400" />, pasa a <Badge label={'A_Despachar'} color="bg-emerald-500/20 text-emerald-400" /> y aparece en el calendario de salidas.</p>

        <h4 className={styles.h4}>Registrar factura</h4>
        <p className={styles.p}>Se escribe el n&uacute;mero de factura real (ej: &quot;A-0001-2026&quot;) y se guarda. El sistema crea la Factura con n&uacute;mero interno secuencial y marca el remito como facturado.</p>

        <h4 className={styles.h4}>Nota de Cr&eacute;dito</h4>
        <p className={styles.p}>Si el remito est&aacute; facturado pero necesita anularse, se ingresa N&deg; de NC y Monto. El remito se marca como <code>facturaAnulada: true</code>.</p>
      </Section>

      {/* 6. FACTURACION */}
      <Section num="Cap&iacute;tulo 6" title="Facturaci&oacute;n &mdash; Cobranza" desc="Gesti&oacute;n de cobranza de todos los remitos facturados. Cada remito se expande para ver pagos y agregar nuevos.">
        <img src={s('09-facturacion')} alt="Facturaci&oacute;n" className={styles.img} />
        <p className={styles.caption}>Figura 6.1 &mdash; Resumen financiero y lista de remitos facturados</p>

        <h4 className={styles.h4}>Resumen</h4>
        <p className={styles.p}>Tres tarjetas: <strong>Total Facturado</strong>, <strong>Total Cobrado</strong>, <strong>Pendiente</strong> (diferencia).</p>

        <h4 className={styles.h4}>Lista expandible</h4>
        <p className={styles.p}><strong>Vista contra&iacute;da:</strong> N&deg; remito, fecha, cliente, factura N&deg;, Total, Pagado, Saldo, badge de cobranza.</p>
        <p className={styles.p}><strong>Vista expandida:</strong> pagos existentes (monto, m&eacute;todo, referencia, fecha, eliminar) + formulario &quot;Agregar Pago&quot; (monto, m&eacute;todo: Efectivo/Transferencia/Cheque/D&eacute;bito/Cr&eacute;dito, referencia opcional).</p>
      </Section>

      {/* 7. SALIDAS */}
      <Section num="Cap&iacute;tulo 7" title="Salidas &mdash; Plan de Entregas" desc="Planificador visual con calendario mensual para programar entregas, asignar veh&iacute;culos/choferes e imprimir remitos de salida.">
        <img src={s('10-salidas')} alt={'Salidas'} className={styles.img} />
        <p className={styles.caption}>Figura 7.1 &mdash; Calendario de entregas con tarjetas de remitos pendientes</p>

        <h4 className={styles.h4}>Secci&oacute;n superior: Remitos Pendientes</h4>
        <p className={styles.p}>Tarjetas horizontales con barra de progreso y bot&oacute;n <strong>Programar Salida</strong>. Toggle Pendientes / Todas.</p>

        <h4 className={styles.h4}>Barra de estad&iacute;sticas</h4>
        <p className={styles.p}>8 indicadores: Salidas, Unidades, D&iacute;as activos, Remitos, Pendientes, En Progreso, Completadas, Avance %.</p>

        <h4 className={styles.h4}>Calendario mensual</h4>
        <p className={styles.p}>Grilla con navegaci&oacute;n entre meses y bot&oacute;n <strong>Hoy</strong>. D&iacute;as con entregas muestran puntos de colores (tooltip al hover, click para detalle). D&iacute;as sin entregas tienen bot&oacute;n &quot;+&quot;.</p>

        <h4 className={styles.h4}>Panel de detalle del d&iacute;a</h4>
        <p className={styles.p}>Muestra fecha, salidas, unidades, clientes. Cada salida es una DeliveryCard con veh&iacute;culo, chofer, productos, y botones: Agregar m&aacute;s, Editar, Imprimir, Eliminar.</p>

        <h4 className={styles.h4}>Registrar nueva salida</h4>
        <p className={styles.p}>Modal con: fecha, remito (solo pendientes), productos (cantidad sugerida = pendiente), veh&iacute;culo, chofer, hora. Al guardar se crea la salida con n&uacute;mero secuencial <strong>S-001, S-002</strong> por remito.</p>

        <h4 className={styles.h4}>Imprimir remito de salida</h4>
        <p className={styles.p}>Documento profesional con: datos de FALPAT SRL, cliente, productos despachados, veh&iacute;culo, chofer, t&eacute;rminos legales y espacios para firmas. Marca de agua &quot;REMITO DE SALIDA&quot;.</p>
      </Section>

      {/* 8. VISTA DOCUMENTO */}
      <Section num="Cap&iacute;tulo 8" title="Vista de Documento" desc="P&aacute;gina que unifica la visualizaci&oacute;n de presupuestos, remitos legacy y remitos aprobados en un formato imprimible profesional.">
        <p className={styles.p}>Incluye: encabezado de empresa (FALPAT SRL), badge de tipo (PRESUPUESTO/REMITO/A DESPACHAR), n&uacute;mero, fecha, vendedor, tarjeta del cliente, tabla de &iacute;tems con subtotales, IVA y total, pagos (si existen), observaciones.</p>
        <p className={styles.p}><strong>Acciones:</strong> Imprimir/PDF, WhatsApp (solo presupuestos), Remito de Salida (solo remitos), Volver.</p>
        <Info type={'warning'}>
          <h4 className={styles.h4}>Vista p&uacute;blica</h4>
          <p className={styles.p}>Cualquier persona con el enlace puede ver el documento. Ideal para compartir por WhatsApp. Los presupuestos muestran marca de agua &quot;PRESUPUESTO&quot;.</p>
        </Info>
      </Section>

      {/* 9. INFORMES */}
      <Section num="Cap&iacute;tulo 9" title={'Informes'} desc="Estad&iacute;sticas generales del negocio con gr&aacute;ficos y res&uacute;menes.">
        <img src={s('11-informes')} alt={'Informes'} className={styles.img} />
        <p className={styles.caption}>Figura 9.1 &mdash; Panel de informes</p>
        <p className={styles.p}>M&eacute;tricas como remitos por per&iacute;odo, facturaci&oacute;n acumulada, productos m&aacute;s vendidos, rendimiento por vendedor. Datos exportables y configurables por rango de fechas.</p>
      </Section>

      {/* 10. FLUJO COMPLETO */}
      <Section num="Cap&iacute;tulo 10" title="Flujo Completo" desc="Diagrama resumen del ciclo comercial completo: desde el presupuesto hasta la entrega y el cobro.">
        <div className={styles.flow}>
          <span className="px-4 py-2 rounded-xl bg-[#6C3CE1]/20 text-[#8B5CF6] border border-[#6C3CE1]/30 text-sm font-semibold">Presupuesto</span>
          <span className="text-[#6B6B8A] text-xl">&rarr;</span>
          <span className="px-4 py-2 rounded-xl bg-[#00D4FF]/15 text-[#00D4FF] border border-[#00D4FF]/20 text-sm font-semibold">Aprobar</span>
          <span className="text-[#6B6B8A] text-xl">&rarr;</span>
          <span className="px-4 py-2 rounded-xl bg-[#6C3CE1]/20 text-[#8B5CF6] border border-[#6C3CE1]/30 text-sm font-semibold">Remito</span>
          <span className="text-[#6B6B8A] text-xl">&rarr;</span>
          <span className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-semibold">Facturar</span>
          <span className="text-[#6B6B8A] text-xl">&rarr;</span>
          <span className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/20 text-sm font-semibold">Salida</span>
          <span className="text-[#6B6B8A] text-xl">&rarr;</span>
          <span className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-semibold">Cobrar</span>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>#</th>
              <th className={styles.th}>Paso</th>
              <th className={styles.th}>Secci&oacute;n</th>
              <th className={styles.th}>&iquest;Qu&eacute; ocurre?</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['1', 'Cargar datos maestros', 'Parametr&iacute;as', 'Registrar clientes, productos, vendedores, veh&iacute;culos y choferes (una vez al inicio)'],
              ['2', 'Crear presupuesto', 'Nuevo Presupuesto', 'Seleccionar cliente + vendedor &rarr; productos &rarr; revisar. Queda Enviado.'],
              ['3', 'Aprobar presupuesto', 'Presupuestos', 'Aprobar &rarr; genera Remito Aprobado en En_Revisi&oacute;n.'],
              ['4', 'Revisar y preparar', 'Remitos', 'Marcar &quot;A Despachar&quot; cuando est&eacute; listo.'],
              ['5', 'Facturar', 'Remitos', 'Ingresar N&deg; de factura real. Se crea la Factura.'],
              ['6', 'Programar salida', 'Salidas', 'Seleccionar d&iacute;a, veh&iacute;culo, chofer, cantidades. Se genera S-001.'],
              ['7', 'Entregar', 'Salidas', 'Imprimir Remito de Salida. Cliente y chofer firman.'],
              ['8', 'Cobrar', 'Facturaci&oacute;n', 'Expandir remito &rarr; &quot;Agregar Pago&quot; &rarr; m&eacute;todo y monto.'],
            ].map(([n, paso, seccion, desc]) => (
              <tr key={n}>
                <td className={`${styles.td} font-bold text-white`}>{n}</td>
                <td className={`${styles.td} text-white font-medium`}>{paso}</td>
                <td className={styles.td}>{seccion}</td>
                <td className={styles.td}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h4 className={styles.h4}>N&uacute;meros secuenciales</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Documento</th>
              <th className={styles.th}>Numeraci&oacute;n</th>
              <th className={styles.th}>Ejemplo</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className={styles.td}>Presupuesto</td><td className={styles.td}>Por a&ntilde;o: contador global</td><td className={styles.td}>P-000001 (2026)</td></tr>
            <tr><td className={styles.td}>Remito Aprobado</td><td className={styles.td}>Por a&ntilde;o: contador global</td><td className={styles.td}>R-000001 (2026)</td></tr>
            <tr><td className={styles.td}>Factura</td><td className={styles.td}>Usuario ingresa + interno secuencial</td><td className={styles.td}>A-0001-2026 / int: 1</td></tr>
            <tr><td className={styles.td}>Salida</td><td className={styles.td}>Por remito: S-001, S-002...</td><td className={styles.td}>S-001 para remito X</td></tr>
          </tbody>
        </table>

        <Info type={'success'}>
          <h4 className={styles.h4}>Ciclo completo</h4>
          <p className={styles.p}><strong>Presupuesto &rarr; Remito &rarr; Factura &rarr; Salida &rarr; Cobro.</strong> Cada paso genera los documentos necesarios y actualiza los estados autom&aacute;ticamente, asegurando trazabilidad desde la cotizaci&oacute;n hasta la entrega final.</p>
        </Info>

        <div className="mt-12 pt-4 border-t border-white/5 text-center text-xs text-[#6B6B8A]">
          FALPAT Ventas &mdash; Manual de Usuario v1.0 &mdash; Julio 2026
        </div>
      </Section>
    </div>
  )
}
