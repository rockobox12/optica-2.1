import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, branchId, opportunityId, limit = 50 } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'detect_opportunities') {
      // Get patients with their last exam/sale dates
      let query = supabase
        .from('patients')
        .select(`
          id, first_name, last_name, phone, email, birth_date,
          visual_exams(exam_date),
          sales(created_at)
        `)
        .eq('is_active', true)
        .limit(limit);
      
      if (branchId) query = query.eq('branch_id', branchId);

      const { data: patients, error } = await query;
      if (error) throw error;

      const opportunities: any[] = [];
      const now = new Date();
      const sixMonths = 180 * 24 * 60 * 60 * 1000;
      const twelveMonths = 365 * 24 * 60 * 60 * 1000;

      for (const patient of patients || []) {
        const fullName = `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Paciente';
        
        // Calculate last visit from exams and sales
        const exams = patient.visual_exams || [];
        const sales = patient.sales || [];
        
        let lastVisitDate: Date | null = null;
        
        // Check last exam
        if (exams.length > 0) {
          const sortedExams = exams.sort((a: any, b: any) => 
            new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime()
          );
          lastVisitDate = new Date(sortedExams[0].exam_date);
        }
        
        // Check last sale
        if (sales.length > 0) {
          const sortedSales = sales.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          const lastSaleDate = new Date(sortedSales[0].created_at);
          if (!lastVisitDate || lastSaleDate > lastVisitDate) {
            lastVisitDate = lastSaleDate;
          }
        }
        
        const timeSince = lastVisitDate ? now.getTime() - lastVisitDate.getTime() : Infinity;

        if (timeSince > twelveMonths) {
          opportunities.push({
            patient_id: patient.id,
            opportunity_type: 'overdue_review_12m',
            priority: 'high',
            clinical_summary: `${fullName} sin revisión en más de 12 meses.`,
            clinical_details: { last_visit: lastVisitDate?.toISOString() || null },
          });
        } else if (timeSince > sixMonths) {
          opportunities.push({
            patient_id: patient.id,
            opportunity_type: 'overdue_review_6m',
            priority: 'medium',
            clinical_summary: `${fullName} sin visita en 6 meses.`,
            clinical_details: { last_visit: lastVisitDate?.toISOString() || null },
          });
        }
      }

      if (opportunities.length > 0) {
        await supabase.from('clinical_opportunities').upsert(
          opportunities.map(opp => ({ ...opp, branch_id: branchId, status: 'detected' })),
          { onConflict: 'patient_id,opportunity_type', ignoreDuplicates: true }
        );
      }

      return new Response(JSON.stringify({ success: true, opportunities_detected: opportunities.length, opportunities }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generate_marketing_action') {
      if (!opportunityId) throw new Error('opportunityId is required');

      const { data: opp, error } = await supabase
        .from('clinical_opportunities')
        .select('*, patients(first_name, last_name, phone, email)')
        .eq('id', opportunityId)
        .single();

      if (error || !opp) throw new Error('Opportunity not found');

      const patientName = opp.patients 
        ? `${opp.patients.first_name || ''} ${opp.patients.last_name || ''}`.trim() 
        : 'estimado paciente';

      const marketingAction = {
        action_type: 'reminder',
        channel: 'whatsapp',
        suggested_message: `Hola ${patientName}, en Óptica Istmeña nos preocupamos por tu salud visual. Te invitamos a agendar una cita de revisión. ¡Contáctanos!`,
        suggested_send_window: { best_days: ['lunes', 'martes', 'miércoles'], best_hours: '10:00-14:00' }
      };

      const { data: actionRecord, error: insertError } = await supabase
        .from('clinical_marketing_actions')
        .insert({
          opportunity_id: opportunityId,
          patient_id: opp.patient_id,
          action_type: marketingAction.action_type,
          channel: marketingAction.channel,
          suggested_message: marketingAction.suggested_message,
          suggested_send_window: marketingAction.suggested_send_window,
          status: 'suggested',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from('clinical_opportunities')
        .update({ status: 'suggested', marketing_action_id: actionRecord.id })
        .eq('id', opportunityId);

      return new Response(JSON.stringify({ success: true, marketing_action: actionRecord }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_learning_insights') {
      const { data, error } = await supabase
        .from('clinical_ai_learning')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const approved = (data || []).filter(l => l.was_approved);
      const insights = {
        total_records: data?.length || 0,
        approval_rate: data?.length ? (approved.length / data.length) * 100 : 0,
      };

      return new Response(JSON.stringify({ success: true, insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});