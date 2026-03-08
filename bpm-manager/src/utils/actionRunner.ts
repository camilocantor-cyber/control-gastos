import { sendToFinance } from './financeBridge';
import { generateDocument, generateExcel, generatePdf } from './documentGenerator';
import { supabase } from '../lib/supabase';

/**
 * Normalizes any string to a snake_case variable name safe for use in docxtemplater.
 * Example: "Contratos Adicionales" → "contratos_adicionales"
 */
function toSnakeCase(str: string): string {
    return str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Loads all process_detail_rows for a process instance and injects them into the
 * outputs context as arrays keyed by the normalized folder name (snake_case).
 *
 * This enables docxtemplater to iterate over carpeta/detalle rows in a Word template
 * using the loop syntax:
 *
 *   {{#nombre_carpeta}}         ← one row per iteration
 *   {{campo1}} {{campo2}}
 *   {{/nombre_carpeta}}
 *
 * Additionally the total row count is injected as  {{nombre_carpeta_total}}.
 */
async function injectDetailRowsIntoContext(
    processId: string,
    outputs: Record<string, any>
): Promise<void> {
    try {
        // 1. Find all workflow_details that belong to this process's workflow
        const { data: instance } = await supabase
            .from('process_instances')
            .select('workflow_id')
            .eq('id', processId)
            .single();

        if (!instance?.workflow_id) return;

        const { data: details } = await supabase
            .from('workflow_details')
            .select('id, name, fields')
            .eq('workflow_id', instance.workflow_id);

        if (!details || details.length === 0) return;

        // 2. Load all rows for this process
        const detailIds = details.map((d: any) => d.id);
        const { data: rows } = await supabase
            .from('process_detail_rows')
            .select('detail_id, data')
            .eq('process_id', processId)
            .in('detail_id', detailIds)
            .order('created_at', { ascending: true });

        // 3. Group rows by detail and inject into outputs
        for (const detail of details) {
            const key = toSnakeCase(detail.name || 'detalle');
            const detailRows = (rows || [])
                .filter((r: any) => r.detail_id === detail.id)
                .map((r: any) => {
                    // r.data is already a plain object from the JSONB column
                    const rowData: Record<string, any> = typeof r.data === 'object' && r.data !== null
                        ? { ...r.data }
                        : {};

                    // Also inject a 1-based row number for convenience: {{_fila}}
                    return rowData;
                })
                .map((rowData: Record<string, any>, idx: number) => ({
                    _fila: String(idx + 1),
                    ...rowData
                }));

            outputs[key] = detailRows;
            outputs[`${key}_total`] = String(detailRows.length);
        }
    } catch (err) {
        console.warn('[actionRunner] Could not inject detail rows into document context:', err);
    }
}

/**
 * Evaluates a condition string against the provided context data.
 * Example condition: "{{monto}} > 1000"
 */
function evaluateCondition(condition: string | undefined, data: Record<string, any>): boolean {
    if (!condition || condition.trim() === '') return true;

    try {
        // 1. Substitute variables in the condition string
        // We use a slightly different approach for substitution here to preserve types (numbers) if possible
        // but for safety in evaluation, we'll replace variables with their JSON-stringified values if they are strings,
        // or direct values if they are numbers/booleans.
        let evalString = condition.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
            const cleanKey = key.trim();
            const val = data[cleanKey];

            if (val === undefined) return 'undefined';
            if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`;
            return String(val);
        });

        // 2. Evaluate the expression
        // Using new Function() is safer than eval() as it doesn't have access to the local closure.
        // We only allow basic logical/comparison operators to be safe-ish.
        return new Function(`return (${evalString})`)();
    } catch (err) {
        console.warn('[actionRunner] Condition evaluation failed:', condition, err);
        // If evaluation fails, we default to FALSE to be safe (don't execute if unsure)
        return false;
    }
}

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
        // 0. Check conditional logic
        const condition = step.condition || (step as any).config?.condition;
        if (condition && !evaluateCondition(condition, outputs)) {
            console.log(`[actionRunner] Saltando paso ${step.id} por condición no cumplida: ${condition}`);
            continue;
        }

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

            // 4. Document Generation Action
            if (step.type === 'document_generation' || step.action_type === 'document_generation') {
                const templateId = step.document_generation_template_id || step.config?.document_generation_template_id;
                const filenamePattern = step.document_generation_filename_pattern || step.config?.document_generation_filename_pattern || 'Documento_{{date}}';

                const format = (step.document_generation_format || step.config?.document_generation_format || 'docx').toLowerCase();

                if (format === 'docx' && !templateId) {
                    throw new Error("Falta el ID de la plantilla para generar el documento Word.");
                }

                const genType = step.document_generation_type || (step.config as any)?.document_generation_type || 'generic';

                // Calculate filename
                const baseName = substitute(filenamePattern).replace(/[^a-zA-Z0-9_-]/g, '_');
                const ext = genType === 'generic' ? 'pdf' : (format === 'xlsx' ? 'xlsx' : 'docx');
                const finalFilename = `${baseName}_${new Date().getTime()}.${ext}`;

                // 1. Inject carpeta/detalle rows into the context as arrays
                //    so docxtemplater can iterate them in the template
                //    using {{#nombre_carpeta}}...{{/nombre_carpeta}} blocks.
                //    This is a no-op if the process has no detail rows.
                if (outputs.process_id) {
                    await injectDetailRowsIntoContext(outputs.process_id, outputs);
                }

                // 2. Generate document based on type and format
                let generatedFile: File;

                if (genType === 'generic') {
                    // Always PDF for generic
                    const includeLogo = step.document_generation_include_logo !== undefined ? step.document_generation_include_logo : (step.config as any)?.document_generation_include_logo;
                    const logoUrl = (includeLogo !== false) ? (companySettings.logo_url || outputs.logo_url) : undefined;
                    generatedFile = await generatePdf(outputs, finalFilename, logoUrl);
                } else {
                    // Template based
                    if (format === 'xlsx') {
                        generatedFile = await generateExcel(outputs, finalFilename);
                    } else {
                        // Default: Word (.docx) - Also used if 'pdf' was somehow selected for template
                        if (!templateId) throw new Error("Falta el ID de la plantilla para generar el documento Word.");
                        generatedFile = await generateDocument(templateId, outputs, finalFilename);
                    }
                }

                // 3. Upload to storage
                const filePath = `${outputs.process_id}/${finalFilename}`;
                const { error: uploadError } = await supabase.storage
                    .from('process-files')
                    .upload(filePath, generatedFile);

                if (uploadError) {
                    throw new Error(`Error subiendo documento a storage: ${uploadError.message}`);
                }

                // 4. Register in process_attachments table
                const { error: dbError } = await supabase
                    .from('process_attachments')
                    .insert({
                        process_instance_id: outputs.process_id,
                        file_name: finalFilename,
                        file_path: filePath,
                        file_size: generatedFile.size,
                        file_type: generatedFile.type,
                        uploaded_by: outputs.user_id,
                        organization_id: outputs.organization_id || companySettings.id || null
                    });

                if (dbError) {
                    throw new Error(`Error registrando el adjunto en la base de datos: ${dbError.message}`);
                }

                outputs[step.output_variable || 'document_status'] = {
                    generated: true,
                    file: finalFilename,
                    size: generatedFile.size
                };
                continue;
            }


            // 5. Generic Webhook/REST Action
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
            const stopOnFailure = step.stop_on_failure ?? (step as any).config?.stop_on_failure ?? true;

            if (stopOnFailure) {
                return { success: false, outputs, error: `Error en paso ${step.id}: ${err.message}` };
            } else {
                console.warn(`[actionRunner] Error en paso ${step.id} ignorado (stop_on_failure=false):`, err.message);
                outputs[`${step.id}_error`] = err.message;
            }
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
