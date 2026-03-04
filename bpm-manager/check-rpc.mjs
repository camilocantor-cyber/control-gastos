import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=([^\n\r]+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\n\r]+)/);

if (!urlMatch || !keyMatch) {
    console.log("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function checkRpc() {
    const { data, error } = await supabase.rpc('search_dynamic_table', {
        p_table_name: 'activities',
        p_search_column: 'name',
        p_search_term: 'a',
        p_return_columns: ['id', 'name', 'description']
    });

    if (error) {
        console.error("RPC Error:", error);
    } else {
        console.log("RPC Success. Results:", data?.length || 0);
        console.log("Sample:", data?.slice(0, 2));
    }
}

checkRpc();
