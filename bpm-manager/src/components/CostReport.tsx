import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, ChevronDown, ChevronRight, Activity, GitBranch, Clock, Filter, Calendar } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { ProcessCostMap } from './ProcessCostMap';

export function CostReport() {
    const [loading, setLoading] = useState(true);
    const [workflowCosts, setWorkflowCosts] = useState<any[]>([]);
    const [totalCost, setTotalCost] = useState(0);

    const { user } = useAuth();
    // Expanded states
    const [expandedWf, setExpandedWf] = useState<string | null>(null);

    // Filter states
    const [period, setPeriod] = useState<'all' | 'year' | 'month' | 'day'>('month');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [trendData, setTrendData] = useState<any[]>([]);

    // Date range for child components
    const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });

    useEffect(() => {
        if (user?.organization_id) {
            fetchCostData();
        } else {
            setLoading(false);
        }
    }, [user?.organization_id, period, selectedDate, selectedMonth]);

    const fetchCostData = async () => {
        try {
            setLoading(true);

            if (!user?.organization_id) return;

            const now = new Date();
            let startDate = null;
            let endDate = null;

            if (period === 'year') {
                startDate = new Date(now.getFullYear(), 0, 1).toISOString();
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), selectedMonth, 1).toISOString();
                endDate = new Date(now.getFullYear(), selectedMonth + 1, 0, 23, 59, 59).toISOString();
            } else if (period === 'day') {
                startDate = selectedDate + 'T00:00:00.000Z';
                endDate = selectedDate + 'T23:59:59.999Z';
            }

            setDateRange({ start: startDate, end: endDate });

            // Fetch History Directly joining process_instances to filter by organization
            // Using a more robust select pattern
            let historyQuery = supabase
                .from('process_history')
                .select(`
                    id, 
                    step_cost, 
                    time_spent_hours, 
                    user_id,
                    activity_id,
                    created_at,
                    activities (id, name, workflows(id, name)),
                    process_instances:process_id!inner(organization_id)
                `)
                .gt('step_cost', 0)
                .eq('process_instances.organization_id', user.organization_id);

            if (startDate) historyQuery = historyQuery.gte('created_at', startDate);
            if (endDate) historyQuery = historyQuery.lte('created_at', endDate);

            const { data: history, error: historyError } = await historyQuery;
            if (historyError) throw historyError;

            let globalTotal = 0;
            const wfMap: Record<string, any> = {};
            const trendMap: Record<string, Record<string, number>> = {};
            const wfNames = new Set<string>();

            (history || []).forEach((h: any) => {
                const cost = parseFloat(h.step_cost || 0);
                const hours = parseFloat(h.time_spent_hours || 0);
                if (isNaN(cost) || cost <= 0) return;

                globalTotal += cost;
                const date = h.created_at ? new Date(h.created_at) : new Date();

                // 1. Group by Workflow
                const actName = h.activities?.name || 'Actividad S/N';
                const wfRaw = h.activities?.workflows;
                const wf = Array.isArray(wfRaw) ? wfRaw[0] : wfRaw;
                const wfId = wf?.id || 'unknown';
                const wfName = wf?.name || 'Proceso S/N';
                wfNames.add(wfName);

                if (!wfMap[wfId]) {
                    wfMap[wfId] = { id: wfId, name: wfName, total: 0, activities: {} };
                }
                wfMap[wfId].total += cost;

                const actId = h.activity_id || 'unknown_act';
                if (!wfMap[wfId].activities[actId]) {
                    wfMap[wfId].activities[actId] = { name: actName, total: 0, hours: 0 };
                }
                wfMap[wfId].activities[actId].total += cost;
                wfMap[wfId].activities[actId].hours += hours;

                // 2. Trend Data
                const monthsNamesSmall = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'];
                let label = '';
                if (period === 'year' || period === 'all') {
                    label = monthsNamesSmall[date.getMonth()];
                } else if (period === 'month') {
                    const d = date.getDate();
                    if (d <= 7) label = 'Semana 1';
                    else if (d <= 14) label = 'Semana 2';
                    else if (d <= 21) label = 'Semana 3';
                    else label = 'Semana 4';
                } else if (period === 'day') {
                    label = date.getHours() + ':00';
                } else {
                    label = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                }

                if (!trendMap[label]) trendMap[label] = {};
                trendMap[label][wfName] = (trendMap[label][wfName] || 0) + cost;
            });

            setTotalCost(globalTotal);
            setWorkflowCosts(Object.values(wfMap).sort((a, b) => b.total - a.total).map(w => ({
                ...w,
                actArr: Object.values(w.activities).sort((a: any, b: any) => b.total - a.total)
            })));

            const chartLabels = (period === 'year' || period === 'all')
                ? ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.']
                : period === 'month'
                    ? ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4']
                    : Object.keys(trendMap).sort();

            const finalTrend = chartLabels.map(label => {
                const entry: any = { name: label };
                wfNames.forEach(name => {
                    entry[name] = trendMap[label]?.[name] || 0;
                });
                return entry;
            });
            setTrendData(finalTrend);

        } catch (err) {
            console.error('Error fetching cost data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const periodLabels: any = { all: 'Histórico', year: 'Este Año', month: 'Mes', day: 'Día' };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <DollarSign className="w-5 h-5 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recalculando Costos...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-700 pb-10">
            {/* Control Bar */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-900/50 p-4 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 ml-2">
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600">
                            <Filter className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Periodo de Análisis</p>
                            <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter">
                                {period === 'month' ? monthNames[selectedMonth] : periodLabels[period]}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                        {(Object.keys(periodLabels) as Array<'all' | 'year' | 'month' | 'day'>).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                    period === p
                                        ? "bg-white dark:bg-slate-900 text-emerald-600 shadow-sm border border-slate-200"
                                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                                )}
                            >
                                {p === 'all' ? 'Todo' : p === 'year' ? 'Año' : p === 'month' ? 'Mes' : 'Día'}
                            </button>
                        ))}
                    </div>
                </div>

                {(period === 'day' || period === 'month') && (
                    <div className="flex items-center gap-3 pl-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {period === 'day' ? (
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-[1.2rem] border border-slate-100 dark:border-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:outline-none" />
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {monthNames.map((m, idx) => (
                                    <button
                                        key={m}
                                        onClick={() => setSelectedMonth(idx)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all",
                                            selectedMonth === idx ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {m.substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-auto italic">Selecciona el rango de análisis</p>
                    </div>
                )}
            </div>

            {/* KPI Resumen */}
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 rounded-[2rem] p-7 text-white shadow-xl shadow-emerald-900/30 relative overflow-hidden group border border-white/10">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-all duration-1000 group-hover:rotate-12 translate-x-12 -translate-y-12">
                    <DollarSign className="w-64 h-64" />
                </div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                            <div className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 text-[8px] font-black uppercase tracking-[0.2em]">{periodLabels[period]}</div>
                            <div className="flex items-center gap-1.5 text-emerald-300"><Clock className="w-3 h-3" /><span className="text-[8px] font-bold uppercase tracking-widest">Gasto Operativo</span></div>
                        </div>
                        <h2 className="text-slate-100/60 font-black uppercase tracking-[0.3em] text-[9px] mb-1.5 leading-none">Total Invertido en Procesos</h2>
                        <div className="text-4xl font-black drop-shadow-xl tracking-tighter bg-gradient-to-r from-white via-white to-emerald-200 bg-clip-text text-transparent">{formatMoney(totalCost)}</div>
                    </div>
                    <div className="hidden lg:flex items-center gap-5 p-4 bg-white/5 backdrop-blur-2xl rounded-[2rem] border border-white/10">
                        <div className="text-center px-3"><p className="text-[8px] font-black text-emerald-300 uppercase tracking-widest mb-1">Flujos</p><p className="text-xl font-black">{workflowCosts.length}</p></div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {/* Workflow Costs */}
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3"><GitBranch className="w-4 h-4" /> Costo por Flujo</h3>
                    <div className="space-y-3">
                        {workflowCosts.map(wf => (
                            <div key={wf.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button onClick={() => setExpandedWf(expandedWf === wf.id ? null : wf.id)} className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">{expandedWf === wf.id ? <ChevronDown className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}{wf.name}</div>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400">{formatMoney(wf.total)}</span>
                                </button>
                                {expandedWf === wf.id && (
                                    <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
                                        {/* Process Cost Map Integration */}
                                        <div className="mb-8 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner bg-slate-50/50 dark:bg-slate-900/50">
                                            <ProcessCostMap
                                                workflowId={wf.id}
                                                startDate={dateRange.start}
                                                endDate={dateRange.end}
                                            />
                                        </div>

                                        <div className="flex items-center gap-2 mb-4">
                                            <Activity className="w-4 h-4 text-emerald-500" />
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desglose de Actividades</h4>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            {wf.actArr.map((act: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                            <Activity className="w-3 h-3 text-emerald-500/50" />
                                                            {act.name}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] text-slate-400 font-medium bg-white/50 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                                                {act.hours.toFixed(1)} hrs invertidas
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block tabular-nums">
                                                            {formatMoney(act.total)}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Inversión Actividad</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            {trendData.length > 0 && (
                <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                                <Activity className="w-4 h-4 text-emerald-500" /> Comportamiento del Gasto
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Evolución monetaria por flujo de trabajo</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {period === 'month' || period === 'year' || period === 'all' ? (
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
                                        dy={10}
                                    />
                                    <YAxis hide />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', padding: '15px' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                        labelStyle={{ fontSize: '11px', fontWeight: 900, color: '#fff', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}
                                        formatter={(value: any) => [formatMoney(typeof value === 'number' ? value : 0), '']}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '20px' }}
                                    />
                                    {Object.keys(trendData[0] || {}).filter(k => k !== 'name').map((wf, idx) => (
                                        <Line
                                            key={wf}
                                            type="monotone"
                                            dataKey={wf}
                                            stroke={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][idx % 5]}
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                            animationDuration={1500}
                                        />
                                    ))}
                                </LineChart>
                            ) : (
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                    <YAxis hide />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', padding: '15px' }}
                                        itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                                        labelStyle={{ fontSize: '11px', fontWeight: 900, color: '#fff', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}
                                        formatter={(value: any) => [formatMoney(typeof value === 'number' ? value : 0), '']}
                                    />
                                    <Legend
                                        verticalAlign="top"
                                        align="right"
                                        iconType="circle"
                                        wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingBottom: '20px' }}
                                    />
                                    {Object.keys(trendData[0] || {}).filter(k => k !== 'name').map((wf, idx) => (
                                        <Bar key={wf} dataKey={wf} stackId="a" fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'][idx % 5]} radius={idx === Object.keys(trendData[0]).length - 2 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                    ))}
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}
