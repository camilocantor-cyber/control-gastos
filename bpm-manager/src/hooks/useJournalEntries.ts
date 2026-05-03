import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { JournalEntry, JournalEntryDetail, JournalEntryFormData } from '../types/accounting';
import { useAuth } from './useAuth';

export function useJournalEntries() {
    const { user } = useAuth();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_id) {
            loadEntries();
        }
    }, [user?.organization_id]);

    async function loadEntries() {
        if (!user?.organization_id) return;
        try {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await supabase
                .from('journal_entries')
                .select(`
                    *,
                    concept:accounting_concepts(name)
                `)
                .eq('organization_id', user.organization_id)
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
                    account:chart_of_accounts(name),
                    provider:providers(name)
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

    async function createEntry(formData: JournalEntryFormData) {
        if (!user?.organization_id) return null;
        try {
            setLoading(true);
            setError(null);

            // 1. Generate entry number
            const year = new Date().getFullYear();
            const { data: countData } = await supabase
                .from('journal_entries')
                .select('id', { count: 'exact' })
                .eq('organization_id', user.organization_id);
            
            const nextNum = (countData?.length || 0) + 1;
            const entryNumber = `${year}-${nextNum.toString().padStart(6, '0')}`;

            // 2. Create Header
            const { data: entry, error: entryError } = await supabase
                .from('journal_entries')
                .insert([{
                    entry_number: entryNumber,
                    entry_date: formData.entry_date,
                    concept_id: formData.concept_id,
                    operation_id: formData.operation_id,
                    description: formData.description,
                    reference: formData.reference,
                    user_id: user.id,
                    organization_id: user.organization_id,
                    status: 'POSTED'
                }])
                .select()
                .single();

            if (entryError) throw entryError;

            // 3. Create Details
            if (formData.details && formData.details.length > 0) {
                const detailsToInsert = formData.details.map(d => ({
                    ...d,
                    journal_entry_id: entry.id,
                    organization_id: user.organization_id
                }));

                const { error: detailsError } = await supabase
                    .from('journal_entry_details')
                    .insert(detailsToInsert);

                if (detailsError) throw detailsError;
            }

            await loadEntries();
            return entry.id;
        } catch (err) {
            console.error('Error creating journal entry:', err);
            setError(err instanceof Error ? err.message : 'Error al crear asiento');
            return null;
        } finally {
            setLoading(false);
        }
    }

    async function voidEntry(entryId: string) {
        try {
            const { error: voidError } = await supabase
                .from('journal_entries')
                .update({ status: 'VOID', voided_at: new Date().toISOString() })
                .eq('id', entryId);

            if (voidError) throw voidError;
            await loadEntries();
            return true;
        } catch (err) {
            console.error('Error voiding entry:', err);
            return false;
        }
    }

    async function deleteEntry(entryId: string) {
        try {
            const { error: delError } = await supabase
                .from('journal_entries')
                .delete()
                .eq('id', entryId);

            if (delError) throw delError;
            await loadEntries();
            return true;
        } catch (err) {
            console.error('Error deleting entry:', err);
            return false;
        }
    }

    return {
        entries,
        loading,
        error,
        createEntry,
        getEntryDetails,
        voidEntry,
        deleteEntry,
        reload: loadEntries
    };
}
