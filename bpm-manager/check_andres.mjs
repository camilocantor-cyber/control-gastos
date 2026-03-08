import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmeoqyoccxbaaumsxamf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtZW9xeW9jY3hiYWF1bXN4YW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODczNzUsImV4cCI6MjA4NjE2MzM3NX0.CACbsqx7EvEpsaO4ANJ83XrKVkS2QHI9oZt_4IB99zs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log('Buscando usuario: andres.camilo.cantor1979@gmail.com');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', 'andres.camilo.cantor1979@gmail.com');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Resultado:', JSON.stringify(data, null, 2));

    if (data.length > 0) {
        const userId = data[0].id;
        console.log('Buscando membresías para ID:', userId);
        const { data: members, error: mError } = await supabase
            .from('organization_members')
            .select('*, organization:organizations(name)')
            .eq('user_id', userId);

        if (mError) {
            console.error('Error buscando membresías:', mError);
        } else {
            console.log('Membresías:', JSON.stringify(members, null, 2));
        }
    }
}

checkUser();
