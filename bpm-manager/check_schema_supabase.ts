import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('activity_field_definitions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching activity_field_definitions:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in activity_field_definitions:', Object.keys(data[0]));
    } else {
        console.log('No data found in activity_field_definitions');
    }
}

checkSchema();
