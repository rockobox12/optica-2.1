# CLONE CHECKLIST — Validación de Reconstrucción

> Usar este checklist después de cada fase para verificar que el clon es idéntico al original.

---

## FASE 1: Foundation

### Auth y Login
- [ ] Página /auth con formulario de login (email + password)
- [ ] Signup con verificación de email
- [ ] Redirect a / después de login exitoso
- [ ] Redirect a /auth si no autenticado
- [ ] Profile creado automáticamente al signup (trigger)
- [ ] Roles asignables: super_admin, admin, gerente, doctor, optometrista, asistente, cobrador, tecnico
- [ ] has_role() RPC funciona (admin incluye super_admin)
- [ ] Logout funcional con mensaje de confirmación

### Layout Desktop
- [ ] Sidebar oscuro (#1F2937) visible a la izquierda, 260px ancho
- [ ] Logo: icono Eye en cuadrado azul + "Óptica Istmeña" + "Suite Admin"
- [ ] Botón de colapsar sidebar (→ 70px)
- [ ] Tooltips en sidebar colapsado
- [ ] Header fijo arriba con selector de sucursal
- [ ] Footer con crédito "Rockobox" en desktop
- [ ] Menú completo con 22 items en orden correcto

### Layout Tablet (768-1023px)
- [ ] Sidebar colapsado por defecto (70px)
- [ ] Sin botón de expandir
- [ ] Padding 16px en contenido

### Layout Móvil (≤767px)
- [ ] Sin sidebar
- [ ] MobileNav fija abajo con 5 tabs
- [ ] Padding 12px, pt-12 pb-16
- [ ] Sin scroll horizontal
- [ ] Clase .mobile-compact activa

### RBAC
- [ ] Tecnico: solo ve 7 items en sidebar (Inicio, Agenda, Expediente, Ventas, Herramienta Optometría, Caja, Usuarios)
- [ ] Gerente: menú operativo completo, solo su sucursal
- [ ] Admin/Super Admin: todo visible
- [ ] Rutas protegidas redirigen a /unauthorized si no tiene rol
- [ ] RoleGuard oculta secciones sin permisos

### Multisucursal
- [ ] Selector de sucursal en header
- [ ] Super admin: puede seleccionar "Todas" o individual
- [ ] Gerente: solo su sucursal (sin selector)
- [ ] branch_id se auto-asigna en nuevos registros
- [ ] Queries filtran por branchFilter

### Dashboard
- [ ] 4 StatCards visibles para todos los roles
- [ ] Valores reales desde Supabase (no mock)
- [ ] Formato MXN correcto ($1,234)
- [ ] Cambio % vs ayer funcional
- [ ] Tecnico: SOLO 4 KPIs, sin gráficas ni panels
- [ ] Admin: gráficas + widgets + panels ejecutivos visibles

---

## FASE 2: Pantallas Críticas

### Nuevo Paciente
- [ ] Botón "Nuevo Paciente" abre Sheet lateral
- [ ] Tabs: Datos Personales, Contacto, Dirección, Clínico
- [ ] Campos: nombre, apellido, nacimiento, género, CURP, RFC
- [ ] WhatsApp input con formato mexicano
- [ ] LocationPicker con geolocalización
- [ ] Detección de duplicados (nombre + fecha nacimiento)
- [ ] Auto Title Case en nombres
- [ ] Selector de promotor/referido
- [ ] branch_id auto-asignado
- [ ] Guarda correctamente en tabla patients
- [ ] Borrador persiste si cierra sin guardar

### Expediente
- [ ] Lista paginada de pacientes con búsqueda
- [ ] Búsqueda funciona por nombre, apellido, teléfono
- [ ] Búsqueda tokenizada (case-insensitive)
- [ ] Click abre ExpedienteDetail completo
- [ ] Tecnico: solo ve pacientes atendidos HOY por él
- [ ] Tecnico: búsqueda opera solo sobre su lista
- [ ] Tecnico post-corte: lista vacía
- [ ] Admin/Gerente: ven todos los pacientes de su sucursal

### Nuevo Examen Visual
- [ ] Se abre desde ExpedienteDetail
- [ ] Formulario OD/OI: esfera, cilindro, eje, ADD, AV
- [ ] Sugerencia de ADD por edad
- [ ] Validación clínica en tiempo real
- [ ] Cambio de graduación indicado vs examen anterior
- [ ] Guarda visual_exam + prescription
- [ ] Botón "Ir a Venta" navega correctamente con params

### POS / Ventas
- [ ] Modal fullscreen se abre al entrar a /ventas
- [ ] CashSessionGuard: requiere caja abierta
- [ ] Selector de paciente funcional
- [ ] Búsqueda de productos funcional
- [ ] Carrito con cantidades editables
- [ ] Precios por sucursal (product_prices_by_branch)
- [ ] Selector de promotor
- [ ] Panel de pago: efectivo, tarjeta, transferencia, cheque, crédito
- [ ] Pago mixto funciona
- [ ] Crédito: modal de plan de pago con enganche mínimo
- [ ] Bloqueo de morosos funciona
- [ ] Venta se guarda correctamente (sales, items, payments, movements)
- [ ] Ticket térmico se muestra post-venta
- [ ] Botón X cierra con confirmación si hay carrito dirty

### Impresión POS-58
- [ ] Desktop: window.print() genera ticket correcto
- [ ] Ancho 58mm: texto legible, no se corta
- [ ] Ancho 80mm: formato adecuado
- [ ] Cabecera: "Óptica Istmeña" + slogan
- [ ] TOTAL centrado y destacado
- [ ] Sección "QUEJAS Y ACLARACIONES"
- [ ] Teléfono debajo de quejas
- [ ] Móvil: botón "Abrir PDF" funciona
- [ ] PDF descargable con dimensiones correctas

### Cobro Rápido
- [ ] Búsqueda de créditos por nombre/teléfono/número de venta
- [ ] Semáforo de urgencia visible
- [ ] Modal de pago abre correctamente
- [ ] Pago se registra (credit_payments + cash_movements)
- [ ] Balance se actualiza en la venta
- [ ] Ticket de abono
- [ ] Tab "Cobros Programados" funciona

---

## FASE 3: Módulos Secundarios

### Caja y Bancos
- [ ] Abrir sesión de caja con monto inicial
- [ ] Solo 1 sesión abierta por usuario/sucursal
- [ ] Movimientos se registran automáticamente con ventas
- [ ] Arqueo de billetes y monedas
- [ ] Cierre de caja con diferencia calculada
- [ ] Cuentas bancarias CRUD

### Laboratorio
- [ ] Kanban: 5 columnas (PENDIENTE→ENTREGADO)
- [ ] Drag & drop funcional
- [ ] Detalle de orden con datos de prescripción
- [ ] Tracking de ubicación (EN_OPTICA/EN_LABORATORIO)

### Inventario
- [ ] Lista de productos con búsqueda
- [ ] CRUD productos con categorías
- [ ] Stock por sucursal
- [ ] Alertas de stock bajo/agotado
- [ ] Kardex de movimientos

### Agenda
- [ ] Vista calendario por día/semana
- [ ] Crear cita con paciente y doctor
- [ ] Estados: programada → confirmada → en atención → completada
- [ ] Sala de espera

### Herramienta Optometría
- [ ] Calculadora de transposición (+/- cilindro)
- [ ] Calculadora de lentes de contacto
- [ ] Receta digital

### Crédito y Cobranza
- [ ] Scoring crediticio (0-100)
- [ ] Planes de pago
- [ ] Reporte de morosidad

---

## FASE 4: IA y Edge Functions

- [ ] Edge functions desplegadas y funcionales
- [ ] IA Assistant responde preguntas
- [ ] IA Clínica analiza datos de exámenes
- [ ] Validador de recetas funciona
- [ ] Recordatorios de pago configurables

---

## VALIDACIÓN GENERAL

### Responsive
- [ ] iPhone 14 (390x844): todo funcional, sin scroll horizontal
- [ ] iPad (768x1024): sidebar colapsado, contenido legible
- [ ] Desktop 1920x1080: layout completo
- [ ] Safe areas en iOS
- [ ] Teclado iOS no causa zoom en inputs
- [ ] Touch scroll suave

### Seguridad
- [ ] RLS activo en TODAS las tablas
- [ ] branch_id filtra datos correctamente
- [ ] Tecnico no puede acceder a pacientes fuera de su lista
- [ ] Acceso por URL directa bloqueado para no autorizados
- [ ] Void payment solo para admin
- [ ] Transfer patient solo para super_admin

### Performance
- [ ] Queries paginadas (máx 50-100 registros)
- [ ] React Query con staleTime 30s
- [ ] Lazy loading con Suspense
- [ ] ErrorBoundary en cada módulo

### UX
- [ ] Todos los mensajes en español
- [ ] Fechas formato dd/MM/yyyy o dd MMM yyyy
- [ ] Moneda MXN con formato $1,234.00
- [ ] Estados vacíos elegantes (no errores)
- [ ] Toasts informativos en cada acción
- [ ] Loading states con skeletons
