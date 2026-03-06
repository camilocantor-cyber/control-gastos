
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ZoomIn, ZoomOut, Maximize, Play, Square, AlertCircle, GitBranch, MousePointer2, X, Filter, Clock, Activity as ActivityIcon, DollarSign, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import type { Activity, Transition } from '../types';
import { ProcessTable } from './ProcessTable';
import { ProcessViewerModal } from './ProcessViewerModal';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

interface WorkflowHeatmapProps {
    workflowId?: string;
    startDate?: string | null;
    endDate?: string | null;
    onViewCost?: (workflowId: string) => void;
}

interface ActivityStats {
    historical: number; // Total executions (passed through)
    active: number;    // Currently active (pending)
    total_cost: number;
    hours: number;
}

export function WorkflowHeatmap({ workflowId: initialWorkflowId, startDate, endDate, onViewCost }: WorkflowHeatmapProps) {
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(initialWorkflowId || null);

    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [stats, setStats] = useState<Record<string, ActivityStats>>({});
    const { user } = useAuth();

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
    }, [selectedWorkflowId, startDate, endDate]);

    useEffect(() => {
        if (selectedNode) {
            loadNodeProcesses(selectedNode.id, selectedNode.type === 'active' ? 'active' : 'historical');
        }
    }, [startDate, endDate]);

    async function loadWorkflows() {
        let query = supabase.from('workflows').select('id, name');
        if (user?.organization_id) {
            query = query.or(`organization_id.eq.${user?.organization_id},is_public.eq.true`);
        } else {
            query = query.eq('is_public', true);
        }
        const { data } = await query;
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
            let activeQuery = supabase
                .from('process_instances')
                .select('current_activity_id')
                .eq('workflow_id', wfId)
                .eq('status', 'active');

            if (user?.organization_id) {
                activeQuery = activeQuery.eq('organization_id', user.organization_id);
            }

            const { data: activeInstances, error: activeError } = await activeQuery;

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

            // 2. Fetch History & Cost Stats directly for this period and workflow
            let historyQuery = supabase
                .from('process_history')
                .select(`
                    activity_id, 
                    step_cost, 
                    time_spent_hours,
                    process_instances!inner(workflow_id, organization_id)
                `)
                .eq('process_instances.workflow_id', wfId)
                .in('activity_id', activityIds);

            if (user?.organization_id) {
                historyQuery = historyQuery.eq('process_instances.organization_id', user.organization_id);
            }
            if (startDate) historyQuery = historyQuery.gte('created_at', startDate);
            if (endDate) historyQuery = historyQuery.lte('created_at', endDate);

            const { data: dataRaw, error: historyError } = await historyQuery;
            if (historyError) throw historyError;
            const historyData = dataRaw || [];

            // Aggregate
            const newStats: Record<string, ActivityStats> = {};

            // Initialize
            activitiesData.forEach(a => {
                newStats[a.id] = { historical: 0, active: 0, total_cost: 0, hours: 0 };
            });

            // Count Active
            activeInstances?.forEach((item: any) => {
                if (item.current_activity_id && newStats[item.current_activity_id]) {
                    newStats[item.current_activity_id].active++;
                }
            });

            // Count Historical & Costs
            historyData?.forEach((h: any) => {
                if (h.activity_id && newStats[h.activity_id]) {
                    newStats[h.activity_id].historical++;
                    newStats[h.activity_id].total_cost += parseFloat(h.step_cost || 0);
                    newStats[h.activity_id].hours += parseFloat(h.time_spent_hours || 0);
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

            // 1.5 Dynamic Height Calculation for Heatmap (added for adaptability)
            // Note: Heatmap height is usually managed by the container, but let's ensure it has breathing room

            if (user?.organization_id) {
                query = query.eq('organization_id', user.organization_id);
            }

            if (type === 'active') {
                // Active instances currently AT this node
                query = query
                    .eq('current_activity_id', activityId)
                    .eq('status', 'active');
            } else {
                let histQuery = supabase
                    .from('process_history')
                    .select(`
                        *,
                        users:user_id(full_name),
                        process_instances:process_id(
                            *,
                            workflows(name)
                        )
                    `)
                    .eq('activity_id', activityId)
                    .order('created_at', { ascending: false });

                if (startDate) histQuery = histQuery.gte('created_at', startDate);
                if (endDate) histQuery = histQuery.lte('created_at', endDate);

                const { data: history, error } = await histQuery;
                if (error) throw error;

                setNodeProcesses(history || []);
                return;
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

    const handleStatClick = (e: React.MouseEvent, activity: Activity, type: 'active' | 'historical' | 'cost') => {
        e.stopPropagation();
        if (type === 'cost') {
            if (onViewCost && selectedWorkflowId) {
                onViewCost(selectedWorkflowId);
            }
            return;
        }
        setSelectedNode({ id: activity.id, name: activity.name, type: type as 'active' | 'historical' });
        setProcessPage(1);
        loadNodeProcesses(activity.id, type as 'active' | 'historical');
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
        window.location.href = `/execution/${taskId}`;
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);


    return (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col h-[800px] overflow-hidden">
            {/* Header / Toolbar */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <div className="flex items-center gap-4">
                    <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <ActivityIcon className="w-5 h-5 text-indigo-600" />
                        Radiografía
                    </h4>

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
                                stats={stats[activity.id] || { historical: 0, active: 0, total_cost: 0, hours: 0 }}
                                maxActive={maxActive}
                                formatMoney={formatMoney}
                                onMouseDown={(e) => handleNodeMouseDown(e, activity.id)}
                                onStatClick={(e, type) => handleStatClick(e, activity, type)}
                            />
                        ));
                    })()}

                </div>

                {/* Controls */}
                <div className="absolute top-6 right-6 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-20 pointer-events-auto">
                    <button onClick={() => setZoom(z => Math.min(z * 1.2, 3))} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-95" title="Acercar"><ZoomIn className="w-4 h-4" /></button>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <span className="text-[10px] font-black w-10 text-center text-slate-500 dark:text-slate-400">{Math.round(zoom * 100)}%</span>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-95" title="Alejar"><ZoomOut className="w-4 h-4" /></button>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl transition-all shadow-sm active:scale-95" title="Centrar Vista"><Maximize className="w-4 h-4" /></button>
                    <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                    <button
                        onClick={handleAutoLayout}
                        className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl transition-all flex items-center gap-2 group/layout active:scale-95"
                        title="Auto-organizar"
                    >
                        <GitBranch className="w-4 h-4 rotate-180" />
                        <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden max-w-0 group-hover/layout:max-w-[100px] transition-all duration-300">Organizar</span>
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
                            <div className={`p-2 rounded-xl ${selectedNode.type === 'active' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                <Filter className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800">
                                    {selectedNode.type === 'active' ? 'Trámites En Curso' : 'Detalle de Inversión / Histórico'}
                                </h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    En actividad: <span className="text-slate-700 font-bold">{selectedNode.name}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => exportToExcel(nodeProcesses, `Detalle_${selectedNode.name.replace(/\s+/g, '_')}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-100"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Exportar XLS
                            </button>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden min-h-[300px] flex flex-col shadow-sm">
                        <ProcessTable
                            processes={nodeProcesses}
                            variant={selectedNode.type === 'active' ? 'current' : 'history'}
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
    onStatClick,
    formatMoney
}: {
    activity: Activity,
    stats: ActivityStats,
    maxActive: number,
    onMouseDown: (e: React.MouseEvent) => void,
    onStatClick: (e: React.MouseEvent, type: 'active' | 'historical' | 'cost') => void,
    formatMoney: (val: number) => string
}) {
    const icons = {
        start: Play,
        task: Square,
        decision: GitBranch,
        end: Square,
    };
    const Icon = icons[activity.type] || ActivityIcon;

    const ratio = stats.active / (maxActive || 1);

    const getHeatStyles = () => {
        if (stats.active === 0) return 'border-slate-100 dark:border-slate-800 ring-transparent shadow-slate-900/5';
        if (ratio >= 0.7) return 'border-rose-600 shadow-rose-500/20 ring-rose-500/10 animate-pulse';
        if (ratio >= 0.3) return 'border-orange-500 shadow-orange-500/10 ring-orange-500/5';
        return 'border-blue-500 shadow-blue-500/10 ring-blue-500/5';
    };

    const colors = {
        start: 'bg-emerald-500',
        task: 'bg-blue-500',
        decision: 'bg-orange-500',
        end: 'bg-rose-500',
    };

    return (
        <div
            className="absolute flex flex-col items-center pointer-events-auto group cursor-move select-none"
            style={{ left: activity.x_pos, top: activity.y_pos }}
            onMouseDown={onMouseDown}
        >
            <div className={cn(
                "w-48 p-3 rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 shadow-lg transition-all duration-500 relative ring-4",
                getHeatStyles()
            )}>
                {/* Compact Header */}
                <div className="flex items-start gap-2.5">
                    <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform duration-500 group-hover:scale-110 flex-shrink-0",
                        (colors as any)[activity.type] || 'bg-slate-500'
                    )}>
                        <Icon className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center h-8">
                        <div className="flex items-center justify-between gap-2 w-full">
                            <h4 className="text-[10px] font-black text-slate-900 dark:text-white truncate tracking-tight uppercase leading-none">{activity.name}</h4>
                            <div className="flex items-center gap-0.5 text-orange-600 font-black flex-shrink-0 bg-orange-50 px-1 py-0.5 rounded-md border border-orange-100/50">
                                <Clock className="w-2 h-2" />
                                <span className="text-[8px]">{stats.hours.toFixed(0)}h</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Saturado / Cuello de Botella Badge (More discreet) */}
                {ratio >= 0.7 && (
                    <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-lg border-2 border-white dark:border-slate-900 shadow-lg animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                    </div>
                )}
            </div>

            {/* Bottom "Tabs" peeking out */}
            <div className="flex gap-1 -mt-1.5 z-20">
                {/* Cost Tab */}
                <button
                    onClick={(e) => onStatClick(e, 'cost')}
                    className={cn(
                        "px-2 py-1 rounded-b-lg border-x border-b text-[8px] font-black uppercase tracking-tighter shadow-sm flex items-center gap-1 transition-all hover:pt-2 active:scale-95",
                        stats.total_cost > 0
                            ? "bg-emerald-600 border-emerald-700 text-white cursor-pointer"
                            : "bg-white border-slate-100 text-slate-300 pointer-events-none"
                    )}
                >
                    <DollarSign className="w-2.5 h-2.5" />
                    {formatMoney(stats.total_cost).replace('$', '').trim()}
                </button>

                <button
                    onClick={(e) => onStatClick(e, 'active')}
                    className={cn(
                        "px-2 py-1 rounded-b-lg border-x border-b text-[8px] font-black uppercase tracking-tighter transition-all hover:pt-2 active:scale-95 shadow-sm whitespace-nowrap",
                        stats.active > 0
                            ? "bg-blue-600 border-blue-700 text-white"
                            : "bg-white border-slate-100 text-slate-300 pointer-events-none"
                    )}
                >
                    {stats.active} En curso
                </button>
                <button
                    onClick={(e) => onStatClick(e, 'historical')}
                    className={cn(
                        "px-2 py-1 rounded-b-lg border-x border-b text-[8px] font-black uppercase tracking-tighter transition-all hover:pt-2 active:scale-95 shadow-sm whitespace-nowrap",
                        stats.historical > 0
                            ? "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                            : "bg-white border-slate-100 text-slate-300 pointer-events-none"
                    )}
                >
                    {stats.historical} Hist.
                </button>
            </div>
        </div>
    );
}

function TransitionArrowHeatmap({ transition, source, target }: { transition: Transition, source: Activity, target: Activity }) {
    // Better calculation for connection points matching standard card (w-56 = 224px, h ~ 100px)
    const sourceX = source.x_pos + 112;
    const sourceY = source.y_pos + 50;
    const targetX = target.x_pos + 112;
    const targetY = target.y_pos + 50;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let sX, sY, tX, tY;

    if (absDx > absDy) {
        sX = sourceX + (dx > 0 ? 112 : -112);
        sY = sourceY;
        tX = targetX - (dx > 0 ? 120 : -120);
        tY = targetY;
    } else {
        sY = sourceY + (dy > 0 ? 50 : -50);
        sX = sourceX;
        tY = targetY - (dy > 0 ? 60 : -60);
        tX = targetX;
    }

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
