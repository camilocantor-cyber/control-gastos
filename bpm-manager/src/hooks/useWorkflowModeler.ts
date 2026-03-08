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
                    const isColumnError = upsActError.message?.includes('column') ||
                        upsActError.message?.includes('schema cache') ||
                        upsActError.code === '42703';

                    if (isColumnError) {
                        console.warn('⚠️ Inconsistencia de esquema en actividades. Reintentando guardado básico...');

                        const optionalColumns = [
                            'assignment_type', 'assignment_strategy', 'actions', 'associated_details',
                            'detail_cardinalities', 'form_columns', 'due_date_hours', 'sla_alert_hours',
                            'enable_supervisor_alerts', 'is_public', 'wait_config', 'subprocess_config',
                            'sync_config', 'width', 'height', 'x_pos', 'y_pos',
                            'folder_completion_rule', 'folder_completion_ids', 'require_save_before_folders'
                        ];

                        const activitiesResilient = activitiesToUpsert.map(a => {
                            const newA = { ...a };
                            optionalColumns.forEach(col => delete (newA as any)[col]);
                            return newA;
                        });

                        const { error: retryError } = await supabase.from('activities').upsert(activitiesResilient);
                        if (retryError) throw retryError;
                    } else {
                        console.error('❌ Error al upsertar actividades:', upsActError);
                        throw upsActError;
                    }
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
                        is_readonly: !!f.is_readonly,
                        placeholder: f.placeholder ?? null,
                        description: f.description ?? null,
                        options: f.options || [],
                        min_value: f.min_value ?? null,
                        max_value: f.max_value ?? null,
                        max_length: f.max_length ?? null,
                        regex_pattern: f.regex_pattern ?? null,
                        visibility_condition: f.visibility_condition ?? null,
                        default_value: f.default_value ?? null,
                        consecutive_mask: f.consecutive_mask ?? null,
                        lookup_config: f.lookup_config ?? null,
                        grid_columns: f.grid_columns ?? null,
                        source_activity_id: f.source_activity_id ?? null,
                        source_field_name: f.source_field_name ?? null,
                        parent_accordion_id: f.parent_accordion_id ?? null,
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
                        // Si falla específicamente por columnas inexistentes o caché de esquema, reintentamos eliminando los campos nuevos
                        const isColumnError = upsFieldsError.message?.includes('column') ||
                            upsFieldsError.message?.includes('schema cache') ||
                            upsFieldsError.code === '42703';

                        if (isColumnError) {
                            console.warn('⚠️ Detectada inconsistencia de esquema. Reintentando guardado básico...');

                            // Lista de columnas que podrían no existir aún
                            const optionalColumns = [
                                'order_index', 'consecutive_mask', 'default_value', 'grid_columns',
                                'source_activity_id', 'source_field_name', 'parent_accordion_id',
                                'regex_pattern', 'visibility_condition', 'max_length'
                            ];

                            const fieldsResilient = cleanedFields.map(f => {
                                const newF = { ...f };
                                optionalColumns.forEach(col => delete (newF as any)[col]);
                                return newF;
                            });

                            const { error: retryError } = await supabase.from('activity_field_definitions').upsert(fieldsResilient);
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
                if (delTransError) throw new Error('Error al borrar transiciones: ' + delTransError.message);
            } else {
                const { error: delTransError } = await supabase.from('transitions').delete().eq('workflow_id', workflowId);
                if (delTransError) throw new Error('Error al borrar todas las transiciones: ' + delTransError.message);
            }

            // Delete orphaned field definitions
            if (activityIds.length > 0) {
                if (fieldIds.length > 0) {
                    const { error: delFieldsError } = await supabase.from('activity_field_definitions')
                        .delete()
                        .in('activity_id', activityIds)
                        .not('id', 'in', fieldIds);
                    if (delFieldsError) throw new Error('Error al borrar campos: ' + delFieldsError.message);
                } else {
                    const { error: delFieldsError } = await supabase.from('activity_field_definitions')
                        .delete()
                        .in('activity_id', activityIds);
                    if (delFieldsError) throw new Error('Error al borrar todos los campos: ' + delFieldsError.message);
                }
            }

            // Delete orphaned activities
            // We do this AFTER transitions and fields to avoid immediate FK violations if possible
            if (activityIds.length > 0) {
                const { error: delActError } = await supabase.from('activities')
                    .delete()
                    .eq('workflow_id', workflowId)
                    .not('id', 'in', activityIds);

                if (delActError) {
                    if (delActError.message?.includes('foreign key constraint') || delActError.code === '23503') {
                        throw new Error('No se puede eliminar la actividad porque tiene trámites (procesos) asociados en curso. Debes finalizar o mover esos trámites antes de eliminarla.');
                    }
                    throw new Error('Error al borrar actividades: ' + delActError.message);
                }
            } else {
                const { error: delActError } = await supabase.from('activities').delete().eq('workflow_id', workflowId);
                if (delActError) {
                    if (delActError.message?.includes('foreign key constraint') || delActError.code === '23503') {
                        throw new Error('No se pueden eliminar las actividades porque tienen trámites asociados.');
                    }
                    throw new Error('Error al borrar todas las actividades: ' + delActError.message);
                }
            }

            // Delete orphaned details
            if (detailIds.length > 0) {
                const { error: delDetailsError } = await supabase.from('workflow_details')
                    .delete()
                    .eq('workflow_id', workflowId)
                    .not('id', 'in', detailIds);
                if (delDetailsError) throw new Error('Error al borrar detalles: ' + delDetailsError.message);
            } else {
                const { error: delDetailsError } = await supabase.from('workflow_details').delete().eq('workflow_id', workflowId);
                if (delDetailsError) throw new Error('Error al borrar todos los detalles: ' + delDetailsError.message);
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
