/**
 * Finance Bridge Utility
 * This utility allows the BPM to send financial data to the Finance (Control Gastos) module.
 * It uses the 'ingest_external_transaction' microservice endpoint.
 */

interface FinancePayload {
    apiKey: string;
    financeProjectUrl: string; // The URL of the Control Gastos Supabase project
    date: string;
    amount: number;
    description: string;
    type: 'income' | 'expense';
    category: string;
    providerName?: string;
    conceptId?: string;
}

export async function sendToFinance(payload: FinancePayload) {
    try {
        console.log('🚀 ERP Bridge: Sending data to Finance module...', payload.description);

        // Calling the Finance project's RPC via HTTP (as it is "external" to this project)
        const rpcUrl = `${payload.financeProjectUrl}/rest/v1/rpc/ingest_external_transaction`;

        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': payload.apiKey,
                'Authorization': `Bearer ${payload.apiKey}`
            },
            body: JSON.stringify({
                p_api_key: payload.apiKey, // Our custom microservice auth
                p_date: payload.date,
                p_amount: payload.amount,
                p_description: payload.description,
                p_type: payload.type,
                p_category: payload.category,
                p_provider_name: payload.providerName,
                p_concept_id: payload.conceptId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Finance API Error: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ ERP Bridge: Successfully integrated movement:', result);
        return result;
    } catch (error) {
        console.error('❌ ERP Bridge: Failed to send data to Finance:', error);
        throw error;
    }
}
