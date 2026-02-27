import { useState } from 'react';
import { supabase } from '../lib/supabase';

import { useAuth } from './useAuth';
import { executeServiceTask } from '../utils/actionRunner';

export function useExecution() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch active tasks for the current user (Inbox)
    async function getActiveTasks() {
        try {
            setLoading(true);

            // 1. Get current user's positions and departments
            const { data: userPos } = await supabase
                .from('employee_positions')
                .select(`
                    position_id,
                    positions (department_id)
                `)
                .eq('user_id', user?.id);

            const positionIds = userPos?.map(p => p.position_id) || [];
            const departmentIds = userPos?.map(p => (p.positions as any)?.department_id).filter(Boolean) || [];

            // 2. Fetch tasks matching user, position, department or truly public (all null)
            let filter = `assigned_user_id.eq.${user?.id}`;

            // Truly public tasks (no user, no dept, no position)
            filter += `,and(assigned_user_id.is.null,assigned_department_id.is.null,assigned_position_id.is.null)`;

            if (positionIds.length > 0) {
                filter += `,assigned_position_id.in.(${positionIds.map(id => `"${id}"`).join(',')})`;
            }
            if (departmentIds.length > 0) {
                filter += `,assigned_department_id.in.(${departmentIds.map(id => `"${id}"`).join(',')})`;
            }

            const { data, error } = await supabase
                .from('process_instances')
                .select(`
                    *,
                    workflows (name, description),
                    activities (*)
                `)
                .eq('status', 'active')
                .or(filter)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (err: any) {
            setError(err.message);
            return [];
        } finally {
            setLoading(false);
        }
    }

    // Start a new process instance
    async function startProcess(workflowId: string, name: string, organizationId: string) {
        try {
            setLoading(true);

            // 1. Get the start activity for this workflow
            const { data: activities, error: actError } = await supabase
                .from('activities')
                .select('*')
                .eq('workflow_id', workflowId)
                .eq('type', 'start')
                .single();

            if (actError) throw new Error('No se encontró el nodo de inicio para este flujo.');

            // 2. Create the process instance
            const { data: instance, error: insError } = await supabase
                .from('process_instances')
                .insert({
                    workflow_id: workflowId,
                    name: name,
                    organization_id: organizationId,
                    current_activity_id: activities.id,
                    status: 'active',
                    assigned_user_id: user?.id // Default creator
                })
                .select()
                .single();

            if (insError) throw insError;

            // 3. Record initial history
            const { error: histError } = await supabase
                .from('process_history')
                .insert({
                    process_id: instance.id,
                    activity_id: activities.id,
                    action: 'started',
                    comment: 'Trámite iniciado automáticamente.',
                    user_id: user?.id
                });

            if (histError) throw histError;

            return { success: true, instance };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }

    async function advanceProcess(processId: string, transitionId: string, comment?: string) {
        try {
            setLoading(true);

            // 1. Get transition details
            const { data: transition, error: transError } = await supabase
                .from('transitions')
                .select('target_id')
                .eq('id', transitionId)
                .single();

            if (transError) throw transError;

            // 1.5 Calculate next assignment
            const { data: targetActivity } = await supabase
                .from('activities')
                .select('*')
                .eq('id', transition.target_id)
                .single();

            // Get original initiator for 'creator' rule
            const { data: instance } = await supabase
                .from('process_instances')
                .select('created_by, organization_id')
                .eq('id', processId)
                .single();

            let nextAssignment: any = { assigned_user_id: null, assigned_department_id: null, assigned_position_id: null };
            if (targetActivity) {
                nextAssignment = await calculateAssignment(targetActivity, instance?.created_by || user?.id || '', instance?.organization_id);
            }

            // 2. Update process instance to next activity
            const { error: updError } = await supabase
                .from('process_instances')
                .update({
                    current_activity_id: transition.target_id,
                    status: 'active',
                    ...nextAssignment
                })
                .eq('id', processId);

            if (updError) throw updError;

            // 3. Record history
            const { error: histError } = await supabase
                .from('process_history')
                .insert({
                    process_id: processId,
                    activity_id: transition.target_id,
                    action: 'completed',
                    comment: comment || 'Actividad completada.',
                    user_id: user?.id
                });

            if (histError) throw histError;

            // 4. Trigger Automatic Actions if configured
            if (targetActivity && targetActivity.action_type && targetActivity.action_type !== 'none') {
                try {
                    const { data: allData } = await supabase.from('process_data').select('field_name, value').eq('process_id', processId);
                    const context: Record<string, any> = { process_id: processId, user_id: user?.id };
                    allData?.forEach(d => context[d.field_name] = d.value);

                    const steps = (targetActivity.action_config as any)?.steps || [{ id: '1', ...targetActivity.action_config }];

                    // Fetch organization settings for parameter substitution
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('settings')
                        .eq('id', instance?.organization_id)
                        .single();

                    const actionResult = await executeServiceTask(steps as any, context, orgData?.settings || {});

                    if (!actionResult.success) {
                        await supabase.from('process_history').insert({
                            process_id: processId,
                            activity_id: transition.target_id,
                            action: 'commented',
                            comment: `❌ Error en Acción Automática: ${actionResult.error}`,
                            user_id: user?.id
                        });
                    } else {
                        const outputsToSave = Object.entries(actionResult.outputs)
                            .filter(([key]) => key !== 'process_id' && key !== 'user_id' && !context[key])
                            .map(([name, value]) => ({
                                process_id: processId,
                                activity_id: transition.target_id,
                                field_name: name,
                                value: typeof value === 'object' ? JSON.stringify(value) : String(value)
                            }));

                        if (outputsToSave.length > 0) await supabase.from('process_data').insert(outputsToSave);

                        await supabase.from('process_history').insert({
                            process_id: processId,
                            activity_id: transition.target_id,
                            action: 'commented',
                            comment: `✅ Acciones Automáticas ejecutadas con éxito. (${steps.length} pasos)`,
                            user_id: user?.id
                        });
                    }
                } catch (actionErr: any) {
                    console.error('Action Execution Failed:', actionErr);
                }
            }

            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }

    async function getFieldDefinitions(activityId: string) {
        const { data, error } = await supabase
            .from('activity_field_definitions')
            .select('*')
            .eq('activity_id', activityId);
        if (error) throw error;
        return data;
    }

    async function getProcessData(processId: string, activityId: string) {
        const { data, error } = await supabase
            .from('process_data')
            .select('*')
            .eq('process_id', processId)
            .eq('activity_id', activityId);
        if (error) throw error;
        return data;
    }

    async function saveProcessData(processId: string, activityId: string, fields: Record<string, string>) {
        try {
            setLoading(true);
            // Delete existing data for this activity in this process to avoid duplicates
            await supabase
                .from('process_data')
                .delete()
                .eq('process_id', processId)
                .eq('activity_id', activityId);

            const dataToInsert = Object.entries(fields).map(([name, value]) => ({
                process_id: processId,
                activity_id: activityId,
                field_name: name,
                value: String(value)
            }));

            if (dataToInsert.length > 0) {
                const { error } = await supabase.from('process_data').insert(dataToInsert);
                if (error) throw error;
            }

            // --- RESOLVE DYNAMIC NAME LOGIC ---
            // 1. Get process instance and workflow info
            const { data: instance } = await supabase
                .from('process_instances')
                .select('*, workflows(name_template, name)')
                .eq('id', processId)
                .single();

            if (instance && instance.workflows?.name_template) {
                // 2. Check if this is the START activity
                const { data: startActivity } = await supabase
                    .from('activities')
                    .select('id')
                    .eq('workflow_id', instance.workflow_id)
                    .eq('type', 'start')
                    .single();

                if (activityId === startActivity?.id) {
                    let fullyResolved = true;
                    let newName = instance.workflows.name_template;

                    // Replace variables {{field_name}}
                    newName = newName.replace(/{{(.*?)}}/g, (match: string, fieldName: string) => {
                        const cleanName = fieldName.trim();
                        // 1. Try direct match
                        if (fields[cleanName] !== undefined && fields[cleanName] !== '') {
                            return fields[cleanName];
                        }
                        // 2. Try normalized match (lowercase, spaces to underscores)
                        const normalizedName = cleanName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                        if (fields[normalizedName] !== undefined && fields[normalizedName] !== '') {
                            return fields[normalizedName];
                        }

                        fullyResolved = false;
                        return match;
                    });

                    // Update instance name only if fully resolved and it actually changed
                    if (fullyResolved && newName !== instance.name) {
                        await supabase
                            .from('process_instances')
                            .update({ name: newName })
                            .eq('id', processId);
                    }
                }
            }
            // ----------------------------------

            return { success: true };
        } catch (err: any) {
            console.error('Error saving process data:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }

    async function completeProcess(processId: string, comment?: string) {
        try {
            setLoading(true);

            // 1. Verify instance exists
            const { data: instance, error: insError } = await supabase
                .from('process_instances')
                .select('*, activities(type)')
                .eq('id', processId)
                .single();

            if (insError) throw insError;

            // 2. Update process status
            const { error: updError } = await supabase
                .from('process_instances')
                .update({
                    status: 'completed'
                })
                .eq('id', processId);

            if (updError) throw updError;

            // 3. Record history
            const { error: histError } = await supabase
                .from('process_history')
                .insert({
                    process_id: processId,
                    activity_id: instance.current_activity_id,
                    action: 'completed',
                    comment: comment || 'Trámite finalizado manualmente.',
                    user_id: user?.id
                });

            if (histError) throw histError;

            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }

    async function calculateAssignment(activity: any, creatorId: string, orgId?: string) {
        // Initialize result with activity defaults (so it's assigned to group if no user strategy is set)
        const result = {
            assigned_user_id: null as string | null,
            assigned_department_id: activity.assigned_department_id || null,
            assigned_position_id: activity.assigned_position_id || null
        };

        if (!activity.assignment_type || activity.assignment_type === 'manual') {
            return result;
        }

        if (activity.assignment_type === 'creator') {
            result.assigned_user_id = creatorId;
            return result;
        }

        if (activity.assignment_type === 'specific_user') {
            result.assigned_user_id = activity.assigned_user_id || null;
            return result;
        }

        if (activity.assignment_type === 'department' || activity.assignment_type === 'position') {
            const strategy = activity.assignment_strategy || 'manual';

            // Find collaborators for the group
            let query = supabase.from('employee_positions').select('user_id');
            if (activity.assigned_position_id) {
                query = query.eq('position_id', activity.assigned_position_id);
            } else if (activity.assigned_department_id) {
                const { data: positions } = await supabase.from('positions').select('id').eq('department_id', activity.assigned_department_id);
                if (positions && positions.length > 0) {
                    query = query.in('position_id', positions.map(p => p.id));
                } else {
                    return result; // Fallback to group
                }
            }

            const { data: employees } = await query;
            const userIds = employees?.map(e => e.user_id).filter(Boolean) as string[] || [];

            if (userIds.length === 0) {
                return result; // Fallback to group
            }

            if (strategy === 'workload') {
                let workloadQuery = supabase.from('process_instances')
                    .select('assigned_user_id')
                    .eq('status', 'active')
                    .in('assigned_user_id', userIds);

                if (orgId) {
                    workloadQuery = workloadQuery.eq('organization_id', orgId);
                }

                const { data: workloads } = await workloadQuery;
                const counts: Record<string, number> = {};
                userIds.forEach(id => counts[id] = 0);
                workloads?.forEach(w => { if (w.assigned_user_id) counts[w.assigned_user_id]++; });

                result.assigned_user_id = userIds.reduce((a, b) => counts[a] <= counts[b] ? a : b);
                return result;
            }

            if (strategy === 'efficiency') {
                let historyQuery = supabase.from('process_history')
                    .select('user_id')
                    .eq('action', 'completed')
                    .in('user_id', userIds);

                const { data: history } = await historyQuery;
                const stats: Record<string, number> = {};
                userIds.forEach(id => stats[id] = 0);
                history?.forEach(h => { if (h.user_id) stats[h.user_id]++; });

                result.assigned_user_id = userIds.reduce((a, b) => stats[a] >= stats[b] ? a : b);
                return result;
            }

            if (strategy === 'random') {
                const randomIndex = Math.floor(Math.random() * userIds.length);
                result.assigned_user_id = userIds[randomIndex];
                return result;
            }
        }

        return result;
    }

    return {
        loading,
        error,
        getActiveTasks,
        startProcess,
        advanceProcess,
        getFieldDefinitions,
        getProcessData,
        saveProcessData,
        completeProcess
    };
}
