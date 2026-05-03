import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type {
    AccountingOperation,
    OperationParameter,
    OperationTemplate
} from '../types/accounting';
import { useAuth } from './useAuth';

export function useAccountingOperations() {
    const { user } = useAuth();
    const [operations, setOperations] = useState<AccountingOperation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_id) {
            loadOperations();
        }
    }, [user?.organization_id]);

    async function loadOperations() {
        if (!user?.organization_id) return;
        try {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('accounting_operations')
                .select(`
                    *,
                    parameters:operation_parameters(*),
                    templates:operation_templates(*)
                `)
                .eq('organization_id', user.organization_id)
                .order('name');

            if (fetchError) throw fetchError;
            setOperations(data || []);
        } catch (err) {
            console.error('Error loading operations:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }

    async function saveOperation(
        operation: Partial<AccountingOperation>,
        parameters: Partial<OperationParameter>[],
        templates: Partial<OperationTemplate>[]
    ) {
        if (!user?.organization_id) return null;
        try {
            setLoading(true);
            setError(null);

            // 1. Guardar encabezado
            const { parameters: _p, templates: _t, ...opData } = operation;
            const opToSave = { 
                ...opData, 
                organization_id: user.organization_id,
                user_id: user.id
            };

            const { data: savedOp, error: opError } = await supabase
                .from('accounting_operations')
                .upsert([opToSave])
                .select()
                .single();

            if (opError) throw opError;

            // 2. Guardar parámetros
            await supabase.from('operation_parameters').delete().eq('operation_id', savedOp.id);
            if (parameters.length > 0) {
                const paramsToSave = parameters.map((p, i) => ({
                    operation_id: savedOp.id,
                    organization_id: user.organization_id,
                    name: p.name || `param_${i}`,
                    label: p.label || p.name || 'Campo',
                    data_type: p.data_type || 'NUMBER',
                    required: p.required ?? true,
                    position: i + 1
                }));
                const { error: pError } = await supabase.from('operation_parameters').insert(paramsToSave);
                if (pError) throw pError;
            }

            // 3. Guardar plantillas
            await supabase.from('operation_templates').delete().eq('operation_id', savedOp.id);
            if (templates.length > 0) {
                const templatesToSave = templates.map((t, i) => ({
                    operation_id: savedOp.id,
                    organization_id: user.organization_id,
                    line_number: i + 1,
                    account_code: t.account_code,
                    movement_type: t.movement_type || 'DEBITO',
                    third_party_formula: t.third_party_formula,
                    description_formula: t.description_formula,
                    value_formula: t.value_formula,
                    base_formula: t.base_formula,
                    cost_center: t.cost_center,
                    municipality: t.municipality,
                    active_asset: t.active_asset
                })).filter(t => t.account_code);

                if (templatesToSave.length > 0) {
                    const { error: tError } = await supabase.from('operation_templates').insert(templatesToSave);
                    if (tError) throw tError;
                }
            }

            await loadOperations();
            return savedOp.id;
        } catch (err) {
            console.error('Error saving operation:', err);
            setError(err instanceof Error ? err.message : 'Error al guardar operación');
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function deleteOperation(id: string) {
        try {
            const { error: delError } = await supabase
                .from('accounting_operations')
                .delete()
                .eq('id', id);

            if (delError) throw delError;
            await loadOperations();
            return true;
        } catch (err) {
            console.error('Error deleting operation:', err);
            setError(err instanceof Error ? err.message : 'Error al eliminar operación');
            return false;
        }
    }

    return {
        operations,
        loading,
        error,
        saveOperation,
        deleteOperation,
        reload: loadOperations
    };
}
