import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useExecution } from '../hooks/useExecution';
import { X, Save, Plus, Trash2, Clock, GitBranch, Download, AlertCircle, Maximize2, Minimize2, CheckCircle2, DollarSign, Layers, ChevronRight, Globe, Eye, History, Box, FolderOpen, Info, Lock, Upload, Edit2, Loader2 } from 'lucide-react';
import type { Transition, Provider } from '../types';
import { evaluateCondition, translateCondition } from '../utils/conditions';
import { FileAttachments } from './FileAttachments';
import clsx from 'clsx';
import { ProcessViewerModal } from './ProcessViewerModal';
import { InteractiveLookup } from './InteractiveLookup';
import { IfcViewer } from './IfcViewer';
import { HistoryDetailModal } from './HistoryDetailModal';
import { GeoSelector } from './GeoSelector';
import * as XLSX from 'xlsx';

export function ProcessExecution({ processId, onClose, onComplete }: { processId: string, onClose: () => void, onComplete: () => void }) {
    const {
        advanceProcess,
        getFieldDefinitions,
        getProcessData,
        saveProcessData,
        completeProcess,
        getGlobalHeaderData,
        getBimStates,
        saveBimState,
        loading: hookLoading
    } = useExecution();

    const [instance, setInstance] = useState<any>(null);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [fields, setFields] = useState<any[]>([]);
    const [globalHeaders, setGlobalHeaders] = useState<any[]>([]);
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [showCopyTooltip, setShowCopyTooltip] = useState(false);
    const [showProcessViewer, setShowProcessViewer] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
    const [hasSavedOnce, setHasSavedOnce] = useState(false);
    const [initialPkValues, setInitialPkValues] = useState<Record<string, any>>({});

    const toggleAccordion = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Details State
    const [activeTab, setActiveTab] = useState<string>('main');
    const [workflowDetails, setWorkflowDetails] = useState<any[]>([]);
    const [detailRows, setDetailRows] = useState<Record<string, any[]>>({});
    const [activeDetailForm, setActiveDetailForm] = useState<string | null>(null);
    const [detailFormData, setDetailFormData] = useState<Record<string, any>>({});
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    // BIM State
    const [ifcFile, setIfcFile] = useState<any>(null);
    const [bimStates, setBimStates] = useState<Record<number, 'completed' | 'processing' | 'delayed' | 'pending'>>({});
    const [selectedBimObject, setSelectedBimObject] = useState<any>(null);


    useEffect(() => {
        loadData();
    }, [processId]);

    async function loadData() {
        try {
            setLoading(true);
            const { data: ins, error: insError } = await supabase
                .from('process_instances')
                .select('*, workflows(*), activities(*)')
                .eq('id', processId)
                .single();

            if (insError) throw insError;
            setInstance(ins);

            if (ins) {
                const { data: trans } = await supabase
                    .from('transitions')
                    .select('*, target:activities!target_id(name)')
                    .eq('source_id', ins.current_activity_id);

                const formattedTransitions = (trans || []).map((t: any) => ({
                    ...t,
                    target_name: t.target?.name || 'Siguiente Actividad'
                }));
                setTransitions(formattedTransitions);

                const { data: histData, error: historyError } = await supabase
                    .from('process_history')
                    .select('*, activities(name), profiles(full_name, email)')
                    .eq('process_id', processId)
                    .order('created_at', { ascending: false });

                if (historyError) throw historyError;
                setHistory(histData || []);

                const gHeaders = await getGlobalHeaderData(processId);
                setGlobalHeaders(gHeaders || []);

                const fieldDefs = await getFieldDefinitions(ins.current_activity_id);
                setFields(fieldDefs || []);

                const hasProviderField = fieldDefs?.some((f: any) => f.type === 'provider');
                if (hasProviderField && ins.organization_id) {
                    const { data: providerData } = await supabase
                        .from('providers')
                        .select('*')
                        .eq('organization_id', ins.organization_id)
                        .order('name', { ascending: true });
                    setProviders(providerData || []);
                }

                const existingData = await getProcessData(processId, ins.current_activity_id);
                const initialData: Record<string, string> = {};
                existingData?.forEach((d: any) => {
                    initialData[d.field_name] = d.value;
                });

                const pkVals: Record<string, any> = {};

                for (const field of (fieldDefs || [])) {
                    if (field.db_is_primary_key && field.db_column) {
                        pkVals[field.db_column] = initialData[field.name];
                    }

                    if (!initialData[field.name]) {
                        if (field.source_activity_id && field.source_field_name) {
                            try {
                                const sourceData = await getProcessData(processId, field.source_activity_id);
                                const sourceValue = sourceData?.find((d: any) => d.field_name === field.source_field_name)?.value;
                                if (sourceValue) {
                                    initialData[field.name] = sourceValue;
                                }
                            } catch (err) {
                                console.warn(`Failed to auto - populate field ${field.name} from source: `, err);
                            }
                        }

                        // Use default_value if still empty
                        if (!initialData[field.name]) {
                            if (field.default_value) {
                                initialData[field.name] = field.default_value;
                            } else if (field.type === 'date') {
                                // Default to today's date if empty
                                initialData[field.name] = new Date().toISOString().split('T')[0];
                            } else if (field.type === 'consecutivo') {
                                // Generar consecutivo
                                const mask = field.consecutive_mask || 'CON-####';
                                const today = new Date();
                                const YYYY = today.getFullYear().toString();
                                const YY = YYYY.slice(2);
                                const MM = (today.getMonth() + 1).toString().padStart(2, '0');
                                const DD = today.getDate().toString().padStart(2, '0');

                                let formatted = mask.replace(/YYYY/g, YYYY).replace(/YY/g, YY).replace(/MM/g, MM).replace(/DD/g, DD);

                                // Process the '#' symbols, using workflow_sequence as the sequence for identity per workflow type
                                // Defaulting to process_number or random if there's an issue with sequence, to prevent crashes.
                                formatted = formatted.replace(/#+/g, (match: string) => {
                                    const seq = ins.workflow_sequence || ins.process_number || Math.floor(Math.random() * 1000);
                                    return seq.toString().padStart(match.length, '0');
                                });

                                initialData[field.name] = formatted;
                            }
                        }
                    }
                }
                setFormData(initialData);
                setInitialPkValues(pkVals);

                if (existingData && existingData.length > 0) {
                    setHasSavedOnce(true);
                }

                // Load Associated Details
                const detailIds = ins.activities?.associated_details || [];
                if (detailIds.length > 0) {
                    const { data: detailsData } = await supabase
                        .from('workflow_details')
                        .select('*')
                        .in('id', detailIds);

                    setWorkflowDetails(detailsData || []);

                    const { data: rowsData } = await supabase
                        .from('process_detail_rows')
                        .select('*')
                        .eq('process_id', processId)
                        .in('detail_id', detailIds);

                    const rowsMap: Record<string, any[]> = {};
                    (detailsData || []).forEach(d => rowsMap[d.id] = []);
                    (rowsData || []).forEach(r => {
                        if (!rowsMap[r.detail_id]) rowsMap[r.detail_id] = [];
                        rowsMap[r.detail_id].push(r);
                    });
                    setDetailRows(rowsMap);
                }

                // Load BIM Info (check for IFC)
                try {
                    const { data: ifcAttach, error: ifcError } = await supabase
                        .from('process_attachments')
                        .select('*')
                        .eq('process_instance_id', processId)
                        .ilike('file_name', '%.ifc')
                        .limit(1)
                        .maybeSingle();

                    if (ifcError && ifcError.code !== 'PGRST116') {
                        console.error("IFC maybeSingle error:", ifcError);
                    }

                    if (ifcAttach) {
                        const { data: urlData, error: urlError } = await supabase.storage
                            .from('process-files')
                            .createSignedUrl(ifcAttach.file_path, 3600);

                        if (urlError) {
                            console.error("Signed URL error:", urlError);
                        } else if (urlData) {
                            setIfcFile({ ...ifcAttach, signedUrl: urlData.signedUrl });
                            try {
                                const states = await getBimStates(processId);
                                const statesMap: Record<number, any> = {};
                                states?.forEach((s: any) => statesMap[s.express_id] = s.status);
                                setBimStates(statesMap);
                            } catch (bimErr) {
                                console.error("Error loading BIM states:", bimErr);
                            }
                        }
                    }
                } catch (ifcWrapperError) {
                    console.error("Error global en BIM / IFC:", ifcWrapperError);
                }
            }
        } catch (error) {
            console.error('Error loading execution state:', error);
            alert('Error al cargar el trámite.');
        } finally {
            setLoading(false);
        }
    }

    const validateForm = () => {
        const errors: string[] = [];
        fields.forEach(field => {
            const value = formData[field.name];

            // Required check
            if (field.required && isFieldVisible(field) && (!value || (typeof value === 'string' && value.trim() === ''))) {
                errors.push(`El campo "${field.label || field.name}" es obligatorio.`);
            }

            if (value && value.trim() !== '') {
                // Regex check
                if (field.regex_pattern) {
                    try {
                        const regex = new RegExp(field.regex_pattern);
                        if (!regex.test(value)) {
                            errors.push(`El campo "${field.label || field.name}" no tiene un formato válido.`);
                        }
                    } catch (e) {
                        console.error('Invalid regex pattern:', field.regex_pattern);
                    }
                }

                // Min/Max check
                if (field.type === 'number' || field.type === 'currency') {
                    const numVal = parseFloat(value);
                    if (!isNaN(numVal)) {
                        if (field.min_value != null && numVal < field.min_value) {
                            errors.push(`El valor de "${field.label || field.name}" debe ser al menos ${field.min_value}.`);
                        }
                        if (field.max_value != null && numVal > field.max_value) {
                            errors.push(`El valor de "${field.label || field.name}" no debe exceder ${field.max_value}.`);
                        }
                    }
                }

                // Email check
                if (field.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errors.push(`El campo "${field.label || field.name}" debe ser un correo válido.`);
                    }
                }
            }
        });

        // Check Master-Detail cardinalities and completion rules
        if (instance?.activities) {
            const cardinalities = instance.activities.detail_cardinalities || {};
            const rule = instance.activities.folder_completion_rule || 'none';
            const mandatoryIds = instance.activities.folder_completion_ids || [];

            // 1. Standard Cardinality Checks
            workflowDetails.forEach(detail => {
                const config = cardinalities[detail.id];
                if (!config || config.mode === 'none') return;

                const rowsCount = detailRows[detail.id]?.length || 0;

                if (config.mode === '1_to_many' && rowsCount < 1) {
                    errors.push(`La carpeta "${detail.name}" es obligatoria (requiere al menos 1 registro).`);
                } else if (config.mode === 'min_x' && config.min_items && rowsCount < config.min_items) {
                    errors.push(`La carpeta "${detail.name}" requiere un mínimo de ${config.min_items} registros (tiene ${rowsCount}).`);
                }
            });

            // 2. Folder Completion Rules (AND / OR)
            if (rule === 'and' && mandatoryIds.length > 0) {
                const missingFolders = mandatoryIds
                    .map((id: string) => workflowDetails.find(d => d.id === id))
                    .filter((d: any) => d && (detailRows[d.id]?.length || 0) < 1);

                if (missingFolders.length > 0) {
                    errors.push(`Regla AND: Todas las siguientes carpetas deben tener al menos un registro: ${missingFolders.map((d: any) => d?.name).join(', ')}.`);
                }
            } else if (rule === 'or' && mandatoryIds.length > 0) {
                const hasAtLeastOne = mandatoryIds.some((id: string) => (detailRows[id]?.length || 0) >= 1);
                if (!hasAtLeastOne) {
                    const folders = mandatoryIds.map((id: string) => workflowDetails.find(d => d.id === id)?.name).filter(Boolean);
                    errors.push(`Regla OR: Al menos una de las siguientes carpetas debe tener contenido: ${folders.join(', ')}.`);
                }
            }
        }

        return errors;
    };

    async function handleSaveDetailRow() {
        if (!activeDetailForm) return;
        const detail = workflowDetails.find(d => d.id === activeDetailForm);
        if (!detail) return;

        const missingRequired = detail.fields?.filter((f: any) => f.required && !detailFormData[f.name]);
        if (missingRequired && missingRequired.length > 0) {
            alert('Por favor complete todos los campos requeridos: ' + missingRequired.map((f: any) => f.label || f.name).join(', '));
            return;
        }

        try {
            setLoading(true);
            if (editingRowId) {
                const { error } = await supabase
                    .from('process_detail_rows')
                    .update({ data: detailFormData })
                    .eq('id', editingRowId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('process_detail_rows')
                    .insert({
                        process_id: processId,
                        detail_id: activeDetailForm,
                        data: detailFormData
                    });
                if (error) throw error;
            }

            const { data: rowsData } = await supabase
                .from('process_detail_rows')
                .select('*')
                .eq('process_id', processId)
                .in('detail_id', workflowDetails.map(d => d.id));

            const rowsMap: Record<string, any[]> = {};
            workflowDetails.forEach(d => rowsMap[d.id] = []);
            (rowsData || []).forEach(r => {
                if (!rowsMap[r.detail_id]) rowsMap[r.detail_id] = [];
                rowsMap[r.detail_id].push(r);
            });
            setDetailRows(rowsMap);
            setActiveDetailForm(null);
            setDetailFormData({});
            setEditingRowId(null);
        } catch (error: any) {
            alert('Error guardando registro: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDeleteDetailRow(rowId: string) {
        if (!confirm('¿Seguro de eliminar este registro?')) return;
        try {
            setLoading(true);
            const { error } = await supabase
                .from('process_detail_rows')
                .delete()
                .eq('id', rowId);
            if (error) throw error;

            setDetailRows(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(k => {
                    updated[k] = updated[k].filter(r => r.id !== rowId);
                });
                return updated;
            });
        } catch (error: any) {
            alert('Error eliminando registro: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    const handleExportTemplate = (detail: any) => {
        const fields = detail.fields || [];
        const headers = fields.map((f: any) => f.label || f.name);

        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

        XLSX.writeFile(wb, `Plantilla_${detail.name || 'Detalle'}.xlsx`);
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>, detail: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                setLoading(true);
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

                if (jsonData.length <= 1) {
                    alert('El archivo no contiene datos válidos.');
                    return;
                }

                const fields = detail.fields || [];
                if (!fields.length) return;

                const headersRow = jsonData[0];
                const dataRows = jsonData.slice(1);

                const headerIndexMap: Record<string, number> = {};
                fields.forEach((f: any) => {
                    const searchName = String(f.label || f.name).toLowerCase().trim();
                    const idx = headersRow.findIndex((h: any) => typeof h === 'string' && h.toLowerCase().trim() === searchName);
                    if (idx !== -1) {
                        headerIndexMap[f.name] = idx;
                    }
                });

                const rowsToInsert = dataRows.map((row: any[]) => {
                    const rowData: Record<string, any> = {};
                    fields.forEach((f: any) => {
                        const idx = headerIndexMap[f.name];
                        if (idx !== undefined && row[idx] !== undefined) {
                            rowData[f.name] = String(row[idx]);
                        }
                    });
                    return {
                        process_id: processId,
                        detail_id: detail.id,
                        data: rowData
                    };
                }).filter((row: any) => Object.keys(row.data).length > 0);

                if (rowsToInsert.length === 0) {
                    alert('No se encontraron filas con datos, o las columnas no coinciden con la plantilla.');
                    return;
                }

                const { error } = await supabase.from('process_detail_rows').insert(rowsToInsert);
                if (error) throw error;

                const { data: rowsData } = await supabase
                    .from('process_detail_rows')
                    .select('*')
                    .eq('process_id', processId)
                    .in('detail_id', workflowDetails.map(d => d.id));

                const rowsMap: Record<string, any[]> = {};
                workflowDetails.forEach(d => rowsMap[d.id] = []);
                (rowsData || []).forEach(r => {
                    if (!rowsMap[r.detail_id]) rowsMap[r.detail_id] = [];
                    rowsMap[r.detail_id].push(r);
                });
                setDetailRows(rowsMap);

                alert(`${rowsToInsert.length} registros importados exitosamente.`);

            } catch (error: any) {
                console.error('Error importando:', error);
                alert('Ocurrió un error al importar el archivo: ' + error.message);
            } finally {
                setLoading(false);
                if (e.target) e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    async function handleSave() {
        setSavingDraft(true);
        const result = await saveProcessData(processId, instance.current_activity_id, formData);
        if (result.success) {
            // Also sync to linked DB table on every save
            const syncResult = await syncFormDataToTable();
            if (!syncResult.success) {
                toast.error('❌ Error sincronizando con BD: ' + syncResult.error);
            }
            setDraftSaved(true);
            setHasSavedOnce(true);
            setTimeout(() => setDraftSaved(false), 3000);
        } else {
            toast.error('❌ Error al guardar: ' + result.error);
        }
        setSavingDraft(false);
    }

    function isFieldVisible(field: any): boolean {
        if (!field) return false;

        // If the field belongs to an accordion, check if that accordion is visible first
        if (field.parent_accordion_id) {
            const parent = fields.find(f => f.id === field.parent_accordion_id);
            if (parent && !isFieldVisible(parent)) return false;
        }

        // Evaluate own condition
        return evaluateCondition(field.visibility_condition || '', formData);
    }

    async function syncFormDataToTable(): Promise<{ success: boolean; error?: string }> {
        if (!instance?.activities?.sync_table) {
            console.log('[SYNC] No sync_table defined for this activity. Skipping.');
            return { success: true };
        }
        const syncTable = instance.activities.sync_table;
        console.log('[SYNC] Syncing form data to table:', syncTable);

        const payload: Record<string, any> = {};
        const pkFields: { name: string; value: any }[] = [];

        for (const field of fields) {
            console.log(`[SYNC] Field: ${field.name}, db_column: ${field.db_column}, db_is_primary_key: ${field.db_is_primary_key}`);
            if (field.db_column) {
                let value = formData[field.name];

                if (value !== undefined && value !== null && value !== '') {
                    if (field.db_type === 'integer' || field.db_type === 'numeric' || field.db_type === 'real' || field.db_type === 'double precision') {
                        value = Number(value);
                    } else if (field.db_type === 'boolean') {
                        value = value === 'true' || value === true;
                    }
                } else {
                    value = null;
                }

                payload[field.db_column] = value;

                if (field.db_is_primary_key) {
                    pkFields.push({ name: field.db_column, value });
                }
            }
        }

        console.log('[SYNC] Payload to save:', payload);
        console.log('[SYNC] PK Fields:', pkFields);

        if (Object.keys(payload).length === 0) {
            toast.warning(`⚠️ Tabla "${syncTable}" vinculada pero ningún campo tiene columna BD mapeada (db_column). Reimporta el esquema en el constructor.`);
            console.warn('[SYNC] ⚠️ Payload is empty — no fields have db_column set. Was the schema imported and workflow saved?');
            return { success: true };
        }

        if (pkFields.length > 0) {
            const isUpdate = pkFields.every(pk => initialPkValues[pk.name] === pk.value && pk.value != null);

            if (!isUpdate) {
                let query = supabase.from(syncTable).select('*', { count: 'exact', head: true });
                let hasAllPks = true;
                for (const pk of pkFields) {
                    if (pk.value === null || pk.value === undefined || pk.value === '') {
                        hasAllPks = false;
                    } else {
                        query = query.eq(pk.name, pk.value);
                    }
                }

                if (hasAllPks) {
                    const { count, error: countError } = await query;
                    if (countError) return { success: false, error: countError.message };
                    if (count && count > 0) {
                        return { success: false, error: `Ya existe un registro con la llave primaria proporcionada en la base de datos.` };
                    }
                } else {
                    return { success: false, error: `Los campos marcados como llave primaria no pueden estar vacíos.` };
                }
            }
        }

        console.log('[SYNC] Executing upsert to', syncTable, 'with', Object.keys(payload).length, 'fields...');
        const { error } = await supabase.from(syncTable).upsert(payload);
        if (error) {
            console.error('[SYNC] ❌ Upsert failed:', error);
            return { success: false, error: error.message };
        }

        console.log('[SYNC] ✅ Sync successful!');
        toast.success(`✅ Registro sincronizado en "${syncTable}"`);

        const newPkVals = { ...initialPkValues };
        for (const pk of pkFields) newPkVals[pk.name] = pk.value;
        setInitialPkValues(newPkVals);

        return { success: true };
    }

    async function handleAdvance(transitionId: string) {
        const errors = validateForm();
        if (errors.length > 0) {
            alert('Por favor corrija los siguientes errores:\n\n' + errors.join('\n'));
            return;
        }

        const dataSave = await saveProcessData(processId, instance.current_activity_id, formData);
        if (!dataSave.success) {
            alert('Error al guardar datos: ' + dataSave.error);
            return;
        }

        const syncResult = await syncFormDataToTable();
        if (!syncResult.success) {
            alert('Error sincronizando con base de datos: ' + syncResult.error);
            return;
        }

        const result = await advanceProcess(processId, transitionId, comment);
        if (result.success) {
            onComplete();
            onClose();
        } else {
            alert('Error al avanzar: ' + result.error);
        }
    }

    async function handleFinalize() {
        const errors = validateForm();
        if (errors.length > 0) {
            alert('Por favor corrija los siguientes errores:\n\n' + errors.join('\n'));
            return;
        }

        const dataSave = await saveProcessData(processId, instance.current_activity_id, formData);
        if (!dataSave.success) {
            alert('Error al guardar datos: ' + dataSave.error);
            return;
        }

        const syncResult = await syncFormDataToTable();
        if (!syncResult.success) {
            alert('Error sincronizando con base de datos: ' + syncResult.error);
            return;
        }

        const result = await completeProcess(processId, comment);
        if (result.success) {
            onComplete();
            onClose();
        } else {
            alert('Error al finalizar: ' + result.error);
        }
    }

    async function handleAttendAll() {
        const errors = validateForm();
        if (errors.length > 0) {
            alert('No se puede atender masivamente porque hay errores o carpetas incompletas:\n\n' + errors.join('\n'));
            return;
        }

        const activeTransitions = transitions.filter(t => evaluateCondition(t.condition, formData));
        if (activeTransitions.length === 0) {
            alert('No hay caminos activos para atender.');
            return;
        }

        if (!window.confirm(`¿Estás seguro de atender los ${activeTransitions.length} caminos activos simultáneamente ? `)) return;

        const dataSave = await saveProcessData(processId, instance.current_activity_id, formData);
        if (!dataSave.success) {
            alert('Error al guardar datos: ' + dataSave.error);
            return;
        }

        const syncResult = await syncFormDataToTable();
        if (!syncResult.success) {
            alert('Error sincronizando con base de datos: ' + syncResult.error);
            return;
        }

        try {
            const result = await advanceProcess(processId, activeTransitions[0].id, `[Atención Masiva] ${comment} `);
            if (result.success) {
                onComplete();
                onClose();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            alert('Error al atender todos los caminos: ' + err.message);
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(processId);
        setShowCopyTooltip(true);
        setTimeout(() => setShowCopyTooltip(false), 2000);
    };



    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 relative mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!instance) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl border border-white/10 dark:border-slate-800 overflow-hidden relative">
                {/* Header */}
                <div className="px-8 py-2.5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-white dark:bg-slate-950/80 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-6">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-200 dark:shadow-blue-900/20">
                            <GitBranch className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">{instance.workflows?.name}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{instance.activities?.name}</span>

                                    <div className="w-[1px] h-3 bg-blue-200 dark:bg-blue-700 mx-1" />

                                    <div className="relative">
                                        <button
                                            onClick={copyToClipboard}
                                            className="group/id text-blue-500 dark:text-blue-400 text-[10px] font-bold uppercase tracking-tighter hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
                                            title="Copiar ID de Trámite"
                                        >
                                            #{instance?.process_number ? instance.process_number.toString().padStart(8, '0') : processId.split('-')[0].toUpperCase()}
                                        </button>
                                        {showCopyTooltip && (
                                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-xl animate-in fade-in zoom-in duration-200 z-50 whitespace-nowrap">
                                                ¡ID COPIADO!
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {instance.activities?.is_public && (
                                    <>
                                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}?public_activity = ${instance.current_activity_id}& process_id=${processId} `;
                                                navigator.clipboard.writeText(url);
                                                setShowCopyTooltip(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                            title="Copiar Enlace Público para esta Actividad"
                                        >
                                            <Globe className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Enlace Público</span>
                                        </button>
                                    </>
                                )}

                                {instance.total_cost > 0 && (
                                    <>
                                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800" />
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-100 dark:border-emerald-800/30" title="Costo Operativo Acumulado">
                                            <DollarSign className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                Inversión: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(instance.total_cost || 0)}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>


                    <div className="flex-1 px-4 min-w-0">
                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
                            {globalHeaders.map((header) => (
                                <div key={header.id} className="flex flex-col min-w-fit border-l-2 border-slate-100 dark:border-slate-800 pl-4">
                                    <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                                        {header.label || header.name}
                                    </span>
                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                        {header.value || '---'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 ml-auto px-2">
                        {/* Grupo 1: Herramientas de Visualización/Consulta */}
                        <div className="flex items-center gap-1.5 mr-2">
                            <button
                                onClick={() => setShowProcessViewer(true)}
                                className="p-2.5 rounded-xl transition-all border flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 border-slate-100 dark:border-white/5 hover:border-transparent"
                                title="Ver Mapa de Navegación"
                            >
                                <Eye className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => setActiveTab('history')}
                                className={clsx(
                                    "p-2.5 rounded-xl transition-all border flex items-center justify-center flex-shrink-0",
                                    activeTab === 'history'
                                        ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900 border-transparent scale-110"
                                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 border-slate-100 dark:border-white/5 hover:border-transparent"
                                )}
                                title="Historial"
                            >
                                <History className="w-5 h-5" />
                            </button>

                            {ifcFile && (
                                <button
                                    onClick={() => setActiveTab('bim')}
                                    className={clsx(
                                        "p-2.5 rounded-xl transition-all border flex items-center justify-center flex-shrink-0",
                                        activeTab === 'bim'
                                            ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900 border-transparent scale-110"
                                            : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 border-slate-100 dark:border-white/5 hover:border-transparent"
                                    )}
                                    title="Modelo BIM"
                                >
                                    <Box className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />

                        {/* Grupo 2: Acciones de Gestión (Guardar y Avanzar) */}
                        <div className="flex items-center gap-1.5 ml-2">
                            <button
                                onClick={handleSave}
                                disabled={hookLoading || savingDraft}
                                className={clsx(
                                    "p-2.5 rounded-xl transition-all border flex items-center justify-center flex-shrink-0 active:scale-95",
                                    savingDraft
                                        ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 border-blue-200 dark:border-blue-800 animate-pulse"
                                        : draftSaved
                                            ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none border-transparent"
                                            : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 border-slate-100 dark:border-white/5 hover:border-transparent"
                                )}
                                title={draftSaved ? '¡Cambios guardados!' : 'Guardar Progreso'}
                            >
                                {savingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            </button>

                            {transitions.length > 1 && (
                                <button
                                    onClick={handleAttendAll}
                                    disabled={hookLoading}
                                    className="p-2.5 rounded-xl transition-all border flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 border-slate-100 dark:border-white/5 hover:border-transparent active:scale-95"
                                    title="Atender Todas las Transiciones Activas"
                                >
                                    {hookLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitBranch className="w-5 h-5" />}
                                </button>
                            )}

                            {(instance?.activities?.type === 'end' || transitions.length === 0) && (
                                <button
                                    onClick={handleFinalize}
                                    disabled={hookLoading}
                                    className="p-2.5 rounded-xl transition-all border flex items-center justify-center flex-shrink-0 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 border-slate-100 dark:border-white/5 hover:border-transparent active:scale-95"
                                    title="Finalizar Gestión"
                                >
                                    {hookLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                </button>
                            )}

                            <FileAttachments processInstanceId={processId} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={clsx(
                                "p-3 rounded-2xl transition-all border border-transparent flex-shrink-0",
                                isFocusMode
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            )}
                            title={isFocusMode ? "Salir de Modo Focus" : "Activar Modo Focus"}
                        >
                            {isFocusMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 dark:border-white/5 flex-shrink-0">
                            <X className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden bg-slate-200/50 dark:bg-[#020408]">
                    {/* Main Form Area */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className={clsx(
                            "mx-auto space-y-8 transition-all duration-500",
                            isFocusMode ? "max-w-3xl" : "max-w-5xl"
                        )}>

                            <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-4">
                                <button
                                    onClick={() => setActiveTab('main')}
                                    className={clsx(
                                        "px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all",
                                        activeTab === 'main'
                                            ? "bg-slate-900 text-white shadow-xl dark:bg-white dark:text-slate-900"
                                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 shadow-sm"
                                    )}
                                >
                                    Formulario Principal
                                </button>
                                {workflowDetails.map(detail => (
                                    <button
                                        key={detail.id}
                                        onClick={() => setActiveTab(detail.id)}
                                        className={clsx(
                                            "px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all gap-2 flex items-center shadow-sm border",
                                            activeTab === detail.id
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 dark:shadow-none"
                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                                        )}
                                    >
                                        <FolderOpen className="w-4 h-4" />
                                        {detail.name}
                                        <span className="ml-1.5 px-2 py-0.5 bg-current/20 text-current rounded-md">{detailRows[detail.id]?.length || 0}</span>
                                    </button>
                                ))}
                            </div>

                            {activeTab === 'main' ? (
                                <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] p-8 border-2 border-[#0f172a] shadow-xl shadow-slate-200/50 dark:shadow-none animate-in fade-in duration-300">
                                    <div className="flex items-center gap-3 mb-8">
                                        <Info className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-[11px] font-black text-[#0f172a] dark:text-slate-300 uppercase tracking-[0.2em]">Información de la Actividad</h3>
                                    </div>
                                    <div className={clsx(
                                        "grid gap-x-6 gap-y-5",
                                        instance.activities?.form_columns === 1 ? "grid-cols-1" :
                                            instance.activities?.form_columns === 3 ? "grid-cols-1 md:grid-cols-3" :
                                                instance.activities?.form_columns === 4 ? "grid-cols-1 md:grid-cols-4" :
                                                    "grid-cols-1 md:grid-cols-2"
                                    )}>
                                        {(() => {
                                            const sortedFields = [...fields].sort((a, b) => (Number(a.order_index ?? 9999) - Number(b.order_index ?? 9999)));

                                            const renderSingleField = (field: any) => {
                                                if (!isFieldVisible(field)) return null;

                                                if (field.type === 'label') {
                                                    return (
                                                        <div key={field.id} className="col-span-full py-4 px-6 bg-blue-50/50 dark:bg-blue-500/5 border-l-4 border-blue-500 rounded-lg shadow-sm mb-2">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-1">
                                                                    <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest leading-none mb-1.5">{field.label || field.name}</p>
                                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                                                        {field.placeholder || field.description || 'Sin información disponible.'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                if (field.type === 'accordion') {
                                                    return (
                                                        <div key={field.id} className="col-span-full border border-slate-700 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all mb-3">
                                                            <div
                                                                className="w-full px-5 py-2.5 flex items-center justify-between bg-[#0f172a] dark:bg-slate-900/60 hover:bg-[#1e293b] dark:hover:bg-slate-800 transition-all cursor-pointer border-b border-slate-700 dark:border-slate-700"
                                                                onClick={(e) => toggleAccordion(field.id, e)}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                                        <ChevronRight className={clsx("w-3.5 h-3.5 text-white transition-transform", openAccordions[field.id] ? "rotate-90" : "")} />
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <h3 className="text-[11px] font-black text-white uppercase tracking-tight leading-none">{field.label || field.name}</h3>
                                                                        {field.description && <p className="text-[8px] text-blue-200/50 mt-1 font-bold uppercase tracking-widest leading-none">{field.description}</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {openAccordions[field.id] && (
                                                                <div className="p-5 border-t border-slate-700 bg-slate-50/20 dark:bg-slate-950/20">
                                                                    <div className={clsx(
                                                                        "grid gap-x-6 gap-y-4",
                                                                        instance.activities?.form_columns === 1 ? "grid-cols-1" :
                                                                            instance.activities?.form_columns === 3 ? "grid-cols-1 md:grid-cols-3" :
                                                                                instance.activities?.form_columns === 4 ? "grid-cols-1 md:grid-cols-4" :
                                                                                    "grid-cols-1 md:grid-cols-2"
                                                                    )}>
                                                                        {sortedFields.filter(f => f.parent_accordion_id === field.id).map(child => renderSingleField(child))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={field.id} className={clsx(
                                                        "space-y-2",
                                                        (field.type === 'textarea' || field.type === 'location') ? "col-span-full" : ""
                                                    )}>
                                                        <div className="flex items-center px-1 min-h-[1.25rem] h-auto mb-1">
                                                            <label className="block text-[10px] font-black text-[#0f172a] dark:text-slate-300 uppercase tracking-[0.15em] leading-none">
                                                                {field.label || field.name}
                                                                {field.required && <span className="text-rose-500 ml-1 text-xs">*</span>}
                                                            </label>
                                                        </div>
                                                        <div className={clsx(
                                                            (field.type === 'textarea' || field.type === 'location') ? "h-auto" : "h-10"
                                                        )}>
                                                            {field.type === 'textarea' ? (
                                                                <textarea
                                                                    value={formData[field.name] || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setFormData({ ...formData, [field.name]: (field.max_length && val.length > field.max_length) ? val.slice(0, field.max_length) : val });
                                                                    }}
                                                                    style={{ minHeight: field.rows ? `${field.rows * 24}px` : '120px' }}
                                                                    className={clsx(
                                                                        "w-full bg-slate-50/50 dark:bg-slate-950/40 border-2 border-blue-100/50 dark:border-slate-700/60 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none transition-all resize-none shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600/50",
                                                                        field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 select-none grayscale-[0.3]"
                                                                    )}
                                                                    placeholder={field.placeholder || `Ingrese ${field.label || field.name}...`}
                                                                    readOnly={field.is_readonly}
                                                                    maxLength={field.max_length}
                                                                />
                                                            ) : field.type === 'select' ? (
                                                                <div className="relative group w-full h-full">
                                                                    <select
                                                                        value={formData[field.name] || ''}
                                                                        onChange={(e) => !field.is_readonly && setFormData({ ...formData, [field.name]: e.target.value })}
                                                                        disabled={field.is_readonly}
                                                                        className={clsx(
                                                                            "w-full h-full bg-slate-50/50 dark:bg-slate-950/40 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm pr-10 font-bold hover:shadow-md",
                                                                            field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50"
                                                                        )}
                                                                    >
                                                                        <option value="">Seleccione...</option>
                                                                        {field.options?.map((opt: string) => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                                                                </div>
                                                            ) : field.type === 'currency' ? (
                                                                <div className="relative group w-full h-full">
                                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">$</div>
                                                                    <input
                                                                        type="text"
                                                                        value={formData[field.name] ? new Intl.NumberFormat('es-CO').format(Number(formData[field.name])) : ''}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value.replace(/\D/g, '');
                                                                            setFormData({ ...formData, [field.name]: val });
                                                                        }}
                                                                        className={clsx(
                                                                            "w-full h-full bg-slate-50/50 dark:bg-slate-950/40 border-2 border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all shadow-sm hover:shadow-md",
                                                                            field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50"
                                                                        )}
                                                                        placeholder="0.00"
                                                                        readOnly={field.is_readonly}
                                                                    />
                                                                </div>
                                                            ) : field.type === 'provider' ? (
                                                                <div className="relative group w-full h-full">
                                                                    <select
                                                                        value={formData[field.name] || ''}
                                                                        onChange={(e) => !field.is_readonly && setFormData({ ...formData, [field.name]: e.target.value })}
                                                                        disabled={field.is_readonly}
                                                                        className={clsx(
                                                                            "w-full h-full bg-slate-50/50 dark:bg-slate-950/40 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-xl pr-10 font-bold hover:shadow-2xl hover:scale-[1.01]",
                                                                            field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50"
                                                                        )}
                                                                    >
                                                                        <option value="">Seleccione...</option>
                                                                        {providers.map(p => (
                                                                            <option key={p.id} value={p.name}>{p.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                                                                </div>
                                                            ) : field.type === 'date' ? (
                                                                <input
                                                                    type="date"
                                                                    value={formData[field.name] || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setFormData({ ...formData, [field.name]: (field.max_length && val.length > field.max_length) ? val.slice(0, field.max_length) : val });
                                                                    }}
                                                                    readOnly={field.is_readonly}
                                                                    className={clsx(
                                                                        "w-full h-full bg-slate-50/50 dark:bg-slate-950/40 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-4 text-xs text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all shadow-xl font-bold hover:shadow-2xl hover:scale-[1.01]",
                                                                        field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50"
                                                                    )}
                                                                />
                                                            ) : field.type === 'boolean' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => !field.is_readonly && setFormData({ ...formData, [field.name]: formData[field.name] === 'true' ? 'false' : 'true' })}
                                                                    disabled={field.is_readonly}
                                                                    className={clsx(
                                                                        "flex items-center gap-2.5 w-full h-full px-4 rounded-xl border-2 transition-all shadow-xl outline-none hover:shadow-2xl hover:scale-[1.01] dark:hover:border-blue-500/30",
                                                                        formData[field.name] === 'true'
                                                                            ? "bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400"
                                                                            : "bg-slate-50/40 border-blue-100/50 text-slate-400 dark:bg-slate-900/50 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/20",
                                                                        field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 grayscale"
                                                                    )}
                                                                >
                                                                    <div className={clsx(
                                                                        "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-colors",
                                                                        formData[field.name] === 'true'
                                                                            ? "bg-blue-600 border-blue-600 shadow-sm"
                                                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                                    )}>
                                                                        {formData[field.name] === 'true' && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                                                                    </div>
                                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{formData[field.name] === 'true' ? 'Activado' : 'Desactivado'}</span>
                                                                </button>
                                                            ) : field.type === 'lookup' ? (
                                                                <div className="h-auto">
                                                                    <InteractiveLookup
                                                                        field={{ ...field, is_readonly: field.is_readonly }}
                                                                        value={formData[field.name]}
                                                                        onChange={(val: any) => !field.is_readonly && setFormData(prev => ({ ...prev, [field.name]: val }))}
                                                                        formData={formData}
                                                                        setFormData={setFormData}
                                                                        disabled={field.is_readonly}
                                                                    />
                                                                </div>
                                                            ) : field.type === 'location' ? (
                                                                <div className="h-auto w-full">
                                                                    <GeoSelector
                                                                        value={formData[field.name]}
                                                                        onChange={(val: string) => setFormData(prev => ({ ...prev, [field.name]: val }))}
                                                                    />
                                                                </div>
                                                            ) : field.type === 'consecutivo' ? (
                                                                <input
                                                                    type="text"
                                                                    readOnly
                                                                    value={formData[field.name] || 'XXX-####'}
                                                                    className="w-full h-full bg-slate-100 dark:bg-slate-950/60 border-2 border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 text-sm text-slate-500 dark:text-slate-400 font-bold border-dashed cursor-not-allowed selection:bg-transparent"
                                                                    title="Este valor fue generado automáticamente"
                                                                />
                                                            ) : (
                                                                <input
                                                                    type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                                                                    value={formData[field.name] || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setFormData({ ...formData, [field.name]: (field.max_length && val.length > field.max_length) ? val.slice(0, field.max_length) : val });
                                                                    }}
                                                                    readOnly={field.is_readonly}
                                                                    className={clsx(
                                                                        "w-full h-full bg-slate-50/50 dark:bg-slate-950/40 border-2 border-slate-300 dark:border-slate-700 rounded-2xl px-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all shadow-xl font-bold placeholder:font-normal placeholder:text-slate-400 hover:shadow-2xl hover:scale-[1.01]",
                                                                        field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50"
                                                                    )}
                                                                    placeholder={field.placeholder || `Completar ${field.label || field.name}...`}
                                                                    maxLength={field.max_length}
                                                                />
                                                            )}
                                                        </div>
                                                        {field.description && <p className="text-[10px] text-slate-400 ml-1 mt-1 leading-tight">{field.description}</p>}
                                                    </div>
                                                );
                                            };

                                            return fields.length > 0 ? (
                                                sortedFields.filter(f => !f.parent_accordion_id).map((field) => renderSingleField(field))
                                            ) : (
                                                <p className="text-center py-10 text-slate-400 font-bold uppercase text-[9px] tracking-widest">Sin campos configurados</p>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : activeTab === 'bim' && ifcFile ? (
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px] animate-in slide-in-from-bottom-5 duration-500">
                                    <div className="lg:col-span-3 bg-white dark:bg-[#080a14] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
                                        <IfcViewer
                                            fileUrl={ifcFile.signedUrl}
                                            objectStates={bimStates}
                                            onObjectSelected={(props) => setSelectedBimObject(props)}
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col h-full">
                                            <div className="flex items-center gap-2 mb-6">
                                                <Info className="w-4 h-4 text-indigo-600" />
                                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atributos 4D</h3>
                                            </div>

                                            {selectedBimObject ? (
                                                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo de Objeto</p>
                                                        <h4 className="text-sm font-black text-slate-800 dark:text-white capitalize">{selectedBimObject.type || 'Elemento BIM'}</h4>
                                                    </div>

                                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID Express</p>
                                                        <p className="text-xl font-black text-indigo-600">#{selectedBimObject.id}</p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Actualizar Estado 4D</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {[
                                                                { id: 'completed', label: 'Hecho', color: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                                                                { id: 'processing', label: 'Proceso', color: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700 border-blue-100' },
                                                                { id: 'delayed', label: 'Atraso', color: 'bg-rose-500', bg: 'bg-rose-50 text-rose-700 border-rose-100' },
                                                                { id: 'pending', label: 'Plan', color: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-100' }
                                                            ].map((st) => (
                                                                <button
                                                                    key={st.id}
                                                                    onClick={async () => {
                                                                        await saveBimState(processId, selectedBimObject.id, st.id);
                                                                        setBimStates(prev => ({ ...prev, [selectedBimObject.id]: st.id as any }));
                                                                    }}
                                                                    className={clsx(
                                                                        "flex items-center gap-2 p-2.5 rounded-xl border text-[10px] font-black uppercase transition-all active:scale-95",
                                                                        bimStates[selectedBimObject.id] === st.id ? st.bg + " ring-2 ring-current ring-offset-2 ring-offset-white dark:ring-offset-slate-950" : "bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                                                                    )}
                                                                >
                                                                    <div className={clsx("w-2 h-2 rounded-full", st.color)} />
                                                                    {st.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex-1 overflow-y-auto custom-scrollbar">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Datos Técnicos</p>
                                                        <div className="space-y-2">
                                                            {Object.entries(selectedBimObject.rawProps || {}).map(([k, v]: [string, any]) => (
                                                                <div key={k} className="flex justify-between items-start gap-4 pb-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{k}</span>
                                                                    <span className="text-[9px] font-black text-slate-700 dark:text-slate-200 text-right">{typeof v === 'object' ? v?.value || '-' : String(v)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                                    <Layers className="w-10 h-10 text-slate-300 mb-3" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Seleccione un elemento<br />para inspeccionar</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : activeTab === 'history' ? (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl animate-in fade-in duration-300 overflow-hidden flex flex-col max-h-[700px]">
                                    <div className="flex items-center gap-3 mb-8">
                                        <History className="w-5 h-5 text-slate-400" />
                                        <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Registro de Actividad</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar px-1">
                                        <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-8 space-y-10 py-4">
                                            {history.map((item: any) => (
                                                <div key={item.id} className="relative group">
                                                    <div className={clsx(
                                                        "absolute -left-[41px] top-1.5 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 transition-all group-hover:scale-125 z-10 shadow-sm",
                                                        item.action === 'started' ? "bg-emerald-500" :
                                                            item.action === 'completed' ? "bg-blue-500" :
                                                                item.action === 'commented' ? (item.comment?.includes('❌') ? "bg-rose-500" : "bg-indigo-500") : "bg-slate-400"
                                                    )} />
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.created_at).toLocaleString()}</span>
                                                            <div className={clsx(
                                                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                                                item.action === 'started' ? "bg-emerald-50 text-emerald-600" :
                                                                    item.action === 'completed' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                                                            )}>{item.action}</div>
                                                        </div>
                                                        <p className="text-sm font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors leading-none mb-1">{item.activities?.name || 'Sistema'}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{item.comment}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-black text-slate-500 uppercase">{item.profiles?.full_name?.[0] || 'S'}</div>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.profiles?.full_name || 'Sistema'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {history.length === 0 && (
                                                <div className="text-center py-20">
                                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay registros de historial</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none animate-in slide-in-from-bottom-2 duration-300">
                                    {(() => {
                                        const detail = workflowDetails.find(d => d.id === activeTab);
                                        if (!detail) return null;
                                        const rows = detailRows[activeTab] || [];
                                        const isReadOnly = instance?.activities?.detail_cardinalities?.[activeTab]?.read_only;
                                        const isProtectionEnabled = instance?.activities?.require_save_before_folders;
                                        const isLockedBySave = isProtectionEnabled && !hasSavedOnce;

                                        return (
                                            <div className="space-y-6">
                                                <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                                                            <FolderOpen className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-lg font-black text-slate-800 dark:text-white leading-none mb-1">
                                                                {detail.name}
                                                                {isReadOnly && (
                                                                    <span className="ml-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                                        <Lock className="w-3 h-3" /> Solo Lectura
                                                                    </span>
                                                                )}
                                                                {isLockedBySave && (
                                                                    <span className="ml-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-[10px] font-bold uppercase tracking-widest border border-rose-200 dark:border-rose-500/20">
                                                                        <AlertCircle className="w-3 h-3" /> Bloqueado: Guarde el Formulario Principal
                                                                    </span>
                                                                )}
                                                            </h3>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{detail.description || 'Registros del detalle'}</p>
                                                        </div>
                                                    </div>
                                                    {!isReadOnly && !isLockedBySave && (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                title="Descargar Plantilla Excel"
                                                                onClick={() => handleExportTemplate(detail)}
                                                                className="px-4 py-3.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-3xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                            <label
                                                                title="Importar Excel con Datos"
                                                                className="px-4 py-3.5 bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400 hover:bg-sky-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-3xl transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
                                                            >
                                                                <Upload className="w-4 h-4" />
                                                                <input
                                                                    type="file"
                                                                    accept=".xlsx, .xls, .csv"
                                                                    className="hidden"
                                                                    onChange={(e) => handleImportExcel(e, detail)}
                                                                />
                                                            </label>
                                                            <button
                                                                onClick={() => { setActiveDetailForm(activeTab); setDetailFormData({}); setEditingRowId(null); }}
                                                                className="px-6 py-3.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-3xl transition-all shadow-sm flex items-center gap-2 active:scale-95"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                                Añadir Registro
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {rows.length === 0 ? (
                                                    <div className="py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/30 group">
                                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                            <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                                        </div>
                                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay registros</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">
                                                            {isReadOnly ? 'No hay información en esta carpeta.' : 'Haz clic en Añadir Registro para comenzar'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="border border-slate-100 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
                                                        <table className="w-full text-left bg-white dark:bg-slate-900">
                                                            <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 backdrop-blur-xl">
                                                                <tr>
                                                                    {detail.fields?.map((f: any) => (
                                                                        <th key={f.id} className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">{f.label || f.name}</th>
                                                                    ))}
                                                                    {!isReadOnly && !isLockedBySave && (
                                                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Opciones</th>
                                                                    )}
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                                                {rows.map(row => (
                                                                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                                                        {detail.fields?.map((f: any) => {
                                                                            let displayVal = row.data[f.name];
                                                                            if (f.type === 'currency' && displayVal) {
                                                                                displayVal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(Number(displayVal));
                                                                            } else if (f.type === 'boolean') {
                                                                                displayVal = displayVal === 'true' ? 'Sí' : 'No';
                                                                            }
                                                                            return (
                                                                                <td key={f.id} className="px-6 py-5 text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{displayVal || '-'}</td>
                                                                            );
                                                                        })}
                                                                        {!isReadOnly && !isLockedBySave && (
                                                                            <td className="px-6 py-3 text-right">
                                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button onClick={() => { setActiveDetailForm(activeTab); setDetailFormData(row.data || {}); setEditingRowId(row.id); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                                                                    <button onClick={() => handleDeleteDetailRow(row.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all shadow-sm" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                                                                </div>
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 border-[#0f172a] shadow-xl shadow-slate-200/50 dark:shadow-none mb-10">
                                <div className="space-y-6">
                                    {/* Mostrar observaciones solo si no hay campos definidos */}
                                    {(!loading && fields.length === 0) && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                            <div className="flex items-center gap-2">
                                                <History className="w-4 h-4 text-[#0f172a] dark:text-blue-400" />
                                                <label className="block text-[10px] font-black text-[#0f172a] dark:text-blue-400 uppercase tracking-widest">Observaciones</label>
                                            </div>
                                            <textarea
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                className="w-full bg-slate-50/50 dark:bg-slate-800/50 border-2 border-blue-100/50 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 outline-none min-h-[50px] focus:border-blue-500/50 transition-all font-medium hover:shadow-md hover:border-blue-300 dark:hover:border-blue-800/80"
                                                placeholder="Detalle de la gestión..."
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <GitBranch className="w-4 h-4 text-[#0f172a] dark:text-blue-400" />
                                            <h4 className="text-[10px] font-black text-[#0f172a] dark:text-blue-400 uppercase tracking-[0.2em]">Acciones Disponibles</h4>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {transitions.map((t) => {
                                                const isActive = evaluateCondition(t.condition, formData);

                                                return (
                                                    <div key={t.id} className="relative group/action">
                                                        <button
                                                            disabled={hookLoading || !isActive}
                                                            onClick={() => handleAdvance(t.id)}
                                                            className={clsx(
                                                                "w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-300 group/btn outline-none relative overflow-hidden",
                                                                isActive
                                                                    ? "bg-[#0f172a] border-slate-800 text-white shadow-lg hover:bg-slate-800 active:scale-95 cursor-pointer"
                                                                    : "bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/80 grayscale opacity-60 cursor-not-allowed"
                                                            )}
                                                        >
                                                            {/* Background Glow Effect on Hover */}
                                                            {isActive && (
                                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500" />
                                                            )}

                                                            <div className="flex flex-col items-start gap-0 relative z-10 text-left">
                                                                <span className={clsx(
                                                                    "text-[7px] font-black uppercase tracking-[0.2em] transition-colors duration-300",
                                                                    isActive ? "text-slate-400" : "text-slate-500"
                                                                )}>
                                                                    Pasar a:
                                                                </span>
                                                                <span className={clsx(
                                                                    "text-xs font-black transition-all duration-300 truncate max-w-[160px]",
                                                                    isActive ? "text-white group-hover/btn:translate-x-1" : "text-slate-500"
                                                                )}>
                                                                    {t.target_name}
                                                                </span>
                                                            </div>

                                                            <div className={clsx(
                                                                "w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 relative z-10",
                                                                isActive
                                                                    ? "bg-white/10 text-white group-hover/btn:bg-white group-hover/btn:text-slate-900 group-hover/btn:rotate-[-45deg] group-hover/btn:scale-110"
                                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-300"
                                                            )}>
                                                                {hookLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                                            </div>
                                                        </button>

                                                        {!isActive && t.condition && (
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-2xl opacity-0 group-hover/action:opacity-100 pointer-events-none transition-all duration-300 z-50 translate-y-2 group-hover/action:translate-y-0 border border-slate-700 dark:border-slate-600">
                                                                <div className="flex items-start gap-2">
                                                                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Condición no cumplida</p>
                                                                        <p className="text-[11px] font-bold text-amber-200">
                                                                            {translateCondition(t.condition, fields)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 pt-6">
                                            {/* Los botones han sido movidos a la cabecera superior */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {
                selectedHistoryItem && (
                    <HistoryDetailModal item={selectedHistoryItem} onClose={() => setSelectedHistoryItem(null)} />
                )
            }
            {
                showProcessViewer && (
                    <ProcessViewerModal
                        processId={processId}
                        onClose={() => setShowProcessViewer(false)}
                    />
                )
            }
            {
                activeDetailForm && (
                    <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                            {(() => {
                                const detail = workflowDetails.find(d => d.id === activeDetailForm);
                                return (
                                    <>
                                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 relative z-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                                                    <FolderOpen className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                                                        {editingRowId ? 'Editar' : 'Agregar'} {detail?.name}
                                                    </h3>
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Llene los datos del registro</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setActiveDetailForm(null)} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 rounded-xl transition-all shadow-sm">
                                                <X className="w-5 h-5 text-slate-400 group-hover:text-rose-500" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white dark:bg-slate-950">
                                            <div className={clsx(
                                                "grid gap-6",
                                                detail?.form_columns === 1 ? "grid-cols-1" :
                                                    detail?.form_columns === 3 ? "grid-cols-1 md:grid-cols-3" :
                                                        detail?.form_columns === 4 ? "grid-cols-1 md:grid-cols-4" :
                                                            "grid-cols-1 md:grid-cols-2"
                                            )}>
                                                {detail?.fields?.map((field: any) => (
                                                    <div key={field.id} className={clsx("space-y-2", field.type === 'textarea' ? "col-span-full" : "")}>
                                                        <label className="flex items-center text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] leading-none mb-2 ml-1">
                                                            {field.label || field.name} {field.required && <span className="text-rose-500 ml-1.5 align-top">*</span>}
                                                        </label>
                                                        {field.type === 'textarea' ? (
                                                            <textarea
                                                                value={detailFormData[field.name] || ''}
                                                                onChange={(e) => setDetailFormData({ ...detailFormData, [field.name]: e.target.value })}
                                                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none min-h-[120px] transition-all resize-none shadow-sm font-bold"
                                                                placeholder={`Completar ${field.label || field.name}...`}
                                                            />
                                                        ) : field.type === 'select' ? (
                                                            <div className="relative group">
                                                                <select
                                                                    value={detailFormData[field.name] || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setDetailFormData({ ...detailFormData, [field.name]: (field.max_length && val.length > field.max_length) ? val.slice(0, field.max_length) : val });
                                                                    }}
                                                                    className="w-full h-12 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-xs text-slate-700 dark:text-slate-200 font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none hover:shadow-sm transition-all appearance-none cursor-pointer pr-10"
                                                                >
                                                                    <option value="">Seleccione...</option>
                                                                    {field.options?.map((opt: string) => (
                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                                                            </div>
                                                        ) : field.type === 'boolean' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDetailFormData({ ...detailFormData, [field.name]: detailFormData[field.name] === 'true' ? 'false' : 'true' })}
                                                                className={clsx(
                                                                    "flex items-center gap-3 w-full h-12 px-4 rounded-2xl border-2 transition-all shadow-sm outline-none hover:shadow-md",
                                                                    detailFormData[field.name] === 'true'
                                                                        ? "bg-indigo-50/50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/50 dark:text-indigo-400"
                                                                        : "bg-slate-50/40 border-slate-200 text-slate-500 dark:bg-slate-900/50 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/20"
                                                                )}
                                                            >
                                                                <div className={clsx(
                                                                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shadow-sm",
                                                                    detailFormData[field.name] === 'true'
                                                                        ? "bg-indigo-600 border-indigo-600 text-white"
                                                                        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent"
                                                                )}>
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                </div>
                                                                <span className="text-[11px] font-black uppercase tracking-widest">{detailFormData[field.name] === 'true' ? 'Activado' : 'Desactivado'}</span>
                                                            </button>
                                                        ) : field.type === 'lookup' ? (
                                                            <div className="h-auto w-full pt-1">
                                                                <InteractiveLookup
                                                                    field={field}
                                                                    value={detailFormData[field.name]}
                                                                    onChange={(val: any) => setDetailFormData((prev: any) => ({ ...prev, [field.name]: val }))}
                                                                    formData={detailFormData}
                                                                    setFormData={setDetailFormData as any}
                                                                />
                                                            </div>
                                                        ) : field.type === 'location' ? (
                                                            <div className="h-auto w-full pt-1">
                                                                <GeoSelector
                                                                    value={detailFormData[field.name]}
                                                                    onChange={(val: string) => setDetailFormData(prev => ({ ...prev, [field.name]: val }))}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                                step={field.type === 'currency' ? "0.01" : undefined}
                                                                value={detailFormData[field.name] || ''}
                                                                onChange={(e) => setDetailFormData({ ...detailFormData, [field.name]: e.target.value })}
                                                                className="w-full h-12 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl px-4 text-xs text-slate-700 dark:text-slate-200 font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none hover:shadow-sm transition-all"
                                                                placeholder={`Ingresar ${field.label || field.name}...`}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl relative z-10">
                                            <button onClick={() => setActiveDetailForm(null)} className="px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-all shadow-sm">Cancelar</button>
                                            <button onClick={handleSaveDetailRow} className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 dark:hover:shadow-none transition-all active:scale-95 flex items-center gap-2">
                                                <Save className="w-4 h-4" />
                                                Guardar Registro
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )
            }
        </div>
    );
}

