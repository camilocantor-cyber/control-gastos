import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, GitBranch, Play, Square, AlertCircle, Trash2, ZoomIn, ZoomOut, Maximize, Maximize2, Minimize2, X, Edit2, CheckCircle2, ChevronUp, ChevronDown, Eye, Activity as ActivityIcon, Download, FileUp, Users, Zap, Dices, BarChart2, Inbox, Link, Code, Mail, Settings2, Clock, FolderOpen, Wand2, Lock, Unlock, MessageSquare, Coins, Target, Award, Scale, Globe, FileSignature, HelpCircle, GitMerge, Database } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Workflow, Activity, Transition, ActivityType, FieldDefinition, AutomatedAction, AutomatedActionType, AssignmentType, AssignmentStrategy, Department, Position } from '../types';
import { exportToBPMN, importFromBPMN } from '../utils/bpmnConverter';
import { translateCondition } from '../utils/conditions';

import { useWorkflowModeler } from '../hooks/useWorkflowModeler';
import { supabase } from '../lib/supabase';

import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { SOPGenerator } from './SOPGenerator';
import { FormPreviewModal } from './FormPreviewModal';
import { DetailsManagerModal } from './DetailsManagerModal';
import { AIWorkflowGeneratorModal } from './AIWorkflowGeneratorModal';
import { useAuth } from '../hooks/useAuth';
import { TemplateManager } from './TemplateManager';
import { useTemplateUpload } from '../hooks/useTemplateUpload';
import { FlowCanvas } from './FlowCanvas';



function FormulaValidationFeedback({ value, availableFields }: { value: string, availableFields: string[] }) {
    if (!value) return null;
    const matches = value.match(/\{\{([^}]+)\}\}/g);
    if (!matches || matches.length === 0) return null;

    const uniqueMatches = Array.from(new Set(matches));

    return (
        <div className="flex flex-wrap gap-1 mt-1.5">
            {uniqueMatches.map((m, i) => {
                const varName = m.slice(2, -2).trim();
                const isValid = availableFields.includes(varName);
                return (
                    <span
                        key={i}
                        className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 cursor-help",
                            isValid
                                ? "bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : "bg-red-100/50 text-red-600 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800"
                        )}
                        title={isValid ? "Variable válida" : "Esta variable no existe en el flujo de trabajo"}
                    >
                        {varName} {isValid ? <CheckCircle2 className="w-2 h-2" /> : <AlertCircle className="w-2 h-2" />}
                    </span>
                );
            })}
        </div>
    );
}

interface WorkflowBuilderProps {
    workflow: Workflow;
    onBack: () => void;
    onOpenHelp: (articleId: string) => void;
}

export function WorkflowBuilder({ workflow, onBack, onOpenHelp }: WorkflowBuilderProps) {
    const { user } = useAuth();
    const currentRole = user?.organization_id ? user?.available_organizations?.find((o: any) => o.id === user.organization_id)?.role : user?.role || 'viewer';
    const isViewer = currentRole === 'viewer';
    const isAdmin = currentRole === 'admin' || currentRole === 'super_admin';
    const isReadOnly = (workflow.organization_id !== user?.organization_id && currentRole !== 'super_admin') || isViewer;
    const { avgResolutionTimeByWorkflow } = useDashboardAnalytics();

    // Filter stats for this specific workflow
    const avgTime = avgResolutionTimeByWorkflow.find(w => w.workflow_name === workflow.name)?.avg_hours || 0;

    const {
        activities,
        setActivities,
        transitions,
        setTransitions,
        details,
        setDetails,
        loading,
        saving,
        saveModel,
        reload
    } = useWorkflowModeler(workflow.id);


    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);
    const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null);
    const [showSOPGenerator, setShowSOPGenerator] = useState(false);
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [showFormPreview, setShowFormPreview] = useState(false);
    const [showPropertiesModal, setShowPropertiesModal] = useState(false);
    const [showWorkflowConfig, setShowWorkflowConfig] = useState(false);
    const [showDetailsManager, setShowDetailsManager] = useState(false);
    const [workflowName, setWorkflowName] = useState(workflow.name);
    const [workflowDesc, setWorkflowDesc] = useState(workflow.description || '');
    const [workflowTemplate, setWorkflowTemplate] = useState(workflow.name_template || '');
    const [workflowStatus, setWorkflowStatus] = useState(workflow.status);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
    const currentActivity = activities.find(a => a.id === selectedActivityId);

    // Delete confirmation dialog
    const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
    const [creatingVersion, setCreatingVersion] = useState(false);
    const [selectedPreviewFieldId, setSelectedPreviewFieldId] = useState<string | null>(null);
    const [availableWorkflows, setAvailableWorkflows] = useState<Workflow[]>([]);

    // Document Template Generation
    const { loadTemplates } = useTemplateUpload();
    const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([]);

    useEffect(() => {
        if (!isTemplateManagerOpen && workflow.id) {
            loadTemplates(workflow.id).then(setWorkflowTemplates);
        }
    }, [isTemplateManagerOpen, workflow.id, loadTemplates]);

    useEffect(() => {
        const fetchWorkflows = async () => {
            const { data, error } = await supabase
                .from('workflows')
                .select('*')
                .eq('organization_id', workflow.organization_id)
                .neq('id', workflow.id); // Don't allow calling itself as subprocess for now (avoid infinite loops unless intended)
            if (!error && data) {
                setAvailableWorkflows(data);
            }
        };
        fetchWorkflows();
    }, [workflow.organization_id, workflow.id]);
    const handleExportBPMN = () => {
        const xml = exportToBPMN(workflow.name, activities, transitions);
        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${workflow.name.replace(/\s+/g, '_')}.bpmn`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportBPMN = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const xml = event.target?.result as string;
            const { activities: importedActivities, transitions: importedTransitions } = importFromBPMN(xml);

            // Set workflow_id to current workflow
            const activitiesWithId = importedActivities.map(a => ({ ...a, workflow_id: workflow.id }));
            const transitionsWithId = importedTransitions.map(t => ({ ...t, workflow_id: workflow.id }));

            setActivities(activitiesWithId);
            setTransitions(transitionsWithId);
        };
        reader.readAsText(file);
    };

    // Zoom and Pan State
    const [zoom, setZoom] = useState(0.7);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const [activeTab, setActiveTab] = useState<'general' | 'fields' | 'transitions' | 'assignment' | 'actions' | 'details' | 'config'>('general');
    const [lookupData, setLookupData] = useState<{
        departments: Department[],
        positions: Position[],
        users: { id: string, email: string, full_name?: string }[],
        dbTables: string[]
    }>({ departments: [], positions: [], users: [], dbTables: [] });
    const [tableColumnsMap, setTableColumnsMap] = useState<Record<string, string[]>>({});
    const [editingActionId, setEditingActionId] = useState<string | null>(null);
    const [testingEmail, setTestingEmail] = useState<boolean>(false);

    useEffect(() => {
        const fetchLookupData = async () => {
            const [depts, positions, users, tablesRes] = await Promise.all([
                supabase.from('departments').select('id, name').eq('organization_id', workflow.organization_id).order('name'),
                supabase.from('positions').select('id, title, department_id').eq('organization_id', workflow.organization_id).order('title'),
                supabase.from('profiles').select('id, email, full_name').eq('organization_id', workflow.organization_id).order('email'),
                supabase.rpc('get_database_tables')
            ]);
            setLookupData({
                departments: (depts.data as any[]) || [],
                positions: (positions.data as any[]) || [],
                users: (users.data as any[]) || [],
                dbTables: tablesRes.data ? (tablesRes.data as any[]).map(t => t.table_name) : []
            });

            // Fetch columns for any existing database lookups on load
            if (activities) {
                activities.forEach(a => {
                    a.fields?.forEach(f => {
                        if (f.type === 'lookup' && f.lookup_config?.type === 'database' && f.lookup_config.table_name) {
                            fetchColumnsForTable(f.lookup_config.table_name);
                        }
                    });
                });
            }
        };
        fetchLookupData();
    }, [activities]); // Added activities dependency to check initial state

    // Load columns for a given table when selected
    async function fetchColumnsForTable(tableName: string) {
        if (!tableName || tableColumnsMap[tableName]) return;
        try {
            const { data } = await supabase.rpc('get_table_columns', { p_table_name: tableName });
            if (data) {
                setTableColumnsMap(prev => ({ ...prev, [tableName]: data.map((c: any) => c.column_name) }));
            }
        } catch (err) {
            console.error('Error fetching columns linking to', tableName, err);
        }
    }

    const [isFocusMode, setIsFocusMode] = useState(false);

    // Global Hotkeys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Save: Ctrl + S or Cmd + S
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
            // Delete selected element: Delete or Backspace
            // Let's only do it if the active element is not an input or textarea
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeTag = document.activeElement?.tagName.toLowerCase();
                const isTyping = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select';
                if (!isTyping) {
                    if (selectedActivityId) {
                        e.preventDefault();
                        deleteActivity(selectedActivityId);
                    } else if (selectedTransitionId) {
                        e.preventDefault();
                        deleteTransition(selectedTransitionId);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedActivityId, selectedTransitionId]);


    const handleDragStartToolbox = (e: React.DragEvent, type: ActivityType) => {
        e.dataTransfer.setData('activityType', type);
        setSelectedActivityId(null);
        setSelectedTransitionId(null);
        setConnectionSourceId(null);
    };

    const handleImportTableSchema = async () => {
        if (!selectedActivityId) return;
        const act = activities.find(a => a.id === selectedActivityId);
        if (!act || !act.sync_table) {
            alert("Por favor defina una tabla para sincronizar primero.");
            return;
        }

        try {
            const { data, error } = await supabase.rpc('get_table_schema', { target_table: act.sync_table });
            if (error) throw error;
            if (!data || data.length === 0) {
                alert(`No se encontraron columnas para la tabla ${act.sync_table}`);
                return;
            }

            const currentFields = act.fields || [];
            let maxOrder = currentFields.length > 0 ? Math.max(...currentFields.map(f => Number(f.order_index) || 0)) : 0;

            const newFields: FieldDefinition[] = data.map((col: any) => {
                maxOrder++;
                let fieldType: any = 'text';

                // Map Postgres types to FieldType
                const dt = col.data_type.toLowerCase();
                if (dt.includes('int') || dt.includes('numeric') || dt.includes('decimal') || dt.includes('float') || dt.includes('double')) fieldType = 'number';
                else if (dt.includes('bool')) fieldType = 'boolean';
                else if (dt.includes('date') || dt.includes('time')) fieldType = 'date';

                return {
                    id: crypto.randomUUID(),
                    activity_id: selectedActivityId,
                    name: col.column_name,
                    label: col.column_name.charAt(0).toUpperCase() + col.column_name.slice(1).replace(/_/g, ' '),
                    type: fieldType,
                    required: !col.is_nullable,
                    order_index: maxOrder,
                    db_column: col.column_name,
                    db_type: col.data_type,
                    db_nullable: col.is_nullable,
                    db_is_primary_key: col.is_primary_key
                };
            });

            if (confirm(`Se importarán ${newFields.length} campos de la tabla ${act.sync_table}. ¿Continuar?`)) {
                setActivities(prev => prev.map(a =>
                    a.id === selectedActivityId ? { ...a, fields: [...currentFields, ...newFields] } : a
                ));
            }

        } catch (err: any) {
            console.error('Error importing schema:', err);
            alert('Error al importar el esquema de la tabla: ' + err.message);
        }
    };


    const handleAddField = () => {
        if (!selectedActivityId) return;
        const newField: FieldDefinition = {
            id: crypto.randomUUID(),
            activity_id: selectedActivityId,
            name: 'nuevo_campo',
            label: 'Nuevo Campo',
            type: 'text',
            required: false,
            order_index: (activities.find(a => a.id === selectedActivityId)?.fields?.length || 0)
        };
        setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: [...(a.fields || []), newField] } : a));
    };

    const handleUpdateField = (fieldId: string, updates: Partial<FieldDefinition>) => {
        if (!selectedActivityId) return;
        setActivities(prev => prev.map(a =>
            a.id === selectedActivityId
                ? { ...a, fields: (a.fields || []).map(f => f.id === fieldId ? { ...f, ...updates } : f) }
                : a
        ));
    };

    const handleDeleteField = (fieldId: string) => {
        if (!selectedActivityId) return;
        setActivities(prev => prev.map(a =>
            a.id === selectedActivityId
                ? { ...a, fields: (a.fields || []).filter(f => f.id !== fieldId) }
                : a
        ));
    };

    const handleReorderFields = (newFields: FieldDefinition[]) => {
        if (!selectedActivityId) return;
        setActivities(prev => prev.map(a =>
            a.id === selectedActivityId
                ? { ...a, fields: newFields }
                : a
        ));
    };





    const handleNodeClick = (id: string, isDoubleClick: boolean = false) => {
        if (connectionSourceId) {
            if (connectionSourceId !== id) {
                // Create new transition
                const newTransition: Transition = {
                    id: crypto.randomUUID(),
                    workflow_id: workflow.id,
                    source_id: connectionSourceId,
                    target_id: id,
                };

                // Prevent duplicates
                const exists = transitions.some(t => t.source_id === connectionSourceId && t.target_id === id);
                if (!exists) {
                    setTransitions(prev => [...prev, newTransition]);
                }
            }
            setConnectionSourceId(null);
        } else {
            setSelectedActivityId(id);
            setSelectedTransitionId(null);
            setEditingActionId(null); // Reset action editing state
            setSelectedPreviewFieldId(null); // Ensure no specific field is focused
            if (isDoubleClick) {
                setShowFormPreview(true);
            }
        }
    };

    function deleteActivity(id: string) {
        // If workflow is published (active), block and suggest new version
        if (workflow.status === 'active') {
            setDeletePendingId(id);
            return;
        }
        // Draft: ask for simple confirmation
        setDeletePendingId(id);
    }

    function confirmDeleteActivity() {
        if (!deletePendingId) return;
        setActivities(prev => prev.filter(a => a.id !== deletePendingId));
        setTransitions(prev => prev.filter(t => t.source_id !== deletePendingId && t.target_id !== deletePendingId));
        if (selectedActivityId === deletePendingId) setSelectedActivityId(null);
        if (connectionSourceId === deletePendingId) setConnectionSourceId(null);
        setDeletePendingId(null);
    }

    async function handleCreateNewVersion() {
        setCreatingVersion(true);
        try {
            // 1. Get current version number
            const currentVersion = parseFloat(workflow.version || '1.0');
            const newVersion = (currentVersion + 0.1).toFixed(1);

            // 2. Duplicate workflow as draft
            const { data: newWf, error: wfError } = await supabase
                .from('workflows')
                .insert({
                    organization_id: workflow.organization_id,
                    name: `${workflow.name} v${newVersion}`,
                    description: workflow.description,
                    status: 'draft',
                    version: newVersion,
                    parent_id: workflow.id,
                    name_template: workflow.name_template,
                    category_id: workflow.category_id || null,
                    created_by: user?.id
                })
                .select()
                .single();

            if (wfError) throw wfError;

            // 3. Duplicate activities
            const activityIdMap: Record<string, string> = {};
            for (const act of activities) {
                const newId = crypto.randomUUID();
                activityIdMap[act.id] = newId;
                const { fields: _f, ...actBase } = act as any;
                await supabase.from('activities').insert({
                    ...actBase,
                    id: newId,
                    workflow_id: newWf.id,
                });
                // Duplicate fields
                if (act.fields && act.fields.length > 0) {
                    await supabase.from('activity_field_definitions').insert(
                        act.fields.map(f => ({ ...f, id: crypto.randomUUID(), activity_id: newId }))
                    );
                }
            }

            // 4. Duplicate transitions with remapped IDs
            if (transitions.length > 0) {
                await supabase.from('transitions').insert(
                    transitions.map(t => ({
                        ...t,
                        id: crypto.randomUUID(),
                        workflow_id: newWf.id,
                        source_id: activityIdMap[t.source_id] || t.source_id,
                        target_id: activityIdMap[t.target_id] || t.target_id,
                    }))
                );
            }

            setDeletePendingId(null);
            toast.success(`Nueva versión v${newVersion} creada como borrador. Abriendo...`);
            setTimeout(() => onBack(), 1500);
        } catch (err: any) {
            toast.error('Error al crear la nueva versión: ' + err.message);
        } finally {
            setCreatingVersion(false);
        }
    }

    function deleteTransition(id: string) {
        setTransitions(prev => prev.filter(t => t.id !== id));
    }

    async function handleSave(currentActs?: Activity[], currentTrans?: Transition[]) {
        const { success, error } = await saveModel(currentActs || activities, currentTrans || transitions);
        if (success) {
            toast.success('Flujo guardado con éxito');
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
        } else {
            toast.error('Error al guardar el flujo: ' + (error || 'Desconocido'));
            // Reload to sync UI with DB since save failed (e.g. deletion blocked by constraints)
            reload();
        }
    }

    const handlePublish = async () => {
        const { success } = await saveModel(activities, transitions);
        if (success) {
            const { error: pubError } = await supabase
                .from('workflows')
                .update({ status: 'active' })
                .eq('id', workflow.id);

            if (pubError) {
                toast.error('Error al publicar: ' + pubError.message);
            } else {
                toast.success('¡Flujo publicado con éxito! Ahora puedes iniciar trámites.');
                onBack();
            }
        } else {
            toast.error('Error al publicar el flujo.');
        }
    };



    const handleAutoLayout = () => {
        if (activities.length === 0) return;

        const GAP_X = 320;
        const GAP_Y = 160;
        const ranks: Record<string, number> = {};
        const visited = new Set<string>();

        // 1. Find root nodes (mostly 'start' type)
        const roots = activities.filter(a => a.type === 'start');
        const worklist = roots.length > 0 ? roots.map(r => ({ id: r.id, rank: 0 })) : [{ id: activities[0].id, rank: 0 }];

        // 2. Simple Rank Assignment (BFS)
        let head = 0;
        while (head < worklist.length) {
            const { id, rank } = worklist[head++];
            if (visited.has(id)) continue;
            visited.add(id);
            ranks[id] = Math.max(ranks[id] || 0, rank);

            const children = transitions.filter(t => t.source_id === id).map(t => t.target_id);
            children.forEach(childId => {
                worklist.push({ id: childId, rank: rank + 1 });
            });
        }

        // Handle disconnected nodes
        activities.forEach(a => {
            if (!visited.has(a.id)) ranks[a.id] = 0;
        });

        // 3. Group by ranks and layout
        const nodesByRank: Record<number, string[]> = {};
        Object.entries(ranks).forEach(([id, rank]) => {
            if (!nodesByRank[rank]) nodesByRank[rank] = [];
            nodesByRank[rank].push(id);
        });

        const newActivities = activities.map(a => {
            const rank = ranks[a.id] || 0;
            const idx = nodesByRank[rank].indexOf(a.id);
            const offsetInRank = idx - (nodesByRank[rank].length - 1) / 2;

            return {
                ...a,
                x_pos: 100 + rank * GAP_X,
                y_pos: 300 + offsetInRank * GAP_Y
            };
        });

        setActivities(newActivities);
        setZoom(0.85); // Adjust zoom to see the whole flow
        setOffset({ x: 50, y: 50 });
    };

    const handleAddAction = (type: AutomatedActionType) => {
        if (!selectedActivityId) return;
        const newAction: AutomatedAction = {
            id: crypto.randomUUID(),
            type,
            name: `Nueva Acción ${type.toUpperCase() === 'FINANCE' ? 'Financiera' : type.toUpperCase() === 'EMAIL' ? 'Correo' : type.toUpperCase()}`,
            config: {}
        };
        setActivities(prev => prev.map(a =>
            a.id === selectedActivityId
                ? { ...a, actions: [...(a.actions || []), newAction] }
                : a
        ));
        setEditingActionId(newAction.id);
    };

    const handleUpdateAction = (actionId: string, updates: Partial<AutomatedAction>) => {
        if (!selectedActivityId) return;
        setActivities(prev => prev.map(a =>
            a.id === selectedActivityId
                ? { ...a, actions: (a.actions || []).map(act => act.id === actionId ? { ...act, ...updates } : act) }
                : a
        ));
    };

    const handleUpdateActionConfig = (actionId: string, configUpdates: Partial<AutomatedAction['config']>) => {
        if (!selectedActivityId) return;
        setActivities(prev => prev.map(a =>
            a.id === selectedActivityId
                ? {
                    ...a,
                    actions: (a.actions || []).map(act =>
                        act.id === actionId
                            ? { ...act, config: { ...act.config, ...configUpdates } }
                            : act
                    )
                }
                : a
        ));
    };

    const handleRemoveAction = (actionId: string) => {
        if (!selectedActivityId) return;
        setActivities(prev => prev.map(a =>
            a.id === selectedActivityId
                ? { ...a, actions: (a.actions || []).filter(act => act.id !== actionId) }
                : a
        ));
        if (editingActionId === actionId) setEditingActionId(null);
    };

    const handleTestEmail = async (action: AutomatedAction) => {
        if (!action.config?.email_to) {
            toast.error("Debes configurar al menos un destinatario (Para)");
            return;
        }

        try {
            setTestingEmail(true);
            const dummyVars = (text: string | undefined, fallback: string) => {
                if (!text) return '';
                return text.replace(/\{\{([^}]+)\}\}/g, fallback);
            };

            const emailPayload = {
                from: dummyVars(action.config?.email_from, "BPM@resend.dev"),
                to: dummyVars(action.config?.email_to, "prueba@resend.dev"),
                cc: dummyVars(action.config?.email_cc, ""),
                subject: dummyVars(action.config?.email_subject, "Prueba") + " [PRUEBA]",
                body: dummyVars(action.config?.email_body || "Esto es un correo de prueba.", "[VARIABLE DE PRUEBA]"),
                smtp: {
                    host: dummyVars(action.config?.email_smtp_host, ""),
                    port: dummyVars(action.config?.email_smtp_port, ""),
                    user: dummyVars(action.config?.email_smtp_user, ""),
                    pass: dummyVars(action.config?.email_smtp_pass, ""),
                    secure: action.config?.email_smtp_secure ?? true
                }
            };

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(emailPayload)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error desconocido');

            toast.success("¡Correo de prueba enviado con éxito!");
        } catch (error: any) {
            console.error('Test Email Failed:', error);
            toast.error(`Error al enviar prueba: ${error.message}`);
        } finally {
            setTestingEmail(false);
        }
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-140px)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col gap-6 animate-in fade-in duration-500 pb-4">
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-800 shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => onOpenHelp('workflows-intro')}
                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50 shadow-sm"
                        title="Ayuda del Constructor"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{workflowName}</h2>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm transition-colors">
                                <ActivityIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{avgTime}h eficiencia</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {saving && (
                        <span className="text-xs font-bold text-slate-400 animate-pulse">Guardando...</span>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className={cn(
                                "p-2.5 rounded-xl border transition-all shadow-sm active:scale-95",
                                isFocusMode
                                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 dark:shadow-none"
                                    : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600"
                            )}
                            title={isFocusMode ? "Salir de Modo Focus" : "Modo Focus"}
                        >
                            {isFocusMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>

                        {!isFocusMode && !isReadOnly && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleSave()}
                                    disabled={saving}
                                    title={showSaveSuccess ? "¡Guardado con éxito!" : "Guardar Diseño"}
                                    className={cn(
                                        "p-2.5 rounded-xl border transition-all shadow-sm active:scale-95 disabled:opacity-50",
                                        showSaveSuccess
                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-none'
                                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-emerald-600'
                                    )}
                                >
                                    {showSaveSuccess ? (
                                        <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" />
                                    ) : (
                                        <Save className={cn("w-5 h-5", saving && "animate-pulse")} />
                                    )}
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={saving}
                                    title="Publicar Flujo (Activar)"
                                    className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                </button>

                                <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 mx-2" />

                                <input
                                    type="file"
                                    accept=".bpmn,.xml"
                                    onChange={handleImportBPMN}
                                    className="hidden"
                                    ref={setFileInputRef}
                                />
                                <button
                                    onClick={() => fileInputRef?.click()}
                                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                                    title="Importar BPMN 2.0"
                                >
                                    <FileUp className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleExportBPMN}
                                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-emerald-600 rounded-xl transition-all"
                                    title="Exportar BPMN 2.0"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowSOPGenerator(true)}
                                    className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"
                                    title="Generar Manual (SOP) con IA"
                                >
                                    <Zap className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setIsTemplateManagerOpen(true)}
                                    className="p-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-xl transition-all relative"
                                    title="Administrar Plantillas Documentales (.docx)"
                                >
                                    <FileSignature className="w-5 h-5" />
                                    {workflowTemplates.length > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-white dark:border-slate-900">
                                            {workflowTemplates.length}
                                        </span>
                                    )}
                                </button>
                                <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 mx-2" />
                                <button
                                    onClick={() => setShowAIGenerator(true)}
                                    className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none flex items-center gap-2 hover:-translate-y-0.5"
                                    title="Arquitecto IA (Generar Flujo)"
                                >
                                    <Wand2 className="w-5 h-5" />
                                    <span className="text-xs font-bold hidden md:inline tracking-wider">IA</span>
                                </button>
                            </div>
                        )}
                    </div>


                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden relative">
                {/* Toolbox */}
                {!isFocusMode && !isReadOnly && (
                    <aside className="w-52 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 shadow-sm overflow-y-auto animate-in slide-in-from-left duration-300 transition-colors">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Herramientas</h3>
                            </div>
                            <div className="space-y-1.5">
                                <ToolboxItem icon={Play} label="Inicio" color="emerald" onDragStart={(e) => handleDragStartToolbox(e, 'start')} />
                                <ToolboxItem icon={Square} label="Tarea" color="blue" onDragStart={(e) => handleDragStartToolbox(e, 'task')} />
                                <ToolboxItem icon={AlertCircle} label="Decisión" color="orange" onDragStart={(e) => handleDragStartToolbox(e, 'decision')} />
                                <ToolboxItem icon={GitBranch} label="Subproceso" color="purple" onDragStart={(e) => handleDragStartToolbox(e, 'subprocess')} />
                                <ToolboxItem icon={Clock} label="Espera (Wait)" color="amber" onDragStart={(e) => handleDragStartToolbox(e, 'wait')} />
                                <ToolboxItem icon={GitMerge} label="Sincronía" color="violet" onDragStart={(e) => handleDragStartToolbox(e, 'sync')} />
                                <ToolboxItem icon={Square} label="Fin" color="rose" onDragStart={(e) => handleDragStartToolbox(e, 'end')} />
                            </div>
                        </div>


                    </aside>
                )}

                {/* Canvas Area */}
                <section className="flex-1 flex bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-inner group">
                    <FlowCanvas
                        activities={activities}
                        transitions={transitions}
                        zoom={zoom}
                        setZoom={setZoom}
                        offset={offset}
                        setOffset={setOffset}
                        selectedActivityId={selectedActivityId}
                        selectedTransitionId={selectedTransitionId}
                        connectionSourceId={connectionSourceId}
                        onNodeClick={(id: string, isDoubleClick: boolean) => {
                            handleNodeClick(id, isDoubleClick);
                        }}
                        onNodeDrag={(id: string, x: number, y: number) => {
                            setActivities(prev => prev.map(a => a.id === id ? { ...a, x_pos: x, y_pos: y } : a));
                        }}
                        onCanvasClick={() => {
                            setSelectedActivityId(null);
                            setSelectedTransitionId(null);
                            setConnectionSourceId(null);
                            setEditingActionId(null);
                        }}
                        onAddTransition={(source: string, target: string) => {
                            const newTransition: Transition = {
                                id: crypto.randomUUID(),
                                workflow_id: workflow.id,
                                source_id: source,
                                target_id: target,
                            };
                            setTransitions(prev => [...prev, newTransition]);
                            setConnectionSourceId(null);
                        }}
                        onDrop={(type: string, x: number, y: number) => {
                            const newActivity: Activity = {
                                id: crypto.randomUUID(),
                                workflow_id: workflow.id,
                                type: type as ActivityType,
                                name: type.toUpperCase(),
                                x_pos: x,
                                y_pos: y,
                                fields: [],
                                actions: []
                            };
                            setActivities(prev => [...prev, newActivity]);
                        }}
                        onDelete={(id: string) => deleteActivity(id)}
                        gridSize={20}
                    />

                    {activities.length === 0 && !isFocusMode && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center max-w-xs mx-auto transition-transform group-hover:scale-105 duration-300 pointer-events-none">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <GitBranch className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">Lienzo Vacío</h4>
                            <p className="text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
                                Arrasta actividades desde la caja de herramientas para empezar a diseñar tu flujo de trabajo.
                            </p>
                        </div>
                    )}

                    {/* Navigation Controls */}
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 ring-1 ring-black/5"
                    >
                        <button onClick={() => setZoom(z => Math.min(z * 1.2, 3))} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-95" title="Acercar"><ZoomIn className="w-4 h-4" /></button>
                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <span className="text-[10px] font-black w-10 text-center text-slate-500 dark:text-slate-400">{Math.round(zoom * 100)}%</span>
                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-95" title="Alejar"><ZoomOut className="w-4 h-4" /></button>
                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl transition-all shadow-sm active:scale-95" title="Centrar Vista"><Maximize className="w-4 h-4" /></button>

                        {!isReadOnly && (
                            <>
                                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                                <button
                                    disabled={!selectedActivityId}
                                    onClick={() => {
                                        if (selectedActivityId) {
                                            setConnectionSourceId(selectedActivityId);
                                            setSelectedActivityId(null);
                                        }
                                    }}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all flex items-center gap-2 group/conn active:scale-95",
                                        selectedActivityId
                                            ? "bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg hover:emerald-600"
                                            : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                    )}
                                    title="Conectar Actividades"
                                >
                                    <Link className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/conn:max-w-[100px] transition-all duration-300">Conectar</span>
                                </button>
                            </>
                        )}

                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button
                            disabled={!selectedActivityId}
                            onClick={() => {
                                if (selectedActivityId) setShowFormPreview(true);
                            }}
                            className={cn(
                                "p-2.5 rounded-xl transition-all flex items-center gap-2 group/preview active:scale-95",
                                selectedActivityId
                                    ? "bg-amber-500 text-white shadow-amber-500/20 shadow-lg hover:bg-amber-600"
                                    : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                            )}
                            title="Vista Previa del Formulario"
                        >
                            <Eye className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/preview:max-w-[100px] transition-all duration-300">
                                Previsualizar
                            </span>
                        </button>

                        {!isReadOnly && (
                            <>
                                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                                <button
                                    disabled={!selectedActivityId && !selectedTransitionId}
                                    onClick={() => setShowPropertiesModal(true)}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all flex items-center gap-2 group/edit active:scale-95",
                                        (selectedActivityId || selectedTransitionId)
                                            ? "bg-blue-600 text-white shadow-blue-500/20 shadow-lg hover:bg-blue-700"
                                            : "bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-700 cursor-not-allowed"
                                    )}
                                    title="Editar Propiedades"
                                >
                                    <Settings2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/edit:max-w-[100px] transition-all duration-300">Propiedades</span>
                                </button>
                                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                                <button onClick={handleAutoLayout} className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all flex items-center gap-2 group/layout active:scale-95" title="Auto-Organizar">
                                    <GitBranch className="w-4 h-4 rotate-180" />
                                    <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/layout:max-w-[100px] transition-all duration-300">Organizar</span>
                                </button>

                                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                                <button
                                    onClick={() => setShowDetailsManager(true)}
                                    className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-2 group/details active:scale-95 shadow-sm"
                                    title="Gestor de Carpetas (Maestro-Detalle)"
                                >
                                    <FolderOpen className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/details:max-w-[150px] transition-all duration-300 whitespace-nowrap">Gestor de Carpetas</span>
                                </button>

                                <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                                <button
                                    onClick={() => setShowWorkflowConfig(true)}
                                    className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-2 group/wfconfig active:scale-95 shadow-sm"
                                    title="Configuración General del Flujo"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/wfconfig:max-w-[100px] transition-all duration-300 whitespace-nowrap">Ajustes Globlales</span>
                                </button>
                            </>
                        )}
                    </div> {/* Closes navigation controls div */}

                    {!isReadOnly && (
                        <>
                            {/* Details Manager Modal */}
                            {showDetailsManager && (
                                <DetailsManagerModal
                                    workflowId={workflow.id}
                                    details={details}
                                    setDetails={setDetails}
                                    onClose={() => setShowDetailsManager(false)}
                                    onSave={handleSave}
                                    onOpenHelp={onOpenHelp}
                                />
                            )}

                            {/* AI Generator Modal */}
                            <AIWorkflowGeneratorModal
                                isOpen={showAIGenerator}
                                onClose={() => setShowAIGenerator(false)}
                                onGenerate={(generatedData, method) => {
                                    if (method === 'replace') {
                                        setActivities(generatedData.activities);
                                        setTransitions(generatedData.transitions);
                                    } else {
                                        // Append
                                        setActivities(prev => [...prev, ...generatedData.activities]);
                                        setTransitions(prev => [...prev, ...generatedData.transitions]);
                                    }
                                    // Auto layout to organize the newly generated flow
                                    setTimeout(() => handleAutoLayout(), 100);
                                }}
                            />

                            {/* Properties Modal Overlay */}
                            {showPropertiesModal && (selectedActivityId || selectedTransitionId) && (
                                <>
                                    <div
                                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] animate-in fade-in duration-300"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-8 pointer-events-none">
                                        <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden pointer-events-auto border border-white dark:border-slate-800 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
                                            {/* Modal Header */}
                                            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/20">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                                                        selectedActivityId ? "bg-blue-600 text-white" : "bg-indigo-600 text-white"
                                                    )}>
                                                        {selectedActivityId ? <ActivityIcon className="w-6 h-6" /> : <GitBranch className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                                            {selectedActivityId ? 'Propiedades de Actividad' : 'Reglas de Transición'}
                                                        </h2>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{selectedActivityId ? 'Configuración y Automatización' : 'Lógica de Flujo'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => {
                                                            if (selectedActivityId) {
                                                                deleteActivity(selectedActivityId);
                                                                setShowPropertiesModal(false);
                                                            } else if (selectedTransitionId) {
                                                                if (confirm('¿Estás seguro de eliminar esta transición?')) {
                                                                    setTransitions(prev => prev.filter(t => t.id !== selectedTransitionId));
                                                                    setShowPropertiesModal(false);
                                                                    handleSave(activities, transitions.filter(t => t.id !== selectedTransitionId));
                                                                }
                                                            }
                                                        }}
                                                        className="flex items-center gap-2 px-4 py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-xl font-black hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all uppercase text-[10px] tracking-widest active:scale-95"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        {selectedActivityId ? 'Eliminar Actividad' : 'Eliminar Transición'}
                                                    </button>

                                                    <button
                                                        onClick={() => handleSave()}
                                                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-blue-200 dark:shadow-none active:scale-95 text-sm uppercase tracking-widest"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                        Aplicar Cambios
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            // Don't deselect, just close modal
                                                            setShowPropertiesModal(false);
                                                            setEditingActionId(null);
                                                        }}
                                                        className="p-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                                    >
                                                        <X className="w-6 h-6" />
                                                    </button>
                                                </div>
                                            </div>

                                            {selectedActivityId ? (
                                                <>
                                                    {/* Activity Details Tabs */}
                                                    <div className="flex gap-2 px-8 pt-4 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/50">
                                                        {[
                                                            { id: 'general', label: 'General', icon: Edit2 },
                                                            { id: 'config', label: 'Configuración', icon: Settings2 },
                                                            { id: 'fields', label: 'Campos', icon: Plus },
                                                            { id: 'assignment', label: 'Asignación', icon: Users },
                                                            { id: 'actions', label: 'Acciones', icon: Zap },
                                                            { id: 'details', label: 'Detalles', icon: FolderOpen },
                                                            { id: 'transitions', label: 'Salidas', icon: GitBranch },
                                                        ].map(tab => (
                                                            <button
                                                                key={tab.id}
                                                                onClick={() => setActiveTab(tab.id as any)}
                                                                className={cn(
                                                                    "flex items-center gap-2 px-5 py-3 font-black text-[10px] uppercase tracking-widest transition-all relative",
                                                                    activeTab === tab.id
                                                                        ? "text-blue-600 dark:text-blue-400"
                                                                        : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                                                )}
                                                            >
                                                                <tab.icon className="w-3.5 h-3.5" />
                                                                {tab.label}
                                                                {activeTab === tab.id && (
                                                                    <div className="absolute bottom-0 left-5 right-5 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-in fade-in zoom-in duration-300" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="p-8 overflow-y-auto flex-1 bg-white dark:bg-slate-950 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                                        {activeTab === 'general' && (
                                                            <div className="space-y-8 animate-fadeIn max-w-2xl">
                                                                <div>
                                                                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Nombre de la Actividad</label>
                                                                    <input
                                                                        type="text"
                                                                        value={activities.find(a => a.id === selectedActivityId)?.name || ''}
                                                                        onChange={(e) => {
                                                                            const newName = e.target.value;
                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, name: newName } : a));
                                                                        }}
                                                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                                                        placeholder="Ej: Aprobación de Gerencia"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Descripción del Paso</label>
                                                                    <textarea
                                                                        value={activities.find(a => a.id === selectedActivityId)?.description || ''}
                                                                        onChange={(e) => {
                                                                            const desc = e.target.value;
                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, description: desc } : a));
                                                                        }}
                                                                        rows={3}
                                                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-600 dark:text-slate-400"
                                                                        placeholder="Instrucciones para la persona que realice esta tarea..."
                                                                    />
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                                    <div className="space-y-3">
                                                                        <div className="h-6 flex items-end">
                                                                            <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Tiempo Límite (Horas)</label>
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            value={activities.find(a => a.id === selectedActivityId)?.due_date_hours || 24}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, due_date_hours: val } : a));
                                                                            }}
                                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        <div className="h-6 flex items-end">
                                                                            <div className="flex items-center gap-2 group cursor-help" title="Horas para Alerta">
                                                                                <div className="w-5 h-5 rounded-md bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                                                                                    <AlertCircle className="w-3 h-3" />
                                                                                </div>
                                                                                <label className="block text-[8px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-[0.2em]">Alerta SLA</label>
                                                                            </div>
                                                                        </div>
                                                                        <input
                                                                            type="number"
                                                                            value={activities.find(a => a.id === selectedActivityId)?.sla_alert_hours || 4}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value) || 0;
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, sla_alert_hours: val } : a));
                                                                            }}
                                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                                                            title="Horas para Alerta"
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-3">
                                                                        <div className="h-6 flex items-end">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                                                                    <AlertCircle className="w-3 h-3" />
                                                                                </div>
                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Notificación</label>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={activities.find(a => a.id === selectedActivityId)?.enable_supervisor_alerts || false}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.checked;
                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, enable_supervisor_alerts: val } : a));
                                                                                }}
                                                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                                                                            />
                                                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">Supervisor</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Columnas del Formulario</label>
                                                                    <select
                                                                        value={activities.find(a => a.id === selectedActivityId)?.form_columns || 1}
                                                                        onChange={(e) => {
                                                                            const val = parseInt(e.target.value);
                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, form_columns: val } : a));
                                                                        }}
                                                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white appearance-none max-w-xs"
                                                                    >
                                                                        <option value={1}>1 Columna (Vertical)</option>
                                                                        <option value={2}>2 Columnas (Ancho Total)</option>
                                                                        <option value={3}>3 Columnas (Compacto)</option>
                                                                        <option value={4}>4 Columnas (Mini)</option>
                                                                    </select>
                                                                </div>

                                                                {/* Public Toggle */}
                                                                <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`p-2 rounded-lg ${activities.find(a => a.id === selectedActivityId)?.is_public ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                                                            <Globe className="w-5 h-5" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-0.5">Actividad Pública</p>
                                                                            <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Permitir completar esta actividad desde un enlace externo sin login</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`w-10 h-6 flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors ${activities.find(a => a.id === selectedActivityId)?.is_public ? 'bg-blue-600 dark:bg-blue-600' : ''}`}>
                                                                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${activities.find(a => a.id === selectedActivityId)?.is_public ? 'translate-x-4' : ''}`}></div>
                                                                    </div>
                                                                </label>

                                                                {/* Sincronización de Base de Datos */}
                                                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50 space-y-4">
                                                                    <div>
                                                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Sincronización de Datos</h4>
                                                                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Vincula esta actividad con una tabla de la base de datos para recuperar o guardar los datos automáticamente.</p>
                                                                    </div>
                                                                    <div className="flex items-end gap-3">
                                                                        <div className="flex-1">
                                                                            <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Tabla Destino</label>
                                                                            <div className="relative">
                                                                                <select
                                                                                    value={activities.find(a => a.id === selectedActivityId)?.sync_table || ''}
                                                                                    onChange={(e) => {
                                                                                        const table = e.target.value;
                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, sync_table: table } : a));
                                                                                    }}
                                                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white appearance-none"
                                                                                >
                                                                                    <option value="">Ninguna tabla vinculada</option>
                                                                                    {lookupData.dbTables.map(t => (
                                                                                        <option key={t} value={t}>{t}</option>
                                                                                    ))}
                                                                                </select>
                                                                                <Database className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            onClick={handleImportTableSchema}
                                                                            disabled={!activities.find(a => a.id === selectedActivityId)?.sync_table}
                                                                            className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-black rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-[10px] uppercase tracking-widest h-[46px]"
                                                                        >
                                                                            <Download className="w-4 h-4" />
                                                                            Importar Columnas
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {activeTab === 'config' && (
                                                            <div className="space-y-8 animate-fadeIn max-w-2xl">
                                                                {activities.find(a => a.id === selectedActivityId)?.type === 'subprocess' && (
                                                                    <div className="space-y-6">
                                                                        <div>
                                                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Configuración de Subproceso</h4>
                                                                            <p className="text-sm text-slate-500 font-medium italic">Seleccione el flujo de trabajo que se iniciará como un subproceso.</p>
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Flujo de Trabajo Destino</label>
                                                                                <select
                                                                                    value={activities.find(a => a.id === selectedActivityId)?.subprocess_config?.workflow_id || ''}
                                                                                    onChange={(e) => {
                                                                                        const wfId = e.target.value;
                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                            ...a,
                                                                                            subprocess_config: {
                                                                                                ...(a.subprocess_config || { input_mapping: {}, output_mapping: {} }),
                                                                                                workflow_id: wfId
                                                                                            }
                                                                                        } : a));
                                                                                    }}
                                                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                                                                >
                                                                                    <option value="">Seleccione un flujo...</option>
                                                                                    {availableWorkflows.map(wf => (
                                                                                        <option key={wf.id} value={wf.id}>{wf.name}</option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>

                                                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl">
                                                                                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                                                                    <AlertCircle className="w-4 h-4" />
                                                                                    <p className="text-[10px] font-black uppercase tracking-widest">Información</p>
                                                                                </div>
                                                                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                                                                    El proceso principal esperará a que el subproceso finalice para continuar con el siguiente paso.
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {activities.find(a => a.id === selectedActivityId)?.type === 'wait' && (
                                                                    <div className="space-y-6">
                                                                        <div>
                                                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Paso de Espera</h4>
                                                                            <p className="text-sm text-slate-500 font-medium italic">Configure cuánto tiempo o bajo qué condición debe pausarse el flujo.</p>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-4">
                                                                            <button
                                                                                onClick={() => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, wait_config: { ...(a.wait_config || {}), type: 'time' } } : a))}
                                                                                className={cn(
                                                                                    "p-4 rounded-2xl border-2 text-left transition-all",
                                                                                    activities.find(a => a.id === selectedActivityId)?.wait_config?.type === 'time'
                                                                                        ? "bg-amber-50 border-amber-500 dark:bg-amber-900/20"
                                                                                        : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                                                                                )}
                                                                            >
                                                                                <Clock className={cn("w-6 h-6 mb-2", activities.find(a => a.id === selectedActivityId)?.wait_config?.type === 'time' ? "text-amber-600" : "text-slate-400")} />
                                                                                <p className="font-black text-xs uppercase tracking-widest">Por Tiempo</p>
                                                                                <p className="text-[10px] text-slate-500">Espera una cantidad fija de horas</p>
                                                                            </button>

                                                                            <button
                                                                                onClick={() => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, wait_config: { ...(a.wait_config || {}), type: 'condition' } } : a))}
                                                                                className={cn(
                                                                                    "p-4 rounded-2xl border-2 text-left transition-all",
                                                                                    activities.find(a => a.id === selectedActivityId)?.wait_config?.type === 'condition'
                                                                                        ? "bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20"
                                                                                        : "bg-white border-slate-100 dark:bg-slate-900 dark:border-slate-800"
                                                                                )}
                                                                            >
                                                                                <Zap className={cn("w-6 h-6 mb-2", activities.find(a => a.id === selectedActivityId)?.wait_config?.type === 'condition' ? "text-indigo-600" : "text-slate-400")} />
                                                                                <p className="font-black text-xs uppercase tracking-widest">Por Condición</p>
                                                                                <p className="text-[10px] text-slate-500">Espera hasta que se cumpla una lógica</p>
                                                                            </button>
                                                                        </div>

                                                                        {activities.find(a => a.id === selectedActivityId)?.wait_config?.type === 'time' && (
                                                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                                                                                <div>
                                                                                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Duración (Horas)</label>
                                                                                    <input
                                                                                        type="number"
                                                                                        value={activities.find(a => a.id === selectedActivityId)?.wait_config?.duration_hours || 0}
                                                                                        onChange={(e) => {
                                                                                            const val = parseInt(e.target.value) || 0;
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                ...a,
                                                                                                wait_config: { ...(a.wait_config || {}), type: 'time' as const, duration_hours: val }
                                                                                            } : a));
                                                                                        }}
                                                                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-slate-900 dark:text-white"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {activities.find(a => a.id === selectedActivityId)?.wait_config?.type === 'condition' && (
                                                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                                                                                <div>
                                                                                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Fórmula de Condición (JS)</label>
                                                                                    <textarea
                                                                                        value={activities.find(a => a.id === selectedActivityId)?.wait_config?.condition || ''}
                                                                                        onChange={(e) => {
                                                                                            const val = e.target.value;
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                ...a,
                                                                                                wait_config: { ...(a.wait_config || {}), type: 'condition' as const, condition: val }
                                                                                            } : a));
                                                                                        }}
                                                                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono text-xs text-indigo-600 dark:text-indigo-400"
                                                                                        placeholder="Ej: {{monto}} > 1000000"
                                                                                        rows={3}
                                                                                    />
                                                                                    <p className="mt-2 text-[10px] text-slate-500 italic">Use {"{{campo}}"} para referenciar valores de pasos anteriores.</p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {activities.find(a => a.id === selectedActivityId)?.type === 'sync' && (
                                                                    <div className="space-y-6">
                                                                        <div>
                                                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Sincronización (Join)</h4>
                                                                            <p className="text-sm text-slate-500 font-medium italic">Configure cómo deben converger múltiples ramas del flujo.</p>
                                                                        </div>

                                                                        <div className="space-y-4">
                                                                            <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Modo de Convergencia</label>
                                                                            <select
                                                                                value={activities.find(a => a.id === selectedActivityId)?.sync_config?.mode || 'synchronous'}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value as any;
                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                        ...a,
                                                                                        sync_config: { mode: val }
                                                                                    } : a));
                                                                                }}
                                                                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all font-bold text-slate-900 dark:text-white"
                                                                            >
                                                                                <option value="synchronous">Esperar a que TODAS las entradas finalicen (AND)</option>
                                                                                <option value="async_single">Continuar con la PRIMERA entrada que llegue (OR)</option>
                                                                                <option value="async_multiple">Ejecutar por cada entrada que llegue (Independiente)</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {['start', 'task', 'decision', 'end'].includes(activities.find(a => a.id === selectedActivityId)?.type || '') && (
                                                                    <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center text-center bg-slate-50/30 dark:bg-slate-900/10">
                                                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                                                            <Settings2 className="w-8 h-8 text-slate-300 opacity-50" />
                                                                        </div>
                                                                        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">Sin ajustes adicionales</h4>
                                                                        <p className="text-sm text-slate-500 max-w-sm">Esta actividad utiliza la configuración estándar. Ajusta el nombre, asignación o campos en las otras pestañas.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {activeTab === 'details' && (
                                                            <div className="space-y-6 animate-fadeIn">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalles</h4>
                                                                        <p className="text-sm text-slate-500 font-medium italic">Seleccione qué sub-carpetas de registros iterables estarán disponibles durante este paso.</p>
                                                                    </div>
                                                                </div>

                                                                {/* Folder Completion Rules */}
                                                                <div className="bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50 rounded-3xl p-6 mb-6 animate-in slide-in-from-top-2">
                                                                    <div className="flex items-center gap-3 mb-4">
                                                                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                                            <Scale className="w-5 h-5 text-white" />
                                                                        </div>
                                                                        <div>
                                                                            <h5 className="text-xs font-black text-indigo-900 dark:text-indigo-100 uppercase tracking-widest">Reglas de Finalización de Actividad</h5>
                                                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-60 italic">Control de flujo basado en datos de carpetas</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] px-1 block h-4">Condición de Guardado</label>
                                                                            <select
                                                                                value={currentActivity?.folder_completion_rule || 'none'}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value as any;
                                                                                    const nextActs = activities.map(a => a.id === selectedActivityId ? { ...a, folder_completion_rule: val } : a);
                                                                                    setActivities(nextActs);
                                                                                    handleSave(nextActs);
                                                                                }}
                                                                                className="w-full bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-100 font-black rounded-2xl p-3 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm h-[48px]"
                                                                            >
                                                                                <option value="none">Opcional (No requiere llenar carpetas)</option>
                                                                                <option value="and">AND - TODAS las carpetas seleccionadas son obligatorias</option>
                                                                                <option value="or">OR - AL MENOS UNA de las seleccionadas es obligatoria</option>
                                                                            </select>
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <label className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] px-1 block h-4">Protección de Datos</label>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const nextActs = activities.map(a => a.id === selectedActivityId ? { ...a, require_save_before_folders: !a.require_save_before_folders } : a);
                                                                                    setActivities(nextActs);
                                                                                    handleSave(nextActs);
                                                                                }}
                                                                                className={cn(
                                                                                    "w-full flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border-2 transition-all group/lock h-[48px]",
                                                                                    currentActivity?.require_save_before_folders
                                                                                        ? "bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30"
                                                                                        : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-500"
                                                                                )}
                                                                            >
                                                                                <div className="flex flex-col items-start transition-transform group-hover/lock:translate-x-1">
                                                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Bloqueo de Escritura</span>
                                                                                    <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter italic">Requiere guardar formulario principal</span>
                                                                                </div>
                                                                                <div className={cn(
                                                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                                                    currentActivity?.require_save_before_folders ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                                                )}>
                                                                                    {currentActivity?.require_save_before_folders ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                                                </div>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {details.length > 0 ? (
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                        {details.map(detail => {
                                                                            const isSelected = currentActivity?.associated_details?.includes(detail.id) || false;
                                                                            return (
                                                                                <div key={detail.id} className={cn(
                                                                                    "flex flex-col gap-3 p-5 rounded-2xl border transition-all",
                                                                                    isSelected ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-inner" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-200 shadow-sm"
                                                                                )}>
                                                                                    <label className="flex items-start gap-4 cursor-pointer w-full">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            checked={isSelected}
                                                                                            onChange={(e) => {
                                                                                                const checked = e.target.checked;
                                                                                                const nextActs = activities.map(a => {
                                                                                                    if (a.id === selectedActivityId) {
                                                                                                        const currentDetails = a.associated_details || [];
                                                                                                        const nextDetails = checked
                                                                                                            ? [...currentDetails, detail.id]
                                                                                                            : currentDetails.filter(id => id !== detail.id);

                                                                                                        const nextCards = { ...(a.detail_cardinalities || {}) };
                                                                                                        if (!checked) {
                                                                                                            delete nextCards[detail.id];
                                                                                                        } else {
                                                                                                            nextCards[detail.id] = { mode: 'none' };
                                                                                                        }

                                                                                                        return { ...a, associated_details: nextDetails, detail_cardinalities: nextCards };
                                                                                                    }
                                                                                                    return a;
                                                                                                });
                                                                                                setActivities(nextActs);
                                                                                                handleSave(nextActs);
                                                                                            }}
                                                                                            className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 transition-all cursor-pointer"
                                                                                        />
                                                                                        <div className="min-w-0 flex-1">
                                                                                            <p className={cn("font-black text-sm mb-1 truncate", isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-slate-900 dark:text-white")}>
                                                                                                {detail.name}
                                                                                            </p>
                                                                                            {detail.description && (
                                                                                                <p className="text-xs text-slate-500 line-clamp-2">{detail.description}</p>
                                                                                            )}
                                                                                        </div>
                                                                                        {isSelected && currentActivity?.folder_completion_rule !== 'none' && (
                                                                                            <div className="flex flex-col items-center gap-1 min-w-[60px] animate-in fade-in zoom-in duration-300">
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        e.preventDefault();
                                                                                                        const nextActivities_comp = activities.map(a => {
                                                                                                            if (a.id === selectedActivityId) {
                                                                                                                const currentIds = a.folder_completion_ids || [];
                                                                                                                const isMandatory_inner = currentIds.includes(detail.id);
                                                                                                                const nextIds = isMandatory_inner
                                                                                                                    ? currentIds.filter(id => id !== detail.id)
                                                                                                                    : [...currentIds, detail.id];
                                                                                                                return { ...a, folder_completion_ids: nextIds };
                                                                                                            }
                                                                                                            return a;
                                                                                                        });
                                                                                                        setActivities(nextActivities_comp);
                                                                                                        handleSave(nextActivities_comp);
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "w-10 h-10 rounded-xl border flex items-center justify-center transition-all",
                                                                                                        currentActivity?.folder_completion_ids?.includes(detail.id)
                                                                                                            ? "bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20"
                                                                                                            : "bg-slate-50 border-slate-200 text-slate-300 dark:bg-slate-800 dark:border-slate-700"
                                                                                                    )}
                                                                                                    title={currentActivity?.folder_completion_ids?.includes(detail.id) ? "Obligatorio por regla" : "Opcional"}
                                                                                                >
                                                                                                    <Award className="w-5 h-5" />
                                                                                                </button>
                                                                                                <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400">Obligatorio</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </label>

                                                                                    {isSelected && (
                                                                                        <div className="pl-9 pt-3 border-t border-indigo-100 dark:border-indigo-800/50 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                                                                                            <label className="text-[9px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest">Validación de Cardinalidad</label>
                                                                                            <div className="flex gap-2 pb-1">
                                                                                                <select
                                                                                                    value={currentActivity?.detail_cardinalities?.[detail.id]?.mode || 'none'}
                                                                                                    onChange={(e) => {
                                                                                                        const mode = e.target.value as any;
                                                                                                        const nextActivities_card = activities.map(a => {
                                                                                                            if (a.id === selectedActivityId) {
                                                                                                                const newCards = { ...(a.detail_cardinalities || {}) };
                                                                                                                newCards[detail.id] = { ...newCards[detail.id], mode, min_items: mode === 'min_x' ? (newCards[detail.id]?.min_items || 1) : undefined };
                                                                                                                return { ...a, detail_cardinalities: newCards };
                                                                                                            }
                                                                                                            return a;
                                                                                                        });
                                                                                                        setActivities(nextActivities_card);
                                                                                                        handleSave(nextActivities_card);
                                                                                                    }}
                                                                                                    className="flex-1 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-100 font-bold rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                                                >
                                                                                                    <option value="none">Opcional (Sin validación)</option>
                                                                                                    <option value="1_to_many">Obligatorio (Mínimo un registro)</option>
                                                                                                    <option value="min_x">Mínimo X cantidad de registros</option>
                                                                                                </select>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        e.preventDefault();
                                                                                                        const nextActivities_lock = activities.map(a => {
                                                                                                            if (a.id === selectedActivityId) {
                                                                                                                const newCards = { ...(a.detail_cardinalities || {}) };
                                                                                                                const currentReadOnly = newCards[detail.id]?.read_only || false;
                                                                                                                newCards[detail.id] = { ...newCards[detail.id], read_only: !currentReadOnly, mode: newCards[detail.id]?.mode || 'none' };
                                                                                                                return { ...a, detail_cardinalities: newCards };
                                                                                                            }
                                                                                                            return a;
                                                                                                        });
                                                                                                        setActivities(nextActivities_lock);
                                                                                                        handleSave(nextActivities_lock);
                                                                                                    }}
                                                                                                    className={cn(
                                                                                                        "px-3 rounded-lg border flex items-center justify-center transition-all",
                                                                                                        currentActivity?.detail_cardinalities?.[detail.id]?.read_only
                                                                                                            ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-900/20 dark:border-rose-800/50"
                                                                                                            : "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                                                                                                    )}
                                                                                                    title={currentActivity?.detail_cardinalities?.[detail.id]?.read_only ? "Modo Lectura (No se pueden añadir filas)" : "Modo Edición (Se pueden añadir filas)"}
                                                                                                >
                                                                                                    {currentActivity?.detail_cardinalities?.[detail.id]?.read_only ? (
                                                                                                        <Lock className="w-4 h-4" />
                                                                                                    ) : (
                                                                                                        <Unlock className="w-4 h-4" />
                                                                                                    )}
                                                                                                </button>
                                                                                            </div>

                                                                                            {currentActivity?.detail_cardinalities?.[detail.id]?.mode === 'min_x' && (
                                                                                                <div className="flex items-center gap-3 mt-1">
                                                                                                    <span className="text-[10px] font-bold text-indigo-400">Cantidad:</span>
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        min={1}
                                                                                                        value={currentActivity?.detail_cardinalities?.[detail.id]?.min_items || 1}
                                                                                                        onChange={(e) => {
                                                                                                            const val = Math.max(1, parseInt(e.target.value) || 1);
                                                                                                            const nextActivities_val = activities.map(a => {
                                                                                                                if (a.id === selectedActivityId) {
                                                                                                                    const newCards = { ...(a.detail_cardinalities || {}) };
                                                                                                                    newCards[detail.id] = { ...newCards[detail.id], min_items: val };
                                                                                                                    return { ...a, detail_cardinalities: newCards };
                                                                                                                }
                                                                                                                return a;
                                                                                                            });
                                                                                                            setActivities(nextActivities_val);
                                                                                                            handleSave(nextActivities_val);
                                                                                                        }}
                                                                                                        className="w-16 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 text-xs text-center font-bold text-indigo-900 dark:text-indigo-100 rounded-lg p-1.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                                                                    />
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center text-center bg-slate-50/50 dark:bg-slate-900/20">
                                                                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                                                                            <FolderOpen className="w-8 h-8 text-slate-400 opacity-50" />
                                                                        </div>
                                                                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">No hay carpetas maestras</h4>
                                                                        <p className="text-sm text-slate-500 max-w-sm mb-6">Aún no se han configurado carpetas para este flujo de trabajo. Puedes crear carpetas y asociarlas aquí para que los usuarios puedan rellenar arreglos de datos.</p>
                                                                        <button
                                                                            onClick={() => setShowDetailsManager(true)}
                                                                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
                                                                        >
                                                                            Nuevo Gestor de Carpetas
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {activeTab === 'fields' && (
                                                            <div className="space-y-6 animate-fadeIn">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Esquema de Datos</h4>
                                                                        <p className="text-sm text-slate-500 font-medium italic">Define los campos que el usuario debe completar en este paso.</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => setShowFormPreview(true)}
                                                                            className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 text-[10px] uppercase tracking-widest group/preview"
                                                                        >
                                                                            <Eye className="w-4 h-4 group-hover/preview:scale-110 transition-transform" />
                                                                            Vista Previa
                                                                        </button>
                                                                        <button
                                                                            onClick={handleAddField}
                                                                            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 text-[10px] uppercase tracking-widest group/btn"
                                                                        >
                                                                            <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                                                                            Añadir Campo
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-sm">
                                                                    <table className="w-full text-left border-collapse">
                                                                        <thead>
                                                                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                                                <th className="px-4 py-3 w-12"></th>
                                                                                <th className="px-3 py-3">Nombre del Campo</th>
                                                                                <th className="px-3 py-3">Tipo de Dato</th>
                                                                                <th className="px-3 py-3">Auto-llenar Desde</th>
                                                                                <th className="px-3 py-3 text-center">Requerido</th>
                                                                                <th className="px-3 py-3 text-center" title="Solo lectura">Lectura</th>
                                                                                <th className="px-3 py-3 text-center">Límite</th>
                                                                                <th className="px-3 py-3 text-center">Altura</th>
                                                                                <th className="px-3 py-3 text-center">Acciones</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white dark:bg-slate-900/50">
                                                                            {activities.find(a => a.id === selectedActivityId)?.fields?.map((field, idx) => {
                                                                                const getAncestors = (targetId: string): string[] => {
                                                                                    const ancestors = new Set<string>();
                                                                                    const queue = [targetId];
                                                                                    while (queue.length > 0) {
                                                                                        const curr = queue.shift()!;
                                                                                        const parents = transitions
                                                                                            .filter(t => t.target_id === curr)
                                                                                            .map(t => t.source_id);
                                                                                        parents.forEach(p => {
                                                                                            if (!ancestors.has(p)) {
                                                                                                ancestors.add(p);
                                                                                                queue.push(p);
                                                                                            }
                                                                                        });
                                                                                    }
                                                                                    return Array.from(ancestors);
                                                                                };

                                                                                const ancestorIds = getAncestors(selectedActivityId!);
                                                                                const previousActivities = activities.filter(a =>
                                                                                    (ancestorIds.includes(a.id) || a.id === selectedActivityId) &&
                                                                                    a.fields && a.fields.length > 0
                                                                                );

                                                                                return (
                                                                                    <React.Fragment key={field.id}>
                                                                                        {/* Field Main Row */}
                                                                                        <tr
                                                                                            className={`group transition-all border-t-[6px] border-slate-300 dark:border-slate-700/80 first:border-t-0 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 cursor-pointer`}
                                                                                            onDoubleClick={() => {
                                                                                                setSelectedPreviewFieldId(field.id);
                                                                                                setShowFormPreview(true);
                                                                                            }}
                                                                                        >
                                                                                            <td className="px-2 py-2 w-10">
                                                                                                <div className="flex flex-col gap-0.5 items-center">
                                                                                                    <button
                                                                                                        disabled={idx === 0}
                                                                                                        onClick={() => {
                                                                                                            setActivities(prev => prev.map(a => {
                                                                                                                if (a.id === selectedActivityId && a.fields) {
                                                                                                                    const newFields = [...a.fields];
                                                                                                                    const temp = newFields[idx];
                                                                                                                    newFields[idx] = newFields[idx - 1];
                                                                                                                    newFields[idx - 1] = temp;
                                                                                                                    return { ...a, fields: newFields.map((f, i) => ({ ...f, order_index: i })) };
                                                                                                                }
                                                                                                                return a;
                                                                                                            }));
                                                                                                        }}
                                                                                                        className="p-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-slate-300 hover:text-blue-600 disabled:opacity-10 transition-colors"
                                                                                                    >
                                                                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        disabled={idx === (activities.find(a => a.id === selectedActivityId)?.fields?.length || 1) - 1}
                                                                                                        onClick={() => {
                                                                                                            setActivities(prev => prev.map(a => {
                                                                                                                if (a.id === selectedActivityId && a.fields) {
                                                                                                                    const newFields = [...a.fields];
                                                                                                                    const temp = newFields[idx];
                                                                                                                    newFields[idx] = newFields[idx + 1];
                                                                                                                    newFields[idx + 1] = temp;
                                                                                                                    return { ...a, fields: newFields.map((f, i) => ({ ...f, order_index: i })) };
                                                                                                                }
                                                                                                                return a;
                                                                                                            }));
                                                                                                        }}
                                                                                                        className="p-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded text-slate-300 hover:text-blue-600 disabled:opacity-10 transition-colors"
                                                                                                    >
                                                                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={field.label || field.name}
                                                                                                    onChange={(e) => {
                                                                                                        const newLabel = e.target.value;
                                                                                                        const newName = newLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                            ...a,
                                                                                                            fields: a.fields?.map(f => f.id === field.id ? { ...f, label: newLabel, name: newName } : f)
                                                                                                        } : a));
                                                                                                    }}
                                                                                                    className="w-full h-8 px-3 text-[11px] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                                                                                                    placeholder="Ej: nombre_cliente"
                                                                                                />
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <select
                                                                                                    value={field.type}
                                                                                                    onChange={(e) => {
                                                                                                        const newType = e.target.value as any;
                                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                            ...a,
                                                                                                            fields: a.fields?.map(f => f.id === field.id ? { ...f, type: newType } : f)
                                                                                                        } : a));
                                                                                                    }}
                                                                                                    className="w-full h-8 px-2 text-[11px] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg font-bold text-slate-500 dark:text-slate-400 focus:bg-white dark:focus:bg-slate-800 outline-none cursor-pointer transition-all"
                                                                                                >
                                                                                                    <option value="text">Texto Corto</option>
                                                                                                    <option value="textarea">Texto Largo</option>
                                                                                                    <option value="number">Número</option>
                                                                                                    <option value="currency">Moneda ($)</option>
                                                                                                    <option value="date">Fecha</option>
                                                                                                    <option value="select">Lista (Desplegable)</option>
                                                                                                    <option value="email">Correo Electrónico</option>
                                                                                                    <option value="phone">Teléfono</option>
                                                                                                    <option value="boolean">Interruptor (Sí/No)</option>
                                                                                                    <option value="provider">Proveedor</option>
                                                                                                    <option value="lookup">Búsqueda Interactiva (Lookup)</option>
                                                                                                    <option value="location">Georreferenciación (Mapa)</option>
                                                                                                    <option value="consecutivo">Consecutivo (Autogenerado)</option>
                                                                                                    <option value="label">Información / Mensaje</option>
                                                                                                    <option value="accordion">Contenedor / Acordeón</option>
                                                                                                </select>
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <select
                                                                                                    value={field.source_activity_id && field.source_field_name ? `${field.source_activity_id}:${field.source_field_name}` : ''}
                                                                                                    onChange={(e) => {
                                                                                                        const value = e.target.value;
                                                                                                        const [sourceActivityId, sourceFieldName] = value ? value.split(':') : [undefined, undefined];
                                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                            ...a,
                                                                                                            fields: a.fields?.map(f => f.id === field.id ? {
                                                                                                                ...f,
                                                                                                                source_activity_id: sourceActivityId,
                                                                                                                source_field_name: sourceFieldName
                                                                                                            } : f)
                                                                                                        } : a));
                                                                                                    }}
                                                                                                    className="w-full h-8 px-2 text-[11px] bg-slate-50/50 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg text-slate-500 dark:text-slate-400 focus:bg-white dark:focus:bg-slate-800 outline-none cursor-pointer transition-all font-bold"
                                                                                                >
                                                                                                    <option value="">Manual (Usuario)</option>
                                                                                                    {previousActivities.map(prevActivity =>
                                                                                                        prevActivity.fields?.filter(pf => !(prevActivity.id === selectedActivityId && pf.id === field.id)).map(prevField => (
                                                                                                            <option key={`${prevActivity.id}:${prevField.name}`} value={`${prevActivity.id}:${prevField.name}`}>
                                                                                                                {prevActivity.id === selectedActivityId ? '(Este Paso) → ' : `${prevActivity.name} → `}{prevField.label || prevField.name}
                                                                                                            </option>
                                                                                                        ))
                                                                                                    )}
                                                                                                </select>
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <div className="flex items-center justify-center h-8">
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        checked={field.required}
                                                                                                        onChange={(e) => {
                                                                                                            const isReq = e.target.checked;
                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                ...a,
                                                                                                                fields: a.fields?.map(f => f.id === field.id ? { ...f, required: isReq } : f)
                                                                                                            } : a));
                                                                                                        }}
                                                                                                        className="w-4 h-4 rounded text-blue-600 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-blue-500 cursor-pointer transition-all"
                                                                                                    />
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <div className="flex items-center justify-center h-8">
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        checked={!!field.is_readonly}
                                                                                                        onChange={(e) => {
                                                                                                            const isRO = e.target.checked;
                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                ...a,
                                                                                                                fields: a.fields?.map(f => f.id === field.id ? { ...f, is_readonly: isRO } : f)
                                                                                                            } : a));
                                                                                                        }}
                                                                                                        className="w-4 h-4 rounded text-amber-500 border-slate-400 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-amber-400 cursor-pointer transition-all accent-amber-500"
                                                                                                        title="El usuario ve el valor pero no puede editarlo"
                                                                                                    />
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-2 py-2">
                                                                                                <input
                                                                                                    type="number"
                                                                                                    value={field.max_length || ''}
                                                                                                    onChange={(e) => {
                                                                                                        const val = e.target.value ? Number(e.target.value) : undefined;
                                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                            ...a,
                                                                                                            fields: a.fields?.map(f => f.id === field.id ? { ...f, max_length: val } : f)
                                                                                                        } : a));
                                                                                                    }}
                                                                                                    className="w-14 h-8 px-1 text-[10px] text-center bg-slate-50/50 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg font-bold"
                                                                                                    placeholder="∞"
                                                                                                />
                                                                                            </td>
                                                                                            <td className="px-2 py-2">
                                                                                                {field.type === 'textarea' ? (
                                                                                                    <input
                                                                                                        type="number"
                                                                                                        min={1}
                                                                                                        value={field.rows || 4}
                                                                                                        onChange={(e) => {
                                                                                                            const val = Number(e.target.value);
                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                ...a,
                                                                                                                fields: a.fields?.map(f => f.id === field.id ? { ...f, rows: val } : f)
                                                                                                            } : a));
                                                                                                        }}
                                                                                                        className="w-12 h-8 px-1 text-[10px] text-center bg-slate-50/50 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg font-bold"
                                                                                                    />
                                                                                                ) : (
                                                                                                    <div className="text-center text-slate-300">-</div>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-3 py-2 text-center">
                                                                                                <div className="flex items-center justify-center h-8">
                                                                                                    <button
                                                                                                        onClick={() => {
                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                ...a,
                                                                                                                fields: a.fields?.filter(f => f.id !== field.id)
                                                                                                            } : a));
                                                                                                        }}
                                                                                                        className="p-1.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                                                                                    >
                                                                                                        <Trash2 className="w-4 h-4" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    </React.Fragment>
                                                                                );
                                                                            })}
                                                                            {(!activities.find(a => a.id === selectedActivityId)?.fields || activities.find(a => a.id === selectedActivityId)?.fields?.length === 0) && (
                                                                                <tr>
                                                                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                                                                        No hay campos definidos para esta actividad.
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {activeTab === 'assignment' && (
                                                            <div className="space-y-8 animate-fadeIn">
                                                                {(() => {
                                                                    const selectedActivity = activities.find(a => a.id === selectedActivityId);
                                                                    if (!selectedActivity) return null;

                                                                    return (
                                                                        <>
                                                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                                                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-blue-600">
                                                                                    <Users className="w-6 h-6" />
                                                                                </div>
                                                                                <div>
                                                                                    <h4 className="text-lg font-black text-blue-900 dark:text-blue-100">Reglas de Reparto</h4>
                                                                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Define quién será el dueño de esta actividad cuando se inicie.</p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="space-y-6">
                                                                                <div>
                                                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Método de Asignación</label>
                                                                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                                                        {[
                                                                                            { id: 'creator', label: 'Iniciador del Flujo', desc: 'Mismo usuario que inició' },
                                                                                            { id: 'specific_user', label: 'Usuario Específico', desc: 'Elegir una persona' },
                                                                                            { id: 'department', label: 'Por Área', desc: 'Reglas para el equipo' },
                                                                                            { id: 'position', label: 'Por Cargo', desc: 'Reglas por jerarquía' },
                                                                                            { id: 'department_and_position', label: 'Área y Cargo', desc: 'Doble filtro (ej: Analista de TI)' },
                                                                                            { id: 'manual', label: 'Manual/Público', desc: 'Sin dueño definido' }
                                                                                        ].map((opt) => (
                                                                                            <button
                                                                                                key={opt.id}
                                                                                                onClick={() => {
                                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assignment_type: opt.id as AssignmentType } : a));
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "p-2 rounded-xl border-2 text-left transition-all",
                                                                                                    selectedActivity.assignment_type === opt.id
                                                                                                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                                                                                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                                                                                                )}
                                                                                            >
                                                                                                <p className="font-black text-[8px] uppercase tracking-wider mb-0.5">{opt.label}</p>
                                                                                                <p className={cn("text-[6px] font-bold uppercase opacity-60", selectedActivity.assignment_type === opt.id ? "text-white" : "text-slate-400")}>
                                                                                                    {opt.desc}
                                                                                                </p>
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Contextual Selectors */}
                                                                                {selectedActivity.assignment_type === 'specific_user' && (
                                                                                    <div className="animate-in slide-in-from-top-2">
                                                                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seleccionar Usuario</label>
                                                                                        <select
                                                                                            value={selectedActivity.assigned_user_id || ''}
                                                                                            onChange={(e) => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assigned_user_id: e.target.value } : a))}
                                                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                                                                        >
                                                                                            <option value="">Selecciona un usuario...</option>
                                                                                            {lookupData.users.map(u => (
                                                                                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>
                                                                                )}

                                                                                {(selectedActivity.assignment_type === 'department' || selectedActivity.assignment_type === 'department_and_position') && (
                                                                                    <div className="animate-in slide-in-from-top-2 pt-4">
                                                                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seleccionar Área / Departamento</label>
                                                                                        <select
                                                                                            value={selectedActivity.assigned_department_id || ''}
                                                                                            onChange={(e) => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assigned_department_id: e.target.value } : a))}
                                                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                                                                        >
                                                                                            <option value="">Selecciona un área...</option>
                                                                                            {lookupData.departments.map(d => (
                                                                                                <option key={d.id} value={d.id}>{d.name}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>
                                                                                )}

                                                                                {(selectedActivity.assignment_type === 'position' || selectedActivity.assignment_type === 'department_and_position') && (
                                                                                    <div className="animate-in slide-in-from-top-2 pt-4">
                                                                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seleccionar Cargo</label>
                                                                                        <select
                                                                                            value={selectedActivity.assigned_position_id || ''}
                                                                                            onChange={(e) => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assigned_position_id: e.target.value } : a))}
                                                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                                                                        >
                                                                                            <option value="">Selecciona un cargo...</option>
                                                                                            {lookupData.positions.map(p => (
                                                                                                <option key={p.id} value={p.id}>{p.title}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </div>
                                                                                )}

                                                                                {(selectedActivity.assignment_type === 'department' || selectedActivity.assignment_type === 'position' || selectedActivity.assignment_type === 'department_and_position') && (
                                                                                    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                                                        <div>
                                                                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Estrategia de Selección</label>
                                                                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                                                                                {[
                                                                                                    { id: 'manual', label: 'Bandeja / Pooling', desc: 'Cualquiera lo toma', icon: Inbox },
                                                                                                    { id: 'claim', label: 'Shark/Cacería', desc: 'Cola General Rápida', icon: Target },
                                                                                                    { id: 'workload', label: 'Carga Laboral', desc: 'Al menos ocupado', icon: BarChart2 },
                                                                                                    { id: 'efficiency', label: 'Eficiencia', desc: 'Al más rápido', icon: Zap },
                                                                                                    { id: 'cost', label: 'Costo Óptimo', desc: 'Menor costo / hora', icon: Coins },
                                                                                                    { id: 'skills', label: 'Habilidades', desc: 'Enrutamiento / Skills', icon: Award },
                                                                                                    { id: 'shift', label: 'Disponibilidad', desc: 'Horario y Turnos', icon: Clock },
                                                                                                    { id: 'weighted', label: 'Ponderado', desc: 'Carga programada', icon: Scale },
                                                                                                    { id: 'random', label: 'Aleatorio', desc: 'Sorteo al azar', icon: Dices }
                                                                                                ].map((strat) => (
                                                                                                    <button
                                                                                                        key={strat.id}
                                                                                                        onClick={() => {
                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assignment_strategy: strat.id as AssignmentStrategy } : a));
                                                                                                        }}
                                                                                                        className={cn(
                                                                                                            "p-2 rounded-xl border-2 text-left transition-all flex xl:flex-row flex-col items-center gap-2",
                                                                                                            (selectedActivity.assignment_strategy || 'manual') === strat.id
                                                                                                                ? "bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-600 text-white shadow-md"
                                                                                                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                                                                                                        )}
                                                                                                    >
                                                                                                        <div className={cn(
                                                                                                            "w-6 h-6 shrink-0 rounded-lg flex items-center justify-center transition-colors",
                                                                                                            (selectedActivity.assignment_strategy || 'manual') === strat.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                                                                        )}>
                                                                                                            <strat.icon className="w-3.5 h-3.5" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="font-black text-[10px] uppercase tracking-wider mb-0.5">{strat.label}</p>
                                                                                                            <p className={cn("text-[8px] font-bold uppercase opacity-80 leading-tight", (selectedActivity.assignment_strategy || 'manual') === strat.id ? "text-white" : "text-slate-400")}>
                                                                                                                {strat.desc}
                                                                                                            </p>
                                                                                                        </div>
                                                                                                    </button>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}

                                                        {activeTab === 'actions' && (
                                                            <div className="space-y-8 animate-fadeIn">
                                                                {(() => {
                                                                    const selectedActivity = activities.find(a => a.id === selectedActivityId);
                                                                    if (!selectedActivity) return null;

                                                                    const editingAction = selectedActivity.actions?.find(act => act.id === editingActionId);
                                                                    const availableFields = ['date', 'user_name', 'user_email', 'organization_name', ...activities.flatMap(a => a.fields?.map(f => f.name) || [])];

                                                                    return (
                                                                        <>
                                                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                                                                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-blue-600">
                                                                                    <Zap className="w-6 h-6" />
                                                                                </div>
                                                                                <div className="flex-1">
                                                                                    <h4 className="text-lg font-black text-blue-900 dark:text-blue-100">Multi-Acciones Automáticas</h4>
                                                                                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium italic">Puedes encadenar N acciones (Correos, Webhooks, ERP) que se ejecutarán secuencialmente.</p>
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {[
                                                                                        { id: 'email', icon: Mail, label: 'Email' },
                                                                                        { id: 'document_generation', icon: FileSignature, label: 'Documento' },
                                                                                        { id: 'finance', icon: Zap, label: 'ERP' },
                                                                                        { id: 'webhook', icon: Link, label: 'REST' },
                                                                                        { id: 'soap', icon: Code, label: 'SOAP' },
                                                                                        { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
                                                                                    ].map(btn => (
                                                                                        <button
                                                                                            key={btn.id}
                                                                                            onClick={() => handleAddAction(btn.id as any)}
                                                                                            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                                                        >
                                                                                            <btn.icon className="w-3.5 h-3.5" />
                                                                                            {btn.label}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            {/* Actions List */}
                                                                            {!editingActionId ? (
                                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                                    {(selectedActivity.actions || []).map((action, idx) => (
                                                                                        <div
                                                                                            key={action.id}
                                                                                            className="group relative bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-5 hover:border-blue-400 transition-all cursor-pointer"
                                                                                            onClick={() => setEditingActionId(action.id)}
                                                                                        >
                                                                                            <div className="flex items-start justify-between mb-4">
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-600">
                                                                                                        {action.type === 'email' ? <Mail className="w-5 h-5" /> :
                                                                                                            action.type === 'finance' ? <Zap className="w-5 h-5" /> :
                                                                                                                action.type === 'webhook' ? <Link className="w-5 h-5" /> :
                                                                                                                    action.type === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> :
                                                                                                                        action.type === 'document_generation' ? <FileSignature className="w-5 h-5" /> :
                                                                                                                            <Code className="w-5 h-5" />}
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Paso {idx + 1}</h5>
                                                                                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[120px]">{action.name}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <button
                                                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveAction(action.id); }}
                                                                                                    className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                                                                >
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                </button>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[8px] font-black uppercase rounded-md border border-blue-100 dark:border-blue-800">
                                                                                                    {action.type}
                                                                                                </span>
                                                                                                {action.type === 'email' && action.config?.email_to && (
                                                                                                    <span className="text-[8px] text-slate-400 truncate flex-1 font-medium">{action.config.email_to}</span>
                                                                                                )}
                                                                                                {(action.type === 'webhook' || action.type === 'soap') && action.config?.steps && (
                                                                                                    <span className="text-[8px] text-slate-400 truncate flex-1 font-medium">{action.config.steps.length} pasos</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                    {(selectedActivity.actions || []).length === 0 && (
                                                                                        <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/30">
                                                                                            <Zap className="w-10 h-10 text-slate-200 dark:text-slate-800 mb-4" />
                                                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay acciones automáticas</p>
                                                                                            <p className="text-[10px] text-slate-300 mt-1">Usa los botones de arriba para añadir la primera</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                /* Action Editor */
                                                                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                                                                                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                                                                                        <div className="flex items-center gap-4">
                                                                                            <button
                                                                                                onClick={() => setEditingActionId(null)}
                                                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
                                                                                            >
                                                                                                <ArrowLeft className="w-5 h-5" />
                                                                                            </button>
                                                                                            <div>
                                                                                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Configurar Acción</h4>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Tipo: {editingAction?.type || '...'}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex-1 max-w-xs mx-8">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editingAction?.name || ''}
                                                                                                onChange={(e) => handleUpdateAction(editingActionId!, { name: e.target.value })}
                                                                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500/20"
                                                                                                placeholder="Nombre de la acción..."
                                                                                            />
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Specific Config Forms */}
                                                                                    {!editingAction ? (
                                                                                        <div className="py-20 flex justify-center">
                                                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <>
                                                                                            {editingAction.type === 'finance' && (
                                                                                                <div className="grid grid-cols-2 gap-6 p-8 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
                                                                                                    <div className="space-y-4">
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">URL Finanzas (ERP)</label>
                                                                                                            <input type="text" value={editingAction.config?.finance_url || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { finance_url: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">API Key</label>
                                                                                                            <input type="password" value={editingAction.config?.api_key || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { api_key: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">ID Concepto Contable</label>
                                                                                                            <input type="text" value={editingAction.config?.concept_id || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { concept_id: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Ej: 10101" />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div className="space-y-4">
                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Cantidad / Monto ( campo )</label>
                                                                                                                <input type="text" value={editingAction.config?.amount || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { amount: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Ej: {{monto_total}}" />
                                                                                                                <FormulaValidationFeedback value={editingAction.config?.amount || ''} availableFields={availableFields} />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Movimiento</label>
                                                                                                                <select value={editingAction.config?.movement_type || 'expense'} onChange={(e) => handleUpdateActionConfig(editingActionId!, { movement_type: e.target.value as any })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                                                                                                                    <option value="expense">Egreso</option>
                                                                                                                    <option value="income">Ingreso</option>
                                                                                                                </select>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Descripción del Movimiento</label>
                                                                                                            <input type="text" value={editingAction.config?.description || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { description: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                            <FormulaValidationFeedback value={editingAction.config?.description || ''} availableFields={availableFields} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {editingAction.type === 'email' && (
                                                                                                <div className="space-y-6 p-8 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
                                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">De ( Remitente - Ej: info@tuempresa.com )</label>
                                                                                                            <input type="text" value={editingAction.config?.email_from || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_from: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" placeholder="info@tuempresa.com" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Para ( Destinatario - Ej: {"{{ email }}"} )</label>
                                                                                                            <input type="text" value={editingAction.config?.email_to || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_to: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="usuario@correo.com o {{campo}}" />
                                                                                                            <FormulaValidationFeedback value={editingAction.config?.email_to || ''} availableFields={availableFields} />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">CC ( Opcional )</label>
                                                                                                        <input type="text" value={editingAction.config?.email_cc || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_cc: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Copia a..." />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Asunto</label>
                                                                                                        <input type="text" value={editingAction.config?.email_subject || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_subject: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                                                                                                        <FormulaValidationFeedback value={editingAction.config?.email_subject || ''} availableFields={availableFields} />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Cuerpo del Mensaje</label>
                                                                                                        <textarea rows={4} value={editingAction.config?.email_body || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_body: e.target.value })} className="w-full p-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono scrollbar-thin" />
                                                                                                        <FormulaValidationFeedback value={editingAction.config?.email_body || ''} availableFields={availableFields} />
                                                                                                    </div>

                                                                                                    <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                                                                                                        <div className="flex items-center justify-between mb-4">
                                                                                                            <h6 className="text-[10px] font-black tracking-widest uppercase text-slate-500">Configuración del Servidor (SMTP)</h6>
                                                                                                            <button
                                                                                                                onClick={() => handleTestEmail(editingAction)}
                                                                                                                disabled={testingEmail}
                                                                                                                className={cn(
                                                                                                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                                                                                                    testingEmail
                                                                                                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                                                                        : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-100 dark:border-blue-900 shadow-sm"
                                                                                                                )}
                                                                                                            >
                                                                                                                <Mail className={cn("w-3 h-3", testingEmail && "animate-pulse")} />
                                                                                                                {testingEmail ? 'Enviando...' : 'Probar Configuración'}
                                                                                                            </button>
                                                                                                        </div>
                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Host SMTP</label>
                                                                                                                <input type="text" value={editingAction.config?.email_smtp_host || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_smtp_host: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Ej: smtp.gmail.com" />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Puerto</label>
                                                                                                                <input type="number" value={editingAction.config?.email_smtp_port || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_smtp_port: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Ej: 587 o 465" />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Usuario (Correo Emisor)</label>
                                                                                                                <input type="text" value={editingAction.config?.email_smtp_user || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_smtp_user: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Ej: info@empresa.com" />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Contraseña de Aplicación</label>
                                                                                                                <input type="password" value={editingAction.config?.email_smtp_pass || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_smtp_pass: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="********" />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-3 mt-4 p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
                                                                                                            <input
                                                                                                                type="checkbox"
                                                                                                                id="smtp_secure"
                                                                                                                checked={editingAction.config?.email_smtp_secure ?? true}
                                                                                                                onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_smtp_secure: e.target.checked })}
                                                                                                                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                                                                                            />
                                                                                                            <label htmlFor="smtp_secure" className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">Usar conexión segura (SSL/TLS recomendado)</label>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {editingAction.type === 'whatsapp' && (
                                                                                                <div className="space-y-6 p-8 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800/20 animate-in zoom-in-95">
                                                                                                    <div className="flex items-center gap-3 mb-6">
                                                                                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400">
                                                                                                            <MessageSquare className="w-5 h-5" />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <h5 className="text-sm font-black text-emerald-900 dark:text-emerald-100">Notificación por WhatsApp</h5>
                                                                                                            <p className="text-[10px] uppercase font-bold text-emerald-600/60 dark:text-emerald-400/60 tracking-widest mt-0.5">Envía alertas instantáneas</p>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="space-y-4">
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-emerald-700/70 dark:text-emerald-400/70 uppercase mb-2 ml-1">Número Destino (Ej: +573001234567 o {"{{telefono}}"})</label>
                                                                                                            <input type="text" value={editingAction.config?.whatsapp_number || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { whatsapp_number: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-bold" placeholder="+573001234567" />
                                                                                                            <FormulaValidationFeedback value={editingAction.config?.whatsapp_number || ''} availableFields={availableFields} />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-emerald-700/70 dark:text-emerald-400/70 uppercase mb-2 ml-1">Mensaje (Usa {"{{variables}}"})</label>
                                                                                                            <textarea rows={5} value={editingAction.config?.whatsapp_message || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { whatsapp_message: e.target.value })} className="w-full p-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-medium resize-none shadow-sm" placeholder="Hola, tu trámite {{id_tramite}} ha sido aprobado..." />
                                                                                                            <FormulaValidationFeedback value={editingAction.config?.whatsapp_message || ''} availableFields={availableFields} />
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    <div className="pt-6 mt-6 border-t border-emerald-200 dark:border-emerald-800/30 space-y-4">
                                                                                                        <div className="flex items-center justify-between mb-4">
                                                                                                            <h6 className="text-[10px] font-black tracking-widest uppercase text-emerald-700/70 dark:text-emerald-400/70">Conexión API (Proveedor)</h6>
                                                                                                        </div>
                                                                                                        <div className="grid grid-cols-2 gap-4">
                                                                                                            <div className="col-span-2">
                                                                                                                <label className="block text-[8px] font-black text-emerald-700/70 dark:text-emerald-400/70 uppercase mb-2 ml-1">Tipo de Integración</label>
                                                                                                                <select
                                                                                                                    value={editingAction.config?.whatsapp_provider || 'evolution'}
                                                                                                                    onChange={(e) => handleUpdateActionConfig(editingActionId!, { whatsapp_provider: e.target.value as any })}
                                                                                                                    className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
                                                                                                                >
                                                                                                                    <option value="evolution">Evolution API / API Wha (Recomendado)</option>
                                                                                                                    <option value="ultramsg">UltraMsg</option>
                                                                                                                    <option value="meta">Oficial: WhatsApp Cloud API (Meta)</option>
                                                                                                                    <option value="generic">Webhook Genérico JSON</option>
                                                                                                                </select>
                                                                                                            </div>
                                                                                                            <div className="col-span-2">
                                                                                                                <label className="block text-[8px] font-black text-emerald-700/70 dark:text-emerald-400/70 uppercase mb-2 ml-1">Endpoint (URL de la API)</label>
                                                                                                                <input type="text" value={editingAction.config?.whatsapp_api_url || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { whatsapp_api_url: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-mono" placeholder="Ej: https://api.tu-proveedor.com/message/sendText/..." />
                                                                                                            </div>
                                                                                                            <div className="col-span-2">
                                                                                                                <label className="block text-[8px] font-black text-emerald-700/70 dark:text-emerald-400/70 uppercase mb-2 ml-1">Api Key o Token de Acceso</label>
                                                                                                                <input type="password" value={editingAction.config?.whatsapp_token || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { whatsapp_token: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-mono" placeholder="Ingresa tu clave secreta de acceso" />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {(editingAction.type === 'webhook' || editingAction.type === 'soap') && (
                                                                                                <div className="space-y-6">
                                                                                                    <div className="flex items-center justify-between">
                                                                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secuencia de Peticiones</h5>
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                const newStep = { id: crypto.randomUUID(), url: '', method: 'POST', auth_type: 'none' as const };
                                                                                                                handleUpdateActionConfig(editingActionId!, {
                                                                                                                    steps: [...(editingAction.config?.steps || []), newStep]
                                                                                                                });
                                                                                                            }}
                                                                                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                                                                                                        >
                                                                                                            + Añadir Endpoint
                                                                                                        </button>
                                                                                                    </div>

                                                                                                    <div className="space-y-4">
                                                                                                        {(editingAction.config?.steps || []).map((step, sIdx) => (
                                                                                                            <div key={step.id} className="p-8 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6 animate-in slide-in-from-bottom-2">
                                                                                                                <div className="flex items-center justify-between">
                                                                                                                    <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Endpoint {sIdx + 1}</span>
                                                                                                                    <button onClick={() => {
                                                                                                                        handleUpdateActionConfig(editingActionId!, {
                                                                                                                            steps: editingAction.config?.steps?.filter(s => s.id !== step.id)
                                                                                                                        });
                                                                                                                    }} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                                                                                </div>
                                                                                                                <div className="grid grid-cols-4 gap-4">
                                                                                                                    <div className="col-span-3">
                                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">URL</label>
                                                                                                                        <input type="text" value={step.url} onChange={(e) => {
                                                                                                                            handleUpdateActionConfig(editingActionId!, {
                                                                                                                                steps: editingAction.config?.steps?.map(s => s.id === step.id ? { ...s, url: e.target.value } : s)
                                                                                                                            });
                                                                                                                        }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                                        <FormulaValidationFeedback value={step.url || ''} availableFields={availableFields} />
                                                                                                                    </div>
                                                                                                                    <div>
                                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Método</label>
                                                                                                                        <select value={step.method} onChange={(e) => {
                                                                                                                            handleUpdateActionConfig(editingActionId!, {
                                                                                                                                steps: editingAction.config?.steps?.map(s => s.id === step.id ? { ...s, method: e.target.value } : s)
                                                                                                                            });
                                                                                                                        }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                                                                                                                            <option value="GET">GET</option>
                                                                                                                            <option value="POST">POST</option>
                                                                                                                            <option value="PUT">PUT</option>
                                                                                                                            <option value="DELETE">DELETE</option>
                                                                                                                        </select>
                                                                                                                    </div>
                                                                                                                </div>

                                                                                                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                                                                                                    <div>
                                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Autenticación</label>
                                                                                                                        <select value={step.auth_type || 'none'} onChange={(e) => {
                                                                                                                            handleUpdateActionConfig(editingActionId!, {
                                                                                                                                steps: editingAction.config?.steps?.map(s => s.id === step.id ? { ...s, auth_type: e.target.value as any } : s)
                                                                                                                            });
                                                                                                                        }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                                                                                                                            <option value="none">Ninguna</option>
                                                                                                                            <option value="bearer">Bearer Token</option>
                                                                                                                            <option value="basic">Basic Auth</option>
                                                                                                                        </select>
                                                                                                                    </div>
                                                                                                                    {step.auth_type !== 'none' && (
                                                                                                                        <div>
                                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Token / Credenciales</label>
                                                                                                                            <input type="password" value={step.auth_token || ''} onChange={(e) => {
                                                                                                                                handleUpdateActionConfig(editingActionId!, {
                                                                                                                                    steps: editingAction.config?.steps?.map(s => s.id === step.id ? { ...s, auth_token: e.target.value } : s)
                                                                                                                                });
                                                                                                                            }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                </div>

                                                                                                                <div>
                                                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase ml-1">Cuerpo (JSON/XML) y Headers</label>
                                                                                                                        <input type="text" value={step.output_variable || ''} onChange={(e) => {
                                                                                                                            handleUpdateActionConfig(editingActionId!, {
                                                                                                                                steps: editingAction.config?.steps?.map(s => s.id === step.id ? { ...s, output_variable: e.target.value } : s)
                                                                                                                            });
                                                                                                                        }} className="bg-transparent border-none text-[8px] font-bold text-blue-600 focus:outline-none w-32 text-right" placeholder="Variable de salida..." title="Guardar respuesta en..." />
                                                                                                                    </div>
                                                                                                                    <textarea rows={3} value={step.body || ''} onChange={(e) => {
                                                                                                                        handleUpdateActionConfig(editingActionId!, {
                                                                                                                            steps: editingAction.config?.steps?.map(s => s.id === step.id ? { ...s, body: e.target.value } : s)
                                                                                                                        });
                                                                                                                    }} className="w-full p-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono" />
                                                                                                                    <FormulaValidationFeedback value={step.body || ''} availableFields={availableFields} />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {editingAction.type === 'document_generation' && (
                                                                                                <div className="space-y-6 p-8 bg-violet-50/50 dark:bg-violet-900/10 rounded-[2.5rem] border border-violet-100 dark:border-violet-800/50 animate-in zoom-in-95">
                                                                                                    <div>
                                                                                                        <h4 className="text-sm font-black text-violet-900 dark:text-violet-100 tracking-tight flex items-center gap-2 mb-1">
                                                                                                            <FileSignature className="w-4 h-4" /> Generación de Documento
                                                                                                        </h4>
                                                                                                        <p className="text-[10px] text-violet-600/70 dark:text-violet-400/70 font-medium">Reemplaza las variables {"{{campo}}"} con datos en un Word.</p>
                                                                                                    </div>

                                                                                                    <div className="grid grid-cols-2 gap-6">
                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Generación</label>
                                                                                                            <select
                                                                                                                value={editingAction.config?.document_generation_type || 'generic'}
                                                                                                                onChange={(e) => {
                                                                                                                    const type = e.target.value;
                                                                                                                    const updates: any = { document_generation_type: type };
                                                                                                                    if (type === 'generic') {
                                                                                                                        updates.document_generation_format = 'pdf';
                                                                                                                        updates.document_generation_include_logo = true;
                                                                                                                    }
                                                                                                                    handleUpdateActionConfig(editingActionId!, updates);
                                                                                                                }}
                                                                                                                className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                                                                                                            >
                                                                                                                <option value="generic">Reporte Automático (PDF Genérico)</option>
                                                                                                                <option value="template">Basado en Plantilla (Word/Excel)</option>
                                                                                                            </select>
                                                                                                        </div>

                                                                                                        <div>
                                                                                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Formato Final</label>
                                                                                                            <select
                                                                                                                disabled={editingAction.config?.document_generation_type === 'generic'}
                                                                                                                value={editingAction.config?.document_generation_format || (editingAction.config?.document_generation_type === 'generic' ? 'pdf' : 'docx')}
                                                                                                                onChange={(e) => handleUpdateActionConfig(editingActionId!, { document_generation_format: e.target.value as "pdf" | "docx" | "xlsx" })}
                                                                                                                className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold disabled:opacity-50"
                                                                                                            >
                                                                                                                {editingAction.config?.document_generation_type === 'generic' ? (
                                                                                                                    <option value="pdf">Archivo PDF (.pdf)</option>
                                                                                                                ) : (
                                                                                                                    <>
                                                                                                                        <option value="docx">Microsoft Word (.docx)</option>
                                                                                                                        <option value="xlsx">Microsoft Excel (.xlsx)</option>
                                                                                                                    </>
                                                                                                                )}
                                                                                                            </select>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {editingAction.config?.document_generation_type === 'template' && (
                                                                                                        <div className="grid grid-cols-1 gap-6 animate-in slide-in-from-top-2 duration-300">
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1 text-center">Seleccionar Plantilla de Origen</label>
                                                                                                                {workflowTemplates.length === 0 ? (
                                                                                                                    <div className="flex flex-col gap-2">
                                                                                                                        <div className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-900/50 p-3 rounded-xl flex items-center justify-between">
                                                                                                                            <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> No hay plantillas</span>
                                                                                                                            <button
                                                                                                                                type="button"
                                                                                                                                onClick={() => setIsTemplateManagerOpen(true)}
                                                                                                                                className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] uppercase font-bold tracking-wider"
                                                                                                                            >
                                                                                                                                Subir
                                                                                                                            </button>
                                                                                                                        </div>
                                                                                                                    </div>
                                                                                                                ) : (
                                                                                                                    <select
                                                                                                                        value={editingAction.config?.document_generation_template_id || ''}
                                                                                                                        onChange={(e) => handleUpdateActionConfig(editingActionId!, { document_generation_template_id: e.target.value })}
                                                                                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                                                                                                                    >
                                                                                                                        <option value="">Seleccione una plantilla...</option>
                                                                                                                        {workflowTemplates.map(t => (
                                                                                                                            <option key={t.id} value={t.id}>{t.name}</option>
                                                                                                                        ))}
                                                                                                                    </select>
                                                                                                                )}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}

                                                                                                    <div>
                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Nombre Base de Archivo Generado</label>
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={editingAction.config?.document_generation_filename_pattern || ''}
                                                                                                            onChange={(e) => handleUpdateActionConfig(editingActionId!, { document_generation_filename_pattern: e.target.value })}
                                                                                                            className="w-full h-10 px-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                                                                                                            placeholder="Ej: Contrato_{{nombre_cliente}}"
                                                                                                        />
                                                                                                        <FormulaValidationFeedback value={editingAction.config?.document_generation_filename_pattern || ''} availableFields={availableFields} />
                                                                                                    </div>

                                                                                                    {/* Opciones de Logo - Solo visibles si el resultado es PDF */}
                                                                                                    {(editingAction.config?.document_generation_type === 'generic' || editingAction.config?.document_generation_format === 'pdf') && (
                                                                                                        <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-violet-300 dark:hover:border-violet-500/30 animate-in fade-in slide-in-from-bottom-2">
                                                                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                                                                <input
                                                                                                                    type="checkbox"
                                                                                                                    checked={editingAction.config?.document_generation_include_logo || false}
                                                                                                                    onChange={(e) => handleUpdateActionConfig(editingActionId!, { document_generation_include_logo: e.target.checked })}
                                                                                                                    className="sr-only peer"
                                                                                                                />
                                                                                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
                                                                                                            </label>
                                                                                                            <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Incluir Logo de Empresa (Solo en PDF)</span>
                                                                                                        </div>
                                                                                                    )}

                                                                                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                                                                                                        <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium italic">
                                                                                                            {editingAction.config?.document_generation_type === 'template' ? (
                                                                                                                "* Las plantillas conservan 100% tu diseño original en Word/Excel."
                                                                                                            ) : (
                                                                                                                "* El reporte automático PDF incluye todos los campos y el logo corporativo."
                                                                                                            )}
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    )}
                                                                                </div >
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div >
                                                        )}

                                                        {activeTab === 'transitions' && (
                                                            <div className="space-y-6 animate-fadeIn">
                                                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Salidas Disponibles</h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    {transitions.filter(t => t.source_id === selectedActivityId).map(t => {
                                                                        const target = activities.find(a => a.id === t.target_id);
                                                                        return (
                                                                            <div key={t.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-500 transition-all group/trans">
                                                                                <div className="flex items-center justify-between mb-4">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600">
                                                                                            <GitBranch className="w-4 h-4" />
                                                                                        </div>
                                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hacia: {target?.name}</span>
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => deleteTransition(t.id)}
                                                                                        className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/trans:opacity-100"
                                                                                    >
                                                                                        <X className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Condición de Activación (JS)</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={t.condition || ''}
                                                                                    onChange={(e) => {
                                                                                        const cond = e.target.value;
                                                                                        setTransitions(prev => prev.map(tr => tr.id === t.id ? { ...tr, condition: cond } : tr));
                                                                                    }}
                                                                                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                                                                                    placeholder="Ej: valor_total > 1000"
                                                                                />
                                                                                {t.condition && (
                                                                                    <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-2 font-bold italic">
                                                                                        Vista previa: {translateCondition(t.condition, activities.find(a => a.id === t.source_id)?.fields || [])}
                                                                                    </p>
                                                                                )}
                                                                                <p className="text-[10px] text-slate-400 mt-2 italic">Deja vacío para transición por defecto.</p>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                {transitions.filter(t => t.source_id === selectedActivityId).length === 0 && (
                                                                    <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                                                                        <p className="text-slate-400 italic">No hay salidas configuradas para esta actividad.</p>
                                                                        <p className="text-[10px] uppercase font-black text-slate-300 mt-2 tracking-widest">Crea una flecha en el lienzo para añadir una salida</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : selectedTransitionId ? (
                                                <div className="p-12 animate-fadeIn">
                                                    <div className="max-w-xl space-y-8">
                                                        <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[1.5rem] border border-indigo-100 dark:border-indigo-800">
                                                            <h4 className="text-xl font-black text-indigo-900 dark:text-indigo-100 mb-4 flex items-center gap-3">
                                                                <GitBranch className="w-6 h-6" />
                                                                Lógica de Salto
                                                            </h4>
                                                            <div className="space-y-6">
                                                                <div>
                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Condición Lógica (Javascript)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={transitions.find(t => t.id === selectedTransitionId)?.condition || ''}
                                                                        onChange={(e) => {
                                                                            const cond = e.target.value;
                                                                            setTransitions(prev => prev.map(t => t.id === selectedTransitionId ? { ...t, condition: cond } : t));
                                                                        }}
                                                                        className="w-full px-5 py-4 bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-900/50 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-indigo-600 dark:text-indigo-400"
                                                                        placeholder="Ej: decision_gerente === 'Aprobado'"
                                                                    />
                                                                    {transitions.find(t => t.id === selectedTransitionId)?.condition && (
                                                                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3 font-bold italic">
                                                                            Vista previa: {translateCondition(
                                                                                transitions.find(t => t.id === selectedTransitionId)?.condition,
                                                                                activities.find(a => a.id === transitions.find(t => t.id === selectedTransitionId)?.source_id)?.fields || []
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-4 p-4 bg-white/60 dark:bg-slate-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                                                                    <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                                                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                                                        Usa los nombres de los campos definidos en la actividad anterior para crear validaciones complejas.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <button
                                                                onClick={() => deleteTransition(selectedTransitionId!)}
                                                                className="px-6 py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl font-black hover:bg-rose-100 transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Eliminar Transición
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-12 text-center animate-fadeIn">
                                                    <p className="text-slate-400 italic">Selecciona una actividad o transición para editar sus propiedades.</p>
                                                    <p className="text-[10px] uppercase font-black text-slate-300 mt-2 tracking-widest">Haz click en el lienzo para deseleccionar</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </section>
            </div >


            <SOPGenerator
                isOpen={showSOPGenerator}
                onClose={() => setShowSOPGenerator(false)}
                workflow={workflow}
                activities={activities}
                transitions={transitions}
            />

            <TemplateManager
                isOpen={isTemplateManagerOpen}
                onClose={() => setIsTemplateManagerOpen(false)}
                workflowId={workflow.id}
            />

            {
                showFormPreview && selectedActivityId && (
                    <FormPreviewModal
                        workflowName={workflowName}
                        activityName={activities.find(a => a.id === selectedActivityId)?.name || ''}
                        fields={activities.find(a => a.id === selectedActivityId)?.fields || []}
                        formColumns={activities.find(a => a.id === selectedActivityId)?.form_columns}
                        onClose={() => {
                            setShowFormPreview(false);
                            setSelectedPreviewFieldId(null);
                        }}
                        onAddField={handleAddField}
                        onUpdateField={handleUpdateField}
                        onDeleteField={handleDeleteField}
                        onReorderFields={handleReorderFields}
                        onSave={handleSave}
                        isReadOnly={isReadOnly}
                        dbTables={lookupData.dbTables}
                        tableColumnsMap={tableColumnsMap}
                        onFetchColumns={fetchColumnsForTable}
                        initialSelectedFieldId={selectedPreviewFieldId}
                        initialShowAdvanced={!!selectedPreviewFieldId}
                        isFirstActivity={
                            activities.find(a => a.id === selectedActivityId)?.type === 'start' ||
                            !transitions.some(t => t.target_id === selectedActivityId)
                        }
                        previousActivities={activities.filter(a => {
                            const hasPath = transitions.some(t =>
                                t.target_id === selectedActivityId &&
                                (t.source_id === a.id || activities.some(intermediate =>
                                    transitions.some(t1 => t1.source_id === a.id && t1.target_id === intermediate.id) &&
                                    transitions.some(t2 => t2.source_id === intermediate.id && t2.target_id === selectedActivityId)
                                ))
                            );
                            return a.id !== selectedActivityId && a.fields && a.fields.length > 0 && hasPath;
                        })}
                    />
                )
            }

            {/* Workflow General Config Modal */}
            {
                showWorkflowConfig && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100 dark:border-slate-800 pointer-events-auto">
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Configuración del Flujo
                                </h3>
                                <button onClick={() => setShowWorkflowConfig(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre del Proceso</label>
                                    <input
                                        type="text"
                                        value={workflowName}
                                        onChange={(e) => setWorkflowName(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Descripción</label>
                                    <textarea
                                        rows={2}
                                        value={workflowDesc}
                                        onChange={(e) => setWorkflowDesc(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-widest">Plantilla de Nombre</label>
                                    <input
                                        type="text"
                                        value={workflowTemplate}
                                        onChange={(e) => setWorkflowTemplate(e.target.value)}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Estado</label>
                                    <select
                                        value={workflowStatus}
                                        onChange={(e) => setWorkflowStatus(e.target.value as any)}
                                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 text-xs shadow-sm appearance-none cursor-pointer"
                                    >
                                        <option value="draft">Borrador</option>
                                        <option value="active">Activo</option>
                                        <option value="archived">Archivado</option>
                                    </select>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        onClick={async () => {
                                            const { error } = await supabase
                                                .from('workflows')
                                                .update({
                                                    name: workflowName,
                                                    description: workflowDesc,
                                                    name_template: workflowTemplate,
                                                    status: workflowStatus
                                                })
                                                .eq('id', workflow.id);

                                            if (error) {
                                                alert('Error al actualizar: ' + error.message);
                                            } else {
                                                setShowWorkflowConfig(false);
                                            }
                                        }}
                                        className="flex-1 py-3.5 px-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                                    >
                                        Guardar Ajustes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Delete Activity Confirmation Modal */}
            {
                deletePendingId && (
                    <div className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md shadow-2xl border border-white/10 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                            {workflow.status === 'active' ? (
                                <>
                                    {/* Published — suggest new version */}
                                    <div className="bg-amber-500 px-8 py-6 flex items-start gap-4">
                                        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Globe className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white leading-tight">Flujo Publicado</h3>
                                            <p className="text-amber-100 text-[11px] font-bold mt-0.5 leading-snug">No puedes modificar un flujo activo con trámites en curso</p>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-5">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            Este flujo está <span className="font-black text-amber-600">publicado</span> y puede tener trámites activos. Eliminar una actividad podría romper los procesos en ejecución.
                                        </p>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
                                            <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5">💡 Recomendación</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                                Crea una <strong>nueva versión en borrador</strong>, realiza tus cambios y publícala cuando esté lista. El flujo actual seguirá activo para los trámites en curso.
                                            </p>
                                        </div>
                                        <div className="flex gap-3 pt-1">
                                            <button
                                                onClick={() => setDeletePendingId(null)}
                                                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-[10px] uppercase tracking-widest"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleCreateNewVersion}
                                                disabled={creatingVersion}
                                                className="flex-1 py-3 px-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 text-[10px] uppercase tracking-widest disabled:opacity-60 flex items-center justify-center gap-2"
                                            >
                                                {creatingVersion ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Creando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <GitBranch className="w-4 h-4" />
                                                        Nueva Versión
                                                    </>
                                                )}
                                            </button>
                                            {user?.email?.toLowerCase() === 'ccantor@gmail.com' && (
                                                <button
                                                    onClick={confirmDeleteActivity}
                                                    className="flex-1 py-3 px-4 bg-rose-500/10 text-rose-500 font-black rounded-xl hover:bg-rose-500 hover:text-white transition-all text-[8px] leading-tight uppercase tracking-widest border border-rose-500/20 active:scale-95"
                                                >
                                                    bajo su responsabilidad
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Draft — simple confirmation */}
                                    <div className="bg-rose-500 px-8 py-6 flex items-start gap-4">
                                        <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Trash2 className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white leading-tight">Eliminar Actividad</h3>
                                            <p className="text-rose-100 text-[11px] font-bold mt-0.5 leading-snug">Esta acción no se puede deshacer</p>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-5">
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            ¿Estás seguro de que deseas eliminar la actividad <strong className="text-slate-900 dark:text-white">"{activities.find(a => a.id === deletePendingId)?.name || 'esta actividad'}"</strong>?
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                                            También se eliminarán todas las conexiones (transiciones) asociadas a esta actividad.
                                        </p>
                                        <div className="flex gap-3 pt-1">
                                            <button
                                                onClick={() => setDeletePendingId(null)}
                                                className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-[10px] uppercase tracking-widest"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={confirmDeleteActivity}
                                                className="flex-1 py-3 px-4 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-200 dark:shadow-none active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Sí, Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    );
}

function ToolboxItem({ icon: Icon, label, color, onDragStart }: { icon: any, label: string, color: 'emerald' | 'blue' | 'orange' | 'rose' | 'purple' | 'amber' | 'violet', onDragStart: (e: React.DragEvent) => void }) {
    const colors_map = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-900/40",
        blue: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50 dark:hover:bg-blue-900/40",
        orange: "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-900/40",
        rose: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50 dark:hover:bg-rose-900/40",
        purple: "bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50 dark:hover:bg-purple-900/40",
        amber: "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/50 dark:hover:bg-amber-900/40",
        violet: "bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800/50 dark:hover:bg-violet-900/40",
    };

    const selectedColor = colors_map[color as keyof typeof colors_map];

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e)}
            className={`p-1.5 rounded-xl border ${selectedColor} flex items-center gap-2.5 cursor-grab transition-all shadow-sm active:cursor-grabbing active:scale-95 group`}
        >
            <div className={`p-1.5 rounded-lg bg-white/60 dark:bg-black/40 shadow-inner group-hover:scale-110 transition-transform`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[0.12em]">{label}</span>
                <span className="text-[8px] opacity-60 font-medium">Click o arrastre</span>
            </div>
        </div>
    );
}

