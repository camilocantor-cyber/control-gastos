import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. Please check your .env file.');
}

const isPlaceholder = (val: string | undefined) => !val || val.includes('your_');

export const supabase = createClient(
    isPlaceholder(supabaseUrl) ? 'https://placeholder.supabase.co' : supabaseUrl,
    isPlaceholder(supabaseAnonKey) ? 'placeholder' : supabaseAnonKey
);
