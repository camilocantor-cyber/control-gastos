import { supabase } from './src/lib/supabase';

async function debugWorkflows() {
    const { data: workflows, error } = await supabase
        .from('workflows')
        .select('name, organization_id, organizations(name)');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('--- List of all Workflows ---');
    workflows?.forEach(w => {
        console.log(`- ${w.name} | Org: ${w.organizations?.name || 'NULL'} (${w.organization_id})`);
    });
}

debugWorkflows();
