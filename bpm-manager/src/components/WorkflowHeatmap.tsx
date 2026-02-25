
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ZoomIn, ZoomOut, Maximize, Play, Square, AlertCircle, GitBranch, MousePointer2, X, Filter } from 'lucide-react';
import type { Activity, Transition } from '../types';
import { ProcessTable } from './ProcessTable';
import { ProcessViewerModal } from './ProcessViewerModal';

interface WorkflowHeatmapProps {
    workflowId?: string;
}

interface ActivityStats {
    historical: number; // Total executions (passed through)
    active: number;    // Currently active (pending)
}

export function WorkflowHeatmap({ workflowId: initialWorkflowId }: WorkflowHeatmapProps) {
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(initialWorkflowId || null);

    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [stats, setStats] = useState<Record<string, ActivityStats>>({});

    // Zoom and Pan State
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // Node Dragging State
    const [draggedNode, setDraggedNode] = useState<string | null>(null);

    // Drill-down State
    const [selectedNode, setSelectedNode] = useState<{ id: string; name: string; type: 'active' | 'historical' } | null>(null);
    const [nodeProcesses, setNodeProcesses] = useState<any[]>([]);
    const [loadingProcesses, setLoadingProcesses] = useState(false);
    const [processPage, setProcessPage] = useState(1);
    const [processPageSize, setProcessPageSize] = useState(5);
    const [viewingProcessId, setViewingProcessId] = useState<string | null>(null);

    useEffect(() => {
        loadWorkflows();
    }, []);

    useEffect(() => {
        if (initialWorkflowId) {
            setSelectedWorkflowId(initialWorkflowId);
        }
    }, [initialWorkflowId]);

    useEffect(() => {
        if (selectedWorkflowId) {
            loadGraphData(selectedWorkflowId);
        } else {
            // Reset if no workflow selected
            setActivities([]);
            setTransitions([]);
            setStats({});
        }
    }, [selectedWorkflowId]);

    async function loadWorkflows() {
        const { data } = await supabase.from('workflows').select('id, name');
        if (data) setWorkflows(data);
    }

    async function loadGraphData(wfId: string) {
        try {
            setLoading(true);

            // 1. Fetch Structure
            const [actRes, transRes] = await Promise.all([
                supabase.from('activities').select('*').eq('workflow_id', wfId),
                supabase.from('transitions').select('*').eq('workflow_id', wfId)
            ]);

            if (actRes.error) throw actRes.error;
            if (transRes.error) throw transRes.error;

            const activitiesData = actRes.data || [];
            setActivities(activitiesData);
            setTransitions(transRes.data || []);

            // 2. Fetch Stats
            // A. Active Instances (Where are they NOW?)
            const { data: activeInstances, error: activeError } = await supabase
                .from('process_instances')
                .select('current_activity_id')
                .eq('workflow_id', wfId)
                .eq('status', 'active');

            if (activeError) throw activeError;

            // B. Historical Executions (Where have they been?)
            // We count 'process_history' entries. 
            // Note: This counts every time a node was entered. 
            // Use 'process_history' joined with activities to ensure we filter by this workflow if needed, 
            // but fetching by process_instances filtered by workflow_id then joining history is complex.
            // Better: Get history for all processes of this workflow.

            // We can resolve this by:
            // Fetch process_ids for this workflow first? No, too many.
            // Fetch history where activity_id IN (list of activity ids for this workflow).
            const activityIds = activitiesData.map(a => a.id);

            // Batching might be needed for huge datasets, but for now:
            const { data: historyData, error: historyError } = await supabase
                .from('process_history')
                .select('activity_id')
                .in('activity_id', activityIds); // This effectively filters by workflow

            if (historyError) throw historyError;

            // Aggregate
            const newStats: Record<string, ActivityStats> = {};

            // Initialize
            activitiesData.forEach(a => {
                newStats[a.id] = { historical: 0, active: 0 };
            });

            // Count Active
            activeInstances?.forEach((item: any) => {
                if (item.current_activity_id && newStats[item.current_activity_id]) {
                    newStats[item.current_activity_id].active++;
                }
            });

            // Count Historical
            historyData?.forEach((item: any) => {
                if (item.activity_id && newStats[item.activity_id]) {
                    newStats[item.activity_id].historical++;
                }
            });

            setStats(newStats);

        } catch (err) {
            console.error("Error loading graph data:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadNodeProcesses(activityId: string, type: 'active' | 'historical') {
        try {
            setLoadingProcesses(true);
            setNodeProcesses([]);

            let query = supabase
                .from('process_instances')
                .select('*, workflows(name), activities(name, type)')
                .order('created_at', { ascending: false });

            if (type === 'active') {
                // Active instances currently AT this node
                query = query
                    .eq('current_activity_id', activityId)
                    .eq('status', 'active');
            } else {
                // Historical: Processes that passed through this node
                // This requires a join or subquery on process_history
                // Simplified: Get history first then instances? Or simple approach for UX:
                // If historical, show ALL instances that have a history record for this activity.

                // 1. Get Instance IDs from history
                const { data: history } = await supabase
                    .from('process_history')
                    .select('process_id')
                    .eq('activity_id', activityId);

                const instanceIds = history?.map(h => h.process_id) || [];

                if (instanceIds.length > 0) {
                    query = query.in('id', instanceIds);
                } else {
                    setNodeProcesses([]);
                    setLoadingProcesses(false);
                    return;
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            setNodeProcesses(data || []);

        } catch (err) {
            console.error("Error loading node processes:", err);
        } finally {
            setLoadingProcesses(false);
        }
    }


    // Reuse Panning Logic from ProcessViewerModal
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
        if (e.button === 0 || e.button === 1) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleNodeMouseDown = (e: React.MouseEvent, activityId: string) => {
        e.stopPropagation(); // Prevent canvas panning
        setDraggedNode(activityId);
        setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    const handleStatClick = (e: React.MouseEvent, activity: Activity, type: 'active' | 'historical') => {
        e.stopPropagation();
        setSelectedNode({ id: activity.id, name: activity.name, type });
        setProcessPage(1);
        loadNodeProcesses(activity.id, type);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;

        if (draggedNode) {
            // Update node position
            setActivities(prev => prev.map(a => {
                if (a.id === draggedNode) {
                    return {
                        ...a,
                        x_pos: a.x_pos + (dx / zoom),
                        y_pos: a.y_pos + (dy / zoom)
                    };
                }
                return a;
            }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        } else if (isPanning) {
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setDraggedNode(null);
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
        setZoom(0.8);
        setOffset({ x: 50, y: 50 });
    };

    const handleAttendTask = (taskId: string) => {
        // Redirect logic would go here, usually navigating to an execution page
        // For now just console log or maybe open viewer? 
        // The prompt implies reusing capabilities. We already check status in table.
        // Let's assume navigating to /execution/:id
        window.location.href = `/execution/${taskId}`;
    };


    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-[800px] overflow-hidden">
            {/* Header / Toolbar */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5 text-indigo-600" />
                        Radiografía de Flujo
                    </h3>

                    {/* Workflow Selector */}
                    <select
                        value={selectedWorkflowId || ''}
                        onChange={(e) => setSelectedWorkflowId(e.target.value)}
                        className="text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-slate-700 p-2 min-w-[200px]"
                    >
                        <option value="" disabled>Seleccione un flujo...</option>
                        {workflows.map(wf => (
                            <option key={wf.id} value={wf.id}>{wf.name}</option>
                        ))}
                    </select>

                    {selectedWorkflowId && (
                        <button
                            onClick={() => setSelectedWorkflowId(null)}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                            title="Cerrar vista actual"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-5 text-[10px] font-black uppercase tracking-widest bg-slate-50 py-2 px-4 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                        <span className="text-slate-400">Sin Actividad</span>
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-5">
                        <span className="text-slate-400 mr-1">Nivel de Carga:</span>
                        <div className="flex gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-blue-600">Bajo</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-orange-600">Medio</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
                                <span className="text-rose-600">Cuello de Botella</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div
                className={`flex-1 bg-slate-50 relative overflow-hidden ${isPanning ? 'cursor-grabbing' : (draggedNode ? 'cursor-grabbing' : 'cursor-grab')}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] opacity-40 pointer-events-none"
                    style={{
                        backgroundPosition: `${offset.x}px ${offset.y}px`,
                        backgroundSize: `${24 * zoom}px ${24 * zoom}px`
                    }}></div>

                {/* Content */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        transformOrigin: '0 0'
                    }}>

                    {/* Transitions */}
                    <svg className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible">
                        <defs>
                            <marker id="arrowhead-heatmap" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                            </marker>
                        </defs>
                        {transitions.map((transition) => {
                            const source = activities.find(a => a.id === transition.source_id);
                            const target = activities.find(a => a.id === transition.target_id);
                            if (!source || !target) return null;

                            return (
                                <TransitionArrowHeatmap
                                    key={transition.id}
                                    transition={transition}
                                    source={source}
                                    target={target}
                                />
                            );
                        })}
                    </svg>

                    {/* Nodes with Stats */}
                    {(() => {
                        const maxActive = Math.max(...Object.values(stats).map(s => s.active), 0);
                        return activities.map(activity => (
                            <ActivityNodeStats
                                key={activity.id}
                                activity={activity}
                                stats={stats[activity.id] || { historical: 0, active: 0 }}
                                maxActive={maxActive}
                                onMouseDown={(e) => handleNodeMouseDown(e, activity.id)}
                                onStatClick={(e, type) => handleStatClick(e, activity, type)}
                            />
                        ));
                    })()}

                </div>

                {/* Controls */}
                <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-20 pointer-events-auto">
                    <button onClick={() => setZoom(z => Math.min(z * 1.2, 3))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"><ZoomIn className="w-4 h-4" /></button>
                    <span className="text-[10px] font-black w-10 text-center text-slate-400">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"><ZoomOut className="w-4 h-4" /></button>
                    <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold rounded-lg ml-2"><Maximize className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
                    <button
                        onClick={handleAutoLayout}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg transition-all"
                        title="Auto-organizar"
                    >
                        <GitBranch className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-wider">Organizar</span>
                    </button>
                </div>

                {(!selectedWorkflowId) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-30 pointer-events-none">
                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 text-center">
                            <MousePointer2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-lg font-bold text-slate-700">Seleccione un Flujo</h3>
                            <p className="text-slate-500 text-sm">Escoja un flujo de trabajo arriba para ver su radiografía.</p>
                        </div>
                    </div>
                )}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            {/* Drill-down Results */}
            {selectedNode && (
                <div className="mt-6 border-t border-slate-100 pt-6 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${selectedNode.type === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                <Filter className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800">
                                    {selectedNode.type === 'active' ? 'Trámites En Curso' : 'Histórico de Ejecución'}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    En actividad: <span className="text-slate-700 font-bold">{selectedNode.name}</span>
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedNode(null)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden min-h-[300px] flex flex-col shadow-sm">
                        <ProcessTable
                            processes={nodeProcesses}
                            loading={loadingProcesses}
                            onView={(id) => setViewingProcessId(id)}
                            onAttend={handleAttendTask}
                            currentPage={processPage}
                            pageSize={processPageSize}
                            onPageChange={setProcessPage}
                            onPageSizeChange={setProcessPageSize}
                        />
                    </div>
                </div>
            )}

            {/* Viewer Modal */}
            {viewingProcessId && (
                <ProcessViewerModal
                    processId={viewingProcessId}
                    onClose={() => setViewingProcessId(null)}
                />
            )}
        </div>
    );
}

// Stats Node Component
function ActivityNodeStats({
    activity,
    stats,
    maxActive,
    onMouseDown,
    onStatClick
}: {
    activity: Activity,
    stats: ActivityStats,
    maxActive: number,
    onMouseDown: (e: React.MouseEvent) => void,
    onStatClick: (e: React.MouseEvent, type: 'active' | 'historical') => void
}) {
    const icons = {
        start: Play,
        task: Square,
        decision: AlertCircle,
        end: Square,
    };
    const Icon = icons[activity.type] || Square;

    const getHeatStyles = () => {
        if (stats.active === 0) return 'bg-white border-slate-200 text-slate-400 shadow-sm';

        const ratio = stats.active / (maxActive || 1);

        if (ratio >= 0.7 && stats.active > 0) {
            return 'bg-rose-600 border-rose-700 text-white shadow-xl shadow-rose-200 ring-4 ring-rose-50 animate-pulse';
        }
        if (ratio >= 0.3 && stats.active > 0) {
            return 'bg-orange-500 border-orange-600 text-white shadow-lg shadow-orange-100 ring-4 ring-orange-50';
        }
        return 'bg-blue-500 border-blue-600 text-white shadow-lg shadow-blue-100 ring-4 ring-blue-50';
    };

    const heatStyles = getHeatStyles();

    return (
        <div
            className="absolute flex flex-col items-center pointer-events-auto group cursor-move"
            style={{ left: activity.x_pos, top: activity.y_pos }}
            onMouseDown={onMouseDown}
        >
            {/* Node Circle */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-500 z-10 ${heatStyles}`}>
                <Icon className={`w-6 h-6 ${stats.active > 0 ? 'text-white' : 'text-slate-400'}`} />
            </div>

            {/* Label */}
            <div className="mt-2 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-bold text-slate-600 border border-slate-100 shadow-sm max-w-[120px] truncate text-center z-10">
                {activity.name}
            </div>

            {/* Stats Panel */}
            <div className="mt-1 flex flex-col gap-1 w-24 pointer-events-auto">
                {/* Active Count */}
                <button
                    onClick={(e) => onStatClick(e, 'active')}
                    title="Ver Trámites En Curso"
                    className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${stats.active > 0 ? 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 shadow-sm' : 'bg-slate-50 text-slate-300 border border-slate-100 hover:bg-slate-100 cursor-not-allowed'}`}
                    disabled={stats.active === 0}
                >
                    <span>En Curso</span>
                    <span>{stats.active}</span>
                </button>
                {/* Historical Count */}
                <button
                    onClick={(e) => onStatClick(e, 'historical')}
                    title="Ver Histórico"
                    className={`flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold bg-white text-slate-500 border border-slate-100 transition-all hover:scale-105 active:scale-95 hover:border-slate-300 cursor-pointer ${stats.historical === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}`}
                    disabled={stats.historical === 0}
                >
                    <span>Histórico</span>
                    <span>{stats.historical}</span>
                </button>
            </div>
        </div>
    );
}

function TransitionArrowHeatmap({ transition, source, target }: { transition: Transition, source: Activity, target: Activity }) {
    // Docking logic
    const sCX = source.x_pos + 24;
    const sCY = source.y_pos + 24;
    const tCX = target.x_pos + 24;
    const tCY = target.y_pos + 24;

    const dx = tCX - sCX;
    const dy = tCY - sCY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let sX, sY, tX, tY;
    const halfSize = 24;

    if (absDx > absDy) {
        // Horizontal docking
        sX = sCX + (dx > 0 ? halfSize : -halfSize);
        sY = sCY + (dy * halfSize / absDx);
        tX = tCX - (dx > 0 ? halfSize + 8 : -halfSize - 8);
        tY = tCY - (dy * (halfSize + 8) / absDx);
    } else {
        // Vertical docking
        sY = sCY + (dy > 0 ? halfSize : -halfSize);
        sX = sCX + (dx * halfSize / absDy);
        tY = tCY - (dy > 0 ? halfSize + 8 : -halfSize - 8);
        tX = tCX - (dx * (halfSize + 8) / absDy);
    }

    // Manhattan Path
    const midX = sX + (tX - sX) / 2;
    const pathData = `M ${sX} ${sY} L ${midX} ${sY} L ${midX} ${tY} L ${tX} ${tY}`;

    const textX = midX;
    const textY = sY + (tY - sY) / 2;

    return (
        <g>
            <path
                d={pathData}
                stroke="#cbd5e1"
                dark-stroke="#334155"
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead-heatmap)"
                className="transition-all duration-300 dark:stroke-slate-800"
            />
            {transition.condition && (
                <g transform={`translate(${textX}, ${textY})`}>
                    <rect x="-24" y="-8" width="48" height="16" rx="8" fill="white" className="dark:fill-slate-900" stroke="#cbd5e1" strokeWidth="1" />
                    <text textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="bold" fill="#94a3b8">
                        {transition.condition}
                    </text>
                </g>
            )}
        </g>
    );
}
