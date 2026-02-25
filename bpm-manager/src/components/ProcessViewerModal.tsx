import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Maximize, Play, Square, AlertCircle, CheckCircle2, Clock, Network, GitBranch } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Activity, Transition } from '../types';
import { HistoryDetailModal } from './ProcessExecution';

interface ProcessViewerModalProps {
    processId: string;
    onClose: () => void;
}

interface ProcessExecutionState {
    executedActivityIds: Set<string>;
    currentActivityId: string | null;
    status: 'active' | 'completed';
}

export function ProcessViewerModal({ processId, onClose }: ProcessViewerModalProps) {
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [workflowName, setWorkflowName] = useState('');
    const [processNumber, setProcessNumber] = useState<number | null>(null);
    const [executionState, setExecutionState] = useState<ProcessExecutionState>({
        executedActivityIds: new Set(),
        currentActivityId: null,
        status: 'active'
    });

    // History Data for Click Details
    const [historyLog, setHistoryLog] = useState<any[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

    // Zoom and Pan State
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // Node Dragging State
    const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        loadProcessData();
    }, [processId]);

    async function loadProcessData() {
        try {
            setLoading(true);

            // 1. Get process instance details to find workflow_id and current status
            const { data: process, error: processError } = await supabase
                .from('process_instances')
                .select('process_number, workflow_id, current_activity_id, status, workflows(name)')
                .eq('id', processId)
                .single();

            if (processError) throw processError;

            // Handle joined data - supabase sometimes returns array for joins even if single
            const workflowData = process.workflows as any;
            const wfName = Array.isArray(workflowData) ? workflowData[0]?.name : workflowData?.name;
            setWorkflowName(wfName || 'Proceso');
            setProcessNumber(process.process_number);

            // 2. Get workflow structure (activities and transitions)
            const [activitiesResult, transitionsResult] = await Promise.all([
                supabase.from('activities').select('*').eq('workflow_id', process.workflow_id),
                supabase.from('transitions').select('*').eq('workflow_id', process.workflow_id)
            ]);

            if (activitiesResult.error) throw activitiesResult.error;
            if (transitionsResult.error) throw transitionsResult.error;

            setActivities(activitiesResult.data || []);
            setTransitions(transitionsResult.data || []);

            // 3. Get execution history to determine executed nodes
            // Changed from process_exec_log to process_history to get full details
            const { data: history, error: historyError } = await supabase
                .from('process_history')
                .select('*, activities(name), profiles(full_name, email)')
                .eq('process_id', processId)
                .order('created_at', { ascending: false });

            if (historyError) throw historyError;

            setHistoryLog(history || []);

            // Build set of executed activities
            const executedIds = new Set(history?.map((h: any) => h.activity_id) || []);

            setExecutionState({
                executedActivityIds: executedIds,
                currentActivityId: process.current_activity_id,
                status: process.status
            });

            // Auto-center view could be calculated here using min/max bounds if needed
            // Removed unused variables

        } catch (error) {
            console.error('Error loading process visualization:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleAutoLayout = () => {
        if (activities.length === 0) return;

        const GAP_X = 240;
        const GAP_Y = 120;
        const ranks: Record<string, number> = {};
        const visited = new Set<string>();

        const roots = activities.filter(a => a.type === 'start');
        const worklist = roots.length > 0 ? roots.map(r => ({ id: r.id, rank: 0 })) : [{ id: activities[0].id, rank: 0 }];

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

        activities.forEach(a => {
            if (!visited.has(a.id)) ranks[a.id] = 0;
        });

        const nodesByRank: Record<number, string[]> = {};
        Object.entries(ranks).forEach(([id, rank]) => {
            if (!nodesByRank[rank]) nodesByRank[rank] = [];
            nodesByRank[rank].push(id);
        });

        const newPos: Record<string, { x: number, y: number }> = {};
        activities.forEach(a => {
            const rank = ranks[a.id] || 0;
            const idx = nodesByRank[rank].indexOf(a.id);
            const offsetInRank = idx - (nodesByRank[rank].length - 1) / 2;

            newPos[a.id] = {
                x: 100 + rank * GAP_X,
                y: 300 + offsetInRank * GAP_Y
            };
        });

        setNodePositions(newPos);
        setZoom(0.8);
        setOffset({ x: 50, y: 50 });
    };

    // Handle Node Click
    async function handleNodeClick(activityId: string) {
        // Find if this activity is in history
        const historyItem = historyLog.find((h: any) => h.activity_id === activityId);

        if (historyItem) {
            // It was executed, show details
            // We need to fetch the extra data like in ProcessExecution
            try {
                const { data: dataFields } = await supabase
                    .from('process_data')
                    .select('*')
                    .eq('process_id', processId)
                    .eq('activity_id', activityId);

                const { data: activityFields } = await supabase
                    .from('activity_field_definitions')
                    .select('*')
                    .eq('activity_id', activityId);

                setSelectedHistoryItem({
                    ...historyItem,
                    fields: activityFields || [],
                    data: dataFields || []
                });
            } catch (err) {
                console.error("Error loading history details", err);
            }
        }
    }

    // Reuse Panning Logic
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY;
            const scaleFactor = 1.1;
            const newZoom = delta > 0 ? zoom * scaleFactor : zoom / scaleFactor;
            const limitedZoom = Math.min(Math.max(newZoom, 0.2), 3);
            setZoom(limitedZoom);
        } else {
            setOffset(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Pan with: Left Click (button 0), Middle Click (button 1), or Right Click (button 2)
        if (e.button === 0 || e.button === 1 || e.button === 2) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingNodeId) {
            // Node dragging
            const dx = (e.clientX - dragStart.x) / zoom;
            const dy = (e.clientY - dragStart.y) / zoom;

            setNodePositions(prev => ({
                ...prev,
                [draggingNodeId]: {
                    x: (prev[draggingNodeId]?.x || activities.find(a => a.id === draggingNodeId)?.x_pos || 0) + dx,
                    y: (prev[draggingNodeId]?.y || activities.find(a => a.id === draggingNodeId)?.y_pos || 0) + dy
                }
            }));
            setDragStart({ x: e.clientX, y: e.clientY });
        } else if (isPanning) {
            // Canvas panning
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggingNodeId(null);
    };

    // Node drag handlers
    const handleNodeDragStart = (e: React.MouseEvent, activityId: string) => {
        e.stopPropagation();
        setDraggingNodeId(activityId);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 flex flex-col items-center animate-in zoom-in-95 shadow-2xl border border-white/10 dark:border-slate-800">
                    <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-900 dark:text-white font-black text-lg">Preparando Vista</p>
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-1">Cargando la estructura del proceso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] w-full max-w-7xl h-[90vh] flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/10 dark:border-slate-800">

                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 backdrop-blur-xl z-10 transition-colors">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                            <Network className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">{workflowName}</h2>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">
                                    #{processNumber ? processNumber.toString().padStart(8, '0') : processId.split('-')[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Mapa de Navegación</span>
                                <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                {executionState.status === 'completed' ? (
                                    <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">Finalizado</span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">En Ejecución</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 dark:border-slate-700 active:scale-95"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Canvas */}
                <div
                    className={`flex-1 bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onContextMenu={(e) => {
                        if (isPanning) e.preventDefault();
                    }}
                >
                    {/* Grid Background */}
                    <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40 pointer-events-none transition-all duration-300"
                        style={{
                            backgroundPosition: `${offset.x}px ${offset.y}px`,
                            backgroundSize: `${32 * zoom}px ${32 * zoom}px`
                        }}></div>

                    {/* Content Container */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            transformOrigin: '0 0'
                        }}>

                        {/* Transitions (Connections) */}
                        <svg className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible">
                            <defs>
                                <marker id="arrowhead-readonly" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                                </marker>
                                <marker id="arrowhead-executed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                                </marker>
                            </defs>
                            {transitions.map((transition) => {
                                const source = activities.find(a => a.id === transition.source_id);
                                const target = activities.find(a => a.id === transition.target_id);
                                if (!source || !target) return null;

                                // Determine color based on execution
                                // Revised Logic:
                                // - Path is "executed" (Grey/Slate) if source is executed AND target is reached (executed or current).
                                // - But we want executed paths to be grey now.
                                // - If we want to highlight the "active" path leading to current node... maybe blue?
                                // User said "activities attended in grey". Presumably arrows too.

                                const isSourceExecuted = executionState.executedActivityIds.has(source.id);
                                const isTargetReached = executionState.executedActivityIds.has(target.id) || executionState.currentActivityId === target.id;
                                const isExecutedPath = isSourceExecuted && isTargetReached;

                                const sourcePos = nodePositions[source.id] || { x: source.x_pos, y: source.y_pos };
                                const targetPos = nodePositions[target.id] || { x: target.x_pos, y: target.y_pos };

                                return (
                                    <TransitionArrowReadOnly
                                        key={transition.id}
                                        transition={transition}
                                        sourcePos={sourcePos}
                                        targetPos={targetPos}
                                        isExecuted={isExecutedPath}
                                    />
                                );
                            })}
                        </svg>

                        {/* Activities (Nodes) */}
                        {activities.map((activity) => {
                            const isExecuted = executionState.executedActivityIds.has(activity.id);
                            const isCurrent = executionState.currentActivityId === activity.id;
                            const status = isCurrent ? 'current' : (isExecuted ? 'executed' : 'pending');

                            return (
                                <ActivityNodeReadOnly
                                    key={activity.id}
                                    activity={activity}
                                    status={status}
                                    position={nodePositions[activity.id]}
                                    onDragStart={handleNodeDragStart}
                                    onClick={() => handleNodeClick(activity.id)}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-8 left-8 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-3 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl z-20 transition-all ring-1 ring-black/5">
                    <button onClick={() => setZoom(z => Math.min(z * 1.2, 3))} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-all active:scale-95" title="Acercar"><ZoomIn className="w-5 h-5" /></button>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <span className="text-[10px] font-black w-12 text-center text-slate-500 dark:text-slate-400">{Math.round(zoom * 100)}%</span>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-all active:scale-95" title="Alejar"><ZoomOut className="w-5 h-5" /></button>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-all shadow-sm active:scale-95" title="Centrar Vista"><Maximize className="w-5 h-5" /></button>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={handleAutoLayout} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl transition-all flex items-center gap-2 group/layout shadow-sm" title="Auto-Organizar">
                        <GitBranch className="w-5 h-5 rotate-180" />
                        <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/layout:max-w-[100px] transition-all duration-300">Organizar</span>
                    </button>
                </div>

                {/* Legend */}
                <div className="absolute bottom-8 right-8 flex flex-col gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl z-20 transition-all hover:scale-105">
                    <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Activo Ahora</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.5)]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Ejecutado</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-300/50 border border-blue-400/50 shadow-[0_0_10px_rgba(147,197,253,0.3)]"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pendiente</span>
                    </div>
                </div>
            </div>

            {/* History Details Modal (Rendered on top) */}
            {selectedHistoryItem && (
                <HistoryDetailModal
                    item={selectedHistoryItem}
                    onClose={() => setSelectedHistoryItem(null)}
                />
            )}
        </div>
    );
}

// Subcomponents for Read-Only View

function ActivityNodeReadOnly({ activity, status, onClick, position, onDragStart }: {
    activity: Activity,
    status: 'executed' | 'current' | 'pending',
    onClick?: () => void,
    position?: { x: number, y: number },
    onDragStart?: (e: React.MouseEvent, activityId: string) => void
}) {
    const icons = {
        start: Play,
        task: Square,
        decision: AlertCircle,
        end: Square,
    };

    const Icon = icons[activity.type];

    // Status Styling
    const styles = {
        executed: {
            bg: "bg-slate-500 shadow-slate-200 dark:shadow-slate-900/50",
            ring: "ring-0",
            iconColor: "text-white",
            labelBg: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400",
            container: "opacity-90 grayscale-[0.3] cursor-move hover:scale-105"
        },
        current: {
            bg: "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]",
            ring: "ring-4 ring-emerald-500/20 dark:ring-emerald-500/10",
            iconColor: "text-white",
            labelBg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-black",
            container: "scale-110 z-10 cursor-move"
        },
        pending: {
            bg: "bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800",
            ring: "ring-0",
            iconColor: "text-slate-400 dark:text-slate-600",
            labelBg: "bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600",
            container: "opacity-100 cursor-move"
        }
    }[status];

    const finalPosition = position || { x: activity.x_pos, y: activity.y_pos };

    return (
        <div
            className={`absolute transition-none ${styles.container} pointer-events-auto select-none`}
            style={{ left: finalPosition.x, top: finalPosition.y }}
            onMouseDown={(e) => {
                e.stopPropagation();
                if (onDragStart) {
                    onDragStart(e, activity.id);
                }
            }}
            onClick={(e) => {
                e.stopPropagation();
                if (status === 'executed' && onClick) {
                    onClick();
                }
            }}
        >
            <div className="flex flex-col items-center gap-2 relative">
                {/* Status Indicator Icon for Executed */}
                {status === 'executed' && (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full text-slate-500 shadow-sm z-20 border border-slate-100">
                        <CheckCircle2 className="w-4 h-4 fill-slate-100" />
                    </div>
                )}
                {/* Status Indicator for Current */}
                {status === 'current' && (
                    <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full text-white p-0.5 shadow-md z-20 animate-bounce">
                        <Clock className="w-3 h-3" />
                    </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xl transition-all duration-300 ${styles.bg} ${styles.ring} ${styles.iconColor} ${status === 'pending' ? '' : 'text-white'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className={`px-2 py-1 rounded-lg border shadow-sm text-[9px] font-black uppercase tracking-widest whitespace-nowrap max-w-[120px] truncate transition-all duration-300 ${styles.labelBg}`}>
                    {activity.name}
                </div>
            </div>
        </div>
    );
}

function TransitionArrowReadOnly({ transition, sourcePos, targetPos, isExecuted }: { transition: Transition, sourcePos: { x: number, y: number }, targetPos: { x: number, y: number }, isExecuted: boolean }) {
    // Calculate center points
    const sCX = sourcePos.x + 20;
    const sCY = sourcePos.y + 20;
    const tCX = targetPos.x + 20;
    const tCY = targetPos.y + 20;

    const dx = tCX - sCX;
    const dy = tCY - sCY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let sX, sY, tX, tY;
    const halfSize = 20; // Node is 40x40

    if (absDx > absDy) {
        sX = sCX + (dx > 0 ? halfSize : -halfSize);
        sY = sCY + (dy * halfSize / absDx);
        tX = tCX - (dx > 0 ? halfSize + 6 : -halfSize - 6);
        tY = tCY - (dy * (halfSize + 6) / absDx);
    } else {
        sY = sCY + (dy > 0 ? halfSize : -halfSize);
        sX = sCX + (dx * halfSize / absDy);
        tY = tCY - (dy > 0 ? halfSize + 6 : -halfSize - 6);
        tX = tCX - (dx * (halfSize + 6) / absDy);
    }

    // Orthogonal path calculation (Manhattan)
    const midX = sX + (tX - sX) / 2;

    // Path: Exit horizontally -> vertical drop -> horizontal enter
    const pathData = `M ${sX} ${sY} L ${midX} ${sY} L ${midX} ${tY} L ${tX} ${tY}`;

    const textX = midX;
    const textY = sY + (tY - sY) / 2;

    const color = isExecuted ? "#64748b" : (document.documentElement.classList.contains('dark') ? "#475569" : "#94a3b8");
    const strokeWidth = isExecuted ? "3" : "2";

    // We need to define the marker for grey executed path if we want
    // But re-using arrowhead-readonly (which is #cbd5e1) for pending is fine.
    // We need a dark grey marker for executed.
    // Let's rely on marker defs. We have 'arrowhead-executed' which was green. We should change it to grey.

    return (
        <g>
            <defs>
                {/* Re-defining here locally if needed or rely on parent defs? 
                     Parent defs at top of file handle markers. 
                     We need to update parent defs for arrowhead-executed to be grey logic 
                     OR just update the color passed to stroke/fill 
                  */}
            </defs>
            <path
                d={pathData}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="none"
                markerEnd={isExecuted ? "url(#arrowhead-executed)" : "url(#arrowhead-readonly)"}
                className="transition-all duration-500"
            />
            {transition.condition && (
                <g transform={`translate(${textX}, ${textY})`}>
                    <rect x="-30" y="-10" width="60" height="20" rx="10" fill="white" stroke={color} strokeWidth="1" />
                    <text textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="bold" fill={isExecuted ? "#475569" : "#94a3b8"}>
                        {transition.condition}
                    </text>
                </g>
            )}
        </g>
    );
}
