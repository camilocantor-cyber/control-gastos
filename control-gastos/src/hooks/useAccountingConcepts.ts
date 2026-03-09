import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { AccountingConcept, ConceptAccountMapping, ConceptFormData } from '../types/accounting';

export function useAccountingConcepts() {
    const [concepts, setConcepts] = useState<AccountingConcept[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadConcepts();
    }, []);

    async function loadConcepts() {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('accounting_concepts')
                .select('*')
                .eq('is_active', true)
                .order('code', { ascending: true });

            if (fetchError) throw fetchError;
            setConcepts(data || []);
        } catch (err) {
            console.error('Error loading concepts:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }

    async function getConceptMappings(conceptId: string): Promise<ConceptAccountMapping[]> {
        try {
            const { data, error: fetchError } = await supabase
                .from('concept_account_mappings')
                .select(`
          *,
          account:chart_of_accounts(*)
        `)
                .eq('concept_id', conceptId)
                .order('position', { ascending: true });

            if (fetchError) throw fetchError;
            return data || [];
        } catch (err) {
            console.error('Error loading concept mappings:', err);
            return [];
        }
    }

    async function addConcept(conceptData: ConceptFormData): Promise<boolean> {
        try {
            setError(null);

            // Insertar concepto
            const { data: newConcept, error: insertError } = await supabase
                .from('accounting_concepts')
                .insert([{
                    code: conceptData.code,
                    name: conceptData.name,
                    concept_type: conceptData.concept_type,
                    description: conceptData.description,
                    is_active: true
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // Insertar mapeos de cuentas
            if (conceptData.mappings && conceptData.mappings.length > 0) {
                const mappings = conceptData.mappings.map(mapping => ({
                    concept_id: newConcept.id,
                    account_code: mapping.account_code,
                    movement_type: mapping.movement_type,
                    position: mapping.position,
                    is_main: mapping.is_main,
                    description: mapping.description
                }));

                const { error: mappingError } = await supabase
                    .from('concept_account_mappings')
                    .insert(mappings);

                if (mappingError) throw mappingError;
            }

            await loadConcepts();
            return true;
        } catch (err) {
            console.error('Error adding concept:', err);
            setError(err instanceof Error ? err.message : 'Error al crear concepto');
            return false;
        }
    }

    async function updateConcept(id: string, conceptData: Partial<ConceptFormData>): Promise<boolean> {
        try {
            setError(null);

            // Actualizar concepto
            const { error: updateError } = await supabase
                .from('accounting_concepts')
                .update({
                    code: conceptData.code,
                    name: conceptData.name,
                    concept_type: conceptData.concept_type,
                    description: conceptData.description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // Si hay mappings, eliminar los anteriores e insertar los nuevos
            if (conceptData.mappings) {
                // Eliminar mappings existentes
                const { error: deleteError } = await supabase
                    .from('concept_account_mappings')
                    .delete()
                    .eq('concept_id', id);

                if (deleteError) throw deleteError;

                // Insertar nuevos mappings
                if (conceptData.mappings.length > 0) {
                    const mappings = conceptData.mappings.map(mapping => ({
                        concept_id: id,
                        account_code: mapping.account_code,
                        movement_type: mapping.movement_type,
                        position: mapping.position,
                        is_main: mapping.is_main,
                        description: mapping.description
                    }));

                    const { error: mappingError } = await supabase
                        .from('concept_account_mappings')
                        .insert(mappings);

                    if (mappingError) throw mappingError;
                }
            }

            await loadConcepts();
            return true;
        } catch (err) {
            console.error('Error updating concept:', err);
            setError(err instanceof Error ? err.message : 'Error al actualizar concepto');
            return false;
        }
    }

    async function deleteConcept(id: string): Promise<boolean> {
        try {
            setError(null);

            // Soft delete
            const { error: deleteError } = await supabase
                .from('accounting_concepts')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (deleteError) throw deleteError;

            await loadConcepts();
            return true;
        } catch (err) {
            console.error('Error deleting concept:', err);
            setError(err instanceof Error ? err.message : 'Error al eliminar concepto');
            return false;
        }
    }

    function getConceptsByType(conceptType: string): AccountingConcept[] {
        return concepts.filter(c => c.concept_type === conceptType);
    }

    function getConceptByCode(code: string): AccountingConcept | undefined {
        return concepts.find(c => c.code === code);
    }

    return {
        concepts,
        loading,
        error,
        addConcept,
        updateConcept,
        deleteConcept,
        getConceptMappings,
        getConceptsByType,
        getConceptByCode,
        reload: loadConcepts
    };
}
