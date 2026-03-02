# CLONE BLUEPRINT — Óptica Istmeña Suite V2.01

> Documento para reconstruir el sistema idéntico en otra cuenta Lovable.

---

## 1. IDENTIDAD

- **Nombre**: Óptica Istmeña Suite
- **Versión**: V2.01
- **Developer**: Rockobox (© 2026)
- **Lema corporativo**: "Precio, Calidad y Garantía"
- **Especialista clínica**: Dra. Belem Castillejos Valle
- **País**: México (MXN, zona horaria America/Mexico_City)

---

## 2. STACK TÉCNICO

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui |
| Estado servidor | TanStack React Query v5 |
| Router | react-router-dom v6 |
| Animaciones | framer-motion |
| Backend | Supabase (Auth, PostgreSQL, Edge Functions, Storage) |
| PDF/Print | jsPDF + html2canvas |
| Gráficas | Recharts |
| Formularios | react-hook-form + zod |
| Drag & Drop | @hello-pangea/dnd |
| Fuentes | Inter (body) + Plus Jakarta Sans (display) |

---

## 3. DESIGN SYSTEM

### Paleta de colores (HSL en `:root`)

| Token | HSL | Hex aprox | Uso |
|-------|-----|-----------|-----|
| `--primary` | 206 59% 44% | #2E7BB4 | Botones principales |
| `--accent` | 209 78% 28% | #0F4C81 | Azul corporativo profundo |
| `--secondary` | 195 47% 94% | #E8F4F8 | Fondos azul claro |
| `--success` | 160 84% 39% | #10B981 | Éxito |
| `--warning` | 38 92% 50% | #F59E0B | Alertas |
| `--destructive` | 0 84% 60% | #EF4444 | Errores |
| `--ai` | 258 90% 66% | #8B5CF6 | Features IA |
| `--background` | 220 14% 96% | #F3F4F6 | Fondo general |
| `--foreground` | 215 28% 17% | #1F2937 | Texto principal |
| `--sidebar-background` | 215 28% 17% | #1F2937 | Sidebar oscuro |

### Tipografía
- **Display/headings**: `Plus Jakarta Sans` (font-display)
- **Body**: `Inter` (font-sans)

### Border radius
- `--radius: 0.625rem` (10px)

### Sidebar
- Tema oscuro (#1F2937), ancho expandido 260px, colapsado 70px
- Icono `Eye` como logo en cuadrado redondeado azul

---

## 4. ARQUITECTURA DE LAYOUT

### AppShell (`MainLayout.tsx`)
```
┌────────────────────────────────────────────┐
│ Sidebar (fixed left, dark)                  │
│ ┌──────────────────────────────────────┐   │
│ │ Header (fixed top, right of sidebar)  │   │
│ │ ┌────────────────────────────────┐   │   │
│ │ │ Main content (scrollable)       │   │   │
│ │ │ ┌──────────────────────────┐   │   │   │
│ │ │ │ Footer (developer credit) │   │   │   │
│ │ │ └──────────────────────────┘   │   │   │
│ │ └────────────────────────────────┘   │   │
│ └──────────────────────────────────────┘   │
└────────────────────────────────────────────┘
```

### Breakpoints
- **Mobile** (`≤767px`): `MobileNav` fija abajo, sin sidebar, padding 12px, pt-12 pb-16
- **Tablet** (`768-1023px`): Sidebar colapsado forzado (70px), padding 16px
- **Desktop** (`≥1024px`): Sidebar expandible (260px), padding 24px

### Reglas UI/UX críticas
1. **Nunca** usar `height: 100vh` → usar `h-[100dvh]` en móviles
2. **Sin scroll horizontal** → `overflow-x-hidden` global
3. **Touch**: `touch-action: pan-x pan-y`, `-webkit-overflow-scrolling: touch`
4. **Safe areas**: `safe-area-left`, `safe-area-right` en layout principal
5. **iOS keyboard**: Hook `useIOSKeyboard` para evitar zoom en inputs <16px
6. **Clase `.mobile-compact`**: Tarjetas con padding 0.5-0.625rem, botones 36px, texto 0.6875rem

### Z-Index Scale (CRÍTICO)
| Capa | z-index |
|------|---------|
| Sidebar | 40 |
| POS Modal | 60 |
| Diálogos/Selects | 70 |
| Alertas/Confirmaciones | 80 |
| Popovers/Calendarios | 9999 |

---

## 5. MAPA DE RUTAS Y MÓDULOS

### Sidebar Navigation (orden exacto)

| # | Ruta | Label | Icono | Roles permitidos | Descripción |
|---|------|-------|-------|-----------------|-------------|
| 1 | `/` | Inicio | `Home` | Todos | Dashboard con KPIs del día + gráficas |
| 2 | `/dashboard-corporativo` | Dashboard Corporativo | `Building2` | super_admin, admin, gerente | Panel ejecutivo multi-sucursal |
| 3 | `/agenda` | Agenda | `CalendarDays` | Todos | Calendario de citas + sala de espera |
| 4 | `/expediente` | Expediente | `FileText` | Todos | Lista de pacientes + detalle clínico |
| 5 | `/herramienta-optometria` | Herramienta Optometría | `Calculator` | Todos | Transposición, lentes de contacto, receta digital |
| 6 | `/ventas` | Ventas | `ShoppingCart` | Todos | POS Terminal (modal fullscreen) + historial |
| 7 | `/laboratorio` | Laboratorio | `Package` | admin, gerente, doctor, optometrista, asistente | Kanban de órdenes de lab |
| 8 | `/oportunidades-clinicas` | IA Oportunidades | `Brain` | admin, gerente, doctor, optometrista | Marketing clínico con IA |
| 9 | `/inventario` | Inventario | `Glasses` | admin, gerente, doctor, asistente | Productos, stock, alertas, kardex |
| 10 | `/compras` | Compras | `Truck` | admin, gerente | Órdenes de compra + proveedores |
| 11 | `/cobro-rapido` | Cobro Rápido | `Banknote` | admin, gerente, cobrador, asistente | Abonos rápidos a créditos |
| 12 | `/credito-cobranza` | Crédito y Cobranza | `CreditCard` | admin, gerente, cobrador | Scoring, planes de pago, morosidad |
| 13 | `/caja` | Caja y Bancos | `Wallet` | Todos | Sesiones de caja, arqueo, cuentas bancarias |
| 14 | `/marketing` | Marketing | `Gift` | admin, gerente | Campañas, lealtad, segmentos IA |
| 15 | `/reportes` | Reportes | `BarChart3` | admin, gerente | Ventas, inventario, financiero, ejecutivo |
| 16 | `/promotores` | Promotores | `Megaphone` | admin, gerente | Gestión de referidores |
| 17 | `/comisiones` | Comisiones | `DollarSign` | admin, gerente | Comisiones de promotores |
| 18 | `/comercial` | Comercial | `Package` | admin, gerente | Paquetes y promociones |
| 19 | `/sucursales` | Sucursales | `Building2` | admin | CRUD de sucursales |
| 20 | `/usuarios` | Usuarios | `UserCog` | Todos | Admin: gestión. Técnico: solo perfil propio |
| 21 | `/bitacora` | Bitácora | `Shield` | admin | Logs de acceso |
| 22 | `/configuracion` | Configuración | `Settings` | admin | Settings generales del sistema |

### Rutas adicionales (sin sidebar)
- `/auth` — Login/Signup
- `/notificaciones` — Centro de notificaciones
- `/portal/*` — Portal del paciente (OTP, sin auth de usuario)
- `/bienvenida` — Pantalla de bienvenida

### Alias/Redirects
- `/pacientes` → `/expediente`
- `/expediente-clinico` → `/expediente`
- `/clinico` → `/expediente`

---

## 6. FLUJOS CRÍTICOS (PANTALLAS PRIORITARIAS)

### A. Nuevo Paciente (`PatientForm.tsx` — 1067 líneas)
1. Sheet lateral (móvil: fullscreen)
2. Tabs: Datos Personales | Contacto | Dirección | Clínico
3. Campos: nombre, apellido, fecha nacimiento (BirthDatePicker), género, CURP, RFC, teléfono, WhatsApp, email, dirección con LocationPicker (geolocalización), notas médicas, alergias, patologías
4. Auto-detección de duplicados (nombre+fecha nacimiento)
5. Promotor/Referido: selector con promotor default "Óptica Istmeña (llegó solo)"
6. Normalización automática de nombres (Title Case)
7. Persistencia de borrador (useDraftPersistence)
8. Validación con Zod
9. Auto-asigna `branch_id` de la sucursal activa

### B. Nuevo Examen Visual (`UnifiedExamForm.tsx` — 1119 líneas)
1. Se abre desde Expediente > Detalle del paciente
2. Tabs: Refracción | Receta | Diagnóstico | Screening Visual
3. Datos por ojo (OD/OI): Esfera, Cilindro, Eje, ADD, AV (agudeza visual)
4. Calculadora de transposición integrada
5. Sugerencia automática de ADD por edad
6. Validación clínica en tiempo real (errores de prescripción)
7. Indicador de cambio de graduación vs examen anterior
8. Paneles IA: Diagnóstico, Alertas Clínicas, Panel Predictivo, Perfil Visual
9. Genera `visual_exams` + `patient_prescriptions`
10. Botón directo "Ir a Venta" (navega a `/ventas?fromExam=true&patientId=X`)

### C. Venta — POS Terminal (`POSTerminal.tsx` — 1263 líneas)
1. Se abre como **modal fullscreen** (`z-[60]`) con backdrop blur
2. Flujo por pasos: Paciente → Productos → Pago → Ticket
3. `CashSessionGuard`: requiere sesión de caja abierta
4. Selector de paciente + banner de crédito moroso
5. Selector de productos (búsqueda, categorías, paquetes)
6. Carrito con precios por sucursal (`get_effective_price`)
7. Selector de promotor (comisiones automáticas)
8. Panel de pago: efectivo, tarjeta, transferencia, cheque, crédito
9. Pagos mixtos (múltiples métodos)
10. Modal de plan de crédito si es venta a crédito (enganche mínimo configurable)
11. Programación de entrega (DeliveryScheduleModal)
12. Al completar: genera `sales`, `sale_items`, `sale_payments`, `cash_movements`, `lab_orders` (opcional)
13. Ticket térmico + WhatsApp
14. Dirty state: confirmación al cerrar con carrito no vacío

### D. Cobro Rápido (`QuickPaymentSearch.tsx` — 465 líneas)
1. Busca créditos pendientes por nombre/teléfono/número de venta
2. Lista de deudas con semáforo (verde/amarillo/rojo según vencimiento)
3. Modal de pago rápido (QuickPaymentModal)
4. Registra `credit_payments` + `cash_movements`
5. Ticket térmico de abono
6. Tab adicional: Cobros Programados

---

## 7. IMPRESIÓN POS-58

### Tecnología
- **Desktop**: `window.print()` con CSS `@media print`
- **Móvil/Touch**: Generación de PDF con `html2canvas` (3x escala) + `jsPDF`
- Auto-detecta touch con `isTouchDevice()` → botón cambia a "Abrir PDF"

### Formato (`ThermalTicket.tsx` — 675 líneas)
- Anchos: 58mm (48mm útiles) y 80mm (72mm útiles)
- Cabecera: Nombre óptica 14pt/10pt extrabold
- Slogan: "Precio, Calidad y Garantía" 9pt bold
- TOTAL centrado como focal point
- "QUEJAS Y ACLARACIONES" en mayúsculas
- Teléfono centrado debajo de quejas
- Separador: `--------------------------------`

### CSS Print
- Estilos en `thermal-print-styles.ts` (función centralizada)
- Configuración local por dispositivo en `localStorage` (`printer_settings_local`)

---

## 8. PDF DESCARGABLE

- **Receta**: `PrescriptionPDF.tsx` genera PDF de prescripción clínica con firma de la Dra.
- **Tickets**: En móvil, el ticket se convierte a PDF descargable automáticamente

---

## 9. COMPONENTES BASE REUTILIZABLES

### UI Base (shadcn/ui customizados)
- `Button`, `Card`, `Dialog`, `Sheet`, `Tabs`, `Table`, `Badge`, `Input`, `Select`, `Popover`, `Calendar`, `ScrollArea`, `Tooltip`, `Alert`, `Separator`, `Progress`, `Skeleton`

### Componentes propios
| Componente | Ubicación | Uso |
|-----------|-----------|-----|
| `StatCard` | dashboard/ | KPI cards con icono, valor, cambio % |
| `PatientTable` | patients/ | Tabla paginada de pacientes con búsqueda |
| `EnhancedSearch` | ui/ | Buscador con debounce y tokens |
| `PaginatedContainer` | ui/ | Wrapper de paginación |
| `ConfirmDeleteDialog` | ui/ | Diálogo de confirmación destructiva |
| `UnsavedChangesDialog` | ui/ | Dirty state guard |
| `LoadingScreen` | ui/ | Spinner de carga |
| `ErrorBoundary` | error/ | Catch de errores React |
| `ModuleErrorFallback` | error/ | UI de error por módulo |
| `RoleGuard` | auth/ | Wrapper RBAC |
| `ProtectedRoute` | auth/ | Route guard con redirect |
| `CashSessionGuard` | cashregister/ | Requiere caja abierta |
| `MorosoBlockModal` | pos/ | Bloqueo por morosidad |
| `ThermalTicket` | pos/ | Ticket de venta |
| `BirthDatePicker` | patients/ | Selector de fecha nacimiento |
| `LocationPicker` | patients/ | Geolocalización |
| `WhatsAppButton` | patients/ | Botón de WhatsApp |

### Animaciones (`src/components/ui/animations/`)
- `AnimatedCheckmark`, `AnimatedCounter`, `AnimatedInput`, `AnimatedList`
- `LoadingStates`, `MotionWrappers`, `PulsingBadge`, `RippleButton`
- `ShakeWrapper`, `SkeletonShimmer`

---

## 10. RBAC (Control de Acceso por Rol)

### Roles del sistema
| Rol | Alcance |
|-----|---------|
| `super_admin` | Todo, todas las sucursales |
| `admin` | Todo + configuración (alias de super_admin en `has_role`) |
| `gerente` | Operativo completo, solo su sucursal |
| `doctor` | Clínico + ventas |
| `optometrista` | Clínico |
| `asistente` | Operativo limitado |
| `cobrador` | Cobranza |
| `tecnico` | Menú limitado, datos solo del día |

### Restricciones del Técnico
1. **Dashboard**: Solo 4 KPIs del día (ventas, clientes, órdenes, exámenes)
2. **Expediente**: Solo pacientes atendidos HOY por él
3. **Búsqueda**: Opera solo sobre su lista restringida
4. **Post-corte de caja**: Lista de expediente vacía
5. **Usuarios**: Solo editar perfil propio + cambiar contraseña
6. **Menú**: Solo 7 items (Inicio, Agenda, Expediente, Ventas, Herramienta Optometría, Caja, Usuarios)

---

## 11. MULTISUCURSAL

- Toda tabla operativa tiene `branch_id`
- Super Admin: selector global (puede ver "Todas")
- Gerente: solo su sucursal asignada
- `can_access_branch()` RLS helper
- `current_user_branch_id()` resuelve desde `profiles.default_branch_id`
- Registros huérfanos se asignan a "Sucursal Matriz" (`is_main = true`)
- Precios diferenciados por sucursal (`product_prices_by_branch`)

---

## 12. DATOS DEMO vs DATOS REALES

| Módulo | Estado | Notas |
|--------|--------|-------|
| Auth/Login | ✅ Real | Supabase Auth |
| Pacientes | ✅ Real | CRUD completo con RLS |
| Exámenes | ✅ Real | visual_exams + prescriptions |
| Ventas/POS | ✅ Real | sales, sale_items, sale_payments |
| Créditos | ✅ Real | credit_payments, payment_plans |
| Inventario | ✅ Real | products, inventory, movements |
| Laboratorio | ✅ Real | lab_orders con Kanban |
| Caja | ✅ Real | cash_registers, cash_movements |
| Agenda | ✅ Real | appointments + doctor_schedules |
| Marketing | ✅ Real | campaigns, segments, templates |
| Promotores | ✅ Real | promotors, comisiones |
| Reportes | ✅ Real | Queries en vivo |
| Dashboard KPIs | ✅ Real | useDashboardMetrics |
| IA Oportunidades | ✅ Real | Edge function con IA |
| IA Chat Clínico | ✅ Real | Edge function |
| Portal Paciente | ✅ Real | OTP-based |
| Notificaciones | ✅ Real | notifications table |
| Offline Sync | ⚠️ Parcial | Hook existe, sync limitado |

---

## 13. EDGE FUNCTIONS

| Función | Propósito |
|---------|-----------|
| `ai-assistant` | Asistente IA general |
| `clinical-ai-chat` | Chat IA clínico |
| `campaign-ai-assistant` | IA para campañas marketing |
| `clinical-marketing-bridge` | Puente clínico-marketing |
| `delivery-ai-assistant` | IA para entregas |
| `prescription-ai-validator` | Validador IA de recetas |
| `create-admin` | Crear primer admin |
| `admin-reset-database` | Reset de BD (protegido) |
| `patient-portal-otp` | OTP para portal paciente |
| `payment-reminders` | Recordatorios de pago |
| `installment-reminders` | Recordatorios de cuotas |
| `send-auto-message` | Mensajes automáticos |

---

## 14. PROVIDERS (orden de anidamiento en App.tsx)

```
ErrorBoundary
  QueryClientProvider
    AuthProvider
      AuthorizationProvider
        BranchProvider
          TooltipProvider
            Toaster + Sonner
            BrowserRouter
              RouteTracker
              Routes...
```
