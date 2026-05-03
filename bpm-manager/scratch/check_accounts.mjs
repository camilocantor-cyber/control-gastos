import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=([^\n\r]+)/);
const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\n\r]+)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
    console.log('Checking chart_of_accounts...');
    const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('count', { count: 'exact' });

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Total accounts found:', data);
    }
}
check();
