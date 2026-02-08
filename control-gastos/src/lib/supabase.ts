import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan las variables de entorno de Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Por favor revisa el archivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
