import { supabase } from '../lib/supabase';
import type { AccountingOperation, JournalEntry, JournalEntryDetail } from '../types/accounting';

/**
 * Evalúa una fórmula simple reemplazando variables {{VAR}} con valores del contexto
 */
function evaluateFormula(formula: string | null, context: Record<string, any>): any {
    if (!formula) return null;
    
    // Reemplazar variables {{variable}}
    const resolved = formula.replace(/{{(.*?)}}/g, (match, varName) => {
        const val = context[varName.trim()];
        return val !== undefined ? val : '0';
    });

    // Intentar evaluar matemáticamente si parece una expresión numérica
    try {
        // Eliminar caracteres no seguros (solo permitir números, operadores básicos y paréntesis)
        const safeExpression = resolved.replace(/[^-0-9+*/().\s]/g, '');
        // eslint-disable-next-line no-eval
        return eval(safeExpression);
    } catch (e) {
        return resolved;
    }
}

export async function executeAccountingOperation(
    operationId: string,
    params: Record<string, any>,
    context: {
        organization_id: string;
        user_id: string;
        reference?: string;
        description?: string;
    }
) {
    try {
        // 1. Obtener la operación con sus parámetros y plantillas
        const { data: operation, error: opError } = await supabase
            .from('accounting_operations')
            .select(`
                *,
                parameters:accounting_operation_parameters(*),
                templates:accounting_operation_templates(*)
            `)
            .eq('id', operationId)
            .single();

        if (opError || !operation) {
            throw new Error(`Operación no encontrada: ${opError?.message}`);
        }

        const op = operation as AccountingOperation;

        // 2. Preparar el contexto de evaluación (Parámetros + Globales)
        const evalContext: Record<string, any> = { ...params };
        
        // 3. Crear el encabezado del asiento (Journal Entry)
        const entryDescription = evaluateFormula(op.description || context.description || op.name, evalContext);
        
        const { data: entry, error: entryError } = await supabase
            .from('journal_entries')
            .insert({
                organization_id: context.organization_id,
                user_id: context.user_id,
                operation_id: operationId,
                entry_date: new Date().toISOString().split('T')[0],
                description: entryDescription,
                reference: context.reference || `PROC-${Date.now()}`,
                status: 'POSTED', // Por defecto contabilizado si viene de proceso automático
                total_debit: 0,
                total_credit: 0,
                is_balanced: false
            })
            .select()
            .single();

        if (entryError) throw entryError;

        // 4. Generar los detalles del asiento basados en las plantillas
        const details: any[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        for (const template of op.templates || []) {
            const value = parseFloat(evaluateFormula(template.value_formula, evalContext)) || 0;
            if (value === 0) continue;

            const detailDescription = evaluateFormula(template.description_formula || op.description || op.name, evalContext);
            
            const isDebit = template.movement_type === 'DEBITO';
            if (isDebit) totalDebit += value;
            else totalCredit += value;

            details.push({
                journal_entry_id: entry.id,
                line_number: template.line_number,
                account_code: template.account_code,
                description: detailDescription,
                debit_amount: isDebit ? value : 0,
                credit_amount: isDebit ? 0 : value,
                provider_id: evaluateFormula(template.third_party_formula, evalContext) || null
            });
        }

        if (details.length > 0) {
            const { error: detailsError } = await supabase
                .from('journal_entry_details')
                .insert(details);
            
            if (detailsError) throw detailsError;
        }

        // 5. Actualizar totales y cuadre
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
        await supabase
            .from('journal_entries')
            .update({
                total_debit: totalDebit,
                total_credit: totalCredit,
                is_balanced: isBalanced
            })
            .eq('id', entry.id);

        return { 
            success: true, 
            entryId: entry.id, 
            isBalanced,
            totalDebit,
            totalCredit
        };

    } catch (error: any) {
        console.error('Accounting Execution Error:', error);
        return { success: false, error: error.message };
    }
}
