import { supabase } from './lib/supabase';

async function diagnose() {
    const { data: jeCount, error: jeError } = await supabase
        .from('journal_entries')
        .select('id', { count: 'exact', head: true });

    const { data: jedCount, error: jedError } = await supabase
        .from('journal_entry_details')
        .select('id', { count: 'exact', head: true });

    const { data: postedCount, error: postedError } = await supabase
        .from('journal_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'POSTED');

    console.log('Journal Entries:', jeCount);
    console.log('JE Details:', jedCount);
    console.log('Posted Entries:', postedCount);

    const { data: sample, error: sampleError } = await supabase
        .from('journal_entries')
        .select('entry_number, entry_date, status, total_debit, total_credit')
        .limit(5);

    console.log('Sample Entries:', sample);
}
// diagnose();
