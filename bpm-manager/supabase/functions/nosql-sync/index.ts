// supabase/functions/nosql-sync/index.ts
// Receives process data and writes to the client's NoSQL database using native driver.
// Enhanced for verbose debugging.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MongoClient } from 'npm:mongodb';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncPayload {
  org_id: string;
  process_id: string;
  workflow_id: string;
  workflow_name?: string;
  activity_id: string;
  activity_name?: string;
  fields: Record<string, string>;
  saved_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: SyncPayload = await req.json();
    const { org_id } = payload;

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase internal configuration missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', org_id)
      .single();

    if (orgError) {
      throw new Error(`Supabase DB Error fetching Org Settings: ${orgError.message}`);
    }

    if (!org?.settings?.NOSQL_URI) {
      throw new Error("NoSQL configuration (URI) not found in Organization Settings.");
    }

    const { NOSQL_PROVIDER, NOSQL_URI, NOSQL_DB, NOSQL_COLLECTION } = org.settings;
    const dbName = NOSQL_DB || 'bpm_data';
    
    let collectionName = NOSQL_COLLECTION || 'process_data';
    if ((collectionName === 'auto' || collectionName === '') && payload.workflow_name) {
       collectionName = payload.workflow_name.toLowerCase().trim()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '_')
          .replace(/^-+|-+$/g, '');
    }

    const document = {
      process_id: payload.process_id,
      workflow_id: payload.workflow_id,
      workflow_name: payload.workflow_name || '',
      activity_id: payload.activity_id,
      activity_name: payload.activity_name || '',
      org_id: payload.org_id,
      fields: payload.fields,
      updated_at: payload.saved_at,
    };

    if (NOSQL_PROVIDER === 'mongodb') {
      console.log(`[nosql-sync] Connecting to MongoDB: ${NOSQL_URI.split('@')[1]} (DB: ${dbName}, Col: ${collectionName})`);
      
      const client = new MongoClient(NOSQL_URI, {
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
      });

      try {
        await client.connect();
        const db = client.db(dbName);
        const col = db.collection(collectionName);
        
        await col.updateOne(
          { process_id: payload.process_id, activity_id: payload.activity_id },
          { $set: document },
          { upsert: true }
        );
        console.log(`[nosql-sync] Success.`);
      } catch (mongoErr: any) {
        throw new Error(`MongoDB Driver Error: ${mongoErr.message}`);
      } finally {
        await client.close();
      }
    } else {
      throw new Error(`Unsupported NoSQL provider: ${NOSQL_PROVIDER}`);
    }

    return new Response(JSON.stringify({ success: true, collection: collectionName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('[nosql-sync] Verbose Error:', err.message);
    return new Response(JSON.stringify({ 
      error: err.message, 
      tip: "Check Supabase project settings for SERVICE_ROLE_KEY or Atlas Network Access (0.0.0.0/0)" 
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
