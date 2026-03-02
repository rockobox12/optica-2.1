import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantRequest {
  message: string;
  branchId?: string;
  history?: ChatMessage[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, branchId, history = [] } = await req.json() as AssistantRequest;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Gather context data based on the question
    let contextData = '';
    
    // Check for sales-related questions
    if (message.toLowerCase().includes('venta') || message.toLowerCase().includes('vendido')) {
      const { data: sales } = await supabase
        .from('sales')
        .select('total, status, created_at, sale_number')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (sales && sales.length > 0) {
        const totalToday = sales
          .filter(s => new Date(s.created_at).toDateString() === new Date().toDateString())
          .reduce((sum, s) => sum + (s.total || 0), 0);
        
        contextData += `\n\nDatos de ventas recientes:
- Ventas de hoy: $${totalToday.toFixed(2)} MXN
- Últimas 10 ventas: ${sales.map(s => `${s.sale_number}: $${s.total}`).join(', ')}`;
      }
    }

    // Check for product-related questions
    if (message.toLowerCase().includes('producto') || message.toLowerCase().includes('stock') || message.toLowerCase().includes('inventario')) {
      const { data: lowStock } = await supabase
        .from('inventory')
        .select('quantity, product:products(name, reorder_point)')
        .lt('quantity', 10)
        .limit(5);

      if (lowStock && lowStock.length > 0) {
        contextData += `\n\nProductos con stock bajo:
${lowStock.map(i => `- ${(i.product as any)?.name}: ${i.quantity} unidades`).join('\n')}`;
      }

      // Top selling products
      const { data: topProducts } = await supabase
        .from('sale_items')
        .select('product_id, quantity, product:products(name)')
        .order('quantity', { ascending: false })
        .limit(5);

      if (topProducts && topProducts.length > 0) {
        contextData += `\n\nProductos más vendidos:
${topProducts.map((p, i) => `${i + 1}. ${(p.product as any)?.name}`).join('\n')}`;
      }
    }

    // Check for order-related questions
    if (message.toLowerCase().includes('orden') || message.toLowerCase().includes('lab') || message.toLowerCase().includes('atras')) {
      const { data: pendingOrders } = await supabase
        .from('lab_orders')
        .select('order_number, status, estimated_date, created_at')
        .in('status', ['PEDIDO', 'EN_PROCESO', 'EN_TRANSITO'])
        .order('estimated_date', { ascending: true })
        .limit(10);

      if (pendingOrders && pendingOrders.length > 0) {
        const overdue = pendingOrders.filter(o => 
          o.estimated_date && new Date(o.estimated_date) < new Date()
        );
        
        contextData += `\n\nÓrdenes de laboratorio:
- Total pendientes: ${pendingOrders.length}
- Atrasadas: ${overdue.length}
${overdue.length > 0 ? `Órdenes atrasadas: ${overdue.map(o => o.order_number).join(', ')}` : ''}`;
      }
    }

    // Check for appointment-related questions
    if (message.toLowerCase().includes('cita') || message.toLowerCase().includes('agenda')) {
      const today = new Date().toISOString().split('T')[0];
      const { data: appointments } = await supabase
        .from('appointments')
        .select('status, appointment_type, start_time')
        .eq('appointment_date', today);

      if (appointments) {
        const pending = appointments.filter(a => a.status === 'scheduled').length;
        const completed = appointments.filter(a => a.status === 'completed').length;
        
        contextData += `\n\nCitas de hoy:
- Total: ${appointments.length}
- Pendientes: ${pending}
- Completadas: ${completed}`;
      }
    }

    const systemPrompt = `Eres el asistente virtual de Óptica Istmeña, un sistema de gestión para ópticas en México.

Tu rol es ayudar al personal con:
- Consultas sobre ventas, inventario y productos
- Estado de órdenes de laboratorio
- Información de citas y pacientes
- Métricas y resúmenes del negocio

Responde de manera:
- Concisa y directa
- Profesional pero amigable
- En español mexicano
- Con datos específicos cuando estén disponibles

Si no tienes información suficiente, sugiere alternativas o indica que el usuario puede consultar el módulo correspondiente.
${contextData}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log('Sending request to AI gateway...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';

    return new Response(JSON.stringify({
      response: aiResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Assistant error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
