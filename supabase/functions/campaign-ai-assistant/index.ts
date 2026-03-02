import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CampaignRequest {
  action: 'generate_segments' | 'generate_campaign' | 'generate_messages' | 'analyze_results' | 'suggest_improvements';
  objective?: string;
  channel?: string;
  branchId?: string;
  campaignId?: string;
  context?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, objective, channel, branchId, campaignId, context } = await req.json() as CampaignRequest;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'generate_segments':
        systemPrompt = `Eres un experto en marketing para ópticas en México. Tu tarea es generar segmentos de clientes inteligentes basados en datos de comportamiento de compra y clínicos.

IMPORTANTE:
- Genera segmentos accionables y específicos
- Incluye justificación basada en datos
- Estima el tamaño del segmento
- Proporciona nombres claros en español

Tipos de segmentos a considerar:
1. Por última compra (30/60/90/180 días)
2. Por tipo de producto (lentes de contacto, armazón, tratamiento)
3. Por historial clínico (usuarios de LC, revisiones pendientes)
4. Cumpleaños del mes actual
5. Sin seguimiento reciente
6. Crédito al día (para upgrades)
7. Clientes frecuentes`;

        userPrompt = `Genera 5-7 segmentos de pacientes para campañas de marketing.
        
Contexto de la sucursal: ${branchId || 'todas'}
Datos disponibles: ${JSON.stringify(context || {})}

Responde en formato JSON con esta estructura:
{
  "segments": [
    {
      "name": "Nombre del segmento",
      "segment_type": "tipo",
      "description": "Descripción breve",
      "criteria": { "field": "value" },
      "estimated_size": 100,
      "justification": "Por qué este segmento es valioso"
    }
  ]
}`;
        break;

      case 'generate_campaign':
        systemPrompt = `Eres un experto en marketing para ópticas en México. Creas campañas efectivas y éticas.

REGLAS:
- NO hacer promesas médicas
- Usar lenguaje claro y profesional
- Respetar cultura mexicana
- Incluir CTAs claros
- Sugerir horarios óptimos de envío`;

        userPrompt = `Genera una campaña de marketing para una óptica.

Objetivo: ${objective || 'promoción general'}
Canal: ${channel || 'whatsapp'}
Sucursal: ${branchId || 'todas'}
Contexto adicional: ${JSON.stringify(context || {})}

Responde en formato JSON:
{
  "campaign": {
    "name": "Nombre de la campaña",
    "description": "Descripción",
    "recommended_segment": "Tipo de segmento recomendado",
    "messages": [
      {
        "variant": "A",
        "content": "Mensaje principal",
        "cta": "Llamado a la acción"
      },
      {
        "variant": "B",
        "content": "Variación del mensaje",
        "cta": "Llamado alternativo"
      }
    ],
    "suggested_send_time": "2024-01-15T10:00:00",
    "best_days": ["lunes", "martes"],
    "best_hours": "9:00-12:00",
    "estimated_reach": 500,
    "tips": ["Consejo 1", "Consejo 2"]
  }
}`;
        break;

      case 'generate_messages':
        systemPrompt = `Eres un copywriter experto en marketing para ópticas mexicanas. 
Generas mensajes persuasivos pero éticos, sin promesas médicas.

Variables disponibles: {Nombre}, {Sucursal}, {FechaCita}, {Beneficio}, {Vencimiento}, {TelefonoSucursal}`;

        userPrompt = `Genera variaciones de mensajes para:

Objetivo: ${objective}
Canal: ${channel}
Contexto: ${JSON.stringify(context || {})}

Responde en JSON:
{
  "messages": [
    {
      "variant": "A",
      "subject": "Asunto (si aplica)",
      "content": "Contenido del mensaje con variables",
      "tone": "formal/casual/urgente"
    }
  ],
  "variables_used": ["Nombre", "Sucursal"],
  "compliance_notes": "Notas de cumplimiento"
}`;
        break;

      case 'analyze_results':
        systemPrompt = `Eres un analista de marketing especializado en ópticas. 
Analizas resultados de campañas y proporcionas insights accionables en lenguaje simple.`;

        userPrompt = `Analiza los resultados de esta campaña:

Datos: ${JSON.stringify(context || {})}

Proporciona:
1. Resumen ejecutivo (2-3 oraciones)
2. Métricas clave interpretadas
3. Comparación con benchmarks del sector
4. Recomendaciones específicas

Responde en JSON:
{
  "summary": "Resumen ejecutivo",
  "metrics_analysis": {
    "delivery_rate": { "value": 95, "interpretation": "Excelente" },
    "open_rate": { "value": 45, "interpretation": "Por encima del promedio" },
    "response_rate": { "value": 5, "interpretation": "Normal" }
  },
  "roi_analysis": "Análisis del ROI",
  "recommendations": ["Recomendación 1", "Recomendación 2"],
  "next_campaign_suggestion": {
    "objective": "Objetivo sugerido",
    "segment": "Segmento recomendado",
    "timing": "Cuándo enviar"
  }
}`;
        break;

      case 'suggest_improvements':
        systemPrompt = `Eres un consultor de marketing digital para ópticas. 
Sugieres mejoras basadas en datos históricos y mejores prácticas.`;

        userPrompt = `Sugiere mejoras para futuras campañas basándote en:

Historial de campañas: ${JSON.stringify(context || {})}

Responde en JSON:
{
  "improvements": [
    {
      "area": "Área de mejora",
      "current_issue": "Problema actual",
      "suggestion": "Sugerencia específica",
      "expected_impact": "Impacto esperado"
    }
  ],
  "optimal_send_times": ["10:00", "14:00"],
  "best_performing_segments": ["Segmento 1"],
  "message_optimization_tips": ["Tip 1"]
}`;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Processing campaign AI request: ${action}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = { raw_response: content };
      }
    } catch {
      result = { raw_response: content };
    }

    return new Response(JSON.stringify({
      success: true,
      action,
      result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Campaign AI error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
