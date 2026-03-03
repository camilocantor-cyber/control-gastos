import { createClient } from 'https://esm.sh/@supabase/supabase-client'

const supabase = createClient(
    Deno.env.get('VITE_SUPABASE_URL'),
    Deno.env.get('VITE_SUPABASE_ANON_KEY')
)

const processNumber = 49

async function check() {
    const { data: ins, error } = await supabase
        .from('process_instances')
        .select('id, process_number, current_activity_id')
        .eq('process_number', processNumber)
        .single()

    if (error) {
        console.error('Process not found:', error)
        return
    }

    console.log('Process ID:', ins.id)

    const { data: hist } = await supabase
        .from('process_history')
        .select('*')
        .eq('process_id', ins.id)
        .order('created_at', { ascending: false })

    console.log('History:', JSON.stringify(hist, null, 2))
}

check()
