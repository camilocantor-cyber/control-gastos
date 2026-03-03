import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { WorkflowCategory } from '../types';

export function useWorkflowCategories() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<WorkflowCategory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.organization_id) return;
        fetchCategories();

        const subscription = supabase
            .channel('workflow-categories')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_categories' }, fetchCategories)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.organization_id]);

    async function fetchCategories() {
        if (!user?.organization_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('workflow_categories')
                .select('*')
                .eq('organization_id', user.organization_id)
                .order('name');
            if (error) throw error;
            setCategories(data || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    }

    async function addCategory(name: string, color: string = '#3b82f6') {
        if (!user?.organization_id) return { error: 'No organization' };
        try {
            const { error } = await supabase
                .from('workflow_categories')
                .insert({ organization_id: user.organization_id, name, color });
            return { error };
        } catch (error: any) {
            return { error: error.message };
        }
    }

    async function updateCategory(id: string, name: string, color: string) {
        try {
            const { error } = await supabase
                .from('workflow_categories')
                .update({ name, color })
                .eq('id', id);
            return { error };
        } catch (error: any) {
            return { error: error.message };
        }
    }

    async function deleteCategory(id: string) {
        try {
            const { error } = await supabase
                .from('workflow_categories')
                .delete()
                .eq('id', id);
            return { error };
        } catch (error: any) {
            return { error: error.message };
        }
    }

    return { categories, loading, addCategory, updateCategory, deleteCategory, refresh: fetchCategories };
}
