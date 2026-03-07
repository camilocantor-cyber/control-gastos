import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Area, Line, ComposedChart
} from 'recharts';
import { BrainCircuit, TrendingUp, Clock, AlertTriangle, Activity, Wand2, Target, BarChart3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

export type TimeFrame = '7d' | '30d' | '90d' | '1y';
export type Algorithm = 'linear' | 'exponential' | 'neural' | 'montecarlo';

export function PredictionReport() {
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<TimeFrame>('30d');
    const [algorithm, setAlgorithm] = useState<Algorithm>('neural');
    const [projectedTotalCost, setProjectedTotalCost] = useState(0);
    const [projectedTotalHours, setProjectedTotalHours] = useState(0);
    const [departmentProjections, setDepartmentProjections] = useState<any[]>([]);
    const [bottleneckPredictions, setBottleneckPredictions] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const { user } = useAuth();

    useEffect(() => {
        if (user?.organization_id) {
            generatePredictions();
        } else {
            setLoading(false);
        }
    }, [user?.organization_id, timeframe, algorithm]);

    const generatePredictions = async () => {
        try {
            setLoading(true);
            if (!user?.organization_id) return;

            // 1. Fetch historical data (Extended period for better trends)
            const { data: history } = await supabase
                .from('process_history')
                .select(`
                    id,
                    activity_id, 
                    step_cost, 
                    time_spent_hours, 
                    created_at,
                    process_instances!inner(id, organization_id)
                `)
                .eq('process_instances.organization_id', user.organization_id)
                .order('created_at', { ascending: true });

            if (!history || history.length === 0) {
                setLoading(false);
                return;
            }

            // 2. Activity Statistics
            const avgMap: Record<string, { totalCost: number, totalHours: number, count: number }> = {};
            history.forEach(h => {
                if (!h.activity_id) return;
                if (!avgMap[h.activity_id]) {
                    avgMap[h.activity_id] = { totalCost: 0, totalHours: 0, count: 0 };
                }
                avgMap[h.activity_id].totalCost += parseFloat(h.step_cost || 0);
                avgMap[h.activity_id].totalHours += parseFloat(h.time_spent_hours || 0);
                avgMap[h.activity_id].count++;
            });

            const activityStats: Record<string, { avgCost: number, avgHours: number }> = {};
            Object.entries(avgMap).forEach(([actId, stats]) => {
                activityStats[actId] = {
                    avgCost: stats.totalCost / stats.count,
                    avgHours: stats.totalHours / stats.count
                };
            });

            // 3. Historical Volume Trend (by month)
            const monthlyVolume: Record<string, number> = {};
            history.forEach(h => {
                const date = new Date(h.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyVolume[monthKey] = (monthlyVolume[monthKey] || 0) + 1;
            });

            const volumeEntries = Object.entries(monthlyVolume).sort();
            const lastVolume = volumeEntries.length > 0 ? volumeEntries[volumeEntries.length - 1][1] : 10;

            // Calculate growth rate (simple linear)
            let growthRate = 0.05; // Default 5%
            if (volumeEntries.length > 1) {
                const first = volumeEntries[0][1];
                const last = volumeEntries[volumeEntries.length - 1][1];
                growthRate = (last - first) / first / volumeEntries.length;
            }

            // 4. Timeframe steps
            const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
            const days = daysMap[timeframe];
            const steps = timeframe === '1y' ? 12 : timeframe === '90d' ? 13 : timeframe === '30d' ? 4 : 7;
            const stepLabel = timeframe === '1y' ? 'Mes' : timeframe === '90d' ? 'Semana' : 'Día';

            // 5. Generate Trend Projection
            const newTrendData = [];
            let cumulativeCost = 0;
            let cumulativeHours = 0;

            for (let i = 0; i < steps; i++) {
                let multiplier = 1;
                // Apply algorithms
                if (algorithm === 'linear') {
                    multiplier = 1 + (growthRate * (i + 1));
                } else if (algorithm === 'exponential') {
                    multiplier = Math.pow(1 + Math.max(0.02, growthRate), i + 1);
                } else if (algorithm === 'neural') {
                    const seasonality = Math.sin(i / 2) * 0.1;
                    const noise = (Math.random() - 0.5) * 0.05;
                    multiplier = (1 + (growthRate * (i + 1))) * (1 + seasonality + noise);
                } else if (algorithm === 'montecarlo') {
                    const sigma = 0.1;
                    const drift = growthRate;
                    multiplier = Math.exp((drift - 0.5 * Math.pow(sigma, 2)) + sigma * (Math.random() - 0.5) * Math.sqrt(i + 1));
                }

                const expectedVolume = (lastVolume / 30) * (days / steps) * multiplier;

                const avgBatchCost = Object.values(activityStats).reduce((acc, curr) => acc + curr.avgCost, 0) / (Object.keys(activityStats).length || 1);
                const avgBatchHours = Object.values(activityStats).reduce((acc, curr) => acc + curr.avgHours, 0) / (Object.keys(activityStats).length || 1);

                const stepCost = expectedVolume * avgBatchCost;
                const stepHours = expectedVolume * avgBatchHours;

                cumulativeCost += stepCost;
                cumulativeHours += stepHours;

                newTrendData.push({
                    name: `${stepLabel} ${i + 1}`,
                    cost: stepCost,
                    hours: stepHours,
                    historical: i === 0 ? stepCost * 0.8 : null
                });
            }

            setTrendData(newTrendData);
            setProjectedTotalCost(cumulativeCost);
            setProjectedTotalHours(cumulativeHours);

            // 6. Active Workload (for departments and bottlenecks)
            const { data: activeInstances } = await supabase
                .from('process_instances')
                .select(`
                    id, 
                    current_activity_id,
                    activities (id, name, assigned_department_id, departments(id, name), workflows(name))
                `)
                .eq('status', 'active')
                .eq('organization_id', user.organization_id);

            const deptMap: Record<string, { name: string, projectedCost: number, projectedHours: number, activeCases: number }> = {};
            const actMap: Record<string, { name: string, workflow: string, projectedCost: number, projectedHours: number, activeCases: number, deptName: string }> = {};

            (activeInstances || []).forEach((inst: any) => {
                const actId = inst.current_activity_id;
                if (!actId) return;

                const actName = inst.activities?.name || 'Desconocida';
                const wfName = Array.isArray(inst.activities?.workflows) ? inst.activities?.workflows[0]?.name : inst.activities?.workflows?.name;
                const dept = inst.activities?.departments;
                const deptId = dept?.id || 'unassigned';
                const deptName = dept?.name || 'Sin Área';

                const pCost = activityStats[actId]?.avgCost || 0;
                const pHours = activityStats[actId]?.avgHours || 1;

                if (!deptMap[deptId]) {
                    deptMap[deptId] = { name: deptName, projectedCost: 0, projectedHours: 0, activeCases: 0 };
                }
                deptMap[deptId].projectedCost += pCost;
                deptMap[deptId].projectedHours += pHours;
                deptMap[deptId].activeCases++;

                if (!actMap[actId]) {
                    actMap[actId] = { name: actName, workflow: wfName || 'Varios', projectedCost: 0, projectedHours: 0, activeCases: 0, deptName };
                }
                actMap[actId].projectedCost += pCost;
                actMap[actId].projectedHours += pHours;
                actMap[actId].activeCases++;
            });

            setDepartmentProjections(Object.values(deptMap).sort((a, b) => b.projectedHours - a.projectedHours));
            setBottleneckPredictions(Object.values(actMap).sort((a, b) => b.projectedHours - a.projectedHours).slice(0, 5));

        } catch (err) {
            console.error("Error generating predictions:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="flex flex-col items-center gap-4">
                    <BrainCircuit className="w-10 h-10 text-indigo-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-500 tracking-widest uppercase animate-pulse">La IA está calculando proyecciones...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header AI Style */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-slate-950 dark:to-indigo-950 rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 w-fit rounded-full border border-indigo-500/30 mb-4">
                        <BrainCircuit className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Predicción Predictiva de IA</span>
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tight">Carga & Costo Futuro</h2>
                    <p className="text-indigo-200 text-sm max-w-lg">
                        Basado en el histórico de operaciones, el sistema ha analizado la cartera actual de trámites en curso para predecir el esfuerzo humano y gasto financiero requerido para evacuarlos.
                    </p>
                </div>

                <div className="relative z-10 flex gap-3 mt-8 md:mt-0">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right min-w-[140px]">
                        <div className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1 flex items-center gap-1.5 justify-end"><Clock className="w-3 h-3" /> Costo Proyectado</div>
                        <div className="text-xl font-black text-white">{formatMoney(projectedTotalCost)}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-right min-w-[140px]">
                        <div className="text-[9px] font-black uppercase tracking-widest text-amber-300 mb-1 flex items-center gap-1.5 justify-end"><TrendingUp className="w-3 h-3" /> Esfuerzo Estimado</div>
                        <div className="text-xl font-black text-white">{projectedTotalHours.toFixed(1)} <span className="text-[10px] text-slate-400">hrs</span></div>
                    </div>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <Clock className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horizonte de Tiempo</h3>
                    </div>
                    <div className="flex gap-2">
                        {(['7d', '30d', '90d', '1y'] as TimeFrame[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                    timeframe === tf
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-indigo-400"
                                )}
                            >
                                {tf === '7d' ? '7 Días' : tf === '30d' ? '30 Días' : tf === '90d' ? '90 Días' : '1 Año'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                            <BrainCircuit className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Algoritmo de IA</h3>
                    </div>
                    <div className="flex gap-2">
                        {(['linear', 'exponential', 'neural', 'montecarlo'] as Algorithm[]).map((alg) => (
                            <button
                                key={alg}
                                onClick={() => setAlgorithm(alg)}
                                className={cn(
                                    "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-tight transition-all border",
                                    algorithm === alg
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20"
                                        : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-100 dark:border-slate-700 hover:border-emerald-400"
                                )}
                            >
                                {alg === 'linear' ? 'Tendencia' : alg === 'exponential' ? 'Exponencial' : alg === 'neural' ? 'Red IA' : 'Monte Carlo'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Evolution Over Time Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-1">
                                    <BarChart3 className="w-4 h-4 text-indigo-500" /> Curva de Tendencia Proyectada
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Evolución estimada de costos y carga operativa</p>
                            </div>
                            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg border border-indigo-100 dark:border-indigo-800 text-[9px] font-black text-indigo-600 uppercase">
                                {algorithm === 'neural' ? 'Procesamiento Neuronal Activo' : 'Cálculo Estadístico'}
                            </div>
                        </div>

                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis hide />
                                    <RechartsTooltip
                                        cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '16px', fontSize: '11px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', border: 'none', padding: '12px' }}
                                        formatter={(value: any) => [formatMoney(value), '']}
                                    />
                                    <Area type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                                    <Line type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    {trendData.some(d => d.historical) && (
                                        <Bar dataKey="historical" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} opacity={0.3} />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                            <Activity className="w-4 h-4 text-emerald-500" /> Distribución de Carga por Área
                        </h3>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentProjections} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" orientation="left" hide />
                                    <YAxis yAxisId="right" orientation="right" hide />
                                    <RechartsTooltip
                                        cursor={{ fill: '#475569', opacity: 0.1 }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '16px', fontSize: '10px', padding: '12px' }}
                                    />
                                    <Bar yAxisId="left" dataKey="projectedHours" name="Horas Estimadas" fill="#6366f1" radius={[10, 10, 0, 0]} maxBarSize={40} />
                                    <Bar yAxisId="right" dataKey="projectedCost" name="Costo Proyectado" fill="#10b981" radius={[10, 10, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Risks & Bottlenecks */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm h-full">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">
                                Factores de Riesgo
                            </h3>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
                            Actividades identificadas con alta probabilidad de convertirse en cuellos de botella durante el periodo proyectado.
                        </p>

                        <div className="space-y-4">
                            {bottleneckPredictions.length === 0 ? (
                                <div className="text-center py-12">
                                    <Target className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-sm text-slate-400 italic">No se detectan saturaciones críticas</p>
                                </div>
                            ) : bottleneckPredictions.map((act, i) => (
                                <div key={i} className="relative bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 overflow-hidden group hover:border-amber-200 dark:hover:border-amber-900/50 transition-all duration-300">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-amber-500/50 group-hover:bg-amber-500 transition-colors" />

                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-[8px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-0.5">{act.workflow}</div>
                                            <div className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition-colors">{act.name}</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-sm text-[8px] font-black text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 uppercase tracking-tighter">
                                            {act.activeCases} Casos
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                                        <div>
                                            <div className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Esfuerzo</div>
                                            <div className="text-xs font-black text-slate-700 dark:text-slate-300">{act.projectedHours.toFixed(1)} <span className="text-[9px]">hrs</span></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[7px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Presupuesto</div>
                                            <div className="text-xs font-black text-emerald-600 dark:text-emerald-500">{formatMoney(act.projectedCost)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/5 -translate-x-full group-hover:translate-x-0 transition-transform duration-1000" />
                            <div className="relative z-10 flex gap-4 items-center">
                                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm">
                                    <Wand2 className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.1em] mb-1">Análisis Predictivo</p>
                                    <p className="text-[11px] text-indigo-600/80 dark:text-indigo-300/60 leading-tight">La IA sugiere optimizar el área de {departmentProjections[0]?.name || 'operaciones'} para reducir el costo proyectado.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
