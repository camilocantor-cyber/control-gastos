
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ZoomIn, ZoomOut, Maximize, Play, Square, GitBranch, DollarSign, Clock, Activity as ActivityIcon, Filter, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';
import type { Activity, Transition } from '../types';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { ProcessTable } from './ProcessTable';

interface ProcessCostMapProps {
    workflowId: string;
    startDate?: string | null;
    endDate?: string | null;
}

interface ActivityCostStats {
    total_cost: number;
    hours: number;
    executions: number;
}

export function ProcessCostMap({ workflowId, startDate, endDate }: ProcessCostMapProps) {
    const [loading, setLoading] = useState(false);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [stats, setStats] = useState<Record<string, ActivityCostStats>>({});
    const { user } = useAuth();

    // Zoom and Pan State
    const [zoom, setZoom] = useState(0.8);
    const [offset, setOffset] = useState({ x: 50, y: 50 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

    // Dynamic Height State
    const [canvasHeight, setCanvasHeight] = useState(550);

    // Node Dragging State
    const [draggedNode, setDraggedNode] = useState<string | null>(null);

    // Detail State
    const [selectedNode, setSelectedNode] = useState<{ id: string; name: string } | null>(null);
    const [nodeProcesses, setNodeProcesses] = useState<any[]>([]);
    const [loadingProcesses, setLoadingProcesses] = useState(false);
    const [processPage, setProcessPage] = useState(1);
    const [processPageSize, setProcessPageSize] = useState(5);

    useEffect(() => {
        if (workflowId) {
            loadGraphData(workflowId);
        }
    }, [workflowId, startDate, endDate]);

    useEffect(() => {
        if (selectedNode) {
            loadNodeProcesses(selectedNode.id, selectedNode.name);
        }
    }, [startDate, endDate]);

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

            // 2. Fetch Cost Stats directly from history for this workflow & period
            let historyQuery = supabase
                .from('process_history')
                .select(`
                    activity_id, 
                    step_cost, 
                    time_spent_hours,
                    process_instances!inner(workflow_id, organization_id)
                `)
                .eq('process_instances.workflow_id', wfId)
                .in('activity_id', activitiesData.map(a => a.id));

            if (user?.organization_id) {
                historyQuery = historyQuery.eq('process_instances.organization_id', user.organization_id);
            }
            if (startDate) historyQuery = historyQuery.gte('created_at', startDate);
            if (endDate) historyQuery = historyQuery.lte('created_at', endDate);

            const { data: history, error: historyError } = await historyQuery;
            if (historyError) {
                console.error("Error fetching history stats:", historyError);
            }

            const newStats: Record<string, ActivityCostStats> = {};
            activitiesData.forEach(a => {
                newStats[a.id] = { total_cost: 0, hours: 0, executions: 0 };
            });

            if (history && history.length > 0) {

                history?.forEach((h: any) => {
                    if (h.activity_id && newStats[h.activity_id]) {
                        newStats[h.activity_id].total_cost += parseFloat(h.step_cost || 0);
                        newStats[h.activity_id].hours += parseFloat(h.time_spent_hours || 0);
                        newStats[h.activity_id].executions++;
                    }
                });
            }

            setStats(newStats);

            // 3. Adjust canvas height based on node positions
            if (activitiesData.length > 0) {
                const maxY = Math.max(...activitiesData.map(a => a.y_pos));
                setCanvasHeight(Math.max(550, maxY + 150));
            }

        } catch (err) {
            console.error("Error loading process cost data:", err);
        } finally {
            setLoading(false);
        }
    }

    async function loadNodeProcesses(activityId: string, activityName: string) {
        try {
            setLoadingProcesses(true);
            setNodeProcesses([]);
            setSelectedNode({ id: activityId, name: activityName });

            // 1. Get detailed history records for this activity & period
            let historyQuery = supabase
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

            if (startDate) historyQuery = historyQuery.gte('created_at', startDate);
            if (endDate) historyQuery = historyQuery.lte('created_at', endDate);

            const { data: history, error } = await historyQuery;
            if (error) throw error;

            setNodeProcesses(history || []);
        } catch (err) {
            console.error("Error loading node processes:", err);
        } finally {
            setLoadingProcesses(false);
        }
    }

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY;
            const scaleFactor = 1.1;
            const newZoom = delta > 0 ? zoom * scaleFactor : zoom / scaleFactor;
            setZoom(Math.min(Math.max(newZoom, 0.2), 3));
        } else {
            setOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 || e.button === 1) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;

        if (draggedNode) {
            setActivities(prev => prev.map(a => {
                if (a.id === draggedNode) {
                    return { ...a, x_pos: a.x_pos + (dx / zoom), y_pos: a.y_pos + (dy / zoom) };
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

        const GAP_X = 280;
        const GAP_Y = 140;
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
        setOffset({ x: 100, y: 100 });
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="flex flex-col gap-6">
            <div
                className="bg-slate-50 rounded-[2.5rem] border border-slate-200 shadow-inner flex flex-col overflow-hidden relative group/canvas transition-all duration-700"
                style={{ height: `${canvasHeight}px` }}
            >
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] opacity-50 pointer-events-none"
                    style={{
                        backgroundPosition: `${offset.x}px ${offset.y}px`,
                        backgroundSize: `${24 * zoom}px ${24 * zoom}px`
                    }}></div>

                <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-100 shadow-xl pointer-events-auto">
                        <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                            <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1.5">Mapa de Inversión</h4>
                            <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">Costos por Actividad</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-xl pointer-events-auto">
                        <button onClick={() => setZoom(z => Math.min(z * 1.2, 3))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Acercar">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors" title="Alejar">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <div className="w-[1px] h-4 bg-slate-100 mx-0.5"></div>
                        <button onClick={() => { setZoom(0.8); setOffset({ x: 50, y: 50 }); }} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all" title="Centrar Vista">
                            <Maximize className="w-4 h-4" />
                        </button>
                        <button onClick={handleAutoLayout} className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all" title="Auto-Organizar Flujo">
                            <GitBranch className="w-4 h-4 rotate-180" />
                        </button>
                        <div className="w-[1px] h-4 bg-slate-100 mx-0.5"></div>
                        <button onClick={() => setCanvasHeight(h => h + 200)} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all" title="Expandir Lienzo">
                            <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => setCanvasHeight(h => Math.max(400, h - 200))} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all" title="Contraer Lienzo">
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div
                    className={cn("flex-1 h-full cursor-grab active:cursor-grabbing outline-none")}
                    onWheel={(e: React.WheelEvent) => handleWheel(e)}
                    onMouseDown={(e: React.MouseEvent) => handleMouseDown(e)}
                    onMouseMove={(e: React.MouseEvent) => handleMouseMove(e)}
                    onMouseUp={() => handleMouseUp()}
                    onMouseLeave={() => handleMouseUp()}
                >
                    <div className="absolute inset-0 pointer-events-none"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                            transformOrigin: '0 0'
                        }}>

                        <svg className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible">
                            <defs>
                                <marker id="arrowhead-cost" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                                </marker>
                            </defs>
                            {transitions.map((transition) => {
                                const source = activities.find(a => a.id === transition.source_id);
                                const target = activities.find(a => a.id === transition.target_id);
                                if (!source || !target) return null;
                                return <ProcessEdge key={transition.id} source={source} target={target} transition={transition} />;
                            })}
                        </svg>

                        {(() => {
                            const maxCost = Math.max(...Object.values(stats).map(s => s.total_cost), 1);
                            return activities.map(activity => (
                                <ProcessNode
                                    key={activity.id}
                                    activity={activity}
                                    stats={stats[activity.id] || { total_cost: 0, hours: 0, executions: 0 }}
                                    maxCost={maxCost}
                                    formatMoney={formatMoney}
                                    onClick={() => loadNodeProcesses(activity.id, activity.name)}
                                    onMouseDown={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setDraggedNode(activity.id);
                                        setLastMousePos({ x: e.clientX, y: e.clientY });
                                    }}
                                />
                            ));
                        })()}
                    </div>
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-20 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                            <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-emerald-600">Calculando Mapa...</p>
                        </div>
                    </div>
                )}
            </div>

            {selectedNode && (
                <div className="mt-6 border-t border-slate-100 pt-6 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                                <Filter className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800">
                                    Detalle de Inversión / Histórico
                                </h4>
                                <p className="text-xs text-slate-500 font-medium">
                                    En actividad: <span className="text-slate-700 font-bold">{selectedNode.name}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => exportToExcel(nodeProcesses, `Inversion_${selectedNode.name.replace(/\s+/g, '_')}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-100"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Exportar XLS
                            </button>
                            <button
                                onClick={() => setSelectedNode(null)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                            >
                                <Maximize className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                        <ProcessTable
                            processes={nodeProcesses}
                            variant="history"
                            loading={loadingProcesses}
                            currentPage={processPage}
                            onPageChange={setProcessPage}
                            pageSize={processPageSize}
                            onPageSizeChange={setProcessPageSize}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function ProcessNode({ activity, stats, maxCost, formatMoney, onMouseDown, onClick }: any) {
    const ratio = stats.total_cost / maxCost;
    const Icon = activity.type === 'start' ? Play : activity.type === 'end' ? Square : activity.type === 'decision' ? GitBranch : ActivityIcon;

    const colors = {
        start: 'bg-emerald-500',
        task: 'bg-blue-500',
        decision: 'bg-orange-500',
        end: 'bg-rose-500',
    };

    return (
        <div className="absolute flex flex-col items-center pointer-events-auto select-none" style={{ left: activity.x_pos, top: activity.y_pos }}>
            <div
                onMouseDown={onMouseDown}
                onClick={onClick}
                className={cn(
                    "w-52 p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 shadow-xl transition-all duration-500 relative ring-4 hover:scale-105 cursor-pointer active:scale-95 group/node",
                    stats.total_cost === 0
                        ? "border-slate-100 dark:border-slate-800 ring-transparent"
                        : ratio > 0.6
                            ? "border-emerald-500 shadow-emerald-500/20 ring-emerald-500/10 animate-pulse"
                            : ratio > 0.2
                                ? "border-emerald-400 shadow-emerald-500/10 ring-emerald-500/5"
                                : "border-slate-100 dark:border-slate-800 ring-transparent shadow-slate-900/5"
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-500 group-hover:scale-110",
                        (colors as any)[activity.type] || 'bg-slate-500',
                        stats.total_cost > 0 && "bg-emerald-600"
                    )}>
                        <Icon className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0 font-black">
                        <h4 className="text-[10px] text-slate-800 dark:text-white truncate tracking-tight uppercase leading-none mb-1">{activity.name}</h4>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                                {formatMoney(stats.total_cost)}
                            </span>
                        </div>
                    </div>
                </div>
                {stats.executions > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                            <ActivityIcon className="w-2.5 h-2.5" />
                            {stats.executions} Veces
                        </div>
                        <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-tighter">
                            <Clock className="w-2.5 h-2.5" />
                            {stats.hours.toFixed(1)}h
                        </div>
                    </div>
                )}
                {stats.total_cost > 0 && ratio > 0.5 && (
                    <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-lg shadow-lg border-2 border-white dark:border-slate-900 animate-bounce">
                        <DollarSign className="w-3 h-3" />
                    </div>
                )}
            </div>
        </div>
    );
}

function ProcessEdge({ source, target, transition }: any) {
    const sourceX = source.x_pos + 104;
    const sourceY = source.y_pos + 40;
    const targetX = target.x_pos + 104;
    const targetY = target.y_pos + 40;
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    let startX = sourceX, startY = sourceY, endX = targetX, endY = targetY;
    if (absDx > absDy) {
        startX = sourceX + (dx > 0 ? 104 : -104);
        endX = targetX - (dx > 0 ? 110 : -110);
    } else {
        startY = sourceY + (dy > 0 ? 40 : -40);
        endY = targetY - (dy > 0 ? 46 : -46);
    }
    const midX = startX + (endX - startX) / 2;
    const pathData = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    return (
        <g>
            <path d={pathData} stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead-cost)" className="transition-all duration-300 pointer-events-none opacity-50" />
            {transition.condition && (
                <g transform={`translate(${midX}, ${(startY + endY) / 2})`}>
                    <rect x="-30" y="-8" width="60" height="16" rx="8" fill="white" className="dark:fill-slate-900" stroke="#cbd5e1" strokeWidth="1" />
                    <text textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="900" fill="#94a3b8" className="uppercase tracking-tighter">{transition.condition}</text>
                </g>
            )}
        </g>
    );
}
