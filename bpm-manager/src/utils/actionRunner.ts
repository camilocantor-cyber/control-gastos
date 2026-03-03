import { sendToFinance } from './financeBridge';

/**
 * Utility to execute sequential service tasks (REST/SOAP/Finance)
 */

export async function executeServiceTask(
    steps: any[],
    processData: Record<string, any>,
    companySettings: Record<string, any> = {}
): Promise<{ success: boolean; outputs: Record<string, any>; error?: string }> {
    const outputs: Record<string, any> = { ...processData };

    const substitute = (text: string | undefined) => substituteVariables(text, outputs, companySettings);

    for (const step of steps) {
        try {
            // 1. Specialized Finance Action (ERP Integration)
            if (step.type === 'finance' || step.action_type === 'finance') {
                const result = await sendToFinance({
                    apiKey: substitute(step.api_key || (step.config as any)?.api_key),
                    financeProjectUrl: substitute(step.finance_url || (step.config as any)?.finance_url),
                    date: substitute(step.date || (step.config as any)?.date || '{{date}}'),
                    amount: Number(substitute(step.amount || (step.config as any)?.amount || '0')),
                    description: substitute(step.description || (step.config as any)?.description || ''),
                    type: substitute(step.movement_type || (step.config as any)?.movement_type || 'expense') as 'income' | 'expense',
                    category: substitute(step.category || (step.config as any)?.category || 'Varios'),
                    providerName: substitute(step.provider || (step.config as any)?.provider || ''),
                    conceptId: substitute(step.concept_id || (step.config as any)?.concept_id)
                });
                outputs[step.output_variable || 'finance_result'] = result;
                continue;
            }

            // 2. Email Action
            if (step.type === 'email' || step.action_type === 'email') {
                const emailPayload = {
                    from: substitute(step.email_from || step.config?.email_from),
                    to: substitute(step.email_to || step.config?.email_to),
                    cc: substitute(step.email_cc || step.config?.email_cc),
                    subject: substitute(step.email_subject || step.config?.email_subject),
                    body: substitute(step.email_body || step.config?.email_body),
                    smtp: {
                        host: substitute(step.email_smtp_host || step.config?.email_smtp_host),
                        port: substitute(step.email_smtp_port || step.config?.email_smtp_port),
                        user: substitute(step.email_smtp_user || step.config?.email_smtp_user),
                        pass: substitute(step.email_smtp_pass || step.config?.email_smtp_pass),
                        secure: step.email_smtp_secure || step.config?.email_smtp_secure
                    }
                };

                if (!emailPayload.to) throw new Error("Falta el destinatario (Para) en la configuración del correo.");

                // Call the central mail bridge (Supabase Edge Function)
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(emailPayload)
                });

                if (!response.ok) {
                    const errDetail = await response.text();
                    throw new Error(`Fallo el envío de email: ${response.status} - ${errDetail}`);
                }

                outputs[step.output_variable || 'email_status'] = { sent: true, at: new Date().toISOString() };
                continue;
            }

            // 3. WhatsApp Action
            if (step.type === 'whatsapp' || step.action_type === 'whatsapp') {
                const number = substitute(step.whatsapp_number || step.config?.whatsapp_number);
                const message = substitute(step.whatsapp_message || step.config?.whatsapp_message);
                const provider = step.whatsapp_provider || step.config?.whatsapp_provider || 'evolution';
                const apiUrl = substitute(step.whatsapp_api_url || step.config?.whatsapp_api_url);
                const token = substitute(step.whatsapp_token || step.config?.whatsapp_token);

                if (!number) throw new Error("Falta el número de WhatsApp destino.");
                if (!message) throw new Error("Falta el mensaje de WhatsApp a enviar.");
                if (!apiUrl && provider !== 'meta') throw new Error("Falta la URL de la API de WhatsApp.");

                console.log(`[WHATSAPP] Enviando vía ${provider} a ${number}...`);

                let fetchUrl = apiUrl;
                let fetchOptions: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
                let payload: any = {};

                if (provider === 'evolution') {
                    // Evolution API / API Wha format
                    payload = { number, textMessage: { text: message } };
                    fetchOptions.headers = { ...fetchOptions.headers, 'apikey': token };
                } else if (provider === 'ultramsg') {
                    // UltraMsg Format
                    payload = { to: number, body: message };
                    if (token) fetchUrl = `${apiUrl}?token=${token}`;
                } else if (provider === 'meta') {
                    // Meta Cloud API Setup
                    payload = {
                        messaging_product: "whatsapp",
                        to: number,
                        type: "text",
                        text: { body: message }
                    };
                    fetchOptions.headers = { ...fetchOptions.headers, 'Authorization': `Bearer ${token}` };
                } else {
                    // Generic JSON Webhook 
                    payload = { number, message, phone: number, body: message };
                    if (token) fetchOptions.headers = { ...fetchOptions.headers, 'Authorization': `Bearer ${token}` };
                }

                if (payload) fetchOptions.body = JSON.stringify(payload);

                try {
                    const response = await fetch(fetchUrl, fetchOptions);
                    if (!response.ok) {
                        const err = await response.text();
                        throw new Error(`HTTP ${response.status}: ${err}`);
                    }
                    const result = await response.json().catch(() => ({}));
                    outputs[step.output_variable || 'whatsapp_status'] = { sent: true, provider, number, at: new Date().toISOString(), result };
                } catch (error: any) {
                    throw new Error(`Error con el proveedor de WhatsApp (${provider}): ${error.message}`);
                }

                continue;
            }

            // 4. Generic Webhook/REST Action
            const url = substitute(step.url);
            const body = substitute(step.body);
            const token = substitute(step.auth_token);

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

function substituteVariables(
    text: string | undefined,
    data: Record<string, any>,
    companySettings: Record<string, any> = {}
): string {
    if (!text) return '';
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const cleanKey = key.trim();

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Helper to get value with fuzzy normalization
        const getValue = (obj: Record<string, any>, k: string) => {
            // 1. Direct match (Fast)
            if (obj[k] !== undefined) return obj[k];

            // 2. Normalize search key
            const kNorm = normalize(k);
            if (!kNorm) return undefined;

            // 3. Check normalized direct match
            const entries = Object.entries(obj);
            for (const [keyName, value] of entries) {
                if (normalize(keyName) === kNorm) return value;
            }

            return undefined;
        };

        // 1. Try process data
        const value = getValue(data, cleanKey);
        if (value !== undefined) return typeof value === 'object' ? JSON.stringify(value) : String(value);

        // 2. Try company settings
        const companyValue = getValue(companySettings, cleanKey);
        if (companyValue !== undefined) return String(companyValue);

        return match;
    });
}
