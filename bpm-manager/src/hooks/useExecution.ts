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
                    positions!inner (department_id, organization_id)
                `)
                .eq('user_id', user?.id)
                .eq('positions.organization_id', user?.organization_id);

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
                    activities (*),
                    process_data:process_data(count)
                `)
                .eq('status', 'active')
                .eq('organization_id', user?.organization_id)
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

    async function calculateStepCost(processId: string) {
        if (!user?.id) return { hoursSpent: 0, stepCost: 0 };

        try {
            // Find when the process or the current activity started
            const { data: lastHistory } = await supabase
                .from('process_history')
                .select('created_at')
                .eq('process_id', processId)
                .in('action', ['started', 'completed'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            let hoursSpent = 0;
            if (lastHistory) {
                const startedAt = new Date(lastHistory.created_at);
                const now = new Date();

                let msSpent = 0;
                let current = new Date(startedAt);

                while (current < now) {
                    const day = current.getDay();
                    const isWeekend = day === 0 || day === 6; // 0 = Sunday, 6 = Saturday

                    const endOfDay = new Date(current);
                    endOfDay.setHours(23, 59, 59, 999);

                    const nextTime = endOfDay < now ? endOfDay : now;

                    if (!isWeekend) {
                        msSpent += nextTime.getTime() - current.getTime();
                    }

                    current = new Date(nextTime.getTime() + 1);
                }

                hoursSpent = parseFloat((msSpent / (1000 * 60 * 60)).toFixed(2));
            }

            // Get user's hourly rate from their primary position
            const { data: userPos } = await supabase
                .from('employee_positions')
                .select('positions(hourly_rate, title)')
                .eq('user_id', user.id)
                .eq('is_primary', true)
                .limit(1)
                .maybeSingle();

            const rawRate = (userPos?.positions as any)?.hourly_rate;
            // If primary position is an array, take first
            let rate = 0;
            if (Array.isArray(rawRate)) rate = rawRate[0] || 0;
            else if (typeof rawRate === 'number') rate = rawRate;

            const stepCost = parseFloat((hoursSpent * rate).toFixed(2));

            return { hoursSpent, stepCost };
        } catch (e) {
            console.error('Error calculating step cost:', e);
            return { hoursSpent: 0, stepCost: 0 };
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

            // Get original initiator for 'creator' rule AND the current activity to get its actions
            const { data: instance } = await supabase
                .from('process_instances')
                .select('*, workflows(name_template, name, id)')
                .eq('id', processId)
                .single();

            // Calculate cost for the activity we are leaving
            const { hoursSpent, stepCost } = await calculateStepCost(processId);
            const totalCost = (instance?.total_cost || 0) + stepCost;

            const { data: sourceActivity } = await supabase
                .from('activities')
                .select('*')
                .eq('id', instance?.current_activity_id)
                .single();

            let nextAssignment: any = { assigned_user_id: null, assigned_department_id: null, assigned_position_id: null };
            if (targetActivity) {
                nextAssignment = await calculateAssignment(targetActivity, instance?.created_by || user?.id || '', instance?.organization_id);
            }

            // 2. Determine Next Status based on Target Activity Type
            let nextStatus = 'active';
            let waitingSubprocessId = null;

            let waitUntil = null;
            let waitCondition = null;

            if (targetActivity?.type === 'wait') {
                nextStatus = 'waiting';
                const waitConfig = (targetActivity as any).wait_config;
                if (waitConfig?.type === 'time' && waitConfig.duration) {
                    const now = new Date();
                    // Basic parser for "Xh", "Xm", "Xd"
                    const amount = parseInt(waitConfig.duration);
                    const unit = waitConfig.duration.slice(-1).toLowerCase();
                    if (unit === 'm') now.setMinutes(now.getMinutes() + amount);
                    else if (unit === 'h') now.setHours(now.getHours() + amount);
                    else if (unit === 'd') now.setDate(now.getDate() + amount);
                    else now.setMinutes(now.getMinutes() + amount); // default minutes
                    waitUntil = now.toISOString();
                } else if (waitConfig?.type === 'condition') {
                    waitCondition = waitConfig.condition;
                }
            } else if (targetActivity?.type === 'subprocess') {
                nextStatus = 'waiting_subprocess';

                // --- SUB-PROCESS INVOCATION ---
                const subConfig = (targetActivity as any).subprocess_config;
                if (subConfig?.workflow_id) {
                    // 1. Prepare input mapping
                    const { data: allData } = await supabase.from('process_data').select('field_name, value').eq('process_id', processId);
                    const processContext: Record<string, any> = {};
                    allData?.forEach(d => processContext[d.field_name] = d.value);

                    const subInputs: Record<string, string> = {};
                    subConfig.mapping_in?.forEach((m: any) => {
                        if (m.source && m.target) {
                            subInputs[m.target] = processContext[m.source] || '';
                        }
                    });

                    // 2. Start Child Process
                    const subName = `${instance?.workflows?.name || 'Sub-proceso'} - ${instance?.process_number || ''}`;
                    const startRes = await startProcess(subConfig.workflow_id, subName, instance?.organization_id);

                    if (startRes.success && startRes.instance) {
                        waitingSubprocessId = startRes.instance.id;

                        // Link child to parent for traceability
                        await supabase.from('process_instances').update({ parent_process_id: processId }).eq('id', waitingSubprocessId);

                        // Save mapped data to child
                        if (Object.keys(subInputs).length > 0) {
                            // Find the child's start activity
                            const { data: subStart } = await supabase.from('activities').select('id').eq('workflow_id', subConfig.workflow_id).eq('type', 'start').single();
                            if (subStart) {
                                await saveProcessData(waitingSubprocessId, subStart.id, subInputs);
                            }
                        }
                    } else {
                        throw new Error(`Error invocando sub-proceso: ${startRes.error}`);
                    }
                }
            } else if (targetActivity?.type === 'sync') {
                const syncConfig = (targetActivity as any).sync_config;
                const mode = syncConfig?.mode || 'synchronous';

                if (mode === 'synchronous') {
                    // 1. Get ALL predecessors for this sync activity
                    const { data: incomingTransitions } = await supabase
                        .from('transitions')
                        .select('source_id')
                        .eq('target_id', targetActivity.id);

                    const predecessorIds = incomingTransitions?.map(t => t.source_id) || [];

                    // 2. Check history to see which predecessors have finished for THIS process
                    const { data: finishedPredecessors } = await supabase
                        .from('process_history')
                        .select('activity_id')
                        .eq('process_id', processId)
                        .eq('action', 'completed')
                        .in('activity_id', predecessorIds);

                    const finishedIds = new Set(finishedPredecessors?.map(h => h.activity_id));

                    // Add the one we just finished (sourceActivity)
                    if (instance?.current_activity_id) finishedIds.add(instance.current_activity_id);

                    const allFinished = predecessorIds.every(id => finishedIds.has(id));

                    if (!allFinished) {
                        // Stay in "active" status but record history that we are waiting for others
                        await supabase.from('process_history').insert({
                            process_id: processId,
                            activity_id: instance?.current_activity_id,
                            action: 'commented',
                            comment: `Sincronización: Esperando otros predecesores (${finishedIds.size}/${predecessorIds.length}).`,
                            user_id: user?.id
                        });
                        return { success: true, message: 'Esperando otros hilos de ejecución.' };
                    }
                    // If all finished, continue normally to nextStatus = 'active'
                } else if (mode === 'async_single') {
                    // Check if this sync point has already been reached by another branch
                    const { data: alreadyReached } = await supabase
                        .from('process_history')
                        .select('id')
                        .eq('process_id', processId)
                        .eq('activity_id', targetActivity.id)
                        .limit(1)
                        .maybeSingle();

                    if (alreadyReached) {
                        return { success: true, message: 'Punto de sincronización ya procesado (Asíncrona Única).' };
                    }
                } else if (mode === 'async_multiple') {
                    // For "Multiple", we don't advance the current process, 
                    // we SPAWN A NEW ONE based on this one to treat them as parallel instances of the remaining flow.
                    // Or more simply: we continue the flow normally, but since each branch calls advanceProcess, 
                    // it naturally creates independent paths if the db allows multiple active tasks (which it does).
                    // Actually, to avoid "swallowing" the token, we just continue normally.
                }
            }

            // 3. Update process instance to next activity
            const { error: updError } = await supabase
                .from('process_instances')
                .update({
                    current_activity_id: transition.target_id,
                    status: nextStatus,
                    total_cost: totalCost,
                    waiting_subprocess_id: waitingSubprocessId,
                    wait_until: waitUntil,
                    wait_condition: waitCondition,
                    ...nextAssignment
                })
                .eq('id', processId);

            if (updError) throw updError;

            // 3. Record history
            const { error: histError } = await supabase
                .from('process_history')
                .insert({
                    process_id: processId,
                    activity_id: transition.target_id, // record history on the target
                    action: 'completed',
                    comment: comment || 'Actividad completada.',
                    user_id: user?.id,
                    time_spent_hours: hoursSpent,
                    step_cost: stepCost
                });

            if (histError) throw histError;

            // 4. Trigger Automatic Actions for the SOURCE activity (On-Exit)
            const actionsToTrace = (sourceActivity as any)?.actions || [];
            const legacyAction = (sourceActivity?.action_type && sourceActivity?.action_type !== 'none')
                ? { type: sourceActivity.action_type, config: sourceActivity.action_config || {} }
                : null;

            if (actionsToTrace.length > 0 || legacyAction) {
                try {
                    const { data: allData } = await supabase.from('process_data').select('field_name, value').eq('process_id', processId);

                    // Context with metadata
                    const context: Record<string, any> = {
                        ...instance,
                        process_id: processId,
                        user_id: user?.id,
                        id_tramite: instance?.process_number || instance?.id,
                        nro_tramite: instance?.process_number,
                        secuencia: instance?.workflow_sequence,
                        nombre_tramite: instance?.name,
                        fecha_inicio: instance?.created_at,
                        iniciador: instance?.created_by,
                        enlace_publico: targetActivity?.is_public ? `${window.location.origin}?public_activity=${targetActivity.id}&process_id=${processId}` : ''
                    };

                    allData?.forEach(d => context[d.field_name] = d.value);

                    // Fetch all labels for the workflow to support using labels in variables
                    const workflowId = (instance as any)?.workflow_id || (instance as any)?.workflows?.id;
                    if (workflowId) {
                        // Fetch ALL labels for the workflow to support using labels in variables from any activity
                        const { data: fDefs } = await supabase
                            .from('activity_field_definitions')
                            .select('name, label, activity_id, activities!inner(workflow_id)')
                            .eq('activities.workflow_id', workflowId);

                        fDefs?.forEach(fd => {
                            if (fd.label && context[fd.name] !== undefined) {
                                // Only set label if not already set, or if it is from current activity (priority)
                                if (!context[fd.label] || fd.activity_id === instance.current_activity_id) {
                                    context[fd.label] = context[fd.name];
                                }
                            }
                        });
                    }

                    // Fetch organization settings
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('settings, logo_url')
                        .eq('id', instance?.organization_id)
                        .single();

                    // Collect all steps to execute
                    let allSteps: any[] = [];

                    // 1. Add steps from Multi-Actions array
                    actionsToTrace.forEach((act: any) => {
                        const actSteps = (act.config?.steps || []).map((s: any) => ({
                            ...s,
                            condition: s.condition || act.condition || act.config?.condition,
                            stop_on_failure: s.stop_on_failure ?? act.stop_on_failure ?? act.config?.stop_on_failure
                        }));

                        if (actSteps.length === 0) {
                            // If no steps array, it's a single-step action
                            allSteps.push({
                                id: act.id,
                                type: act.type,
                                condition: act.condition || act.config?.condition,
                                stop_on_failure: act.stop_on_failure ?? act.config?.stop_on_failure,
                                ...act.config
                            });
                        } else {
                            allSteps = [...allSteps, ...actSteps];
                        }
                    });

                    // 2. Add steps from Legacy config (backwards compatibility)
                    if (legacyAction) {
                        const actConfig = sourceActivity.action_config as any;
                        const legacySteps = actConfig?.steps || [{ id: 'legacy-1', type: sourceActivity.action_type, ...actConfig }];
                        allSteps = [...allSteps, ...legacySteps];
                    }

                    if (allSteps.length > 0) {
                        const actionResult = await executeServiceTask(allSteps, context, { ...(orgData?.settings || {}), logo_url: orgData?.logo_url });

                        if (!actionResult.success) {
                            await supabase.from('process_history').insert({
                                process_id: processId,
                                activity_id: transition.target_id,
                                action: 'commented',
                                comment: `❌ Error en Acciones: ${actionResult.error}`,
                                user_id: user?.id
                            });
                        } else {
                            // Update context with any outputs from the actions
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
                                comment: `✅ Acciones completadas con éxito. (${allSteps.length} pasos ejecutados)`,
                                user_id: user?.id
                            });
                        }
                    }
                } catch (actionErr: any) {
                    console.error('Action Execution Failed:', actionErr);
                    await supabase.from('process_history').insert({
                        process_id: processId,
                        activity_id: transition.target_id,
                        action: 'commented',
                        comment: `❌ Error de sistema en acciones: ${actionErr.message}`,
                        user_id: user?.id
                    });
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
            .eq('activity_id', activityId)
            .order('order_index', { ascending: true, nullsFirst: false });
        if (error) throw error;
        return data;
    }

    async function getGlobalHeaderData(processId: string) {
        try {
            // 1. Get process instance and its workflow
            const { data: instance } = await supabase
                .from('process_instances')
                .select('workflow_id')
                .eq('id', processId)
                .single();

            if (!instance) return [];

            // 2. Fetch all activity IDs for this workflow
            const { data: activities } = await supabase
                .from('activities')
                .select('id')
                .eq('workflow_id', instance.workflow_id);
            
            if (!activities || activities.length === 0) return [];
            const activityIds = activities.map(a => a.id);

            // 3. Fetch all fields of these activities that are marked as global headers
            const { data: allGlobalFields } = await supabase
                .from('activity_field_definitions')
                .select('*')
                .in('activity_id', activityIds)
                .eq('is_global_header', true);

            if (!allGlobalFields || allGlobalFields.length === 0) return [];

            // Deduplicate by name (keep only one definition per field name)
            const uniqueGlobalFields: any[] = [];
            const seenNames = new Set();
            for (const f of allGlobalFields) {
                if (!seenNames.has(f.name)) {
                    uniqueGlobalFields.push(f);
                    seenNames.add(f.name);
                }
            }

            // 4. Fetch ALL values for this process to find global field values
            const { data: values } = await supabase
                .from('process_data')
                .select('*')
                .eq('process_id', processId)
                .in('field_name', uniqueGlobalFields.map(f => f.name));

            // 5. Map values to field definitions
            return uniqueGlobalFields.map(f => {
                // Pick the most recent/relevant value (not empty if possible)
                const relevantValue = values?.filter(v => v.field_name === f.name).sort((a,b) => b.created_at?.localeCompare(a.created_at)).find(v => v.value !== '')?.value 
                    || values?.find(v => v.field_name === f.name)?.value 
                    || '';
                    
                return {
                    ...f,
                    value: relevantValue
                };
            });
        } catch (err) {
            console.error('Error fetching global header data:', err);
            return [];
        }
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
            const { data: instance, error: insFetchError } = await supabase
                .from('process_instances')
                .select('*, workflows(name_template, name)')
                .eq('id', processId)
                .single();

            if (insFetchError) {
                console.error("Error fetching instance for name template:", insFetchError);
            }

            if (instance && instance.workflows?.name_template) {
                // 2. Fetch profile if available
                let creatorName = 'Usuario';
                if (instance.created_by) {
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', instance.created_by)
                        .maybeSingle();
                    if (prof?.full_name) creatorName = prof.full_name;
                }

                // 2. Fetch ALL data for this process to have full context for the template
                const { data: allProcessData } = await supabase
                    .from('process_data')
                    .select('field_name, value')
                    .eq('process_id', processId);

                const fullContext: Record<string, string> = {};
                allProcessData?.forEach(d => fullContext[d.field_name] = d.value);
                // Priority to current fields being saved
                Object.assign(fullContext, fields);

                let newName = instance.workflows.name_template;

                // Support Predefined Variables
                const globals: Record<string, string> = {
                    'date': new Date().toLocaleDateString('es-CO'),
                    'user_name': creatorName || (user as any)?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario',
                    'id': instance.process_number ? instance.process_number.toString() : processId.split('-')[0].toUpperCase(),
                    'process_number': instance.process_number?.toString() || ''
                };

                // Replace variables {{field_name}}
                newName = newName.replace(/{{(.*?)}}/g, (match: string, fieldName: string) => {
                    const cleanName = fieldName.trim();
                    const lowerClean = cleanName.toLowerCase();

                    // A. Check Globals first
                    if (globals[lowerClean] !== undefined) {
                        return globals[lowerClean];
                    }

                    // B. Try case-insensitive match in fullContext
                    const foundKey = Object.keys(fullContext).find(k => k.toLowerCase() === lowerClean);
                    if (foundKey && fullContext[foundKey] !== undefined && fullContext[foundKey] !== '') {
                        return String(fullContext[foundKey]);
                    }

                    // C. Try normalized match (lowercase, spaces to underscores)
                    const normalizedSearch = lowerClean.replace(/\s+/g, '_');
                    const normalizedKey = Object.keys(fullContext).find(k => k.toLowerCase().replace(/\s+/g, '_') === normalizedSearch);
                    if (normalizedKey && fullContext[normalizedKey] !== undefined && fullContext[normalizedKey] !== '') {
                        return String(fullContext[normalizedKey]);
                    }

                    // If not found, it might be a partial resolve
                    return match;
                });

                // Update instance name if it actually changed
                if (newName !== instance.name && newName.trim().length > 0) {
                    await supabase
                        .from('process_instances')
                        .update({ name: newName })
                        .eq('id', processId);
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

            // Calculate cost for the final activity
            const { hoursSpent, stepCost } = await calculateStepCost(processId);
            const totalCost = (instance?.total_cost || 0) + stepCost;

            // 2. Update process status
            const { error: updError } = await supabase
                .from('process_instances')
                .update({
                    status: 'completed',
                    total_cost: totalCost
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
                    user_id: user?.id,
                    time_spent_hours: hoursSpent,
                    step_cost: stepCost
                });

            if (histError) throw histError;

            // 4. Handle Sub-process completion (return to parent)
            if (instance.parent_process_id) {
                try {
                    const parentId = instance.parent_process_id;
                    const { data: parentInstance } = await supabase
                        .from('process_instances')
                        .select('*, activities(*)')
                        .eq('id', parentId)
                        .single();

                    if (parentInstance && parentInstance.activities?.type === 'subprocess') {
                        const subConfig = (parentInstance.activities as any).subprocess_config;

                        // 1. Map Outputs from Child to Parent
                        if (subConfig?.mapping_out?.length > 0) {
                            const { data: childData } = await supabase.from('process_data').select('field_name, value').eq('process_id', processId);
                            const childContext: Record<string, any> = {};
                            childData?.forEach(d => childContext[d.field_name] = d.value);

                            const parentOutputs: Record<string, string> = {};
                            subConfig.mapping_out.forEach((m: any) => {
                                if (m.source && m.target) {
                                    parentOutputs[m.target] = childContext[m.source] || '';
                                }
                            });

                            if (Object.keys(parentOutputs).length > 0) {
                                await saveProcessData(parentId, parentInstance.current_activity_id, parentOutputs);
                            }
                        }

                        // 2. Advance Parent to the next step
                        const { data: nextTrans } = await supabase
                            .from('transitions')
                            .select('id')
                            .eq('source_id', parentInstance.current_activity_id)
                            .maybeSingle();

                        if (nextTrans) {
                            await advanceProcess(parentId, nextTrans.id, `Sub-proceso (${instance.process_number || instance.id}) finalizado.`);
                        }
                    }
                } catch (parentErr) {
                    console.error('Error returning to parent process:', parentErr);
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
            // Check if specific user belongs to the current organization
            const userId = activity.assigned_user_id;
            if (userId && orgId) {
                const { data: userInOrg } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', userId)
                    .eq('organization_id', orgId)
                    .maybeSingle();

                if (!userInOrg) {
                    console.warn(`Attempted to assign user ${userId} who is not in organization ${orgId}. Reverting to group/manual.`);
                    return result;
                }
            }
            result.assigned_user_id = userId || null;
            return result;
        }

        if (activity.assignment_type === 'department' || activity.assignment_type === 'position' || activity.assignment_type === 'department_and_position') {
            const strategy = activity.assignment_strategy || 'manual';

            // Obtener colaboradores con sus detalles de cargo filtrando SIEMPRE por la organización del trámite
            let query = supabase
                .from('employee_positions')
                .select('user_id, position_id, positions!inner(hourly_rate, department_id, organization_id)');

            if (orgId) {
                query = query.eq('positions.organization_id', orgId);
            }

            if (activity.assignment_type === 'position' && activity.assigned_position_id) {
                query = query.eq('position_id', activity.assigned_position_id);
            } else if (activity.assignment_type === 'department' && activity.assigned_department_id) {
                let posQuery = supabase.from('positions').select('id').eq('department_id', activity.assigned_department_id);
                if (orgId) posQuery = posQuery.eq('organization_id', orgId);

                const { data: positions } = await posQuery;

                if (positions && positions.length > 0) {
                    query = query.in('position_id', positions.map(p => p.id));
                } else {
                    return result; // Fallback to group
                }
            } else if (activity.assignment_type === 'department_and_position') {
                if (activity.assigned_position_id) {
                    query = query.eq('position_id', activity.assigned_position_id);
                }
                if (activity.assigned_department_id) {
                    let posQuery = supabase.from('positions').select('id').eq('department_id', activity.assigned_department_id);
                    if (orgId) posQuery = posQuery.eq('organization_id', orgId);

                    const { data: positions } = await posQuery;

                    if (positions && positions.length > 0) {
                        query = query.in('position_id', positions.map(p => p.id));
                    } else {
                        return result;
                    }
                }
            }

            const { data: employees } = await query;
            const userIds = employees?.map(e => e.user_id).filter(Boolean) as string[] || [];

            if (userIds.length === 0) {
                return result; // Fallback to group
            }

            // 1. SHARK / CLAIM (Bandeja / Pooling)
            if (strategy === 'claim' || strategy === 'manual') {
                return result; // Dejar assigned_user_id en null significa que queda en la cola general
            }

            // 2. CARGA LABORAL
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

            // 3. EFICIENCIA
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

            // 4. COSTO ÓPTIMO (Buscando Ahorro)
            if (strategy === 'cost') {
                // Buscamos el empleado con el hourly_rate más bajo
                let lowestCostUser = userIds[0];
                let lowestCost = Infinity;

                employees?.forEach(e => {
                    const rate = (e.positions as any)?.hourly_rate || 0;
                    if (rate < lowestCost) {
                        lowestCost = rate;
                        lowestCostUser = e.user_id!;
                    }
                });

                result.assigned_user_id = lowestCostUser;
                return result;
            }

            // 5. ENRUTAMIENTO POR HABILIDADES (Skills-Based)
            if (strategy === 'skills') {
                // TODO: A futuro cruzar con una tabla de 'employee_skills'
                // Por ahora, simulamos eligiendo al más ocioso dentro del grupo (workload fallback)
                const randomIndex = Math.floor(Math.random() * userIds.length);
                result.assigned_user_id = userIds[randomIndex];
                return result;
            }

            // 6. DISPONIBILIDAD Y HORARIOS (Shift Routing)
            if (strategy === 'shift') {
                const currentHour = new Date().getHours();
                // Simulación: asumiendo turnos según el hash del userId
                const availableUsers = userIds.filter(id => {
                    const hash = id.charCodeAt(0) % 24; // Pseudo-turno para demo
                    return Math.abs(currentHour - hash) <= 8; // Turnos de 8 horas
                });

                const targetUsers = availableUsers.length > 0 ? availableUsers : userIds;
                result.assigned_user_id = targetUsers[Math.floor(Math.random() * targetUsers.length)];
                return result;
            }

            // 7. PONDERADO (Weighted Round-Robin)
            if (strategy === 'weighted') {
                // Simula pesos: User 1 tiene 60%, User 2 tiene 40% (basado en la posición en el array)
                const totalWeight = userIds.length * (userIds.length + 1) / 2; // Sucesión
                let randomVal = Math.random() * totalWeight;

                for (let i = 0; i < userIds.length; i++) {
                    const w = userIds.length - i; // Mayor peso al primero
                    if (randomVal <= w) {
                        result.assigned_user_id = userIds[i];
                        break;
                    }
                    randomVal -= w;
                }
                return result;
            }

            // 8. RANDOM (Sorteo)
            if (strategy === 'random') {
                const randomIndex = Math.floor(Math.random() * userIds.length);
                result.assigned_user_id = userIds[randomIndex];
                return result;
            }
        }

        return result;
    }

    async function deleteProcessInstance(processId: string) {
        try {
            setLoading(true);
            // 1. Delete associated data first (though there should be none if unused, for safety)
            await supabase.from('process_data').delete().eq('process_id', processId);
            await supabase.from('process_history').delete().eq('process_id', processId);
            await supabase.from('process_attachments').delete().eq('process_instance_id', processId);
            await supabase.from('process_bim_states').delete().eq('process_id', processId);

            // 2. Delete the instance
            const { error } = await supabase
                .from('process_instances')
                .delete()
                .eq('id', processId);

            if (error) throw error;
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }

    return {
        loading,
        error,
        getActiveTasks,
        startProcess,
        advanceProcess,
        deleteProcessInstance,
        getFieldDefinitions,
        getProcessData,
        saveProcessData,
        completeProcess,
        getGlobalHeaderData,
        getBimStates: async (processId: string) => {
            const { data, error } = await supabase
                .from('process_bim_states')
                .select('*')
                .eq('process_id', processId);
            if (error) throw error;
            return data;
        },
        saveBimState: async (processId: string, expressId: number, status: string) => {
            const { error } = await supabase
                .from('process_bim_states')
                .upsert({
                    process_id: processId,
                    express_id: expressId,
                    status,
                    updated_at: new Date().toISOString(),
                    updated_by: user?.id
                });
            if (error) throw error;
            return { success: true };
        }
    };
}
