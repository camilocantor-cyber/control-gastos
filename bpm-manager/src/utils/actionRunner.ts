import { sendToFinance } from './financeBridge';

/**
 * Utility to execute sequential service tasks (REST/SOAP/Finance)
 */

export async function executeServiceTask(
    steps: any[],
    processData: Record<string, any>
): Promise<{ success: boolean; outputs: Record<string, any>; error?: string }> {
    const outputs: Record<string, any> = { ...processData };

    for (const step of steps) {
        try {
            // 1. Specialized Finance Action (ERP Integration)
            if (step.type === 'finance') {
                const result = await sendToFinance({
                    apiKey: substituteVariables(step.api_key, outputs),
                    financeProjectUrl: substituteVariables(step.finance_url, outputs),
                    date: substituteVariables(step.date || '{{date}}', outputs),
                    amount: Number(substituteVariables(step.amount || '{{amount}}', outputs)),
                    description: substituteVariables(step.description || '{{description}}', outputs),
                    type: substituteVariables(step.movement_type || 'expense', outputs) as 'income' | 'expense',
                    category: substituteVariables(step.category || 'Varios', outputs),
                    providerName: substituteVariables(step.provider || '', outputs),
                    conceptId: substituteVariables(step.concept_id, outputs)
                });
                outputs[step.output_variable || 'finance_result'] = result;
                continue;
            }

            // 2. Generic Webhook/REST Action
            const url = substituteVariables(step.url, outputs);
            const body = substituteVariables(step.body, outputs);
            const token = substituteVariables(step.auth_token, outputs);

            // Prepare Headers
            const headers: Record<string, string> = {
                'Content-Type': step.method === 'GET' ? 'application/json' : (step.body?.startsWith('<') ? 'application/xml' : 'application/json'),
                ...step.headers
            };

            if (step.auth_type === 'bearer' && token) {
                headers['Authorization'] = `Bearer ${token}`;
            } else if (step.auth_type === 'basic' && token) {
                headers['Authorization'] = `Basic ${token}`;
            }

            // Execution
            const response = await fetch(url, {
                method: step.method,
                headers,
                body: step.method !== 'GET' ? body : undefined
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            // Handle Output Mapping
            if (step.output_variable) {
                const contentType = response.headers.get('content-type');
                let result;
                if (contentType?.includes('application/json')) {
                    result = await response.json();
                } else {
                    result = await response.text();
                }
                outputs[step.output_variable] = result;
            }
        } catch (err: any) {
            return { success: false, outputs, error: `Error en paso ${step.id}: ${err.message}` };
        }
    }

    return { success: true, outputs };
}

function substituteVariables(text: string | undefined, data: Record<string, any>): string {
    if (!text) return '';
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const value = data[key.trim()];
        if (value === undefined) return match;
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
}
