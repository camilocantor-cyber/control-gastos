import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Activity, Transition, WorkflowDetail } from '../types';

export function useWorkflowModeler(workflowId: string) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [details, setDetails] = useState<WorkflowDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (workflowId) {
            loadModel();
        }
    }, [workflowId]);

    async function loadModel() {
        try {
            setLoading(true);

            // Fetch activities, transitions and details first
            const [activitiesRes, transitionsRes, detailsRes] = await Promise.all([
                supabase.from('activities').select('*').eq('workflow_id', workflowId),
                supabase.from('transitions').select('*').eq('workflow_id', workflowId),
                supabase.from('workflow_details').select('*').eq('workflow_id', workflowId)
            ]);

            if (activitiesRes.error) throw activitiesRes.error;
            if (transitionsRes.error) throw transitionsRes.error;
            if (detailsRes.error) throw detailsRes.error;

            setDetails(detailsRes.data || []);

            const activityIds = (activitiesRes.data || []).map(a => a.id);

            // Fetch fields only for these activities
            let fields: any[] = [];
            if (activityIds.length > 0) {
                const { data, error } = await supabase
                    .from('activity_field_definitions')
                    .select('*')
                    .in('activity_id', activityIds);

                if (error) {
                    console.error('⚠️ Error cargando campos (continuando sin ellos):', error.message);
                } else {
                    fields = data || [];
                }
            }

            const activitiesWithFields = (activitiesRes.data || []).map(activity => ({
                ...activity,
                // Normalize coordinates: use x_pos/y_pos if available, fallback to x/y, then 0
                x_pos: Number(activity.x_pos ?? activity.x ?? 100),
                y_pos: Number(activity.y_pos ?? activity.y ?? 100),
                fields: fields
                    .filter(f => f.activity_id === activity.id)
                    .sort((a, b) => (Number(a.order_index || 0) - Number(b.order_index || 0)))
            }));

            setActivities(activitiesWithFields);
            setTransitions(transitionsRes.data || []);
        } catch (error: any) {
            console.error('❌ Error fatal loading workflow model:', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function saveModel(newActivities: Activity[], newTransitions: Transition[], newDetails: WorkflowDetail[] = details) {
        try {
            setSaving(true);

            // 1. Upsert Activities
            if (newActivities.length > 0) {
                const activitiesToUpsert = newActivities.map(({ fields, ...rest }) => rest);
                const { error: upsActError } = await supabase.from('activities').upsert(activitiesToUpsert);
                if (upsActError) {
                    console.error('❌ Error al upsertar actividades:', upsActError);
                    throw upsActError;
                }

                // 2. Upsert Field Definitions
                const allFields = newActivities.flatMap(a => (a.fields || []).map(f => {
                    const fieldToSave: any = {
                        id: f.id,
                        activity_id: a.id,
                        name: f.name,
                        label: f.label ?? f.name,
                        type: f.type,
                        required: !!f.required,
                        placeholder: f.placeholder ?? null,
                        options: f.options || [],
                        min_value: f.min_value ?? null,
                        max_value: f.max_value ?? null,
                        regex_pattern: f.regex_pattern ?? null,
                        visibility_condition: f.visibility_condition ?? null,
                    };

                    // Solo incluir order_index si f lo tiene, para evitar errores si la columna no existe
                    if (f.order_index !== undefined) {
                        fieldToSave.order_index = f.order_index;
                    }

                    return fieldToSave;
                }));

                console.log('Todos los campos a guardar (normalizados):', allFields);

                if (allFields.length > 0) {
                    // Limpiar opciones vacías antes de enviar a base de datos
                    const cleanedFields = allFields.map(f => ({
                        ...f,
                        options: Array.isArray(f.options) ? f.options.filter((o: string) => o !== '') : []
                    }));

                    const { error: upsFieldsError } = await supabase.from('activity_field_definitions').upsert(cleanedFields);

                    if (upsFieldsError) {
                        // Si falla específicamente por la columna order_index, reintentamos sin ella
                        if (upsFieldsError.message?.includes('order_index') || upsFieldsError.message?.includes('column')) {
                            console.warn('⚠️ Reintentando guardado sin columna order_index...');
                            const fieldsWithoutOrder = cleanedFields.map(({ order_index, ...rest }) => rest);
                            const { error: retryError } = await supabase.from('activity_field_definitions').upsert(fieldsWithoutOrder);
                            if (retryError) throw retryError;
                        } else {
                            console.error('❌ Error al upsertar campos:', upsFieldsError);
                            throw upsFieldsError;
                        }
                    }
                }
            }

            // 3. Upsert Transitions
            if (newTransitions.length > 0) {
                const { error: upsTransError } = await supabase.from('transitions').upsert(newTransitions);
                if (upsTransError) {
                    console.error('❌ Error al upsertar transiciones:', upsTransError);
                    throw upsTransError;
                }
            }

            // 3.5 Upsert Details (Carpetas)
            if (newDetails.length > 0) {
                const { error: upsDetailsError } = await supabase.from('workflow_details').upsert(newDetails);
                if (upsDetailsError) {
                    console.error('❌ Error al upsertar detalles:', upsDetailsError);
                    throw upsDetailsError;
                }
            }

            // 4. Delete orphans
            const activityIds = newActivities.map(a => a.id);
            const transitionIds = newTransitions.map(t => t.id);
            const detailIds = newDetails.map(d => d.id);
            const fieldIds = newActivities.flatMap(a => (a.fields || []).map(f => f.id));


            // Delete orphaned transitions
            if (transitionIds.length > 0) {
                const { error: delTransError } = await supabase.from('transitions')
                    .delete()
                    .eq('workflow_id', workflowId)
                    .not('id', 'in', transitionIds);
                if (delTransError) console.warn('⚠️ No se pudieron borrar algunas transiciones:', delTransError);
            } else {
                await supabase.from('transitions').delete().eq('workflow_id', workflowId);
            }

            // Delete orphaned field definitions
            if (activityIds.length > 0) {
                if (fieldIds.length > 0) {
                    const { error: delFieldsError } = await supabase.from('activity_field_definitions')
                        .delete()
                        .in('activity_id', activityIds)
                        .not('id', 'in', fieldIds);
                    if (delFieldsError) console.error('❌ Error al borrar campos huérfanos:', delFieldsError);
                } else {
                    await supabase.from('activity_field_definitions')
                        .delete()
                        .in('activity_id', activityIds);
                }
            }

            // Delete orphaned activities
            if (activityIds.length > 0) {
                const { error: delActError } = await supabase.from('activities')
                    .delete()
                    .eq('workflow_id', workflowId)
                    .not('id', 'in', activityIds);
                if (delActError) {
                    console.warn('⚠️ No se pudieron borrar algunas actividades (posiblemente en uso):', delActError.message);
                }
            } else {
                await supabase.from('activities').delete().eq('workflow_id', workflowId);
            }

            // Delete orphaned details
            if (detailIds.length > 0) {
                const { error: delDetailsError } = await supabase.from('workflow_details')
                    .delete()
                    .eq('workflow_id', workflowId)
                    .not('id', 'in', detailIds);
                if (delDetailsError) console.warn('⚠️ No se pudieron borrar detalles:', delDetailsError);
            } else {
                await supabase.from('workflow_details').delete().eq('workflow_id', workflowId);
            }

            setActivities(newActivities);
            setTransitions(newTransitions);
            setDetails(newDetails);

            return { success: true };
        } catch (error: any) {
            console.error('🔥 Error Crítico en saveModel:', error.message);
            return { success: false, error: error.message };
        } finally {
            setSaving(false);
        }
    }

    return {
        activities,
        setActivities,
        transitions,
        setTransitions,
        details,
        setDetails,
        loading,
        saving,
        saveModel,
        reload: loadModel
    };
}
