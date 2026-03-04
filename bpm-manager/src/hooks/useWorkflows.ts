import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Workflow } from '../types';
import { useAuth } from './useAuth';

export function useWorkflows() {
    const { user } = useAuth();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return; // Wait for user to be loaded

        fetchWorkflows();

        // Set up real-time subscription
        const subscription = supabase
            .channel('workflows-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workflows' }, () => {
                fetchWorkflows();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user?.organization_id]);

    async function fetchWorkflows() {
        try {
            setLoading(true);

            let query = supabase
                .from('workflows')
                .select('*, category:workflow_categories(*), organizations(id, name)')
                .order('created_at', { ascending: false });

            const availableOrgIds = user?.available_organizations?.map(o => o.id) || [];

            if (user?.email === 'ccantor@gmail.com' && availableOrgIds.length > 0) {
                // Para Camilo, mostrar flujos de TODAS sus sucursales
                query = query.or(`organization_id.in.(${availableOrgIds.join(',')}),is_public.eq.true`);
            } else if (user?.organization_id) {
                query = query.or(`organization_id.eq.${user.organization_id},is_public.eq.true`);
            } else {
                query = query.eq('is_public', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            setWorkflows(data || []);
        } catch (err: any) {
            console.error('Error fetching workflows:', err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function moveWorkflow(workflowId: string, targetOrgId: string) {
        try {
            const { error } = await supabase
                .from('workflows')
                .update({ organization_id: targetOrgId })
                .eq('id', workflowId);

            if (error) throw error;
            await fetchWorkflows();
            return { error: null };
        } catch (err: any) {
            console.error('Error moving workflow:', err);
            return { error: err.message || 'Error al mover el flujo' };
        }
    }

    async function createWorkflow(workflow: Partial<Workflow>) {
        try {
            const { data, error } = await supabase
                .from('workflows')
                .insert([workflow])
                .select();

            if (error) throw error;
            if (data && data.length > 0) {
                setWorkflows(prev => [data[0], ...prev]);
            }
            return { data, error: null };
        } catch (err: any) {
            console.error('Error creating workflow:', err);
            return { data: null, error: err.message || 'Error desconocido al crear flujo' };
        }
    }

    async function updateWorkflow(id: string, updates: Partial<Workflow>) {
        try {
            const { data, error } = await supabase
                .from('workflows')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) throw error;
            if (data && data.length > 0) {
                setWorkflows(prev => prev.map(w => w.id === id ? data[0] : w));
            }
            return { data, error: null };
        } catch (err: any) {
            console.error('Error updating workflow:', err);
            return { data: null, error: err.message || 'Error desconocido al actualizar flujo' };
        }
    }

    async function deleteWorkflow(id: string) {
        try {
            const { error } = await supabase
                .from('workflows')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setWorkflows(prev => prev.filter(w => w.id !== id));
            return { error: null };
        } catch (err: any) {
            console.error('Error deleting workflow:', err.message);
            return { error: err.message };
        }
    }

    async function duplicateWorkflow(id: string) {
        try {
            setLoading(true);
            // 1. Get original workflow
            const { data: workflow, error: wfError } = await supabase
                .from('workflows')
                .select('*')
                .eq('id', id)
                .single();
            if (wfError) throw wfError;

            // 2. Get activities
            const { data: activities, error: actError } = await supabase
                .from('activities')
                .select('*')
                .eq('workflow_id', id);
            if (actError) throw actError;

            // 3. Get all field definitions for these activities
            const activityIds = (activities || []).map(a => a.id);
            let fields: any[] = [];
            if (activityIds.length > 0) {
                const { data, error } = await supabase
                    .from('activity_field_definitions')
                    .select('*')
                    .in('activity_id', activityIds);
                if (error) throw error;
                fields = data || [];
            }

            // 4. Get transitions
            const { data: transitions, error: transError } = await supabase
                .from('transitions')
                .select('*')
                .eq('workflow_id', id);
            if (transError) throw transError;

            const currentVersionStr = (workflow.version || 'v1.0').replace('v', '');
            const isDifferentOrg = user?.organization_id && user.organization_id !== workflow.organization_id;
            const nextVersionNum = isDifferentOrg ? '1.0' : (parseFloat(currentVersionStr) + 0.1).toFixed(1);
            const nextVersion = `v${nextVersionNum}`;

            const newWfData: any = {
                organization_id: user?.organization_id || workflow.organization_id,
                name: isDifferentOrg ? `${workflow.name} (Copia)` : `${workflow.name} (${nextVersion})`,
                description: workflow.description,
                created_by: user?.id || workflow.created_by,
                status: 'draft',
                version: nextVersion,
                parent_id: isDifferentOrg ? null : (workflow.parent_id || workflow.id),
                name_template: workflow.name_template,
                category_id: workflow.category_id
            };

            let { data: newWf, error: newWfError } = await supabase
                .from('workflows')
                .insert([newWfData])
                .select()
                .single();

            // Fallback if version/parent_id columns don't exist
            if (newWfError && (newWfError.message?.includes('version') || newWfError.message?.includes('parent_id') || newWfError.code === '42703')) {
                console.warn('Versioning columns missing, retrying without them...');
                delete newWfData.version;
                delete newWfData.parent_id;
                const retry = await supabase
                    .from('workflows')
                    .insert([newWfData])
                    .select()
                    .single();
                newWf = retry.data;
                newWfError = retry.error;
            }

            if (newWfError) throw newWfError;
            if (!newWf) throw new Error('Failed to create new workflow copy');

            // 6. Map old activity IDs to new IDs
            const activityIdMap: Record<string, string> = {};
            for (const activity of (activities || [])) {
                // Remove id and metadata fields before insert
                const { id: _, created_at: __, workflow_id: ___, ...activityData } = activity;
                const { data: newAct, error: newActError } = await supabase
                    .from('activities')
                    .insert([{
                        ...activityData,
                        workflow_id: newWf.id
                    }])
                    .select()
                    .single();

                if (newActError) throw newActError;
                activityIdMap[activity.id] = newAct.id;

                // 7. Clone fields for this activity
                const activityFields = fields.filter(f => f.activity_id === activity.id);
                if (activityFields.length > 0) {
                    const fieldsToInsert = activityFields.map(f => {
                        const { id: _, activity_id: __, ...fData } = f;
                        return {
                            ...fData,
                            activity_id: newAct.id
                        };
                    });
                    const { error: fError } = await supabase
                        .from('activity_field_definitions')
                        .insert(fieldsToInsert);
                    if (fError) throw fError;
                }
            }

            // 8. Clone transitions
            if ((transitions || []).length > 0) {
                const transitionsToInsert = transitions.map(t => {
                    const { id: _, workflow_id: __, ...tData } = t;
                    return {
                        ...tData,
                        workflow_id: newWf.id,
                        source_id: activityIdMap[t.source_id],
                        target_id: activityIdMap[t.target_id]
                    };
                });
                const { error: tError } = await supabase
                    .from('transitions')
                    .insert(transitionsToInsert);
                if (tError) throw tError;
            }

            await fetchWorkflows();
            return { data: newWf, error: null };
        } catch (err: any) {
            console.error('Error duplicating workflow:', err);
            return { data: null, error: err.message || 'Error al duplicar flujo' };
        } finally {
            setLoading(false);
        }
    }

    return {
        workflows,
        loading,
        error,
        createWorkflow,
        updateWorkflow,
        deleteWorkflow,
        duplicateWorkflow,
        moveWorkflow,
        refresh: fetchWorkflows
    };
}
