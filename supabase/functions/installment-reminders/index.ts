import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Settings {
  is_enabled: boolean;
  min_hour: number;
  max_hour: number;
  max_per_patient_per_week: number;
  template_before: string;
  template_level1: string;
  template_level2: string;
  template_level3: string;
  level_cooldown_days: number;
  overdue_repeat_interval_days: number;
}

function getDelinquencyLevel(daysOverdue: number): number {
  if (daysOverdue >= 60) return 3;
  if (daysOverdue >= 30) return 2;
  if (daysOverdue >= 1) return 1;
  return 0;
}

function getLevelTemplateKey(level: number): 'template_level1' | 'template_level2' | 'template_level3' {
  if (level >= 3) return 'template_level3';
  if (level >= 2) return 'template_level2';
  return 'template_level1';
}

function formatDateMX(d: string): string {
  const date = new Date(d + 'T12:00:00');
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
}

function formatMoney(n: number): string {
  return `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let msg = template;
  for (const [key, val] of Object.entries(vars)) {
    msg = msg.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
  }
  // Also handle ${monto} and ${saldo} patterns
  msg = msg.replace(/\{\$?monto\}/g, vars.monto || '');
  msg = msg.replace(/\{\$?saldo\}/g, vars.saldo || '');
  return msg;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase
      .from('installment_reminder_settings')
      .select('*')
      .limit(1)
      .single();

    if (!settings || !settings.is_enabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'Installment reminders disabled', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const currentHour = now.getUTCHours() - 6; // Approx CST
    if (currentHour < settings.min_hour || currentHour > settings.max_hour) {
      return new Response(
        JSON.stringify({ success: true, message: 'Outside allowed hours', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = now.toISOString().split('T')[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: branchInfo } = await supabase
      .from('branches')
      .select('name, phone')
      .eq('is_main', true)
      .limit(1)
      .maybeSingle();

    const results: { type: string; patientId: string; status: string; level?: number; reason?: string }[] = [];

    // Helper: send message via edge function
    async function sendMessage(phone: string, message: string, patient: any) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-auto-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            channel: 'whatsapp', to: phone, message,
            patient_id: patient.id,
            patient_name: `${patient.first_name} ${patient.last_name}`,
            message_type: 'payment_reminder',
            reference_type: 'installment_reminder',
          }),
        });
      } catch (e) {
        console.error('Send error:', e);
      }
    }

    // Helper: check weekly limit
    async function checkWeeklyLimit(patientId: string): Promise<boolean> {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('installment_reminder_log')
        .select('id', { count: 'exact', head: true })
        .eq('patient_id', patientId)
        .gte('created_at', weekAgo);
      return (count || 0) >= settings.max_per_patient_per_week;
    }

    // ========== A) "Tomorrow" reminders (pre-due) ==========
    const { data: dueTomorrow } = await supabase
      .from('payment_plan_installments')
      .select(`
        id, due_date, amount, installment_number,
        payment_plans!inner (
          id, sale_id, patient_id,
          patients!inner (
            id, first_name, last_name, whatsapp, mobile, phone, whatsapp_opted_in
          )
        )
      `)
      .eq('due_date', tomorrow)
      .eq('status', 'pending');

    for (const inst of (dueTomorrow || [])) {
      const plan = inst.payment_plans as any;
      const patient = plan.patients as any;

      if (!patient?.whatsapp_opted_in) {
        results.push({ type: 'before', patientId: patient?.id, status: 'skipped', reason: 'No opt-in' });
        continue;
      }

      const phone = patient.whatsapp || patient.mobile;
      if (!phone) {
        results.push({ type: 'before', patientId: patient.id, status: 'skipped', reason: 'No phone' });
        continue;
      }

      if (await checkWeeklyLimit(patient.id)) {
        results.push({ type: 'before', patientId: patient.id, status: 'skipped', reason: 'Weekly limit' });
        continue;
      }

      // Check if already sent
      const { data: existing } = await supabase
        .from('installment_reminder_log')
        .select('id')
        .eq('installment_id', inst.id)
        .eq('template_key', 'before')
        .in('status', ['pending', 'sent'])
        .limit(1)
        .maybeSingle();

      if (existing) {
        results.push({ type: 'before', patientId: patient.id, status: 'skipped', reason: 'Already sent' });
        continue;
      }

      const { data: sale } = await supabase
        .from('sales')
        .select('sale_number, balance')
        .eq('id', plan.sale_id)
        .maybeSingle();

      const message = fillTemplate(settings.template_before, {
        nombre: `${patient.first_name} ${patient.last_name}`,
        fecha: formatDateMX(inst.due_date),
        monto: formatMoney(inst.amount),
        saldo: formatMoney(sale?.balance || 0),
        sucursal: branchInfo?.name || 'Óptica Istmeña',
        telefono_sucursal: branchInfo?.phone || '',
        folio_venta: sale?.sale_number || '',
      });

      await supabase.from('installment_reminder_log').insert({
        patient_id: patient.id,
        plan_id: plan.id,
        installment_id: inst.id,
        sale_id: plan.sale_id,
        template_key: 'before',
        channel: 'whatsapp',
        message_content: message,
        phone,
        status: 'sent',
        sent_at: new Date().toISOString(),
        delinquency_level: 0,
        days_overdue_at_send: 0,
      });

      await sendMessage(phone, message, patient);
      results.push({ type: 'before', patientId: patient.id, status: 'sent', level: 0 });
    }

    // ========== B) Level-based overdue reminders ==========
    const { data: overdue } = await supabase
      .from('payment_plan_installments')
      .select(`
        id, due_date, amount, installment_number, days_overdue,
        payment_plans!inner (
          id, sale_id, patient_id,
          patients!inner (
            id, first_name, last_name, whatsapp, mobile, phone, whatsapp_opted_in
          )
        )
      `)
      .lt('due_date', today)
      .in('status', ['pending', 'overdue']);

    for (const inst of (overdue || [])) {
      const plan = inst.payment_plans as any;
      const patient = plan.patients as any;

      if (!patient?.whatsapp_opted_in) continue;
      const phone = patient.whatsapp || patient.mobile;
      if (!phone) continue;

      if (await checkWeeklyLimit(patient.id)) continue;

      const daysOverdue = inst.days_overdue || Math.max(0, Math.ceil((now.getTime() - new Date(inst.due_date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24)));
      const level = getDelinquencyLevel(daysOverdue);
      if (level === 0) continue;

      // Check cooldown: no message of same level in last N days
      const cooldownDate = new Date(now.getTime() - settings.level_cooldown_days * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentSameLevel } = await supabase
        .from('installment_reminder_log')
        .select('id')
        .eq('patient_id', patient.id)
        .eq('delinquency_level', level)
        .gte('created_at', cooldownDate)
        .in('status', ['pending', 'sent'])
        .limit(1)
        .maybeSingle();

      if (recentSameLevel) continue;

      const { data: sale } = await supabase
        .from('sales')
        .select('sale_number, balance')
        .eq('id', plan.sale_id)
        .maybeSingle();

      const templateKey = getLevelTemplateKey(level);
      const template = settings[templateKey] || settings.template_overdue;

      const message = fillTemplate(template, {
        nombre: `${patient.first_name} ${patient.last_name}`,
        fecha: formatDateMX(inst.due_date),
        dias: String(daysOverdue),
        monto: formatMoney(inst.amount),
        saldo: formatMoney(sale?.balance || 0),
        sucursal: branchInfo?.name || 'Óptica Istmeña',
        telefono_sucursal: branchInfo?.phone || '',
        telefono: branchInfo?.phone || '',
        folio_venta: sale?.sale_number || '',
      });

      await supabase.from('installment_reminder_log').insert({
        patient_id: patient.id,
        plan_id: plan.id,
        installment_id: inst.id,
        sale_id: plan.sale_id,
        template_key: `level_${level}`,
        channel: 'whatsapp',
        message_content: message,
        phone,
        status: 'sent',
        sent_at: new Date().toISOString(),
        delinquency_level: level,
        days_overdue_at_send: daysOverdue,
      });

      await sendMessage(phone, message, patient);
      results.push({ type: `level_${level}`, patientId: patient.id, status: 'sent', level });
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in installment-reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
