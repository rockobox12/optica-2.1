import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface DeliveryAnalysis {
  deliveryId: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  appointmentDate: string;
  startTime: string;
  riskScore: number;
  riskReasons: string[];
  recommendation: string;
  suggestedWhatsAppMessage: string;
  labOrderId?: string;
  labOrderNumber?: string;
  labOrderStatus?: string;
  labOrderLocation?: string;
  saleId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, branchId, deliveryId } = await req.json();
    console.log(`Delivery AI Assistant: action=${action}, branchId=${branchId}, deliveryId=${deliveryId}`);

    if (action === 'analyze_deliveries') {
      // Fetch upcoming deliveries (next 7 days)
      const today = new Date();
      const in7Days = new Date(today);
      in7Days.setDate(in7Days.getDate() + 7);

      let query = supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          patient_name,
          patient_phone,
          appointment_date,
          start_time,
          status,
          notes,
          sale_id,
          lab_order_id,
          branch_id
        `)
        .eq('appointment_type', 'delivery')
        .gte('appointment_date', today.toISOString().split('T')[0])
        .lte('appointment_date', in7Days.toISOString().split('T')[0])
        .not('status', 'in', '("completed","cancelled","no_show")')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data: deliveries, error: deliveriesError } = await query;

      if (deliveriesError) {
        console.error('Error fetching deliveries:', deliveriesError);
        throw deliveriesError;
      }

      console.log(`Found ${deliveries?.length || 0} deliveries to analyze`);

      const analyses: DeliveryAnalysis[] = [];

      for (const delivery of (deliveries || [])) {
        let riskScore = 0;
        const riskReasons: string[] = [];
        let recommendation = '';

        // 1. Check lab order status if exists
        let labOrderId: string | undefined;
        let labOrderNumber: string | undefined;
        let labOrderStatus: string | undefined;
        let labOrderLocation: string | undefined;
        
        if (delivery.lab_order_id) {
          const { data: labOrder } = await supabase
            .from('lab_orders')
            .select('id, order_number, status, location')
            .eq('id', delivery.lab_order_id)
            .single();

          if (labOrder) {
            labOrderId = labOrder.id;
            labOrderNumber = labOrder.order_number;
            labOrderStatus = labOrder.status;
            labOrderLocation = labOrder.location;

            // Add risk based on lab order status
            if (labOrder.status !== 'LISTO_PARA_ENTREGA' && labOrder.status !== 'ENTREGADO') {
              riskScore += 40;
              riskReasons.push('Orden aún en laboratorio');
            }
            
            if (labOrder.location !== 'EN_OPTICA') {
              riskScore += 20;
              riskReasons.push('Producto no está en la óptica');
            }
          }
        }

        // 2. Check patient no-show history
        if (delivery.patient_id) {
          const { data: noShowHistory, error: historyError } = await supabase
            .from('appointments')
            .select('id')
            .eq('patient_id', delivery.patient_id)
            .eq('status', 'no_show')
            .limit(5);

          if (!historyError && noShowHistory && noShowHistory.length > 0) {
            riskScore += noShowHistory.length * 10;
            riskReasons.push(`Paciente con historial de no asistencia (${noShowHistory.length} veces)`);
          }
        }

        // 3. Check if delivery is confirmed
        if (delivery.status === 'scheduled') {
          riskScore += 25;
          riskReasons.push('Entrega sin confirmar');
        }

        // 4. Check if delivery is today or tomorrow
        const deliveryDate = new Date(delivery.appointment_date);
        const diffDays = Math.ceil((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1 && riskScore > 20) {
          riskScore += 15;
          riskReasons.push('Entrega próxima con pendientes');
        }

        // 5. Check contact events (WhatsApp confirmations)
        if (delivery.patient_id) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          const { data: recentContacts } = await supabase
            .from('contact_events')
            .select('id')
            .eq('patient_id', delivery.patient_id)
            .eq('channel', 'whatsapp')
            .gte('created_at', yesterday.toISOString())
            .limit(1);

          if (!recentContacts || recentContacts.length === 0) {
            riskScore += 10;
            riskReasons.push('Sin contacto reciente');
          }
        }

        // Cap risk score at 100
        riskScore = Math.min(riskScore, 100);

        // Generate recommendation based on risk factors
        if (riskReasons.some(r => r.includes('laboratorio') || r.includes('óptica'))) {
          recommendation = 'Verificar estado del producto en laboratorio antes de confirmar';
        } else if (riskReasons.some(r => r.includes('sin confirmar'))) {
          recommendation = 'Confirmar cita por WhatsApp';
        } else if (riskReasons.some(r => r.includes('no asistencia'))) {
          recommendation = 'Llamar al paciente para confirmar asistencia';
        } else if (riskScore > 50) {
          recommendation = 'Reprogramar si no se puede confirmar';
        } else if (riskScore > 20) {
          recommendation = 'Enviar recordatorio por WhatsApp';
        } else {
          recommendation = 'Sin acción requerida';
        }

        // Generate suggested WhatsApp message
        const patientFirstName = delivery.patient_name?.split(' ')[0] || 'Estimado cliente';
        const formattedDate = new Date(delivery.appointment_date).toLocaleDateString('es-MX', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        });

        let suggestedWhatsAppMessage = '';
        if (riskReasons.some(r => r.includes('laboratorio'))) {
          suggestedWhatsAppMessage = `Hola ${patientFirstName}, le informamos que sus productos están en proceso de preparación. Le confirmaremos en cuanto estén listos para su entrega programada el ${formattedDate} a las ${delivery.start_time}. ¡Gracias por su paciencia!`;
        } else if (delivery.status === 'scheduled') {
          suggestedWhatsAppMessage = `Hola ${patientFirstName}, le recordamos su cita para entrega de productos el ${formattedDate} a las ${delivery.start_time}. ¿Nos confirma su asistencia? ¡Lo esperamos!`;
        } else {
          suggestedWhatsAppMessage = `Hola ${patientFirstName}, le recordamos que tiene programada la entrega de sus productos el ${formattedDate} a las ${delivery.start_time}. ¡Lo esperamos!`;
        }

        analyses.push({
          deliveryId: delivery.id,
          patientId: delivery.patient_id || undefined,
          patientName: delivery.patient_name || 'Sin nombre',
          patientPhone: delivery.patient_phone || undefined,
          appointmentDate: delivery.appointment_date,
          startTime: delivery.start_time,
          riskScore,
          riskReasons: riskReasons.length > 0 ? riskReasons : ['Sin riesgos detectados'],
          recommendation,
          suggestedWhatsAppMessage,
          labOrderId,
          labOrderNumber,
          labOrderStatus,
          labOrderLocation,
          saleId: delivery.sale_id || undefined,
        });
      }

      // Sort by risk score descending
      analyses.sort((a, b) => b.riskScore - a.riskScore);

      return new Response(JSON.stringify({
        success: true,
        analyses,
        analyzedCount: analyses.length,
        highRiskCount: analyses.filter(a => a.riskScore >= 50).length,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'get_single_analysis' && deliveryId) {
      // Get analysis for a single delivery
      const { data: delivery, error: deliveryError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          patient_name,
          patient_phone,
          appointment_date,
          start_time,
          status,
          notes,
          sale_id,
          lab_order_id,
          branch_id
        `)
        .eq('id', deliveryId)
        .eq('appointment_type', 'delivery')
        .single();

      if (deliveryError || !delivery) {
        return new Response(JSON.stringify({ error: 'Delivery not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Similar analysis logic for single delivery
      let riskScore = 0;
      const riskReasons: string[] = [];
      let recommendation = '';
      let labOrderId: string | undefined;
      let labOrderNumber: string | undefined;
      let labOrderStatus: string | undefined;
      let labOrderLocation: string | undefined;

      if (delivery.lab_order_id) {
        const { data: labOrder } = await supabase
          .from('lab_orders')
          .select('id, order_number, status, location')
          .eq('id', delivery.lab_order_id)
          .single();

        if (labOrder) {
          labOrderId = labOrder.id;
          labOrderNumber = labOrder.order_number;
          labOrderStatus = labOrder.status;
          labOrderLocation = labOrder.location;
          
          if (labOrder.status !== 'LISTO_PARA_ENTREGA' && labOrder.status !== 'ENTREGADO') {
            riskScore += 40;
            riskReasons.push('Orden aún en laboratorio');
          }
          
          if (labOrder.location !== 'EN_OPTICA') {
            riskScore += 20;
            riskReasons.push('Producto no está en la óptica');
          }
        }
      }

      if (delivery.patient_id) {
        const { data: noShowHistory } = await supabase
          .from('appointments')
          .select('id')
          .eq('patient_id', delivery.patient_id)
          .eq('status', 'no_show')
          .limit(5);

        if (noShowHistory && noShowHistory.length > 0) {
          riskScore += noShowHistory.length * 10;
          riskReasons.push(`Paciente con historial de no asistencia (${noShowHistory.length} veces)`);
        }
      }

      if (delivery.status === 'scheduled') {
        riskScore += 25;
        riskReasons.push('Entrega sin confirmar');
      }

      riskScore = Math.min(riskScore, 100);

      if (riskReasons.some(r => r.includes('laboratorio') || r.includes('óptica'))) {
        recommendation = 'Verificar estado del producto en laboratorio antes de confirmar';
      } else if (riskReasons.some(r => r.includes('sin confirmar'))) {
        recommendation = 'Confirmar cita por WhatsApp';
      } else if (riskReasons.some(r => r.includes('no asistencia'))) {
        recommendation = 'Llamar al paciente para confirmar asistencia';
      } else if (riskScore > 50) {
        recommendation = 'Reprogramar si no se puede confirmar';
      } else if (riskScore > 20) {
        recommendation = 'Enviar recordatorio por WhatsApp';
      } else {
        recommendation = 'Sin acción requerida';
      }

      const patientFirstName = delivery.patient_name?.split(' ')[0] || 'Estimado cliente';
      const formattedDate = new Date(delivery.appointment_date).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      let suggestedWhatsAppMessage = '';
      if (riskReasons.some(r => r.includes('laboratorio'))) {
        suggestedWhatsAppMessage = `Hola ${patientFirstName}, le informamos que sus productos están en proceso de preparación. Le confirmaremos en cuanto estén listos para su entrega programada el ${formattedDate} a las ${delivery.start_time}. ¡Gracias por su paciencia!`;
      } else if (delivery.status === 'scheduled') {
        suggestedWhatsAppMessage = `Hola ${patientFirstName}, le recordamos su cita para entrega de productos el ${formattedDate} a las ${delivery.start_time}. ¿Nos confirma su asistencia? ¡Lo esperamos!`;
      } else {
        suggestedWhatsAppMessage = `Hola ${patientFirstName}, le recordamos que tiene programada la entrega de sus productos el ${formattedDate} a las ${delivery.start_time}. ¡Lo esperamos!`;
      }

      return new Response(JSON.stringify({
        success: true,
        analysis: {
          deliveryId: delivery.id,
          patientId: delivery.patient_id || undefined,
          patientName: delivery.patient_name || 'Sin nombre',
          patientPhone: delivery.patient_phone || undefined,
          appointmentDate: delivery.appointment_date,
          startTime: delivery.start_time,
          riskScore,
          riskReasons: riskReasons.length > 0 ? riskReasons : ['Sin riesgos detectados'],
          recommendation,
          suggestedWhatsAppMessage,
          labOrderId,
          labOrderNumber,
          labOrderStatus,
          labOrderLocation,
          saleId: delivery.sale_id || undefined,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Delivery AI Assistant error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
