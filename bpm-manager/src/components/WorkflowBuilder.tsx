import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, GitBranch, Play, Square, AlertCircle, Trash2, ZoomIn, ZoomOut, Maximize, Maximize2, Minimize2, X, Edit2, CheckCircle2, ChevronUp, ChevronDown, Eye, Activity as ActivityIcon, Download, FileUp, Users, Zap, Dices, BarChart2, Inbox, Link, Code, Mail, Settings2, Clock, FolderOpen, Wand2 } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Workflow, Activity, Transition, ActivityType, FieldDefinition, AutomatedAction, AutomatedActionType, AssignmentType, AssignmentStrategy } from '../types';
import { exportToBPMN, importFromBPMN } from '../utils/bpmnConverter';
import { translateCondition } from '../utils/conditions';

import { useWorkflowModeler } from '../hooks/useWorkflowModeler';
import { supabase } from '../lib/supabase';

import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { SOPGenerator } from './SOPGenerator';
import { FormPreviewModal } from './FormPreviewModal';
import { DetailsManagerModal } from './DetailsManagerModal';
import { AIWorkflowGeneratorModal } from './AIWorkflowGeneratorModal';


interface WorkflowBuilderProps {
    workflow: Workflow;
    onBack: () => void;
}

export function WorkflowBuilder({ workflow, onBack }: WorkflowBuilderProps) {
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
        saveModel
    } = useWorkflowModeler(workflow.id);

    const [draggedType, setDraggedType] = useState<ActivityType | null>(null);
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
    const [draggedActivityId, setDraggedActivityId] = useState<string | null>(null);
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
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [activeTab, setActiveTab] = useState<'general' | 'fields' | 'transitions' | 'assignment' | 'actions'>('general');
    const [lookupData, setLookupData] = useState<{
        departments: any[],
        positions: any[],
        users: any[],
        dbTables: string[]
    }>({ departments: [], positions: [], users: [], dbTables: [] });
    const [tableColumnsMap, setTableColumnsMap] = useState<Record<string, string[]>>({});
    const [editingActionId, setEditingActionId] = useState<string | null>(null);

    React.useEffect(() => {
        const fetchLookupData = async () => {
            const [depts, positions, users, tablesRes] = await Promise.all([
                supabase.from('departments').select('id, name').order('name'),
                supabase.from('positions').select('id, title, department_id').order('title'),
                supabase.from('profiles').select('id, email, full_name').order('email'),
                supabase.rpc('get_database_tables')
            ]);
            setLookupData({
                departments: depts.data || [],
                positions: positions.data || [],
                users: users.data || [],
                dbTables: tablesRes.data ? (tablesRes.data as any[]).map(t => t.table_name) : []
            });

            // Fetch columns for any existing database lookups on load
            activities.forEach(a => {
                a.fields?.forEach(f => {
                    if (f.type === 'lookup' && f.lookup_config?.type === 'database' && f.lookup_config.table_name) {
                        fetchColumnsForTable(f.lookup_config.table_name);
                    }
                });
            });
        };
        fetchLookupData();
    }, [activities]); // Added activities dependency to check initial state

    // Load columns for a given table when selected
    const fetchColumnsForTable = async (tableName: string) => {
        if (!tableName || tableColumnsMap[tableName]) return;
        try {
            const { data } = await supabase.rpc('get_table_columns', { p_table_name: tableName });
            if (data) {
                setTableColumnsMap(prev => ({ ...prev, [tableName]: data.map((c: any) => c.column_name) }));
            }
        } catch (err) {
            console.error('Error fetching columns linking to', tableName, err);
        }
    };

    const [isFocusMode, setIsFocusMode] = useState(false);

    const handleDragStartToolbox = (type: ActivityType) => {
        setDraggedType(type);
        setDraggedActivityId(null);
        setSelectedActivityId(null);
        setSelectedTransitionId(null);
        setConnectionSourceId(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (draggedType) {
            const x_room = (x - offset.x) / zoom;
            const y_room = (y - offset.y) / zoom;
            const newActivity: Activity = {
                id: crypto.randomUUID(),
                workflow_id: workflow.id,
                name: `Nueva ${draggedType}`,
                type: draggedType,
                x_pos: Math.round(x_room - 24),
                y_pos: Math.round(y_room - 24),
            };
            setActivities(prev => [...prev, newActivity]);
            setDraggedType(null);
        } else if (draggedActivityId) {
            const x_room = (x - offset.x) / zoom;
            const y_room = (y - offset.y) / zoom;
            // Move existing activity
            setActivities(prev => prev.map(a =>
                a.id === draggedActivityId
                    ? { ...a, x_pos: Math.round(x_room - 24), y_pos: Math.round(y_room - 24) }
                    : a
            ));
            setDraggedActivityId(null);
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

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const scaleFactor = 1.1;
        const newZoom = delta > 0 ? zoom * scaleFactor : zoom / scaleFactor;

        // Limit zoom
        const limitedZoom = Math.min(Math.max(newZoom, 0.2), 3);
        setZoom(limitedZoom);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Check if we are clicking on the background (the section or the grid div)
        const isBackground = e.target === e.currentTarget || (e.target as HTMLElement).className.includes('bg-[radial-gradient');

        // Pan with middle-click, right-click, OR left-click only on the background
        if (e.button === 1 || e.button === 2 || (e.button === 0 && isBackground)) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
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
            if (isDoubleClick) {
                setShowPropertiesModal(true);
            }
        }
    };

    const deleteActivity = (id: string) => {
        setActivities(prev => prev.filter(a => a.id !== id));
        setTransitions(prev => prev.filter(t => t.source_id !== id && t.target_id !== id));
        if (selectedActivityId === id) setSelectedActivityId(null);
        if (connectionSourceId === id) setConnectionSourceId(null);
    };

    const deleteTransition = (id: string) => {
        setTransitions(prev => prev.filter(t => t.id !== id));
    };

    const handleSave = async () => {
        const { success, error } = await saveModel(activities, transitions);
        if (success) {
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
        } else {
            alert('Error al guardar el flujo: ' + (error || 'Desconocido'));
        }
    };

    const handlePublish = async () => {
        const { success } = await saveModel(activities, transitions);
        if (success) {
            const { error: pubError } = await supabase
                .from('workflows')
                .update({ status: 'active' })
                .eq('id', workflow.id);

            if (pubError) {
                alert('Error al publicar: ' + pubError.message);
            } else {
                alert('¡Flujo publicado con éxito! Ahora puedes iniciar trámites.');
                onBack();
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
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

                        {!isFocusMode && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSave}
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
                {!isFocusMode && (
                    <aside className="w-52 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col gap-4 shadow-sm overflow-y-auto animate-in slide-in-from-left duration-300 transition-colors">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Herramientas</h3>
                            </div>
                            <div className="space-y-1.5">
                                <ToolboxItem icon={Play} label="Inicio" color="emerald" onDragStart={() => handleDragStartToolbox('start')} />
                                <ToolboxItem icon={Square} label="Tarea" color="blue" onDragStart={() => handleDragStartToolbox('task')} />
                                <ToolboxItem icon={AlertCircle} label="Decisión" color="orange" onDragStart={() => handleDragStartToolbox('decision')} />
                                <ToolboxItem icon={Square} label="Fin" color="rose" onDragStart={() => handleDragStartToolbox('end')} />
                            </div>
                        </div>


                    </aside>
                )}

                {/* Canvas Area */}
                <section
                    className={`flex-1 bg-slate-50 dark:bg-[#0f172a] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 relative overflow-hidden shadow-inner group ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onContextMenu={(e) => {
                        if (isPanning) e.preventDefault();
                    }}
                    onClick={() => {
                        if (selectedActivityId || selectedTransitionId) return;
                        setSelectedActivityId(null);
                        setSelectedTransitionId(null);
                        setConnectionSourceId(null);
                        setEditingActionId(null);
                    }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1.2px,transparent_1.2px)] opacity-[0.15] dark:opacity-[0.1]"
                        style={{
                            backgroundPosition: `${offset.x}px ${offset.y}px`,
                            backgroundSize: `${24 * zoom}px ${24 * zoom}px`
                        }}></div>



                    <div className="absolute inset-0 z-10 pointer-events-none"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            transformOrigin: '0 0'
                        }}>
                        <svg className="absolute inset-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill={document.documentElement.classList.contains('dark') ? "#94a3b8" : "#334155"} />
                                </marker>
                                <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                                </marker>
                            </defs>
                            {transitions.map((transition) => {
                                const source = activities.find(a => a.id === transition.source_id);
                                const target = activities.find(a => a.id === transition.target_id);
                                if (!source || !target) return null;
                                return (
                                    <TransitionArrow
                                        key={transition.id}
                                        transition={transition}
                                        source={source}
                                        target={target}
                                        isSelected={selectedTransitionId === transition.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTransitionId(transition.id);
                                            setSelectedActivityId(null);
                                            // Optional: double click for transition props too
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedTransitionId(transition.id);
                                            setSelectedActivityId(null);
                                            setShowPropertiesModal(true);
                                        }}
                                    />
                                );
                            })}
                        </svg>

                        {activities.map((activity) => (
                            <ActivityNode
                                activity={activity}
                                isSelected={selectedActivityId === activity.id}
                                isConnectionSource={connectionSourceId === activity.id}
                                isDragging={draggedActivityId === activity.id}
                                onDragStart={() => {
                                    setDraggedActivityId(activity.id);
                                    setSelectedActivityId(null);
                                    setConnectionSourceId(null);
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleNodeClick(activity.id);
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    handleNodeClick(activity.id, true);
                                }}
                                outgoingTransitions={transitions.filter(t => t.source_id === activity.id).length}
                                zoom={zoom}
                            />
                        ))}
                    </div>

                    {activities.length === 0 && !offset.x && !offset.y && !isFocusMode && (
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
                    </div>

                    {/* Details Manager Modal */}
                    {showDetailsManager && (
                        <DetailsManagerModal
                            workflowId={workflow.id}
                            details={details}
                            setDetails={setDetails}
                            onClose={() => setShowDetailsManager(false)}
                            onSave={() => {
                                handleSave();
                            }}
                        />
                    )}

                    {/* AI Generator Modal */}
                    <AIWorkflowGeneratorModal
                        isOpen={showAIGenerator}
                        onClose={() => setShowAIGenerator(false)}
                        onGenerate={(generatedActivities, method) => {
                            if (method === 'replace') {
                                setActivities(generatedActivities);
                                setTransitions([]); // Clear transitions since nodes changed
                            } else {
                                // Append
                                setActivities(prev => [...prev, ...generatedActivities]);
                            }
                            // Auto layout to organize the newly generated linear flow
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
                                                onClick={handleSave}
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
                                                    { id: 'fields', label: 'Campos y Formulario', icon: Plus },
                                                    { id: 'assignment', label: 'Asignación', icon: Users },
                                                    { id: 'actions', label: 'Acciones Automáticas', icon: Zap },
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

                                                        {/* Maestro-Detalles (Carpetas) Asociadas */}
                                                        {details.length > 0 && (
                                                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <FolderOpen className="w-5 h-5 text-indigo-500" />
                                                                    <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-[0.1em]">Carpetas (Detalles) Asociadas</label>
                                                                </div>
                                                                <p className="text-xs text-slate-500 mb-4 ml-1">Seleccione qué sub-carpetas de registros iterables estarán disponibles durante este paso.</p>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {details.map(detail => {
                                                                        const activity = activities.find(a => a.id === selectedActivityId);
                                                                        const isSelected = activity?.associated_details?.includes(detail.id) || false;
                                                                        return (
                                                                            <label
                                                                                key={detail.id}
                                                                                className={cn(
                                                                                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                                                    isSelected ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-inner" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-200"
                                                                                )}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isSelected}
                                                                                    onChange={(e) => {
                                                                                        const checked = e.target.checked;
                                                                                        setActivities(prev => prev.map(a => {
                                                                                            if (a.id === selectedActivityId) {
                                                                                                const currentDetails = a.associated_details || [];
                                                                                                const nextDetails = checked
                                                                                                    ? [...currentDetails, detail.id]
                                                                                                    : currentDetails.filter(id => id !== detail.id);
                                                                                                return { ...a, associated_details: nextDetails };
                                                                                            }
                                                                                            return a;
                                                                                        }));
                                                                                    }}
                                                                                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                                                                                />
                                                                                <span className={cn("text-xs font-bold truncate", isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300")}>
                                                                                    {detail.name}
                                                                                </span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800/50">
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('¿Estás seguro de eliminar esta actividad? Se perderán sus campos y transiciones.')) {
                                                                        deleteActivity(selectedActivityId);
                                                                    }
                                                                }}
                                                                className="flex items-center gap-2 px-6 py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl font-black hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-all uppercase text-[10px] tracking-widest"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Eliminar Actividad
                                                            </button>
                                                        </div>
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

                                                        <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                                        <th className="px-4 py-3 w-12"></th>
                                                                        <th className="px-3 py-3">Nombre del Campo</th>
                                                                        <th className="px-3 py-3">Tipo de Dato</th>
                                                                        <th className="px-3 py-3">Auto-llenar Desde</th>
                                                                        <th className="px-3 py-3 text-center">Requerido</th>
                                                                        <th className="px-3 py-3 text-center">Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white dark:bg-slate-900/50">
                                                                    {activities.find(a => a.id === selectedActivityId)?.fields?.map((field, idx) => {
                                                                        const previousActivities = activities.filter(a => {
                                                                            const hasPath = transitions.some(t =>
                                                                                t.target_id === selectedActivityId &&
                                                                                (t.source_id === a.id || activities.some(intermediate =>
                                                                                    transitions.some(t1 => t1.source_id === a.id && t1.target_id === intermediate.id) &&
                                                                                    transitions.some(t2 => t2.source_id === intermediate.id && t2.target_id === selectedActivityId)
                                                                                ))
                                                                            );
                                                                            return a.id !== selectedActivityId && a.fields && a.fields.length > 0 && hasPath;
                                                                        });

                                                                        return (
                                                                            <React.Fragment key={field.id}>
                                                                                {/* Field Main Row */}
                                                                                <tr className={`group transition-all border-t-[6px] border-slate-300 dark:border-slate-700/80 first:border-t-0 hover:bg-slate-50/30 dark:hover:bg-slate-800/20`}>
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
                                                                                            className="w-full h-8 px-2 text-[11px] bg-transparent border-none text-slate-400 dark:text-slate-500 font-medium focus:outline-none cursor-pointer"
                                                                                        >
                                                                                            <option value="">Manual (Usuario)</option>
                                                                                            {previousActivities.map(prevActivity =>
                                                                                                prevActivity.fields?.map(prevField => (
                                                                                                    <option key={`${prevActivity.id}:${prevField.name}`} value={`${prevActivity.id}:${prevField.name}`}>
                                                                                                        {prevActivity.name} → {prevField.label || prevField.name}
                                                                                                    </option>
                                                                                                ))
                                                                                            )}
                                                                                        </select>
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-center">
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
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-center">
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
                                                                                    </td>
                                                                                </tr>

                                                                                {/* Conditional Advanced Settings Chapter */}
                                                                                <tr className="bg-slate-50/40 dark:bg-slate-800/10">
                                                                                    <td colSpan={6} className="px-4 py-3 border-b border-transparent">
                                                                                        <div className="grid grid-cols-3 gap-6">
                                                                                            <div>
                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Visibilidad Condicional</label>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={field.visibility_condition || ''}
                                                                                                    onChange={(e) => {
                                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                            ...a,
                                                                                                            fields: a.fields?.map(f => f.id === field.id ? { ...f, visibility_condition: e.target.value } : f)
                                                                                                        } : a));
                                                                                                    }}
                                                                                                    className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all font-mono"
                                                                                                    placeholder="Eje: campo_1 == 'Si'"
                                                                                                />
                                                                                            </div>

                                                                                            {field.type === 'text' && (
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Patrón Regex</label>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={field.regex_pattern || ''}
                                                                                                        onChange={(e) => {
                                                                                                            const pattern = e.target.value;
                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                ...a,
                                                                                                                fields: a.fields?.map(f => f.id === field.id ? { ...f, regex_pattern: pattern } : f)
                                                                                                            } : a));
                                                                                                        }}
                                                                                                        className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all font-mono"
                                                                                                        placeholder="Eje: ^[A-Z]{3}-\d{4}$"
                                                                                                    />
                                                                                                </div>
                                                                                            )}

                                                                                            {(field.type === 'number' || field.type === 'currency') && (
                                                                                                <div className="flex gap-2">
                                                                                                    <div className="flex-1">
                                                                                                        <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Mínimo</label>
                                                                                                        <input
                                                                                                            type="number"
                                                                                                            value={field.min_value || ''}
                                                                                                            onChange={(e) => {
                                                                                                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                    ...a,
                                                                                                                    fields: a.fields?.map(f => f.id === field.id ? { ...f, min_value: val } : f)
                                                                                                                } : a));
                                                                                                            }}
                                                                                                            className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div className="flex-1">
                                                                                                        <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Máximo</label>
                                                                                                        <input
                                                                                                            type="number"
                                                                                                            value={field.max_value || ''}
                                                                                                            onChange={(e) => {
                                                                                                                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                    ...a,
                                                                                                                    fields: a.fields?.map(f => f.id === field.id ? { ...f, max_value: val } : f)
                                                                                                                } : a));
                                                                                                            }}
                                                                                                            className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all"
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {field.type === 'select' && (
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Opciones</label>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={field.options?.join(', ') || ''}
                                                                                                        onChange={(e) => {
                                                                                                            const val = e.target.value;
                                                                                                            const opts = val.split(',').map(o => o.startsWith(' ') ? o : o.trimStart());
                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                                ...a,
                                                                                                                fields: a.fields?.map(f => f.id === field.id ? { ...f, options: opts } : f)
                                                                                                            } : a));
                                                                                                        }}
                                                                                                        className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all"
                                                                                                        placeholder="Aprobado, Rechazado..."
                                                                                                    />
                                                                                                </div>
                                                                                            )}

                                                                                            {field.type === 'lookup' && (
                                                                                                <div className="col-span-3 mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl space-y-4">
                                                                                                    <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/50 pb-3">
                                                                                                        <h5 className="text-[10px] font-black tracking-widest uppercase text-indigo-900 dark:text-indigo-200">
                                                                                                            Configuración de Búsqueda Interactiva (Lookup)
                                                                                                        </h5>

                                                                                                        {/* Type Selector Toggle */}
                                                                                                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', url: undefined, method: undefined, search_param: undefined } } : f) } : a))}
                                                                                                                className={cn(
                                                                                                                    "px-3 py-1 text-[9px] font-bold rounded-md transition-all uppercase tracking-wider",
                                                                                                                    (field.lookup_config?.type === 'database') ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                                                                                                )}
                                                                                                            >
                                                                                                                Catálogo BD
                                                                                                            </button>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'rest', table_name: undefined, search_column: undefined } } : f) } : a))}
                                                                                                                className={cn(
                                                                                                                    "px-3 py-1 text-[9px] font-bold rounded-md transition-all uppercase tracking-wider",
                                                                                                                    (!field.lookup_config?.type || field.lookup_config?.type === 'rest') ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                                                                                                                )}
                                                                                                            >
                                                                                                                API Externa
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    </div>

                                                                                                    {field.lookup_config?.type === 'database' ? (
                                                                                                        /* --- DATABASE CATALOG CONFIG --- */
                                                                                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                                                                                            <div className="col-span-2">
                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-widest ml-1">1. Seleccionar Tabla</label>
                                                                                                                <select
                                                                                                                    value={field.lookup_config?.table_name || ''}
                                                                                                                    onChange={e => {
                                                                                                                        const table = e.target.value;
                                                                                                                        fetchColumnsForTable(table);
                                                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', table_name: table, search_column: '', display_fields: [], value_field: '', mapping: {} } } : f) } : a));
                                                                                                                    }}
                                                                                                                    className="w-full h-8 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-300 font-bold focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                                                                                                                >
                                                                                                                    <option value="">-- Elija una tabla del esquema --</option>
                                                                                                                    {lookupData.dbTables.map(t => (
                                                                                                                        <option key={t} value={t}>{t}</option>
                                                                                                                    ))}
                                                                                                                </select>
                                                                                                            </div>

                                                                                                            {field.lookup_config?.table_name && tableColumnsMap[field.lookup_config.table_name] && (
                                                                                                                <>
                                                                                                                    <div className="col-span-2 p-3 bg-white/40 dark:bg-slate-900/20 rounded-lg border border-slate-200/50 dark:border-slate-800/50 space-y-3">
                                                                                                                        <h6 className="text-[9px] font-black uppercase tracking-widest text-slate-500">2. Configurar Búsqueda</h6>
                                                                                                                        <div className="grid grid-cols-2 gap-3">
                                                                                                                            <div>
                                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-widest ml-1">Columna a Buscar (LIKE)</label>
                                                                                                                                <select
                                                                                                                                    value={field.lookup_config?.search_column || ''}
                                                                                                                                    onChange={e => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', search_column: e.target.value } } : f) } : a))}
                                                                                                                                    className="w-full h-8 px-2 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                                                                                                                                >
                                                                                                                                    <option value="">Seleccione columna...</option>
                                                                                                                                    {tableColumnsMap[field.lookup_config.table_name]?.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                                                                </select>
                                                                                                                            </div>
                                                                                                                            <div>
                                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-widest ml-1">Columna a Guardar (Value)</label>
                                                                                                                                <select
                                                                                                                                    value={field.lookup_config?.value_field || ''}
                                                                                                                                    onChange={e => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', value_field: e.target.value } } : f) } : a))}
                                                                                                                                    className="w-full h-8 px-2 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none transition-all"
                                                                                                                                >
                                                                                                                                    <option value="">Seleccione columna ID/Value...</option>
                                                                                                                                    {tableColumnsMap[field.lookup_config.table_name]?.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                                                                </select>
                                                                                                                            </div>
                                                                                                                            <div className="col-span-2">
                                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-widest ml-1">Columnas a Mostrar (Popup)</label>
                                                                                                                                <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md min-h-8">
                                                                                                                                    {tableColumnsMap[field.lookup_config.table_name]?.map(c => (
                                                                                                                                        <label key={c} className={cn("flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors", field.lookup_config?.display_fields?.includes(c) ? "border-indigo-300 dark:border-indigo-700/50 text-indigo-700 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400")}>
                                                                                                                                            <input
                                                                                                                                                type="checkbox"
                                                                                                                                                className="w-3 h-3 text-indigo-600 border-slate-300 focus:ring-indigo-500 rounded-sm"
                                                                                                                                                checked={field.lookup_config?.display_fields?.includes(c) || false}
                                                                                                                                                onChange={(evt) => {
                                                                                                                                                    const isChecked = evt.target.checked;
                                                                                                                                                    const current = field.lookup_config?.display_fields || [];
                                                                                                                                                    const next = isChecked ? [...current, c] : current.filter(x => x !== c);
                                                                                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', display_fields: next } } : f) } : a));
                                                                                                                                                }}
                                                                                                                                            />
                                                                                                                                            <span className="text-[9px] font-mono">{c}</span>
                                                                                                                                        </label>
                                                                                                                                    ))}
                                                                                                                                </div>
                                                                                                                            </div>
                                                                                                                        </div>
                                                                                                                    </div>

                                                                                                                    <div className="col-span-2 p-3 bg-fuchsia-50/50 dark:bg-fuchsia-900/10 rounded-lg border border-fuchsia-100 dark:border-fuchsia-800/50 space-y-3">
                                                                                                                        <h6 className="text-[9px] font-black uppercase tracking-widest text-fuchsia-800 dark:text-fuchsia-300 flex items-center justify-between">
                                                                                                                            3. Mapeo de Campos (Autollenado)
                                                                                                                            <button
                                                                                                                                type="button"
                                                                                                                                onClick={() => {
                                                                                                                                    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
                                                                                                                                    const key = Array.from({ length: 4 }).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
                                                                                                                                    // initialize empty mapping pair using dummy key
                                                                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', mapping: { ...(f.lookup_config?.mapping || {}), [`_new_${key}`]: '' } } } : f) } : a));
                                                                                                                                }}
                                                                                                                                className="flex items-center gap-1 text-[8px] bg-white dark:bg-slate-900 px-2 py-1 rounded border border-fuchsia-200 dark:border-fuchsia-800 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40 transition-colors cursor-pointer"
                                                                                                                            >
                                                                                                                                <Plus className="w-3 h-3" /> AGREGAR
                                                                                                                            </button>
                                                                                                                        </h6>

                                                                                                                        {(!field.lookup_config?.mapping || Object.keys(field.lookup_config.mapping).length === 0) ? (
                                                                                                                            <p className="text-[10px] text-slate-500 italic p-2 pb-0 text-center">No hay mapeos. Agrega uno para llenar otros campos automáticamente.</p>
                                                                                                                        ) : (
                                                                                                                            <div className="space-y-2">
                                                                                                                                {Object.entries(field.lookup_config.mapping).map(([sourceKey, targetField]) => (
                                                                                                                                    <div key={sourceKey} className="flex items-center gap-2">
                                                                                                                                        <div className="flex-1">
                                                                                                                                            <select
                                                                                                                                                value={sourceKey.startsWith('_new_') ? '' : sourceKey}
                                                                                                                                                onChange={(e) => {
                                                                                                                                                    const newSource = e.target.value;
                                                                                                                                                    const currentMapping = { ...field.lookup_config!.mapping };
                                                                                                                                                    const targetVal = currentMapping[sourceKey];
                                                                                                                                                    delete currentMapping[sourceKey];
                                                                                                                                                    currentMapping[newSource] = targetVal;
                                                                                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', mapping: currentMapping } } : f) } : a));
                                                                                                                                                }}
                                                                                                                                                className="w-full h-8 px-2 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-300 font-mono"
                                                                                                                                            >
                                                                                                                                                <option value="">Columna Origen...</option>
                                                                                                                                                {tableColumnsMap[field.lookup_config!.table_name!]?.map(c => <option key={c} value={c}>{c}</option>)}
                                                                                                                                            </select>
                                                                                                                                        </div>
                                                                                                                                        <div className="text-slate-400">
                                                                                                                                            <ArrowLeft className="w-3 h-3" />
                                                                                                                                        </div>
                                                                                                                                        <div className="flex-1">
                                                                                                                                            <select
                                                                                                                                                value={targetField}
                                                                                                                                                onChange={(e) => {
                                                                                                                                                    const newTarget = e.target.value;
                                                                                                                                                    const currentMapping = { ...field.lookup_config!.mapping };
                                                                                                                                                    currentMapping[sourceKey] = newTarget;
                                                                                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', mapping: currentMapping } } : f) } : a));
                                                                                                                                                }}
                                                                                                                                                className="w-full h-8 px-2 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-300 font-bold"
                                                                                                                                            >
                                                                                                                                                <option value="">Campo Formulario...</option>
                                                                                                                                                {activities.find(a => a.id === selectedActivityId)?.fields?.filter(f => f.id !== field.id).map(f => (
                                                                                                                                                    <option key={f.id} value={f.name}>{f.name} ({f.label})</option>
                                                                                                                                                ))}
                                                                                                                                            </select>
                                                                                                                                        </div>
                                                                                                                                        <button
                                                                                                                                            onClick={() => {
                                                                                                                                                const currentMapping = { ...field.lookup_config!.mapping };
                                                                                                                                                delete currentMapping[sourceKey];
                                                                                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, type: 'database', mapping: currentMapping } } : f) } : a));
                                                                                                                                            }}
                                                                                                                                            className="p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                                                                                                                                        >
                                                                                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                                                                                        </button>
                                                                                                                                    </div>
                                                                                                                                ))}
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        /* --- REST API CONFIG (Legacy) --- */
                                                                                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">URL del Endpoint</label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={field.lookup_config?.url || ''}
                                                                                                                    onChange={e => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, url: e.target.value, type: 'rest', method: f.lookup_config?.method || 'GET', search_param: f.lookup_config?.search_param || '', display_fields: f.lookup_config?.display_fields || [], value_field: f.lookup_config?.value_field || '' } } : f) } : a))}
                                                                                                                    placeholder="https://api.ejemplo.com/datos"
                                                                                                                    className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Parámetro de Búsqueda</label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={field.lookup_config?.search_param || ''}
                                                                                                                    onChange={e => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, search_param: e.target.value, type: 'rest', method: f.lookup_config?.method || 'GET', url: f.lookup_config?.url || '', display_fields: f.lookup_config?.display_fields || [], value_field: f.lookup_config?.value_field || '' } } : f) } : a))}
                                                                                                                    placeholder="q, query, name..."
                                                                                                                    className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Campos a Mostrar</label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={field.lookup_config?.display_fields?.join(', ') || ''}
                                                                                                                    onChange={e => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, display_fields: e.target.value.split(',').map(s => s.trim()), type: 'rest', method: f.lookup_config?.method || 'GET', search_param: f.lookup_config?.search_param || '', url: f.lookup_config?.url || '', value_field: f.lookup_config?.value_field || '' } } : f) } : a))}
                                                                                                                    placeholder="nombre, email"
                                                                                                                    className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Campo de Valor</label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={field.lookup_config?.value_field || ''}
                                                                                                                    onChange={e => setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, value_field: e.target.value, type: 'rest', method: f.lookup_config?.method || 'GET', search_param: f.lookup_config?.search_param || '', display_fields: f.lookup_config?.display_fields || [], url: f.lookup_config?.url || '' } } : f) } : a))}
                                                                                                                    placeholder="id, uuid..."
                                                                                                                    className="w-full h-7 px-2 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div className="col-span-2">
                                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Mapeo Extra (JSON)</label>
                                                                                                                <textarea
                                                                                                                    value={field.lookup_config?.mapping ? JSON.stringify(field.lookup_config.mapping, null, 2) : ''}
                                                                                                                    onChange={e => {
                                                                                                                        try {
                                                                                                                            const mapping = JSON.parse(e.target.value);
                                                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: a.fields?.map(f => f.id === field.id ? { ...f, lookup_config: { ...f.lookup_config, mapping, type: 'rest', method: f.lookup_config?.method || 'GET', search_param: f.lookup_config?.search_param || '', display_fields: f.lookup_config?.display_fields || [], url: f.lookup_config?.url || '', value_field: f.lookup_config?.value_field || '' } } : f) } : a));
                                                                                                                        } catch (err) {
                                                                                                                            // Ignore errors while typing
                                                                                                                        }
                                                                                                                    }}
                                                                                                                    placeholder='{"email_resp": "email_form"}'
                                                                                                                    className="w-full h-14 px-2 py-1.5 text-[10px] bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-md text-slate-500 dark:text-slate-400 focus:border-blue-400 outline-none transition-all font-mono"
                                                                                                                />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}

                                                                                            <div>
                                                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase mb-1.5 tracking-widest ml-1">Ayuda / Placeholder</label>
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={field.placeholder || ''}
                                                                                                    onChange={(e) => {
                                                                                                        const val = e.target.value;
                                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                            ...a,
                                                                                                            fields: a.fields?.map(f => f.id === field.id ? { ...f, placeholder: val } : f)
                                                                                                        } : a));
                                                                                                    }}
                                                                                                    className="w-full h-7 px-2 text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 transition-all font-bold"
                                                                                                    placeholder="Instrucciones..."
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                    {(!activities.find(a => a.id === selectedActivityId)?.fields || activities.find(a => a.id === selectedActivityId)?.fields?.length === 0) && (
                                                                        <tr>
                                                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
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
                                                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                                                {[
                                                                                    { id: 'creator', label: 'Iniciador del Flujo', desc: 'Mismo usuario que inició' },
                                                                                    { id: 'specific_user', label: 'Usuario Específico', desc: 'Elegir una persona' },
                                                                                    { id: 'department', label: 'Por Área', desc: 'Reglas para el equipo' },
                                                                                    { id: 'position', label: 'Por Cargo', desc: 'Reglas por jerarquía' },
                                                                                    { id: 'manual', label: 'Manual/Público', desc: 'Sin dueño definido' }
                                                                                ].map((opt) => (
                                                                                    <button
                                                                                        key={opt.id}
                                                                                        onClick={() => {
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assignment_type: opt.id as AssignmentType } : a));
                                                                                        }}
                                                                                        className={cn(
                                                                                            "p-3 rounded-xl border-2 text-left transition-all",
                                                                                            selectedActivity.assignment_type === opt.id
                                                                                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                                                                                                : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                                                                                        )}
                                                                                    >
                                                                                        <p className="font-black text-[9px] uppercase tracking-wider mb-0.5">{opt.label}</p>
                                                                                        <p className={cn("text-[7px] font-bold uppercase opacity-60", selectedActivity.assignment_type === opt.id ? "text-white" : "text-slate-400")}>
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

                                                                        {(selectedActivity.assignment_type === 'department' || selectedActivity.assignment_type === 'position') && (
                                                                            <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4">
                                                                                <div>
                                                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Estrategia de Selección</label>
                                                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                                                                        {[
                                                                                            { id: 'manual', label: 'Público', desc: 'Bandeja Común', icon: Inbox },
                                                                                            { id: 'workload', label: 'Carga', desc: 'Al menos ocupado', icon: BarChart2 },
                                                                                            { id: 'efficiency', label: 'Eficiencia', desc: 'Al más veloz', icon: Zap },
                                                                                            { id: 'random', label: 'Aleatorio', desc: 'Sorteo al azar', icon: Dices }
                                                                                        ].map((strat) => (
                                                                                            <button
                                                                                                key={strat.id}
                                                                                                onClick={() => {
                                                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assignment_strategy: strat.id as AssignmentStrategy } : a));
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "p-3 rounded-xl border-2 text-left transition-all flex flex-col gap-2",
                                                                                                    (selectedActivity.assignment_strategy || 'manual') === strat.id
                                                                                                        ? "bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-600 text-white shadow-md"
                                                                                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                                                                                                )}
                                                                                            >
                                                                                                <div className={cn(
                                                                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                                                                    (selectedActivity.assignment_strategy || 'manual') === strat.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                                                                )}>
                                                                                                    <strat.icon className="w-4 h-4" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <p className="font-black text-[9px] uppercase tracking-wider mb-0.5">{strat.label}</p>
                                                                                                    <p className={cn("text-[7px] font-bold uppercase opacity-60", (selectedActivity.assignment_strategy || 'manual') === strat.id ? "text-white" : "text-slate-400")}>
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
                                                                                { id: 'finance', icon: Zap, label: 'ERP' },
                                                                                { id: 'webhook', icon: Link, label: 'REST' },
                                                                                { id: 'soap', icon: Code, label: 'SOAP' },
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
                                                                                                    <input type="text" value={editingAction.config?.finance_url || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { finance_url: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">API Key</label>
                                                                                                    <input type="password" value={editingAction.config?.api_key || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { api_key: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">ID Concepto Contable</label>
                                                                                                    <input type="text" value={editingAction.config?.concept_id || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { concept_id: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Ej: 10101" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="space-y-4">
                                                                                                <div className="grid grid-cols-2 gap-4">
                                                                                                    <div>
                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Cantidad / Monto ( campo )</label>
                                                                                                        <input type="text" value={editingAction.config?.amount || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { amount: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="Ej: {{monto_total}}" />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Movimiento</label>
                                                                                                        <select value={editingAction.config?.movement_type || 'expense'} onChange={(e) => handleUpdateActionConfig(editingActionId!, { movement_type: e.target.value as any })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                                                                                                            <option value="expense">Egreso</option>
                                                                                                            <option value="income">Ingreso</option>
                                                                                                        </select>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Descripción del Movimiento</label>
                                                                                                    <input type="text" value={editingAction.config?.description || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { description: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}

                                                                                    {editingAction.type === 'email' && (
                                                                                        <div className="space-y-6 p-8 bg-slate-50/50 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
                                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Para ( {"{{ email }}"} )</label>
                                                                                                    <input type="text" value={editingAction.config?.email_to || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_to: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" placeholder="usuario@correo.com o {{campo}}" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">CC</label>
                                                                                                    <input type="text" value={editingAction.config?.email_cc || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_cc: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Asunto</label>
                                                                                                <input type="text" value={editingAction.config?.email_subject || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_subject: e.target.value })} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold" />
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Cuerpo del Mensaje</label>
                                                                                                <textarea rows={4} value={editingAction.config?.email_body || ''} onChange={(e) => handleUpdateActionConfig(editingActionId!, { email_body: e.target.value })} className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono scrollbar-thin" />
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
                                                                                                                }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Método</label>
                                                                                                                <select value={step.method} onChange={(e) => {
                                                                                                                    handleUpdateActionConfig(editingActionId!, {
                                                                                                                        steps: editingAction.config?.steps?.map(s => s.id === step.id ? { ...s, method: e.target.value } : s)
                                                                                                                    });
                                                                                                                }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
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
                                                                                                                }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
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
                                                                                                                    }} className="w-full h-10 px-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs" />
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
                                                                                                            }} className="w-full p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono" />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
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
                </section>
            </div>

            {
                showSOPGenerator && (
                    <SOPGenerator
                        workflow={workflow}
                        activities={activities}
                        onClose={() => setShowSOPGenerator(false)}
                    />
                )
            }

            {
                showFormPreview && selectedActivityId && (
                    <FormPreviewModal
                        workflowName={workflowName}
                        activityName={activities.find(a => a.id === selectedActivityId)?.name || ''}
                        fields={activities.find(a => a.id === selectedActivityId)?.fields || []}
                        formColumns={activities.find(a => a.id === selectedActivityId)?.form_columns}
                        onClose={() => setShowFormPreview(false)}
                        onAddField={handleAddField}
                        onUpdateField={handleUpdateField}
                        onDeleteField={handleDeleteField}
                        onReorderFields={handleReorderFields}
                        onSave={handleSave}
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
        </div>
    );
}

function ActivityNode({ activity, isSelected, isConnectionSource, onDragStart, onClick, onDoubleClick, outgoingTransitions, isDragging, zoom = 1 }: { activity: Activity, isSelected: boolean, isConnectionSource: boolean, onDragStart: (e: React.DragEvent) => void, onClick: (e: React.MouseEvent) => void, onDoubleClick: (e: React.MouseEvent) => void, outgoingTransitions: number, isDragging: boolean, zoom?: number }) {
    const iconMap = {
        start: Play,
        task: Square,
        decision: GitBranch,
        end: Square,
    };
    const Icon = (iconMap[activity.type] as any) || Square;

    const colors = {
        start: isSelected ? 'bg-emerald-600 ring-emerald-500/30' : 'bg-emerald-500 ring-emerald-500/20',
        task: isSelected ? 'bg-blue-600 ring-blue-500/30' : 'bg-blue-500 ring-blue-500/20',
        decision: isSelected ? 'bg-orange-600 ring-orange-500/30' : 'bg-orange-500 ring-orange-500/20',
        end: isSelected ? 'bg-rose-600 ring-rose-500/30' : 'bg-rose-500 ring-rose-500/20',
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            style={{ left: activity.x_pos, top: activity.y_pos }}
            className={cn(
                "absolute cursor-grab active:cursor-grabbing group/node select-none transition-all duration-300 pointer-events-auto",
                isSelected ? "z-40 scale-105" : "z-30 hover:scale-105 group-hover/node:z-[100]",
                isDragging && "opacity-40 grayscale"
            )}
        >
            <div className={cn(
                "w-52 p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 shadow-xl transition-all duration-500 relative ring-4",
                isSelected
                    ? "border-blue-600 shadow-blue-500/20 ring-blue-500/10 translate-y-[-2px]"
                    : "border-slate-100 dark:border-slate-800 shadow-slate-900/5 ring-transparent hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-blue-500/5",
                isConnectionSource && "border-blue-600 ring-blue-500/20 animate-pulse"
            )}>
                {/* Information Tooltip */}
                {!isDragging && (
                    <div
                        style={{
                            transform: `translateX(-50%) scale(${1 / zoom})`,
                            transformOrigin: 'bottom center'
                        }}
                        className="absolute bottom-[calc(100%+10px)] left-1/2 w-48 bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-2xl opacity-0 group-hover/node:opacity-100 group-hover/node:translate-y-[-4px] pointer-events-none transition-all duration-300 z-50"
                    >
                        <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                            <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-white",
                                (colors as any)[activity.type]
                            )}>
                                <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h5 className="text-[9px] font-black text-white uppercase tracking-tight truncate">{activity.name || 'Sin nombre'}</h5>
                                <p className="text-[7px] font-bold text-blue-400 uppercase opacity-70">
                                    {activity.type}
                                </p>
                            </div>
                        </div>

                        {activity.description && (
                            <p className="text-[8px] text-slate-400 leading-tight mb-2 line-clamp-3 italic">
                                "{activity.description}"
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                                <div className="flex items-center gap-1 text-blue-400">
                                    <Code className="w-2.5 h-2.5" />
                                    <span className="text-[8px] font-bold">{activity.fields?.length || 0} Campos</span>
                                </div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-1.5 border border-white/5">
                                <div className="flex items-center gap-1 text-emerald-400">
                                    <GitBranch className="w-2.5 h-2.5" />
                                    <span className="text-[8px] font-bold">{outgoingTransitions} Rutas</span>
                                </div>
                            </div>
                            <div className="bg-white/10 rounded-lg p-1.5 border border-white/10 col-span-2 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-orange-400">
                                    <Clock className="w-2.5 h-2.5" />
                                    <span className="text-[8px] font-bold">{activity.due_date_hours || 24}h</span>
                                </div>
                                <div className="flex items-center gap-1 text-rose-400">
                                    <Users className="w-2.5 h-2.5" />
                                    <span className="text-[8px] font-bold uppercase truncate max-w-[60px]">{activity.assignment_type || 'Manual'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/98" />
                    </div>
                )}

                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                        (colors as any)[activity.type]
                    )}>
                        <Icon className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-slate-800 dark:text-white truncate tracking-tight">{activity.name}</h4>
                    </div>
                </div>


                {/* Status indicator for Finance */}
                {activity.action_type === 'finance' && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1.5 rounded-xl shadow-lg border-2 border-white dark:border-slate-900 animate-bounce">
                        <Zap className="w-3 h-3" />
                    </div>
                )}
            </div>
        </div>
    );
}

function TransitionArrow({ transition, source, target, isSelected, onClick, onDoubleClick }: { transition: Transition, source: Activity, target: Activity, isSelected: boolean, onClick: (e: React.MouseEvent) => void, onDoubleClick: (e: React.MouseEvent) => void }) {
    // Docking points (nodes are 208px wide [w-52], roughly 80px high)
    const sW = 208;
    const sH = 80;
    const tH = 80;

    const sX = source.x_pos + sW;
    const sY = source.y_pos + sH / 2;
    const tX = target.x_pos;
    const tY = target.y_pos + tH / 2;

    const midX = sX + (tX - sX) / 2;
    const pathData = `M ${sX} ${sY} L ${midX} ${sY} L ${midX} ${tY} L ${tX} ${tY}`;

    return (
        <g onClick={onClick} onDoubleClick={onDoubleClick} className="cursor-pointer group pointer-events-auto">
            <path
                d={pathData}
                stroke={isSelected ? "#3b82f6" : "#334155"}
                strokeWidth={isSelected ? "3" : "2"}
                fill="none"
                markerEnd={isSelected ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                className={cn("transition-all duration-300", !isSelected && "dark:stroke-slate-400")}
            />
            {transition.condition && (
                <text x={midX} y={(sY + tY) / 2 - 10} textAnchor="middle" className="text-[9px] font-black uppercase fill-blue-600 drop-shadow-md">
                    IF {transition.condition}
                </text>
            )}
            {/* Wider hit area */}
            <path
                d={pathData}
                stroke="transparent"
                strokeWidth="20"
                fill="none"
            />
        </g>
    );
}

function ToolboxItem({ icon: Icon, label, color, onDragStart }: { icon: any, label: string, color: 'emerald' | 'blue' | 'orange' | 'rose', onDragStart: () => void }) {
    const colors = {
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-900/40",
        blue: "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50 dark:hover:bg-blue-900/40",
        orange: "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-900/40",
        rose: "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800/50 dark:hover:bg-rose-900/40",
    }[color];

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className={`p-1.5 rounded-xl border ${colors} flex items-center gap-2.5 cursor-grab transition-all shadow-sm active:cursor-grabbing active:scale-95 group`}
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

