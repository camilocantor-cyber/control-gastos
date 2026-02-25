import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { ScheduledProcess } from '../types';

export function useScheduledProcesses(organizationId?: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getScheduledProcesses = useCallback(async () => {
        if (!organizationId) return [];
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('scheduled_processes')
                .select('*, workflows(name)')
                .eq('organization_id', organizationId)
                .order('scheduled_at', { ascending: true });

            if (error) throw error;
            return data as (ScheduledProcess & { workflows: { name: string } })[];
        } catch (err: any) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    const scheduleProcess = async (process: Omit<ScheduledProcess, 'id' | 'created_at' | 'organization_id' | 'last_run_at'>) => {
        if (!organizationId) return { success: false, error: 'No organization ID' };
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('scheduled_processes')
                .insert([{
                    ...process,
                    organization_id: organizationId,
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const deleteScheduledProcess = async (id: string) => {
        try {
            const { error } = await supabase
                .from('scheduled_processes')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    };

    const updateScheduledProcess = async (id: string, updates: Partial<ScheduledProcess>) => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('scheduled_processes')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        getScheduledProcesses,
        scheduleProcess,
        deleteScheduledProcess,
        updateScheduledProcess
    };
}
