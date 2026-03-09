import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type {
    JournalEntry,
    JournalEntryDetail,
    JournalEntryFormData,
    ConceptAccountMapping
} from '../types/accounting';

export function useJournalEntries(userId?: string) {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            loadEntries();
        }
    }, [userId]);

    async function loadEntries() {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('journal_entries')
                .select(`
          *,
          concept:accounting_concepts(*)
        `)
                .eq('user_id', userId!)
                .order('entry_date', { ascending: false })
                .order('entry_number', { ascending: false });

            if (fetchError) throw fetchError;
            setEntries(data || []);
        } catch (err) {
            console.error('Error loading journal entries:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }

    async function getEntryDetails(entryId: string): Promise<JournalEntryDetail[]> {
        try {
            const { data, error: fetchError } = await supabase
                .from('journal_entry_details')
                .select(`
          *,
          account:chart_of_accounts(*),
          provider:providers(*)
        `)
                .eq('journal_entry_id', entryId)
                .order('line_number', { ascending: true });

            if (fetchError) throw fetchError;
            return data || [];
        } catch (err) {
            console.error('Error loading entry details:', err);
            return [];
        }
    }

    async function createEntry(entryData: JournalEntryFormData): Promise<string | null> {
        try {
            setError(null);

            // Validar que esté balanceado
            const totalDebit = entryData.details.reduce((sum, d) => sum + d.debit_amount, 0);
            const totalCredit = entryData.details.reduce((sum, d) => sum + d.credit_amount, 0);

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new Error('El asiento no está balanceado. Débitos y créditos deben ser iguales.');
            }

            // Generar número de asiento
            const { data: entryNumber, error: numberError } = await supabase
                .rpc('generate_entry_number');

            if (numberError) throw numberError;

            // Crear encabezado del asiento
            const { data: newEntry, error: insertError } = await supabase
                .from('journal_entries')
                .insert([{
                    entry_number: entryNumber,
                    entry_date: entryData.entry_date,
                    concept_id: entryData.concept_id,
                    description: entryData.description,
                    reference: entryData.reference,
                    user_id: userId!,
                    status: 'DRAFT',
                    total_debit: totalDebit,
                    total_credit: totalCredit
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // Crear detalles del asiento
            const details = entryData.details.map(detail => ({
                journal_entry_id: newEntry.id,
                line_number: detail.line_number,
                account_code: detail.account_code,
                description: detail.description,
                debit_amount: detail.debit_amount,
                credit_amount: detail.credit_amount,
                provider_id: detail.provider_id
            }));

            const { error: detailsError } = await supabase
                .from('journal_entry_details')
                .insert(details);

            if (detailsError) throw detailsError;

            await loadEntries();
            return newEntry.id;
        } catch (err) {
            console.error('Error creating journal entry:', err);
            setError(err instanceof Error ? err.message : 'Error al crear asiento');
            return null;
        }
    }

    async function createEntryFromTransaction(
        transactionId: string,
        amount: number,
        conceptId: string,
        description: string,
        date: string,
        providerId?: string
    ): Promise<string | null> {
        try {
            setError(null);

            // 1. Obtener mapeos del concepto
            const { data: mappings, error: mappingError } = await supabase
                .from('concept_account_mappings')
                .select('*')
                .eq('concept_id', conceptId)
                .order('position', { ascending: true });

            if (mappingError) throw mappingError;
            if (!mappings || mappings.length === 0) {
                throw new Error('El concepto no tiene cuentas configuradas');
            }

            // 2. Verificar si ya existe un asiento para esta transacción
            const { data: existingEntry } = await supabase
                .from('journal_entries')
                .select('id, entry_number')
                .eq('transaction_id', transactionId)
                .maybeSingle();

            let entryId = existingEntry?.id;
            let entryNumber = existingEntry?.entry_number;

            if (entryId) {
                // Borrar detalles antiguos si existe
                await supabase
                    .from('journal_entry_details')
                    .delete()
                    .eq('journal_entry_id', entryId);
            } else {
                // Generar nuevo número si no existe
                const { data: num, error: numberError } = await supabase.rpc('generate_entry_number');
                if (numberError) throw numberError;
                entryNumber = num;
            }

            // 3. Crear o actualizar encabezado
            const entryHeader = {
                entry_number: entryNumber,
                entry_date: date,
                concept_id: conceptId,
                transaction_id: transactionId,
                description: description,
                user_id: userId!,
                status: 'DRAFT', // Cambiar a DRAFT para poder insertar detalles (por RLS)
                total_debit: amount,
                total_credit: amount,
                updated_at: new Date().toISOString()
            };

            const { data: newEntry, error: upsertError } = await supabase
                .from('journal_entries')
                .upsert(entryId ? { ...entryHeader, id: entryId } : entryHeader)
                .select()
                .single();

            if (upsertError) throw upsertError;
            entryId = newEntry.id;

            // 4. Crear nuevos detalles
            const details = mappings.map((mapping: ConceptAccountMapping, index: number) => ({
                journal_entry_id: entryId,
                line_number: index + 1,
                account_code: mapping.account_code,
                description: mapping.description || description,
                debit_amount: mapping.movement_type === 'DEBITO' ? amount : 0,
                credit_amount: mapping.movement_type === 'CREDITO' ? amount : 0,
                provider_id: mapping.movement_type === 'CREDITO' ? providerId : null
            }));

            const { error: detailsError } = await supabase
                .from('journal_entry_details')
                .insert(details);

            if (detailsError) throw detailsError;

            // 5. Marcar como POSTED
            const { error: postError } = await supabase
                .from('journal_entries')
                .update({
                    status: 'POSTED',
                    posted_at: new Date().toISOString()
                })
                .eq('id', entryId);

            if (postError) throw postError;

            await loadEntries();
            return entryId;
        } catch (err) {
            console.error('Error in createEntryFromTransaction:', err);
            setError(err instanceof Error ? err.message : 'Error al procesar contabilidad');
            return null;
        }
    }

    async function postEntry(entryId: string): Promise<boolean> {
        try {
            setError(null);

            const { error: updateError } = await supabase
                .from('journal_entries')
                .update({
                    status: 'POSTED',
                    posted_at: new Date().toISOString()
                })
                .eq('id', entryId)
                .eq('status', 'DRAFT');

            if (updateError) throw updateError;

            await loadEntries();
            return true;
        } catch (err) {
            console.error('Error posting entry:', err);
            setError(err instanceof Error ? err.message : 'Error al contabilizar asiento');
            return false;
        }
    }

    async function voidEntry(entryId: string): Promise<boolean> {
        try {
            setError(null);

            const { error: updateError } = await supabase
                .from('journal_entries')
                .update({
                    status: 'VOID',
                    voided_at: new Date().toISOString()
                })
                .eq('id', entryId);

            if (updateError) throw updateError;

            await loadEntries();
            return true;
        } catch (err) {
            console.error('Error voiding entry:', err);
            setError(err instanceof Error ? err.message : 'Error al anular asiento');
            return false;
        }
    }

    async function deleteEntry(entryId: string): Promise<boolean> {
        try {
            setError(null);

            // 1. Borrar detalles primero explícitamente (por si falla el CASCADE o hay triggers)
            const { error: detailsError } = await supabase
                .from('journal_entry_details')
                .delete()
                .eq('journal_entry_id', entryId);

            if (detailsError) throw detailsError;

            // 2. Borrar encabezado
            const { error: deleteError } = await supabase
                .from('journal_entries')
                .delete()
                .eq('id', entryId);

            if (deleteError) throw deleteError;

            await loadEntries();
            return true;
        } catch (err) {
            console.error('Error deleting entry:', err);
            const msg = err instanceof Error ? err.message : 'Error al eliminar asiento';
            setError(msg);
            alert(`No se pudo eliminar el asiento: ${msg}`);
            return false;
        }
    }

    function getEntriesByStatus(status: 'DRAFT' | 'POSTED' | 'VOID'): JournalEntry[] {
        return entries.filter(e => e.status === status);
    }

    function getEntriesByDateRange(startDate: string, endDate: string): JournalEntry[] {
        return entries.filter(e => e.entry_date >= startDate && e.entry_date <= endDate);
    }

    return {
        entries,
        loading,
        error,
        createEntry,
        createEntryFromTransaction,
        postEntry,
        voidEntry,
        deleteEntry,
        getEntryDetails,
        getEntriesByStatus,
        getEntriesByDateRange,
        reload: loadEntries
    };
}
