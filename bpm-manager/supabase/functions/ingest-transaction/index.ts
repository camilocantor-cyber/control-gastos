import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// 1. CORS Headers to allow BPM to call us
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("🚀 Edge Function 'ingest-transaction' started!");

serve(async (req) => {
    // 2. Handle CORS preflight options
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 3. Parse and log incoming request
        const { p_api_key, p_date, p_amount, p_description, p_type, p_category, p_provider_name, p_concept_id } = await req.json();

        console.log(`📝 Received Transaction Request: ${p_description} - $${p_amount}`);

        // Init Supabase Client with Service Role (to write to DB)
        // Note: The key should be in Deno secrets store or .env
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 4. Validate Custom API Key (if you want an extra layer of security)
        // In production, compare p_api_key with a secret or stored key
        if (!p_api_key) {
            throw new Error("Missing p_api_key in request body.");
        }

        // 5. Call the Database Logic (Stored Procedure) to handle business rules
        // This keeps the heavy lifting in the DB layer but exposes it cleanly via HTTP
        const { data, error } = await supabaseAdmin.rpc('ingest_external_transaction', {
            p_api_key,
            p_date,
            p_amount,
            p_description,
            p_type,
            p_category,
            p_provider_name,
            p_concept_id
        });

        if (error) {
            console.error('❌ Database RPC Error:', error);
            throw error;
        }

        console.log('✅ Transaction Processed:', data);

        // 6. Return Success JSON
        return new Response(
            JSON.stringify({
                success: true,
                message: "Transaction ingested successfully via Microservice",
                data
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Edge Function Error:', error.message);

        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
});
