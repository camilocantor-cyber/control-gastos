import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { BrainCircuit, TrendingUp, Clock, AlertTriangle, Activity } from 'lucide-react';

export function PredictionReport() {
    const [loading, setLoading] = useState(true);
    const [projectedTotalCost, setProjectedTotalCost] = useState(0);
    const [projectedTotalHours, setProjectedTotalHours] = useState(0);
    const [departmentProjections, setDepartmentProjections] = useState<any[]>([]);
    const [bottleneckPredictions, setBottleneckPredictions] = useState<any[]>([]);

    useEffect(() => {
        generatePredictions();
    }, []);

    const generatePredictions = async () => {
        try {
            setLoading(true);

            // 1. Fetch historical data to calculate averages
            const { data: history } = await supabase
                .from('process_history')
                .select('activity_id, step_cost, time_spent_hours')
                .gt('step_cost', 0); // Only entries with cost

            const avgMap: Record<string, { totalCost: number, totalHours: number, count: number }> = {};
            (history || []).forEach(h => {
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

            // 2. Fetch current active workload
            const { data: activeInstances } = await supabase
                .from('process_instances')
                .select(`
                    id, 
                    current_activity_id,
                    activities (id, name, assigned_department_id, departments(id, name), workflows(name))
                `)
                .eq('status', 'active');

            let totalPjCost = 0;
            let totalPjHours = 0;

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

                // Predicted values (fallback to minimal assumptions if no history)
                const pCost = activityStats[actId]?.avgCost || 0; // If no history, we assume 0 for now
                const pHours = activityStats[actId]?.avgHours || 1; // Assume 1 hour default if no history

                totalPjCost += pCost;
                totalPjHours += pHours;

                // Dept Projection
                if (!deptMap[deptId]) {
                    deptMap[deptId] = { name: deptName, projectedCost: 0, projectedHours: 0, activeCases: 0 };
                }
                deptMap[deptId].projectedCost += pCost;
                deptMap[deptId].projectedHours += pHours;
                deptMap[deptId].activeCases++;

                // Activity Projection (Bottlenecks)
                if (!actMap[actId]) {
                    actMap[actId] = { name: actName, workflow: wfName || 'Varios', projectedCost: 0, projectedHours: 0, activeCases: 0, deptName };
                }
                actMap[actId].projectedCost += pCost;
                actMap[actId].projectedHours += pHours;
                actMap[actId].activeCases++;
            });

            setProjectedTotalCost(totalPjCost);
            setProjectedTotalHours(totalPjHours);

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
        <div className="space-y-6 animate-in fade-in duration-500">
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

                <div className="relative z-10 flex gap-4 mt-8 md:mt-0">
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-1 flex items-center gap-1.5 justify-end"><Clock className="w-3 h-3" /> Costo Proyectado</div>
                        <div className="text-3xl font-black text-white">{formatMoney(projectedTotalCost)}</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-300 mb-1 flex items-center gap-1.5 justify-end"><TrendingUp className="w-3 h-3" /> Esfuerzo Estimado</div>
                        <div className="text-3xl font-black text-white">{projectedTotalHours.toFixed(1)} <span className="text-sm text-slate-300">hrs</span></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cuellos de botella futuros */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Riesgo de Saturación
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                            Estas son las actividades con mayor carga pendiente proyectada asumiendo los tiempos promedios reales del equipo.
                        </p>

                        <div className="space-y-3">
                            {bottleneckPredictions.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm italic">Sin cuellos de botella proyectados.</div>
                            ) : bottleneckPredictions.map((act, i) => (
                                <div key={i} className="relative bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 overflow-hidden group hover:border-amber-200 dark:hover:border-amber-800 transition-colors">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-amber-400" />
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-0.5">{act.workflow}</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{act.name}</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-sm text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                                            {act.activeCases} Casos
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                        <div>
                                            <div className="text-[9px] text-slate-400 uppercase tracking-widest">Esfuerzo</div>
                                            <div className="text-sm font-black text-slate-700 dark:text-slate-300">{act.projectedHours.toFixed(1)} hrs</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] text-slate-400 uppercase tracking-widest">Presupuesto</div>
                                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-500">{formatMoney(act.projectedCost)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Graficas Generales */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2 mb-6">
                            <Activity className="w-4 h-4 text-indigo-500" /> Carga Laboral Proyectada por Área
                        </h3>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={departmentProjections} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" orientation="left" stroke="#6366f1" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                    <RechartsTooltip
                                        cursor={{ fill: '#475569', opacity: 0.1 }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    <Bar yAxisId="left" dataKey="projectedHours" name="Horas de Trabajo Estimadas" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    <Bar yAxisId="right" dataKey="projectedCost" name="Costo Proyectado (COP)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
