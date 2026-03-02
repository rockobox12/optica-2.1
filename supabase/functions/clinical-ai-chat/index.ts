import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ClinicalChatRequest {
  message: string;
  patientId: string;
  clinicalContext: {
    patientName: string;
    patientAge: number | null;
    currentRx: {
      odSphere: number | null;
      odCylinder: number | null;
      odAxis: number | null;
      odAdd: number | null;
      oiSphere: number | null;
      oiCylinder: number | null;
      oiAxis: number | null;
      oiAdd: number | null;
    };
    diagnosis: string;
    riskScore: number;
    riskLevel: string;
    alerts: string[];
    projections: string[];
    commercialLevel: string;
    occupation: string | null;
  };
  history?: { role: string; content: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, patientId, clinicalContext, history = [] } = await req.json() as ClinicalChatRequest;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch previous prescriptions for historical context
    const { data: prevRx } = await supabase
      .from('patient_prescriptions')
      .select('exam_date, od_sphere, od_cylinder, od_axis, od_add, oi_sphere, oi_cylinder, oi_axis, oi_add, diagnosis, status')
      .eq('patient_id', patientId)
      .eq('status', 'VIGENTE')
      .order('exam_date', { ascending: false })
      .limit(5);

    // Fetch sales history
    const { data: salesData } = await supabase
      .from('sales')
      .select('total, created_at, status')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);

    const rxHistory = prevRx && prevRx.length > 0
      ? prevRx.map(r => `${r.exam_date}: OD ${r.od_sphere ?? 'N/A'}/${r.od_cylinder ?? 'N/A'}x${r.od_axis ?? '-'} ADD ${r.od_add ?? '-'} | OI ${r.oi_sphere ?? 'N/A'}/${r.oi_cylinder ?? 'N/A'}x${r.oi_axis ?? '-'} ADD ${r.oi_add ?? '-'} (${r.diagnosis || 'Sin dx'})`).join('\n')
      : 'Sin historial previo';

    const salesSummary = salesData && salesData.length > 0
      ? `${salesData.length} compras recientes. Última: $${salesData[0].total} (${salesData[0].created_at?.split('T')[0]})`
      : 'Sin compras registradas';

    const ctx = clinicalContext;
    const rxCurrent = ctx.currentRx;

    const systemPrompt = `Eres un asistente clínico de IA para Óptica Istmeña, especializado en optometría y óptica.

PACIENTE: ${ctx.patientName}, ${ctx.patientAge ?? 'Edad no disponible'} años
OCUPACIÓN: ${ctx.occupation || 'No registrada'}

GRADUACIÓN ACTUAL:
OD: SPH ${rxCurrent.odSphere ?? 'N/A'} CYL ${rxCurrent.odCylinder ?? 'N/A'} EJE ${rxCurrent.odAxis ?? '-'} ADD ${rxCurrent.odAdd ?? '-'}
OI: SPH ${rxCurrent.oiSphere ?? 'N/A'} CYL ${rxCurrent.oiCylinder ?? 'N/A'} EJE ${rxCurrent.oiAxis ?? '-'} ADD ${rxCurrent.oiAdd ?? '-'}

DIAGNÓSTICO: ${ctx.diagnosis || 'Pendiente'}
SCORE DE RIESGO: ${ctx.riskScore}/100 (${ctx.riskLevel})
NIVEL COMERCIAL: ${ctx.commercialLevel}

ALERTAS ACTIVAS: ${ctx.alerts.length > 0 ? ctx.alerts.join('; ') : 'Ninguna'}
PROYECCIONES: ${ctx.projections.length > 0 ? ctx.projections.join('; ') : 'Sin datos suficientes'}

HISTORIAL DE GRADUACIONES:
${rxHistory}

HISTORIAL DE COMPRAS: ${salesSummary}

REGLAS:
1. Responde en español profesional pero accesible.
2. Basa tus respuestas SOLO en los datos proporcionados.
3. Incluye siempre: análisis clínico, posibles riesgos, recomendación de seguimiento, sugerencia óptica.
4. NUNCA diagnostiques. Siempre di "sugiero" o "considero".
5. Sé conciso (máximo 300 palabras).
6. Si detectas algo inusual, menciónalo claramente.

⚠️ DISCLAIMER OBLIGATORIO: Incluir al final: "Esta respuesta es asistente clínico. No reemplaza el criterio profesional."`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.5,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Demasiadas solicitudes. Espera un momento.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

    // Audit log
    try {
      await supabase.from('clinical_ai_audit').insert({
        patient_id: patientId,
        user_id: '00000000-0000-0000-0000-000000000000', // Will be overridden by RLS
        action_type: 'clinical_chat',
        suggestion_content: { question: message, response: aiResponse, context: { riskScore: ctx.riskScore, diagnosis: ctx.diagnosis } },
        status: 'generated',
      });
    } catch (e) {
      console.warn('Could not log audit:', e);
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Clinical AI Chat error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Error desconocido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
