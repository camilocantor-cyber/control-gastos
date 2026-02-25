import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Grid, Activity, Download, Calendar, CheckSquare, Clock, User } from 'lucide-react';
import { cn } from '../utils/cn';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';

interface ProcessHistoryStats {
    workflow_name: string;
    total_executions: number;
    active: number;
    completed: number;
}

const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
    '#6366f1', '#14b8a6', '#f97316', '#d946ef', '#84cc16', '#0ea5e9', '#a855f7'
];

interface TreemapData {
    name: string;
    children: any[];
    [key: string]: any;
}

const CustomizedContent = (props: any) => {
    // Basic props safely extracted
    const { depth, x, y, width, height, index, payload, colors, name, metric } = props;

    // Depth 1: Workflow Level (Container)
    if (depth === 1) {
        return (
            <g style={{ pointerEvents: 'none' }}>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill="none" // Changed from transparent to none to avoid capturing events
                    stroke="#fff"
                    strokeWidth={3}
                />
                {/* Workflow Name - Lighter */}
                {width > 100 && height > 30 ? (
                    <text
                        x={x + 4}
                        y={y + 14}
                        fill={document.documentElement.classList.contains('dark') ? "#94a3b8" : "#64748b"}
                        fontSize={11}
                        fontWeight={400}
                        fillOpacity={0.8}
                    >
                        {name}
                    </text>
                ) : null}
            </g>
        );
    }

    if (depth === 2) {
        // Render Activity Leaf
        const total = payload?.total || 0;
        const active = payload?.active || 0;
        const avgTime = payload?.avgTime || 0;
        const attended = total - active;
        const activityName = name || 'Actividad';

        const showStats = width > 50 && height > 40;

        // Ensure we pass event handlers safely. 
        const { onMouseEnter, onMouseLeave, onClick } = props;

        // Determine Fill Color based on Metric
        let finalFill = '#8884d8';
        if (metric === 'time') {
            finalFill = payload?.timeFill || '#cbd5e1';
        } else {
            // Volume default
            finalFill = payload?.fill || (colors && colors.length > 0 ? colors[index % colors.length] : '#8884d8');
        }


        return (
            <g
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}
                style={{ cursor: 'pointer' }}
            >
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                        fill: finalFill,
                        stroke: '#fff',
                        strokeWidth: 1,
                        rx: 3,
                        ry: 3
                    }}
                />
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    style={{
                        pointerEvents: 'none',
                        filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))',
                        fontWeight: 400
                    }}
                >
                    {/* Activity Name */}
                    {width > 40 && height > 25 ? (
                        <>
                            <tspan
                                x={x + width / 2}
                                dy={showStats ? "-0.6em" : "0.3em"}
                                fontSize={width > 80 ? "12" : "11"}
                            >
                                {activityName.length > 15 ? activityName.substring(0, 13) + '..' : activityName}
                            </tspan>

                            {/* Stats */}
                            {showStats && (
                                <tspan
                                    x={x + width / 2}
                                    dy="1.4em"
                                    fontSize="10"
                                    fillOpacity="0.95"
                                >
                                    {metric === 'time'
                                        ? `${avgTime.toFixed(1)}h avg`
                                        : `${attended} ✅ | ${active} ⏳`
                                    }
                                </tspan>
                            )}
                        </>
                    ) : ''}
                </text>
            </g>
        );
    }

    return null;
};

const CustomTooltip = ({ active, payload, metric }: any) => {
    if (active && payload && payload.length && payload[0]?.payload) {
        const data = payload[0].payload;
        const attended = (data.total || 0) - (data.active || 0);
        // Calculate onTime safely
        const onTime = (data.active || 0) - (data.overdue || 0) - (data.nearDue || 0);
        const avgTime = data.avgTime || 0;

        return (
            <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 shadow-lg rounded-xl min-w-[220px]">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-normal border-b dark:border-slate-800 pb-1 mb-2 flow-root">
                    <span className="float-left">Flujo:</span>
                    <span className="float-right font-medium text-slate-700 dark:text-slate-200 max-w-[140px] truncate text-right">{data.workflowName || 'N/A'}</span>
                </div>
                {/* Activity Name */}
                <div className="mb-3">
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-0.5">Actividad</div>
                    <div className="font-medium text-lg text-slate-800 dark:text-white leading-tight">{data.name || 'Actividad'}</div>
                </div>

                {metric === 'time' ? (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded text-center mb-3">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Tiempo Promedio</div>
                        <div className={`text-xl font-black ${avgTime > 48 ? 'text-rose-600' : avgTime > 24 ? 'text-amber-500' : 'text-emerald-600'}`}>
                            {avgTime.toFixed(1)}h
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1">Basado en {attended} casos finalizados</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded text-center">
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Total Historico</div>
                            <div className="text-lg font-medium text-slate-700 dark:text-slate-200">{data.total || 0}</div>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded text-center">
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase">Atendidas</div>
                            <div className="text-lg font-medium text-emerald-700 dark:text-emerald-300">{attended}</div>
                        </div>
                    </div>
                )}


                {(data.active > 0) && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase mb-1">Pendientes ({data.active})</div>

                        {data.overdue > 0 && (
                            <div className="flex justify-between items-center text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1.5 rounded-md">
                                <span className="flex items-center gap-1">🚨 Vencidas</span>
                                <span className="font-bold bg-white dark:bg-slate-800 px-1.5 rounded-sm shadow-sm">{data.overdue}</span>
                            </div>
                        )}

                        {data.nearDue > 0 && (
                            <div className="flex justify-between items-center text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-md">
                                <span className="flex items-center gap-1">⚠️ Por Vencer</span>
                                <span className="font-bold bg-white dark:bg-slate-800 px-1.5 rounded-sm shadow-sm">{data.nearDue}</span>
                            </div>
                        )}

                        {onTime > 0 && (
                            <div className="flex justify-between items-center text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1.5 rounded-md">
                                <span className="flex items-center gap-1">📅 A Tiempo</span>
                                <span className="font-bold bg-white dark:bg-slate-800 px-1.5 rounded-sm shadow-sm">{onTime}</span>
                            </div>
                        )}
                    </div>
                )}

                {data.active === 0 && (
                    <div className="pt-2 border-t border-slate-50 text-center">
                        <span className="text-xs text-slate-400">✨ Sin pendientes activos</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

function ManagementRanking({ limit = 5 }: { limit?: number }) {
    const { topUsers } = useDashboardAnalytics();

    if (!topUsers || topUsers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                <User className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Sin Actividad</p>
            </div>
        );
    }

    const maxCompleted = Math.max(...topUsers.map(u => u.tasks_completed), 1);

    return (
        <div className="w-full space-y-5">
            {topUsers.slice(0, limit).map((user, i) => (
                <div key={user.user_name} className="flex items-center gap-3 group">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                        i === 0
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40 rotate-3 group-hover:rotate-0"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800"
                    )}>
                        {user.user_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate pr-2">{user.user_name}</p>
                            <span className="text-[10px] font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                {user.tasks_completed}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000", i === 0 ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600")}
                                style={{ width: `${(user.tasks_completed / maxCompleted) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Import the new component
import { WorkflowHeatmap } from './WorkflowHeatmap';

export function Reports() {
    // Shared State
    const [statsData, setStatsData] = useState<ProcessHistoryStats[]>([]);
    const [treemapData, setTreemapData] = useState<TreemapData[]>([]);
    const [trendData, setTrendData] = useState<{ date: string; completed: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'all' | 'month' | 'week'>('all');
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    // Viz Config
    const [heatmapMetric, setHeatmapMetric] = useState<'volume' | 'time'>('volume');

    const { avgResolutionTimeByWorkflow, processStatus } = useDashboardAnalytics();

    // Tab State
    const [activeTab, setActiveTab] = useState<'operation' | 'flow' | 'efficiency'>('operation');
    const [deptEfficiencyData, setDeptEfficiencyData] = useState<any[]>([]);

    useEffect(() => {
        loadWorkflows();
    }, []);

    useEffect(() => {
        if (activeTab === 'operation' || activeTab === 'efficiency') {
            fetchReportsData();
        }
    }, [dateRange, selectedWorkflowId, activeTab, heatmapMetric]);

    async function loadWorkflows() {
        const { data } = await supabase.from('workflows').select('id, name');
        if (data) setWorkflows(data);
    }

    async function fetchReportsData() {
        try {
            setLoading(true);

            // Calculate Date Filter
            let dateFilter = null;
            const now = new Date();
            if (dateRange === 'month') {
                now.setMonth(now.getMonth() - 1);
                dateFilter = now.toISOString();
            } else if (dateRange === 'week') {
                now.setDate(now.getDate() - 7);
                dateFilter = now.toISOString();
            }

            // 1. Fetch Process Instances
            let query = supabase
                .from('process_instances')
                .select(`id, status, created_at, workflow_id, workflows (name)`);

            if (dateFilter) query = query.gte('created_at', dateFilter);
            if (selectedWorkflowId) query = query.eq('workflow_id', selectedWorkflowId);

            const { data: instances, error } = await query;
            if (error) throw error;

            const statsMap: Record<string, ProcessHistoryStats> = {};
            instances?.forEach((instance: any) => {
                const wfName = instance.workflows?.name || 'Desconocido';

                if (!statsMap[wfName]) {
                    statsMap[wfName] = {
                        workflow_name: wfName,
                        total_executions: 0,
                        active: 0,
                        completed: 0
                    };
                }

                statsMap[wfName].total_executions++;
                if (instance.status === 'active') {
                    statsMap[wfName].active++;
                } else {
                    statsMap[wfName].completed++;
                }
            });
            setStatsData(Object.values(statsMap));

            // 2. Fetch History & Active Tasks for Treemap
            let historyQuery = supabase
                .from('process_history')
                .select(`activity_id, created_at, action, process_id, activities (name, workflow_id, due_date_hours, workflows(name))`);

            if (dateFilter) historyQuery = historyQuery.gte('created_at', dateFilter);
            // We need 'completed' actions to calculate time

            const { data: history, error: historyError } = await historyQuery;
            if (historyError) throw historyError;

            // Helper to get Active tasks count and expiration status
            const instanceIds = new Set(instances?.map((i: any) => i.id));
            const { data: activeTasks, error: activeError } = await supabase
                .from('process_instances')
                .select(`id, current_activity_id, created_at`)
                .eq('status', 'active');

            if (activeError) throw activeError;

            // Map active tasks by Activity ID to calculate overdue counts
            const activeMetrics: Record<string, { count: number, overdue: number, nearDue: number }> = {};

            activeTasks?.forEach((task: any) => {
                if (instanceIds.has(task.id)) {
                    const actId = task.current_activity_id;
                    if (!actId) return;

                    if (!activeMetrics[actId]) activeMetrics[actId] = { count: 0, overdue: 0, nearDue: 0 };
                    activeMetrics[actId].count++;

                    const historyRecord = history?.find((h: any) => h.activity_id === actId);
                    const activities: any = historyRecord?.activities;
                    const activity = Array.isArray(activities) ? activities[0] : activities;
                    const dueHours = activity?.due_date_hours || 24; // Default 24h

                    const createdAt = new Date(task.created_at);
                    const now = new Date();
                    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

                    if (hoursElapsed > dueHours) {
                        activeMetrics[actId].overdue++;
                    } else if ((dueHours - hoursElapsed) <= 4) {
                        activeMetrics[actId].nearDue++;
                    }
                }
            });

            // Calculate Average Time per Activity
            const timeMetrics: Record<string, { totalHours: number, count: number }> = {};

            // To calculate times accurately, we ideally need the full history of the processes involved in the current view
            // If we only have history within dateRange, we might miss the 'start' action of a long process.
            // For this version, we will try to rely on the fetched history.

            // Group history by process AND sort by time for accurate diffing
            const processHistoryMap: Record<string, any[]> = {};
            history?.forEach((h: any) => {
                if (!processHistoryMap[h.process_id]) processHistoryMap[h.process_id] = [];
                processHistoryMap[h.process_id].push(h);
            });

            // Calculate durations
            Object.values(processHistoryMap).forEach(pHistory => {
                // Ascending order
                pHistory.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                for (let i = 1; i < pHistory.length; i++) {
                    const current = pHistory[i];
                    const prev = pHistory[i - 1];

                    // We measure time spent IN the 'prev' activity
                    // 'prev' is when the activity started/was assigned
                    // 'current' is when we moved away from it (completed/transitioned)
                    // This is a simplification. Real logic depends on action types.
                    // Assuming 'assignment' or 'transition' starts an activity.

                    if (prev.activity_id && prev.activity_id !== current.activity_id) {
                        const duration = (new Date(current.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60 * 60);

                        // Sanity check: ignore super long durations (e.g. data bugs) or negative
                        if (duration > 0 && duration < 8760) { // < 1 year
                            if (!timeMetrics[prev.activity_id]) timeMetrics[prev.activity_id] = { totalHours: 0, count: 0 };
                            timeMetrics[prev.activity_id].totalHours += duration;
                            timeMetrics[prev.activity_id].count++;
                        }
                    }
                }
            });

            // Aggregate Heatmap
            const treemapMap: Record<string, Record<string, { total: number, active: number, overdue: number, nearDue: number, id: string, avgTime: number }>> = {};

            history?.forEach((record: any) => {
                const wfId = record.activities?.workflow_id;
                if (selectedWorkflowId && wfId !== selectedWorkflowId) return;

                const wfName = record.activities?.workflows?.name || 'Otros';
                const actName = record.activities?.name || 'Desconocida';
                const actId = record.activity_id;

                if (!treemapMap[wfName]) treemapMap[wfName] = {};
                if (!treemapMap[wfName][actName]) {
                    const metrics = activeMetrics[actId] || { count: 0, overdue: 0, nearDue: 0 };
                    const timeMetric = timeMetrics[actId] || { totalHours: 0, count: 0 };
                    const avgTime = timeMetric.count > 0 ? timeMetric.totalHours / timeMetric.count : 0;

                    treemapMap[wfName][actName] = {
                        total: 0,
                        active: metrics.count,
                        overdue: metrics.overdue,
                        nearDue: metrics.nearDue,
                        id: actId,
                        avgTime
                    };
                }
                treemapMap[wfName][actName].total++;
            });

            // Find Max Time for Relative Scaling
            let maxAvgTime = 0;
            Object.values(treemapMap).forEach(activities => {
                Object.values(activities).forEach(data => {
                    if (data.avgTime > maxAvgTime) maxAvgTime = data.avgTime;
                });
            });

            // Avoid division by zero
            if (maxAvgTime === 0) maxAvgTime = 1;

            const formattedTreemapData: TreemapData[] = Object.entries(treemapMap).map(([wfName, activities]) => ({
                name: wfName,
                children: Object.entries(activities).map(([actName, data]) => {
                    // Logic for Volume View
                    let volumeColor = '#cbd5e1'; // Default Gray
                    if (data.overdue > 0) volumeColor = '#ef4444'; // Red
                    else if (data.nearDue > 0) volumeColor = '#f59e0b'; // Amber
                    else if (data.active > 0) volumeColor = '#3b82f6'; // Blue
                    else if (data.total > 0) volumeColor = '#10b981'; // Green (Completed history)

                    // Logic for Time View (Relative Heatmap)
                    // Interpolate between Green (Fast) -> Yellow -> Red (Slowest in current set)
                    let timeColor = '#10b981';
                    if (data.avgTime > 0) {
                        const ratio = data.avgTime / maxAvgTime;
                        if (ratio > 0.66) timeColor = '#ef4444'; // Top 33% slowest -> Red
                        else if (ratio > 0.33) timeColor = '#f59e0b'; // Middle 33% -> Amber
                        else timeColor = '#10b981'; // Bottom 33% -> Green
                    } else {
                        timeColor = '#cbd5e1'; // No time data
                    }

                    return {
                        name: actName,
                        size: data.total, // Always size by volume for now
                        total: data.total,
                        active: data.active,
                        overdue: data.overdue,
                        nearDue: data.nearDue,
                        avgTime: data.avgTime,
                        fill: volumeColor,
                        timeFill: timeColor,
                        volumeFill: volumeColor,
                        workflowName: wfName
                    };
                })
            }));

            setTreemapData(formattedTreemapData);

            // 3. Efficiency by Department
            const { data: depts } = await supabase.from('departments').select('id, name');
            const { data: allActivities } = await supabase.from('activities').select('id, name, assigned_department_id, due_date_hours');

            if (depts && allActivities) {
                const efficiencyMap: Record<string, any> = {};
                depts.forEach(d => {
                    efficiencyMap[d.id] = { id: d.id, name: d.name, active: 0, overdue: 0, completed: 0 };
                });

                // Completed tasks grouped by activity and then mapped to dept
                const { data: historyRes } = await supabase.from('process_history').select('activity_id').eq('action', 'completed');

                historyRes?.forEach(h => {
                    const act = allActivities.find(a => a.id === h.activity_id);
                    if (act?.assigned_department_id && efficiencyMap[act.assigned_department_id]) {
                        efficiencyMap[act.assigned_department_id].completed++;
                    }
                });

                // Active and Overdue tasks
                activeTasks?.forEach((task: any) => {
                    const act = allActivities.find(a => a.id === task.current_activity_id);
                    if (act?.assigned_department_id && efficiencyMap[act.assigned_department_id]) {
                        efficiencyMap[act.assigned_department_id].active++;

                        const dueHours = act.due_date_hours || 24;
                        const createdAt = new Date(task.created_at);
                        const now = new Date();
                        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                        if (hoursElapsed > dueHours) {
                            efficiencyMap[act.assigned_department_id].overdue++;
                        }
                    }
                });

                setDeptEfficiencyData(Object.values(efficiencyMap).filter(d => (d.active + d.completed) > 0));
            }

            // 4. Calculate Trend Data (Completed processes by day)
            const completedInstances = instances?.filter((i: any) => i.status === 'completed') || [];
            const trendMap: Record<string, number> = {};

            completedInstances.forEach((instance: any) => {
                const date = new Date(instance.created_at).toLocaleDateString('es-ES', {
                    month: 'short',
                    day: 'numeric'
                });
                trendMap[date] = (trendMap[date] || 0) + 1;
            });

            const trend = Object.entries(trendMap)
                .map(([date, completed]) => ({ date, completed }))
                .slice(-14); // Last 14 days

            setTrendData(trend);

        } catch (err) {
            console.error('Error loading reports:', err);
        } finally {
            setLoading(false);
        }
    }

    const handleExport = async () => {
        try {
            let query = supabase
                .from('process_instances')
                .select(`
                    id, name, status, created_at, workflow_id,
                    workflows (name),
                    activities (name)
                `)
                .order('created_at', { ascending: false });

            if (selectedWorkflowId) query = query.eq('workflow_id', selectedWorkflowId);

            if (dateRange !== 'all') {
                const now = new Date();
                if (dateRange === 'month') now.setMonth(now.getMonth() - 1);
                if (dateRange === 'week') now.setDate(now.getDate() - 7);
                query = query.gte('created_at', now.toISOString());
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                alert('No hay datos para exportar.');
                return;
            }

            // --- INTELIGENCIA DE EXPORTACIÓN: Cargar datos dinámicos ---
            const instanceIds = data.map(i => i.id);
            const { data: fieldData, error: fieldError } = await supabase
                .from('process_data')
                .select('*')
                .in('process_id', instanceIds);

            if (fieldError) console.warn('No se pudieron cargar algunos datos de campos:', fieldError);

            // Agrupar datos por instancia
            const dynamicDataMap: Record<string, Record<string, string>> = {};
            const uniqueFieldNames = new Set<string>();

            fieldData?.forEach(row => {
                if (!dynamicDataMap[row.process_id]) dynamicDataMap[row.process_id] = {};
                dynamicDataMap[row.process_id][row.field_name] = row.value;
                uniqueFieldNames.add(row.field_name);
            });

            const sortedFields = Array.from(uniqueFieldNames).sort();

            const headers = ['ID Trámite', 'Nombre', 'Flujo de Trabajo', 'Actividad Actual', 'Estado', 'Fecha Creación', ...sortedFields];
            const csvRows = [headers.join(',')];

            data.forEach((row: any) => {
                const dynData = dynamicDataMap[row.id] || {};
                const values = [
                    row.id,
                    `"${(row.name || '').replace(/"/g, '""')}"`,
                    `"${(row.workflows?.name || '').replace(/"/g, '""')}"`,
                    `"${(row.activities?.name || 'Finalizado/Inicio').replace(/"/g, '""')}"`,
                    row.status,
                    new Date(row.created_at).toLocaleDateString(),
                    ...sortedFields.map(fieldName => `"${(dynData[fieldName] || '').replace(/"/g, '""')}"`)
                ];
                csvRows.push(values.join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `reporte_inteligente_${selectedWorkflowId ? 'filtro_' : ''}${dateRange}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Error exporting data:', err);
            alert('Error al exportar los datos.');
        }
    };

    const periodLabels = {
        'all': 'Histórico Completo',
        'month': 'Últimos 30 Días',
        'week': 'Últimos 7 Días'
    };

    if (loading && activeTab === 'operation') {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            {/* Unified Action Bar */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
                {/* Tabs */}
                <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => setActiveTab('operation')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'operation' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <BarChart3 className="w-3 h-3 inline-block mr-1.5" />
                        Operación
                    </button>
                    <button
                        onClick={() => setActiveTab('flow')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'flow' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Activity className="w-3 h-3 inline-block mr-1.5" />
                        Por Flujo
                    </button>
                    <button
                        onClick={() => setActiveTab('efficiency')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'efficiency' ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Grid className="w-3 h-3 inline-block mr-1.5" />
                        Áreas
                    </button>
                </div>

                {/* Unified Filters & Actions */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                    {activeTab === 'operation' && (
                        <>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:block mr-2">
                                Periodo: <span className="text-blue-600 dark:text-blue-400">{periodLabels[dateRange]}</span>
                            </div>

                            <button
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg font-black text-[9px] uppercase tracking-wider transition-colors ${showFilterMenu ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                            >
                                <Calendar className="w-3 h-3" />
                                Filtros
                            </button>

                            {showFilterMenu && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-4">
                                    <div className="mb-4">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Mapa Calor</h4>
                                        <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                            <button onClick={() => setHeatmapMetric('volume')} className={`px-2 py-1 text-[9px] font-black rounded transition-all ${heatmapMetric === 'volume' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}>VOLUMEN</button>
                                            <button onClick={() => setHeatmapMetric('time')} className={`px-2 py-1 text-[9px] font-black rounded transition-all ${heatmapMetric === 'time' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>TIEMPOS</button>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Periodo</h4>
                                        <div className="space-y-1">
                                            {['all', 'month', 'week'].map((range: any) => (
                                                <button key={range} onClick={() => setDateRange(range)} className={`w-full text-left px-2 py-1.5 text-[11px] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between ${dateRange === range ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {periodLabels[range as 'all']}
                                                    {dateRange === range && <CheckSquare className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Flujo</h4>
                                        <select value={selectedWorkflowId || ''} onChange={(e) => setSelectedWorkflowId(e.target.value || null)} className="w-full text-[11px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-200 p-1.5">
                                            <option value="">TODOS</option>
                                            {workflows.map(wf => (<option key={wf.id} value={wf.id}>{wf.name}</option>))}
                                        </select>
                                    </div>
                                    <button onClick={() => setShowFilterMenu(false)} className="w-full mt-4 bg-blue-600 text-white text-[10px] font-black py-2 rounded-lg hover:bg-blue-700 tracking-wider">APLICAR</button>
                                </div>
                            )}
                        </>
                    )}

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-black text-[9px] uppercase tracking-wider hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                    >
                        <Download className="w-3 h-3" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Operation Report Content */}
            {
                activeTab === 'operation' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in slide-in-from-bottom-5 duration-500">
                        {/* Global Process Efficiency Dashboard */}
                        <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:col-span-2 transition-all duration-300">
                            <div className="flex items-center justify-between mb-2.5 px-1">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                    <PieChartIcon className="w-3.5 h-3.5 text-blue-600" />
                                    Resumen Ejecutivo
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <Activity className="w-3 h-3 text-blue-500" />
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">En Progreso</p>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{processStatus.active}</p>
                                </div>
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <CheckSquare className="w-3 h-3 text-emerald-500" />
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Finalizados</p>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{processStatus.completed}</p>
                                </div>
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <Grid className="w-3 h-3 text-indigo-500" />
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Absoluto</p>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{processStatus.active + processStatus.completed}</p>
                                </div>
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <Clock className="w-3 h-3 text-amber-500" />
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tasa Cierre</p>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                        {((processStatus.completed / (processStatus.active + processStatus.completed || 1)) * 100).toFixed(0)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Chart 1: Total Historical Distribution (Pie) */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                            <div className="mb-2">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                    <PieChartIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    Volumen por Flujo
                                </h3>
                            </div>
                            <div className="flex-1 min-h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 10, bottom: 20 }}>
                                        <Pie
                                            data={statsData}
                                            cx="50%"
                                            cy="50%"
                                            paddingAngle={5}
                                            innerRadius={45}
                                            outerRadius={75}
                                            dataKey="total_executions"
                                            nameKey="workflow_name"
                                        >
                                            {statsData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Ranking de Gestión - Moved to Operation */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                            <div className="mb-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                    <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    Ranking Operativo
                                </h3>
                            </div>
                            <div className="flex-1">
                                <ManagementRanking limit={5} />
                            </div>
                        </div>

                        {/* Chart 2: Activity Detail Map (Treemap - Expanded to full width) */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Mapa de Calor de Actividades
                                </h3>
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl shrink-0">
                                    <button
                                        onClick={() => setHeatmapMetric('volume')}
                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${heatmapMetric === 'volume' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        Volumen
                                    </button>
                                    <button
                                        onClick={() => setHeatmapMetric('time')}
                                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight transition-all ${heatmapMetric === 'time' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                    >
                                        Tiempos
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 min-h-[300px]">
                                {treemapData.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height="88%">
                                            <Treemap
                                                data={treemapData}
                                                dataKey={heatmapMetric === 'volume' ? "size" : "avgTime"}
                                                aspectRatio={4 / 3}
                                                stroke="#fff"
                                                content={<CustomizedContent colors={COLORS} metric={heatmapMetric} />}
                                            >
                                                <Tooltip
                                                    content={<CustomTooltip metric={heatmapMetric} />}
                                                    cursor={false}
                                                />
                                            </Treemap>
                                        </ResponsiveContainer>

                                        {/* Dynamic Legend */}
                                        <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                                            {heatmapMetric === 'volume' ? (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Vencidos</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-sm bg-amber-500"></div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Por Vencer</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Al Día</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Completados</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Lento (Fricción)</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-sm bg-amber-500"></div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Promedio</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Rápido (Fluido)</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400">
                                        <p>No hay datos suficientes para los filtros seleccionados.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Chart 3: Active vs Completed (Bar) */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-2">
                            <div className="mb-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                    <Grid className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    Ejecución: Activos vs. Completados
                                </h3>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={statsData}
                                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? "#1e293b" : "#f1f5f9"} />
                                        <XAxis
                                            dataKey="workflow_name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                                        />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                        <Bar dataKey="active" name="Activos" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={30} />
                                        <Bar dataKey="completed" name="Completados" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart 4: Completion Trend (Line Chart) */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm lg:col-span-2">
                            <div className="mb-4">
                                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Tendencia de Finalización
                                </h3>
                            </div>
                            <div className="h-[220px] w-full">
                                {trendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={trendData}
                                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? "#1e293b" : "#f1f5f9"} />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 700 }}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                            <Tooltip
                                                cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="completed"
                                                name="Completados"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                dot={{ fill: '#10b981', r: 4 }}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-[10px] font-bold">
                                        <p>No hay datos de tendencia disponibles</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Workflow Heatmap Content */}
            {
                activeTab === 'flow' && (
                    <div className="animate-in slide-in-from-bottom-5 duration-500">
                        <WorkflowHeatmap workflowId={selectedWorkflowId || undefined} />
                    </div>
                )
            }

            {/* Efficiency Dashboard Content */}
            {activeTab === 'efficiency' && (
                <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500">
                    {/* Global Process Efficiency Dashboard */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                <PieChartIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                Resumen Ejecutivo de Gestión
                            </h3>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activos</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{processStatus.active}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Finalizados</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{processStatus.completed}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                <div className="flex items-center gap-2 mb-2">
                                    <Grid className="w-3.5 h-3.5 text-purple-600" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absoluto</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{processStatus.active + processStatus.completed}</p>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa Cierre</p>
                                </div>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">
                                    {((processStatus.completed / (processStatus.active + processStatus.completed || 1)) * 100).toFixed(0)}%
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Global Closing Efficiency Widget */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                <Clock className="w-4 h-4 text-orange-500" />
                                Eficiencia de Cierre (Horas)
                            </h3>
                        </div>

                        {avgResolutionTimeByWorkflow.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {avgResolutionTimeByWorkflow.map((wf) => (
                                    <div
                                        key={wf.workflow_name}
                                        className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-orange-500/20 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2 min-w-0">
                                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 truncate pr-2 uppercase" title={wf.workflow_name}>{wf.workflow_name}</p>
                                            <span className="text-[9px] font-black text-orange-600 bg-orange-100/50 dark:bg-orange-900/40 px-1.5 py-0.5 rounded-md">{wf.count}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-2">
                                            <span className="text-xl font-black text-slate-800 dark:text-white group-hover:text-orange-600 transition-colors">
                                                {wf.avg_hours.toFixed(1)}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">hr</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${wf.avg_hours > 48 ? 'bg-rose-500' : wf.avg_hours > 24 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(100, (wf.avg_hours / 72) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                                <Clock className="w-8 h-8 mb-2 text-slate-200 dark:text-slate-700" />
                                <p className="font-bold text-[10px] uppercase tracking-wider">Sin datos de cierre</p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* Per-Department Quick Summary Cards */}
                        {deptEfficiencyData.slice(0, 6).map((dept) => (
                            <div key={dept.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
                                <div className="mb-2">
                                    <h4 className="font-black text-[9px] uppercase text-slate-400 truncate">{dept.name}</h4>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between items-baseline">
                                        <p className="text-[14px] font-black text-slate-900 dark:text-white">{dept.completed}</p>
                                        <p className="text-[12px] font-black text-blue-600">{dept.active}</p>
                                    </div>
                                    {dept.overdue > 0 && (
                                        <div className="text-[8px] font-black text-rose-600 uppercase flex items-center gap-1">
                                            <span>🚨 {dept.overdue} Venc..</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="mb-4">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                <BarChart3 className="w-4 h-4 text-amber-500" />
                                Comparativa por Área
                            </h3>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={deptEfficiencyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? "#1e293b" : "#f1f5f9"} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 700 }}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
                                    <Bar dataKey="completed" name="Éxito" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                                    <Bar dataKey="active" name="En Curso" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                                    <Bar dataKey="overdue" name="Atrasados" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={25} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

