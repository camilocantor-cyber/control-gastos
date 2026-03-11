const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Read .env manually
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data, error } = await supabase
        .from('activity_field_definitions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching activity_field_definitions:', error);
        process.exit(1);
    }

    if (data && data.length > 0) {
        console.log('Columns in activity_field_definitions:', Object.keys(data[0]));
    } else {
        console.log('No data found in activity_field_definitions');
    }
    process.exit(0);
}

checkSchema();
