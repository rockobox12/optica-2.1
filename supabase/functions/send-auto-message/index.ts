import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  channel: 'whatsapp' | 'sms';
  to: string;
  message: string;
  patient_id?: string;
  patient_name?: string;
  message_type: string;
  template_id?: string;
  variables_used?: Record<string, string>;
  reference_type?: string;
  reference_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API keys
    const whatsappToken = Deno.env.get('WHATSAPP_BUSINESS_TOKEN');
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    const body: SendMessageRequest = await req.json();
    const { channel, to, message, patient_id, patient_name, message_type, template_id, variables_used, reference_type, reference_id } = body;

    // Normalize phone number to E.164 format for Mexico
    let normalizedPhone = to.replace(/\D/g, '');
    if (!normalizedPhone.startsWith('52')) {
      normalizedPhone = '52' + normalizedPhone;
    }
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }

    // Create log entry
    const { data: logEntry, error: logError } = await supabase
      .from('auto_message_logs')
      .insert({
        template_id,
        message_type,
        channel,
        recipient_phone: normalizedPhone,
        recipient_name: patient_name,
        patient_id,
        message_content: message,
        variables_used: variables_used || {},
        status: 'pending',
        reference_type,
        reference_id,
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating log entry:', logError);
      throw new Error('Failed to create message log');
    }

    let result: { success: boolean; external_id?: string; error?: string } = { success: false };

    if (channel === 'whatsapp') {
      if (!whatsappToken || !whatsappPhoneId) {
        result = { success: false, error: 'WhatsApp Business API not configured' };
      } else {
        try {
          // Send via WhatsApp Business API
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${whatsappToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: normalizedPhone.replace('+', ''),
                type: 'text',
                text: { body: message },
              }),
            }
          );

          const data = await response.json();
          
          if (response.ok && data.messages?.[0]?.id) {
            result = { success: true, external_id: data.messages[0].id };
          } else {
            result = { success: false, error: data.error?.message || 'Unknown WhatsApp error' };
          }
        } catch (e) {
          result = { success: false, error: e instanceof Error ? e.message : 'WhatsApp API error' };
        }
      }
    } else if (channel === 'sms') {
      if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
        result = { success: false, error: 'Twilio SMS not configured' };
      } else {
        try {
          // Send via Twilio
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
          const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
          
          const formData = new URLSearchParams();
          formData.append('To', normalizedPhone);
          formData.append('From', twilioPhoneNumber);
          formData.append('Body', message);

          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });

          const data = await response.json();
          
          if (response.ok && data.sid) {
            result = { success: true, external_id: data.sid };
          } else {
            result = { success: false, error: data.message || 'Unknown Twilio error' };
          }
        } catch (e) {
          result = { success: false, error: e instanceof Error ? e.message : 'Twilio API error' };
        }
      }
    }

    // Update log entry with result
    await supabase
      .from('auto_message_logs')
      .update({
        status: result.success ? 'sent' : 'failed',
        external_id: result.external_id,
        error_message: result.error,
        sent_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', logEntry.id);

    return new Response(
      JSON.stringify({
        success: result.success,
        log_id: logEntry.id,
        external_id: result.external_id,
        error: result.error,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500,
      }
    );
  } catch (error) {
    console.error('Error in send-auto-message:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
