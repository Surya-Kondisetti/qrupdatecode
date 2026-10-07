// supabase/functions/send-sms/index.ts
// Supabase Edge Function — Fast2SMS Absent Alert Sender
// Deploy with: supabase functions deploy send-sms
//
// Set secret: supabase secrets set FAST2SMS_API_KEY=your_key_here

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing phone or message' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Validate Indian mobile number
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid phone: ${phone}` }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FAST2SMS_API_KEY');
    if (!apiKey) {
      console.error('[SMS] FAST2SMS_API_KEY secret not set');
      return new Response(
        JSON.stringify({ success: false, error: 'SMS API key not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Fast2SMS Quick SMS API
    const smsPayload = {
      route: 'q',          // Quick SMS (DLT not required for transactional)
      message: message,
      language: 'english',
      flash: 0,
      numbers: cleanPhone,
    };

    const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smsPayload),
    });

    const smsData = await smsRes.json();
    console.log(`[SMS] Fast2SMS response for ${cleanPhone}:`, JSON.stringify(smsData));

    if (smsData.return === true) {
      return new Response(
        JSON.stringify({ success: true, requestId: smsData.request_id }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: smsData.message || 'SMS failed', details: smsData }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err: any) {
    console.error('[SMS] Edge function crash:', err?.message);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
