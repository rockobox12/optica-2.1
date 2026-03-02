# DATA MODEL — Óptica Istmeña Suite

> Modelo de datos completo para reconstruir la base de datos.

---

## 1. TABLAS PRINCIPALES Y RELACIONES

### Usuarios y Autenticación
```
auth.users (Supabase managed)
  └── profiles (1:1)
        ├── user_id (FK → auth.users.id)
        ├── full_name, email, phone, birth_date
        ├── is_active, default_branch_id (FK → branches)
        └── avatar_url
  └── user_roles (1:N)
        ├── user_id (FK → auth.users.id)
        ├── role (enum: app_role)
        └── branch_id (FK → branches, nullable)
```

### Enum `app_role`
```sql
'super_admin' | 'admin' | 'gerente' | 'doctor' | 'optometrista' | 'asistente' | 'cobrador' | 'tecnico'
```

### Sucursales
```
branches
  ├── id (UUID PK)
  ├── name, code (auto: SUC001)
  ├── address, city, state, colony, zip_code
  ├── phone, email, whatsapp_number
  ├── is_main (boolean, solo 1 true)
  ├── is_active
  └── manager
```

### Pacientes
```
patients
  ├── id (UUID PK)
  ├── first_name, last_name
  ├── birth_date, gender, curp, rfc
  ├── phone, mobile, whatsapp, email
  ├── phone_e164 (auto-calculated via trigger)
  ├── address, city, state, zip_code, colony
  ├── latitude, longitude
  ├── occupation, blood_type
  ├── medical_notes, allergies, pathologies
  ├── referred_by (FK → promotors)
  ├── branch_id (FK → branches) ← CRITICAL
  ├── origin_branch_id (FK → branches)
  ├── is_active, is_deleted, status ('active'|'archived')
  ├── deleted_at, deleted_by, deleted_reason
  ├── archived_at, archived_by, archive_reason
  ├── payment_probability_score (0-100)
  ├── payment_risk_level ('reliable'|'moderate'|'high'|'critical')
  ├── loyalty_points
  └── created_at, created_by
```

### Exámenes Visuales
```
visual_exams
  ├── id (UUID PK)
  ├── patient_id (FK → patients)
  ├── branch_id (FK → branches)
  ├── created_by (FK → auth.users)
  ├── exam_date
  ├── od_sphere, od_cylinder, od_axis, od_add, od_av, od_dnp
  ├── oi_sphere, oi_cylinder, oi_axis, oi_add, oi_av, oi_dnp
  ├── od_near_av, oi_near_av
  ├── diagnosis, notes, recommendations
  ├── screening_data (JSONB)
  ├── visual_profile (JSONB)
  └── created_at
```

### Prescripciones
```
patient_prescriptions
  ├── id (UUID PK)
  ├── prescription_number (auto: RX-YYYYMM-00001)
  ├── patient_id (FK → patients)
  ├── visual_exam_id (FK → visual_exams)
  ├── branch_id (FK → branches)
  ├── prescribed_by (FK → auth.users)
  ├── od_sphere, od_cylinder, od_axis, od_add
  ├── oi_sphere, oi_cylinder, oi_axis, oi_add
  ├── lens_type, material, coating, observations
  ├── expiry_date
  ├── status ('active'|'used'|'expired')
  └── created_at
```

### Ventas
```
sales
  ├── id (UUID PK)
  ├── sale_number (auto: VTA-YYYYMM-000001)
  ├── patient_id (FK → patients)
  ├── branch_id (FK → branches)
  ├── seller_id (FK → auth.users)
  ├── prescription_id (FK → patient_prescriptions, nullable)
  ├── subtotal, discount_amount, tax_amount, total
  ├── amount_paid, balance
  ├── status (enum: sale_status → 'pending'|'partial'|'completed'|'cancelled'|'refunded')
  ├── is_credit (boolean)
  ├── credit_due_date, next_payment_date, next_payment_amount
  ├── promotor_id (FK → promotors)
  ├── total_profit
  ├── notes
  └── created_at, updated_at

sale_items
  ├── id (UUID PK)
  ├── sale_id (FK → sales)
  ├── product_id (FK → products)
  ├── product_name, product_sku
  ├── quantity, unit_price, discount_percent, discount_amount, subtotal
  ├── cost_price, profit_amount
  └── package_id (FK → packages, nullable)

sale_payments
  ├── id (UUID PK)
  ├── sale_id (FK → sales)
  ├── payment_method ('cash'|'card'|'transfer'|'check'|'credit')
  ├── amount, reference
  └── created_at
```

### Crédito y Cobranza
```
credit_payments
  ├── id (UUID PK)
  ├── sale_id (FK → sales)
  ├── amount, payment_method, reference
  ├── payment_number
  ├── received_by (FK → auth.users)
  ├── is_voided, voided_at, voided_by, voided_reason
  └── created_at

payment_plans
  ├── id (UUID PK)
  ├── sale_id (FK → sales)
  ├── total_amount, down_payment
  ├── num_installments, installment_amount
  ├── frequency ('weekly'|'biweekly'|'monthly')
  ├── start_date, status
  └── created_at

payment_plan_installments
  ├── id (UUID PK)
  ├── payment_plan_id (FK → payment_plans)
  ├── installment_number, due_date
  ├── amount, paid_amount
  ├── status ('pending'|'paid'|'overdue'|'partial')
  ├── days_overdue
  └── paid_at

payment_audit_log
  ├── event_type, payment_id, sale_id, patient_id
  ├── amount, reason, performed_by
  └── metadata (JSONB)
```

### Caja
```
cash_registers (sesiones de caja)
  ├── id (UUID PK)
  ├── branch_id (FK → branches)
  ├── opened_by, opening_amount, opening_date
  ├── closed_by, closing_amount, closing_date
  ├── expected_amount, difference
  ├── status ('open'|'closed')
  └── notes

cash_movements
  ├── id (UUID PK)
  ├── cash_register_id (FK → cash_registers)
  ├── sale_id (FK → sales, nullable)
  ├── movement_type ('income'|'expense'|'adjustment')
  ├── payment_method
  ├── amount, description
  └── created_by, created_at

cash_counts (arqueos)
  ├── cash_register_id, count_type ('opening'|'closing'|'partial')
  ├── bills_20, bills_50, bills_100, bills_200, bills_500, bills_1000
  ├── coins_50c, coins_1, coins_2, coins_5, coins_10, coins_20
  ├── total_counted, expected_amount, difference
  └── counted_by, notes

bank_accounts
  ├── bank_name, account_number, clabe, account_type
  ├── currency ('MXN'), current_balance
  └── branch_id

bank_transactions
  ├── bank_account_id, transaction_type, amount
  ├── reference, description
  ├── reconciled, reconciled_at
  └── sale_id (nullable)
```

### Inventario
```
products
  ├── id (UUID PK)
  ├── sku (auto: PRD-000001), name, description
  ├── category_id (FK → product_categories)
  ├── brand, model, material, color, size
  ├── purchase_price, sale_price
  ├── min_stock, max_stock, reorder_point
  ├── is_active, is_service
  └── barcode

product_categories
  ├── id, name, description, parent_id (self-ref)

inventory
  ├── product_id (FK → products)
  ├── branch_id (FK → branches)
  ├── quantity
  └── updated_at

inventory_movements
  ├── product_id, branch_id
  ├── movement_type ('entrada'|'salida'|'venta'|'devolucion'|'ajuste'|'transferencia')
  ├── quantity, previous_stock, new_stock
  ├── unit_cost, total_cost
  ├── reference_type, reference_id
  ├── transfer_branch_id
  └── created_by, notes

stock_alerts
  ├── product_id, branch_id
  ├── alert_type ('out_of_stock'|'low_stock'|'overstock')
  ├── current_quantity, threshold_quantity
  └── is_resolved, resolved_at

product_prices_by_branch
  ├── product_id, branch_id, price, is_active
```

### Laboratorio
```
lab_orders
  ├── id (UUID PK)
  ├── order_number
  ├── patient_id, sale_id, prescription_id
  ├── branch_id
  ├── status (Kanban: PENDIENTE → EN_PROCESO → EN_LABORATORIO → LISTO_PARA_ENTREGA → ENTREGADO)
  ├── location ('EN_OPTICA'|'EN_LABORATORIO')
  ├── lab_name, lab_notes
  ├── lens_type, material, coating, treatment
  ├── od_*, oi_* (prescription data snapshot)
  ├── estimated_date, delivered_at
  └── created_by
```

### Agenda
```
appointments
  ├── id (UUID PK)
  ├── patient_id, doctor_id, branch_id
  ├── appointment_date, start_time, end_time
  ├── appointment_type (enum: consulta|entrega|seguimiento|emergencia|otro)
  ├── status (enum: scheduled|confirmed|checked_in|in_progress|completed|cancelled|no_show)
  ├── reason, notes
  ├── sale_id, lab_order_id (para entregas)
  ├── delivery_responsible_user_id, delivery_responsible_type
  ├── booking_source ('manual'|'portal'|'auto')
  └── reminder_sent, reminder_sent_at

doctor_schedules
  ├── doctor_id, branch_id
  ├── day_of_week (0-6)
  ├── start_time, end_time, slot_duration (minutos)
  └── is_active

blocked_slots
  ├── doctor_id, branch_id
  ├── start_datetime, end_datetime, reason
```

### Promotores y Comisiones
```
promotors
  ├── id (UUID PK)
  ├── name, phone, email, zone
  ├── is_active
  └── branch_id

promotor_commission_config
  ├── promotor_id (nullable = global)
  ├── tipo_comision ('PERCENT'|'FIXED')
  ├── valor_comision
  └── activo

promotor_comisiones
  ├── promotor_id, sale_id (unique)
  ├── monto_venta, monto_comision
  ├── tipo_comision, valor_aplicado
  └── periodo (YYYY-MM)
```

### Marketing
```
marketing_campaigns
  ├── name, description, campaign_type
  ├── status ('draft'|'pending_approval'|'approved'|'active'|'completed'|'cancelled')
  ├── start_date, end_date
  ├── target_audience, budget
  └── branch_id

campaign_messages, campaign_recipients, campaign_templates
ai_campaign_segments
customer_loyalty_points, loyalty_settings
```

### Notificaciones
```
notifications
  ├── user_id, title, message
  ├── type, priority
  ├── is_read, read_at
  ├── action_url, action_label
  ├── expires_at
  └── metadata (JSONB)
```

### Transferencias de Pacientes
```
patient_transfers
  ├── patient_id, from_branch_id, to_branch_id
  ├── reason, notes
  ├── transferred_by, keep_credit_owner
  └── pending_balance

patient_transfer_requests
  ├── patient_id, from_branch_id, to_branch_id
  ├── requested_by, reason, notes
  ├── status ('pending'|'approved'|'rejected')
  ├── reviewed_by, reviewed_at, review_notes
  └── transfer_id
```

### Autorizaciones Admin
```
admin_authorization_requests
  ├── action_type (enum), resource_type, resource_id
  ├── requested_by_user_id, requested_by_role
  ├── status ('pending'|'approved'|'rejected'|'expired')
  ├── approved_by_user_id, admin_comment
  └── expires_at

admin_reset_otp (para reset de BD)
admin_reset_rate_limit
```

### Borradores
```
drafts
  ├── user_id, branch_id, form_type, entity_id
  ├── draft_data (JSONB)
  ├── status ('ACTIVE'|'USED'|'DISCARDED')
  └── updated_at
```

### Mensajería Automática
```
auto_message_templates
  ├── name, message_type (enum), channel (enum)
  ├── template_content, trigger_config (JSONB)
  └── is_active

auto_message_logs
  ├── message_type, channel, recipient_phone
  ├── message_content, patient_id
  ├── status, sent_at, error_message
```

### Portal del Paciente
```
patient_portal_tokens
  ├── token (text), patient_id
  ├── phone_e164, patient_name
  ├── expires_at, attempts_left, used
```

### Configuración
```
company_settings (singleton)
  ├── company_name, slogan, phone, email
  ├── address, logo_url
  ├── corporate_patients_enabled
  └── various config flags

credit_settings (singleton)
  ├── min_down_payment_percent (default 20)
  ├── max_installments, default_frequency
  └── moroso_block_enabled

add_clinical_config (singleton)
  ├── add_min, add_max, add_step
  ├── edad_minima_add
  └── mostrar_sugerencia_add

add_age_suggestions
  ├── min_age, max_age, suggested_add
```

---

## 2. CAMPOS CLAVE TRANSVERSALES

| Campo | Propósito |
|-------|-----------|
| `branch_id` | Filtro multisucursal en TODA tabla operativa |
| `created_at` | Timestamp UTC auto |
| `created_by` | UUID del usuario que creó el registro |
| `status` | Estado del registro (varía por tabla) |
| `patient_id` | Referencia al paciente |
| `is_active` | Soft-delete flag |
| `is_deleted` | Soft-delete explícito (patients) |

---

## 3. FUNCIONES RPC CRÍTICAS

| Función | Propósito |
|---------|-----------|
| `has_role(user_id, role)` | Verifica rol (admin incluye super_admin) |
| `is_super_admin()` | Shortcut para super_admin |
| `can_access_branch(branch_id)` | Verifica acceso a sucursal |
| `current_user_branch_id()` | Obtiene branch_id del usuario |
| `set_user_roles(target_id, roles_json)` | Asigna roles (SECURITY DEFINER) |
| `update_inventory(...)` | Movimiento de inventario atómico |
| `void_payment(payment_id, by, reason)` | Anula pago (solo admin) |
| `calculate_payment_probability(patient_id)` | Scoring crediticio (0-100) |
| `calculate_promotor_commission(...)` | Calcula y registra comisión |
| `get_effective_price(product_id, branch_id)` | Precio con override por sucursal |
| `get_available_slots(doctor, branch, date)` | Slots libres de agenda |
| `transfer_patient(...)` | Transferencia entre sucursales |
| `archive_patient(...)` / `reactivate_patient(...)` | Archivo seguro |
| `soft_delete_patient(...)` | Eliminación lógica |
| `normalize_phone_mx(phone)` | Normaliza a +52XXXXXXXXXX |

---

## 4. DEFINICIONES DE KPIs DEL DASHBOARD

### Hook: `useDashboardMetrics`

| KPI | Query |
|-----|-------|
| **Ventas del Día** | `SUM(total) FROM sales WHERE created_at >= HOY_00:00 AND branch_id = activa` |
| **Cambio % vs ayer** | `(ventas_hoy - ventas_ayer) / ventas_ayer * 100` |
| **Clientes Atendidos** | `COUNT(DISTINCT patient_id) FROM sales WHERE created_at >= HOY` |
| **Nuevos Clientes** | `COUNT(*) FROM patients WHERE created_at >= HOY AND branch_id = activa` |
| **Órdenes Pendientes** | `COUNT(*) FROM lab_orders WHERE status NOT IN ('ENTREGADO','CANCELADO')` |
| **Listas para Entrega** | `COUNT(*) FROM lab_orders WHERE status = 'LISTO_PARA_ENTREGA'` |
| **Exámenes Hoy** | `COUNT(*) FROM visual_exams WHERE created_at >= HOY` |

### Cálculo de "HOY"
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const todayISO = today.toISOString(); // Usa hora local del navegador convertida a UTC
```
> **Nota**: El filtro usa `>=` sobre `created_at` (timestamp with time zone). La zona horaria efectiva es la del navegador del usuario (típicamente America/Mexico_City CST/CDT UTC-6/-5).

---

## 5. TRIGGERS IMPORTANTES

| Trigger | Tabla | Acción |
|---------|-------|--------|
| `validate_user_role` | `user_roles` | Bloquea roles inválidos |
| `handle_new_user` | `auth.users` | Crea profile automático |
| `patients_set_phone_e164` | `patients` | Normaliza teléfono |
| `update_sale_totals` | `sale_items` | Recalcula totales de venta |
| `update_sale_total_profit` | `sale_items` | Recalcula utilidad |
| `ensure_single_main_branch` | `branches` | Solo 1 sucursal principal |
| `validate_lab_order_status_location` | `lab_orders` | Validación de estado-ubicación |
| `update_updated_at_column` | Varias | Auto-actualiza `updated_at` |

---

## 6. SEQUENCES

```sql
prescription_number_seq  -- Para RX-YYYYMM-XXXXX
sale_number_seq          -- Para VTA-YYYYMM-XXXXXX
product_sku_seq          -- Para PRD-XXXXXX
```
