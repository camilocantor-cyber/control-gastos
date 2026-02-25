import React, { useState } from 'react';
import { ArrowLeft, Save, Plus, GitBranch, Play, Square, AlertCircle, Trash2, ZoomIn, ZoomOut, Maximize, X, Edit2, CheckCircle2, ChevronUp, ChevronDown, Eye, Activity as ActivityIcon, Download, FileUp, Users, Zap, Dices, BarChart2, Inbox, Globe, Link, Code } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Workflow, Activity, Transition, ActivityType, FieldDefinition } from '../types';
import { exportToBPMN, importFromBPMN } from '../utils/bpmnConverter';

import { useWorkflowModeler } from '../hooks/useWorkflowModeler';
import { supabase } from '../lib/supabase';

import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';

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
        users: any[]
    }>({ departments: [], positions: [], users: [] });

    React.useEffect(() => {
        const fetchLookupData = async () => {
            const [depts, positions, users] = await Promise.all([
                supabase.from('departments').select('id, name').order('name'),
                supabase.from('positions').select('id, title, department_id').order('title'),
                supabase.from('profiles').select('id, email, full_name').order('email')
            ]);
            setLookupData({
                departments: depts.data || [],
                positions: positions.data || [],
                users: users.data || []
            });
        };
        fetchLookupData();
    }, []);
    const [showToolbox, setShowToolbox] = useState(true);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

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

    const handleNodeClick = (id: string) => {
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
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{workflow.name}</h2>
                        <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-tight uppercase">Modelador de Actividades</p>
                            <span className="w-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800 flex items-center gap-1">
                                    <ActivityIcon className="w-2.5 h-2.5" />
                                    {avgTime}h prom.
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">Eficiencia</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {saving && (
                        <span className="text-xs font-bold text-slate-400 animate-pulse">Guardando...</span>
                    )}

                    {!isPreviewMode && (
                        <>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50 border-2 ${showSaveSuccess
                                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20'
                                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                            >
                                {showSaveSuccess ? (
                                    <CheckCircle2 className="w-5 h-5 animate-in zoom-in duration-300" />
                                ) : (
                                    <Save className={`w-5 h-5 ${saving ? 'animate-pulse' : ''}`} />
                                )}
                                <span>{showSaveSuccess ? '¡Guardado!' : (saving ? 'Guardando...' : 'Guardar')}</span>
                            </button>
                            <button
                                onClick={handlePublish}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/40 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                Publicar
                            </button>
                        </>
                    )}
                    {!isPreviewMode && (
                        <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-3">
                            <input
                                type="file"
                                accept=".bpmn,.xml"
                                onChange={handleImportBPMN}
                                className="hidden"
                                ref={setFileInputRef}
                            />
                            <button
                                onClick={() => fileInputRef?.click()}
                                className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                                title="Importar BPMN 2.0"
                            >
                                <FileUp className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleExportBPMN}
                                className="p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-emerald-600 rounded-xl transition-all"
                                title="Exportar BPMN 2.0"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {!isPreviewMode && (
                        <button
                            onClick={() => setShowToolbox(!showToolbox)}
                            className={`p-2.5 rounded-xl transition-all border ${showToolbox ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600' : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600'}`}
                            title={showToolbox ? "Ocultar Toolbox" : "Mostrar Toolbox"}
                        >
                            {showToolbox ? <Maximize className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex gap-6 overflow-hidden relative">
                {/* Toolbox */}
                {showToolbox && !isPreviewMode && (
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

                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={() => setIsPreviewMode(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all group"
                            >
                                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <span className="text-xs uppercase tracking-widest">Vista Previa</span>
                            </button>
                        </div>
                    </aside>
                )}

                {/* Canvas Area */}
                <section
                    className={`flex-1 bg-slate-100 dark:bg-black rounded-3xl border border-dashed border-slate-300 dark:border-slate-900 relative overflow-hidden shadow-inner group ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
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
                    }}
                >
                    <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40"
                        style={{
                            backgroundPosition: `${offset.x}px ${offset.y}px`,
                            backgroundSize: `${24 * zoom}px ${24 * zoom}px`
                        }}></div>

                    {isPreviewMode && (
                        <button
                            onClick={() => setIsPreviewMode(false)}
                            className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-2xl hover:bg-blue-700 transition-all animate-in slide-in-from-top-4 active:scale-95"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Volver al Editor</span>
                        </button>
                    )}

                    <div className="absolute inset-0 z-10 pointer-events-none"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            transformOrigin: '0 0'
                        }}>
                        <svg className="absolute inset-0 w-[10000px] h-[10000px] pointer-events-none overflow-visible">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill={document.documentElement.classList.contains('dark') ? "#475569" : "#94a3b8"} />
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
                                            if (isPreviewMode) return;
                                            e.stopPropagation();
                                            setSelectedTransitionId(transition.id);
                                            setSelectedActivityId(null);
                                        }}
                                    />
                                );
                            })}
                        </svg>

                        {activities.map((activity) => (
                            <ActivityNode
                                key={activity.id}
                                activity={activity}
                                isSelected={selectedActivityId === activity.id}
                                isConnectionSource={connectionSourceId === activity.id}
                                onDragStart={(e) => {
                                    e.stopPropagation();
                                    setDraggedActivityId(activity.id);
                                }}
                                onClick={(e) => {
                                    if (isPreviewMode) return;
                                    e.stopPropagation();
                                    handleNodeClick(activity.id);
                                }}
                            />
                        ))}
                    </div>

                    {activities.length === 0 && !offset.x && !offset.y && !isPreviewMode && (
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

                        <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <button onClick={handleAutoLayout} className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all flex items-center gap-2 group/layout active:scale-95" title="Auto-Organizar">
                            <GitBranch className="w-4 h-4 rotate-180" />
                            <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/layout:max-w-[100px] transition-all duration-300">Organizar</span>
                        </button>
                    </div>

                    {/* Details Modal Overlay */}
                    {(selectedActivityId || selectedTransitionId) && (
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
                                                    setSelectedActivityId(null);
                                                    setSelectedTransitionId(null);
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
                                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-lg text-slate-900 dark:text-white"
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
                                                                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-600 dark:text-slate-400"
                                                                placeholder="Instrucciones para la persona que realice esta tarea..."
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div>
                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Tiempo Límite (Horas)</label>
                                                                <input
                                                                    type="number"
                                                                    value={activities.find(a => a.id === selectedActivityId)?.due_date_hours || 24}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, due_date_hours: val } : a));
                                                                    }}
                                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Columnas del Formulario</label>
                                                                <select
                                                                    value={activities.find(a => a.id === selectedActivityId)?.form_columns || 1}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value);
                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, form_columns: val } : a));
                                                                    }}
                                                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white appearance-none"
                                                                >
                                                                    <option value={1}>1 Columna (Vertical)</option>
                                                                    <option value={2}>2 Columnas (Ancho Total)</option>
                                                                </select>
                                                            </div>
                                                        </div>
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
                                                            <button
                                                                onClick={() => {
                                                                    const newField: FieldDefinition = {
                                                                        id: crypto.randomUUID(),
                                                                        activity_id: selectedActivityId,
                                                                        name: `campo_${Math.floor(Math.random() * 1000)}`,
                                                                        label: 'Nuevo Campo',
                                                                        type: 'text',
                                                                        required: false,
                                                                        order_index: (activities.find(a => a.id === selectedActivityId)?.fields?.length || 0)
                                                                    };
                                                                    setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, fields: [...(a.fields || []), newField] } : a));
                                                                }}
                                                                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 text-[10px] uppercase tracking-widest group/btn"
                                                            >
                                                                <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                                                                Añadir Campo
                                                            </button>
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
                                                    <div className="space-y-8 animate-fadeIn max-w-3xl">
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
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assignment_type: opt.id as any } : a));
                                                                            }}
                                                                            className={cn(
                                                                                "p-4 rounded-2xl border-2 text-left transition-all",
                                                                                activities.find(a => a.id === selectedActivityId)?.assignment_type === opt.id
                                                                                    ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 dark:shadow-none"
                                                                                    : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                                                                            )}
                                                                        >
                                                                            <p className="font-black text-[10px] uppercase tracking-wider mb-1">{opt.label}</p>
                                                                            <p className={cn("text-[8px] font-bold uppercase opacity-60", activities.find(a => a.id === selectedActivityId)?.assignment_type === opt.id ? "text-white" : "text-slate-400")}>
                                                                                {opt.desc}
                                                                            </p>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Contextual Selectors */}
                                                            {activities.find(a => a.id === selectedActivityId)?.assignment_type === 'specific_user' && (
                                                                <div className="animate-in slide-in-from-top-2">
                                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Seleccionar Usuario</label>
                                                                    <select
                                                                        value={activities.find(a => a.id === selectedActivityId)?.assigned_user_id || ''}
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

                                                            {(activities.find(a => a.id === selectedActivityId)?.assignment_type === 'department' || activities.find(a => a.id === selectedActivityId)?.assignment_type === 'position') && (
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
                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, assignment_strategy: strat.id as any } : a));
                                                                                    }}
                                                                                    className={cn(
                                                                                        "p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-2",
                                                                                        (activities.find(a => a.id === selectedActivityId)?.assignment_strategy || 'manual') === strat.id
                                                                                            ? "bg-slate-900 dark:bg-blue-600 border-slate-900 dark:border-blue-600 text-white shadow-lg"
                                                                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                                                                                    )}
                                                                                >
                                                                                    <div className={cn(
                                                                                        "w-8 h-8 rounded-lg flex items-center justify-center",
                                                                                        (activities.find(a => a.id === selectedActivityId)?.assignment_strategy || 'manual') === strat.id
                                                                                            ? "bg-white/20"
                                                                                            : "bg-slate-50 dark:bg-slate-800"
                                                                                    )}>
                                                                                        <strat.icon className="w-4 h-4" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="font-black text-[9px] uppercase tracking-wider mb-0.5">{strat.label}</p>
                                                                                        <p className={cn("text-[7px] font-bold uppercase opacity-60", (activities.find(a => a.id === selectedActivityId)?.assignment_strategy || 'manual') === strat.id ? "text-white" : "text-slate-400")}>
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
                                                    </div>
                                                )}

                                                {activeTab === 'actions' && (
                                                    <div className="space-y-8 animate-fadeIn">
                                                        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                                                            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-blue-600">
                                                                <Globe className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <h4 className="text-lg font-black text-blue-900 dark:text-blue-100">Acciones Automáticas</h4>
                                                                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Configura llamadas a servicios externos (Finanzas/Webhooks/SOAP) para esta actividad.</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                            {[
                                                                { id: 'none', label: 'Sin Acción', icon: X, desc: 'Tarea 100% manual' },
                                                                { id: 'finance', label: 'Contabilidad (ERP)', icon: Zap, desc: 'Auto-asiento contable' },
                                                                { id: 'webhook', label: 'REST Webhook', icon: Link, desc: 'Llamada JSON Standard' },
                                                                { id: 'soap', label: 'SOAP Service', icon: Code, desc: 'XML/Enterprise' }
                                                            ].map((type) => (
                                                                <button
                                                                    key={type.id}
                                                                    onClick={() => {
                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? { ...a, action_type: type.id as any } : a));
                                                                    }}
                                                                    className={cn(
                                                                        "p-5 rounded-[2rem] border-2 text-left transition-all flex flex-col gap-3 group/act",
                                                                        (activities.find(a => a.id === selectedActivityId)?.action_type || 'none') === type.id
                                                                            ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 dark:shadow-none"
                                                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-200"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover/act:scale-110",
                                                                        (activities.find(a => a.id === selectedActivityId)?.action_type || 'none') === type.id
                                                                            ? "bg-white/20"
                                                                            : "bg-slate-50 dark:bg-slate-800"
                                                                    )}>
                                                                        <type.icon className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-[10px] uppercase tracking-wider mb-1">{type.label}</p>
                                                                        <p className={cn("text-[8px] font-bold uppercase opacity-60", (activities.find(a => a.id === selectedActivityId)?.action_type || 'none') === type.id ? "text-white" : "text-slate-400")}>
                                                                            {type.desc}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {activities.find(a => a.id === selectedActivityId)?.action_type === 'finance' && (
                                                            <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] border border-slate-200 dark:border-slate-800 space-y-6 animate-in slide-in-from-top-4">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">URL del Proyecto Finanzas</label>
                                                                        <input
                                                                            type="text"
                                                                            value={activities.find(a => a.id === selectedActivityId)?.action_config?.finance_url || ''}
                                                                            onChange={(e) => {
                                                                                const finance_url = e.target.value;
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                    ...a,
                                                                                    action_config: { ...a.action_config, finance_url }
                                                                                } : a));
                                                                            }}
                                                                            className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                                                            placeholder="https://example.supabase.co"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">API Key (Service Role)</label>
                                                                        <input
                                                                            type="password"
                                                                            value={activities.find(a => a.id === selectedActivityId)?.action_config?.api_key || ''}
                                                                            onChange={(e) => {
                                                                                const api_key = e.target.value;
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                    ...a,
                                                                                    action_config: { ...a.action_config, api_key }
                                                                                } : a));
                                                                            }}
                                                                            className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                                                            placeholder="sk_..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-4">
                                                                    <div>
                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Monto (Eje: {'{{monto}}'})</label>
                                                                        <input
                                                                            type="text"
                                                                            value={activities.find(a => a.id === selectedActivityId)?.action_config?.amount || ''}
                                                                            onChange={(e) => {
                                                                                const amount = e.target.value;
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                    ...a,
                                                                                    action_config: { ...a.action_config, amount }
                                                                                } : a));
                                                                            }}
                                                                            className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Movimiento</label>
                                                                        <select
                                                                            value={activities.find(a => a.id === selectedActivityId)?.action_config?.movement_type || 'expense'}
                                                                            onChange={(e) => {
                                                                                const movement_type = e.target.value as 'expense' | 'income';
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                    ...a,
                                                                                    action_config: { ...a.action_config, movement_type }
                                                                                } : a));
                                                                            }}
                                                                            className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                                                        >
                                                                            <option value="expense">Egreso</option>
                                                                            <option value="income">Ingreso</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">ID Concepto Contable</label>
                                                                        <input
                                                                            type="text"
                                                                            value={activities.find(a => a.id === selectedActivityId)?.action_config?.concept_id || ''}
                                                                            onChange={(e) => {
                                                                                const concept_id = e.target.value;
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                    ...a,
                                                                                    action_config: { ...a.action_config, concept_id }
                                                                                } : a));
                                                                            }}
                                                                            className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Descripción</label>
                                                                    <input
                                                                        type="text"
                                                                        value={activities.find(a => a.id === selectedActivityId)?.action_config?.description || ''}
                                                                        onChange={(e) => {
                                                                            const description = e.target.value;
                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                ...a,
                                                                                action_config: { ...a.action_config, description }
                                                                            } : a));
                                                                        }}
                                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(activities.find(a => a.id === selectedActivityId)?.action_type === 'webhook' ||
                                                            activities.find(a => a.id === selectedActivityId)?.action_type === 'soap') && (
                                                                <div className="space-y-6">
                                                                    <div className="flex items-center justify-between">
                                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pasos de la Acción</h5>
                                                                        <button
                                                                            onClick={() => {
                                                                                const newStep = {
                                                                                    id: crypto.randomUUID(),
                                                                                    url: '',
                                                                                    method: 'POST',
                                                                                    auth_type: 'none' as const
                                                                                };
                                                                                setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                    ...a,
                                                                                    action_config: {
                                                                                        ...a.action_config,
                                                                                        steps: [...(a.action_config?.steps || []), newStep]
                                                                                    }
                                                                                } : a));
                                                                            }}
                                                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider"
                                                                        >
                                                                            + Añadir Paso
                                                                        </button>
                                                                    </div>

                                                                    {(activities.find(a => a.id === selectedActivityId)?.action_config?.steps || []).map((step, sIdx) => (
                                                                        <div key={step.id} className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800 space-y-4">
                                                                            <div className="flex items-center justify-between mb-2">
                                                                                <span className="text-[10px] font-black text-blue-600 uppercase">Paso {sIdx + 1}</span>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                            ...a,
                                                                                            action_config: {
                                                                                                ...a.action_config,
                                                                                                steps: a.action_config?.steps?.filter(s => s.id !== step.id)
                                                                                            }
                                                                                        } : a));
                                                                                    }}
                                                                                    className="text-rose-500 hover:text-rose-600 transition-colors"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                            <div className="grid grid-cols-4 gap-4">
                                                                                <div className="col-span-3">
                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Endpoint (URL)</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={step.url}
                                                                                        onChange={(e) => {
                                                                                            const url = e.target.value;
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                ...a,
                                                                                                action_config: {
                                                                                                    ...a.action_config,
                                                                                                    steps: a.action_config?.steps?.map(s => s.id === step.id ? { ...s, url } : s)
                                                                                                }
                                                                                            } : a));
                                                                                        }}
                                                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                                                                        placeholder="https://api.servidor.com/v1/recurso"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Método</label>
                                                                                    <select
                                                                                        value={step.method}
                                                                                        onChange={(e) => {
                                                                                            const method = e.target.value;
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                ...a,
                                                                                                action_config: {
                                                                                                    ...a.action_config,
                                                                                                    steps: a.action_config?.steps?.map(s => s.id === step.id ? { ...s, method } : s)
                                                                                                }
                                                                                            } : a));
                                                                                        }}
                                                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                                                                    >
                                                                                        <option value="GET">GET</option>
                                                                                        <option value="POST">POST</option>
                                                                                        <option value="PUT">PUT</option>
                                                                                        <option value="DELETE">DELETE</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Variable de Salida (Opcional)</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={step.output_variable || ''}
                                                                                        onChange={(e) => {
                                                                                            const v = e.target.value;
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                ...a,
                                                                                                action_config: {
                                                                                                    ...a.action_config,
                                                                                                    steps: a.action_config?.steps?.map(s => s.id === step.id ? { ...s, output_variable: v } : s)
                                                                                                }
                                                                                            } : a));
                                                                                        }}
                                                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                                                                                        placeholder="token_acceso"
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Tipo de Auth</label>
                                                                                    <select
                                                                                        value={step.auth_type}
                                                                                        onChange={(e) => {
                                                                                            const at = e.target.value as any;
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                ...a,
                                                                                                action_config: {
                                                                                                    ...a.action_config,
                                                                                                    steps: a.action_config?.steps?.map(s => s.id === step.id ? { ...s, auth_type: at } : s)
                                                                                                }
                                                                                            } : a));
                                                                                        }}
                                                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                                                                    >
                                                                                        <option value="none">Sin Auth</option>
                                                                                        <option value="bearer">Bearer Token</option>
                                                                                        <option value="basic">Basic Auth</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>

                                                                            {step.auth_type !== 'none' && (
                                                                                <div className="animate-in slide-in-from-top-2 duration-300">
                                                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Token / Credenciales (Eje: {'{{mi_token}}'})</label>
                                                                                    <input
                                                                                        type="text"
                                                                                        value={step.auth_token || ''}
                                                                                        onChange={(e) => {
                                                                                            const token = e.target.value;
                                                                                            setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                                ...a,
                                                                                                action_config: {
                                                                                                    ...a.action_config,
                                                                                                    steps: a.action_config?.steps?.map(s => s.id === step.id ? { ...s, auth_token: token } : s)
                                                                                                }
                                                                                            } : a));
                                                                                        }}
                                                                                        className="w-full h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                                                                                        placeholder="Token de acceso o user:pass"
                                                                                    />
                                                                                </div>
                                                                            )}

                                                                            <div>
                                                                                <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 ml-1">Cuerpo de la Petición (JSON/XML - Usa {'{{variable}}'})</label>
                                                                                <textarea
                                                                                    value={step.body || ''}
                                                                                    onChange={(e) => {
                                                                                        const body = e.target.value;
                                                                                        setActivities(prev => prev.map(a => a.id === selectedActivityId ? {
                                                                                            ...a,
                                                                                            action_config: {
                                                                                                ...a.action_config,
                                                                                                steps: a.action_config?.steps?.map(s => s.id === step.id ? { ...s, body } : s)
                                                                                            }
                                                                                        } : a));
                                                                                    }}
                                                                                    rows={4}
                                                                                    className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono scrollbar-thin"
                                                                                    placeholder={activities.find(a => a.id === selectedActivityId)?.action_type === 'soap' ? '<xml>...</xml>' : '{ "clave": "{{valor}}" }'}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                    </div>
                                                )}

                                                {activeTab === 'transitions' && (
                                                    <div className="space-y-6 animate-fadeIn">
                                                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Salidas Disponibles</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {transitions.filter(t => t.source_id === selectedActivityId).map(t => {
                                                                const target = activities.find(a => a.id === t.target_id);
                                                                return (
                                                                    <div key={t.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl hover:border-blue-500 transition-all group/trans">
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
                                                <div className="p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800">
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
        </div>
    );
}

function ActivityNode({ activity, isSelected, isConnectionSource, onDragStart, onClick }: { activity: Activity, isSelected: boolean, isConnectionSource: boolean, onDragStart: (e: React.DragEvent) => void, onClick: (e: React.MouseEvent) => void }) {
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
            style={{ left: activity.x_pos, top: activity.y_pos }}
            className={cn(
                "absolute cursor-grab active:cursor-grabbing group select-none transition-all duration-300 pointer-events-auto",
                isSelected ? "z-40 scale-105" : "z-30 hover:scale-105"
            )}
        >
            <div className={cn(
                "w-52 p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 shadow-xl transition-all duration-500 relative ring-4",
                isSelected
                    ? "border-blue-600 shadow-blue-500/20 ring-blue-500/10 translate-y-[-2px]"
                    : "border-slate-100 dark:border-slate-800 shadow-slate-900/5 ring-transparent hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-blue-500/5",
                isConnectionSource && "border-blue-600 ring-blue-500/20 animate-pulse"
            )}>
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

function TransitionArrow({ transition, source, target, isSelected, onClick }: { transition: Transition, source: Activity, target: Activity, isSelected: boolean, onClick: (e: React.MouseEvent) => void }) {
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
        <g onClick={onClick} className="cursor-pointer group pointer-events-auto">
            <path
                d={pathData}
                stroke={isSelected ? "#3b82f6" : "#cbd5e1"}
                strokeWidth={isSelected ? "3" : "2"}
                fill="none"
                markerEnd={isSelected ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                className={cn("transition-all duration-300", !isSelected && "dark:stroke-slate-800")}
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

