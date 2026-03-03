import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, Layers, Users, Briefcase, ChevronDown, ChevronRight, Activity, GitBranch } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function CostReport() {
    const [loading, setLoading] = useState(true);
    const [workflowCosts, setWorkflowCosts] = useState<any[]>([]);
    const [areaCosts, setAreaCosts] = useState<any[]>([]);
    const [totalCost, setTotalCost] = useState(0);

    const { user } = useAuth();
    // Expanded states
    const [expandedWf, setExpandedWf] = useState<string | null>(null);
    const [expandedDept, setExpandedDept] = useState<string | null>(null);
    const [expandedPos, setExpandedPos] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_id) {
            fetchCostData();
        } else {
            setLoading(false);
        }
    }, [user?.organization_id]);

    const fetchCostData = async () => {
        try {
            setLoading(true);

            if (!user?.organization_id) return;

            const { data: instances } = await supabase
                .from('process_instances')
                .select('id')
                .eq('organization_id', user.organization_id);

            const instanceIds = instances?.map((i: any) => i.id) || [];

            if (instanceIds.length === 0) {
                setWorkflowCosts([]);
                setAreaCosts([]);
                setTotalCost(0);
                setLoading(false);
                return;
            }

            // Fetch History with costs > 0
            const { data: history, error: historyError } = await supabase
                .from('process_history')
                .select(`
                    id, 
                    step_cost, 
                    time_spent_hours, 
                    user_id,
                    activity_id,
                    activities (name, workflows(id, name))
                `)
                .gt('step_cost', 0)
                .in('process_id', instanceIds);

            if (historyError) throw historyError;

            // Fetch Positions & Users to map user_id -> Dept -> Position -> User Name
            const { data: employees } = await supabase
                .from('employee_positions')
                .select(`
                    user_id,
                    user:user_id (full_name),
                    positions (id, title, departments(id, name))
                `);

            let globalTotal = 0;

            // Maps for grouping
            const wfMap: Record<string, { id: string, name: string, total: number, activities: Record<string, { name: string, total: number, hours: number }> }> = {};
            const deptMap: Record<string, { id: string, name: string, total: number, positions: Record<string, { id: string, name: string, total: number, users: Record<string, { name: string, total: number, hours: number }> }> }> = {};

            // Processing History
            (history || []).forEach((h: any) => {
                const cost = parseFloat(h.step_cost || 0);
                const hours = parseFloat(h.time_spent_hours || 0);

                if (cost > 0) {
                    globalTotal += cost;

                    // 1. Group by Workflow -> Activity
                    const actName = h.activities?.name || 'Desconocida';
                    const wf = Array.isArray(h.activities?.workflows) ? h.activities?.workflows[0] : h.activities?.workflows;
                    const wfId = wf?.id || 'unknown';
                    const wfName = wf?.name || 'Proceso S/N';

                    if (!wfMap[wfId]) wfMap[wfId] = { id: wfId, name: wfName, total: 0, activities: {} };
                    wfMap[wfId].total += cost;

                    if (!wfMap[wfId].activities[h.activity_id]) {
                        wfMap[wfId].activities[h.activity_id] = { name: actName, total: 0, hours: 0 };
                    }
                    wfMap[wfId].activities[h.activity_id].total += cost;
                    wfMap[wfId].activities[h.activity_id].hours += hours;

                    // 2. Group by Department -> Position -> User
                    // Find employee mapping
                    const emp = employees?.find(e => e.user_id === h.user_id);
                    const pos = Array.isArray(emp?.positions) ? emp.positions[0] : emp?.positions;
                    const dept = pos?.departments;

                    const deptId = (dept as any)?.id || 'unassigned_dept';
                    const deptName = (dept as any)?.name || 'Sin Área Asignada';

                    const posId = (pos as any)?.id || 'unassigned_pos';
                    const posName = (pos as any)?.title || 'Sin Cargo Específico';

                    const userName = (emp?.user as any)?.full_name || h.user_id || 'Usuario Desconocido';

                    if (!deptMap[deptId]) deptMap[deptId] = { id: deptId, name: deptName, total: 0, positions: {} };
                    deptMap[deptId].total += cost;

                    if (!deptMap[deptId].positions[posId]) {
                        deptMap[deptId].positions[posId] = { id: posId, name: posName, total: 0, users: {} };
                    }
                    deptMap[deptId].positions[posId].total += cost;

                    if (!deptMap[deptId].positions[posId].users[h.user_id]) {
                        deptMap[deptId].positions[posId].users[h.user_id] = { name: userName, total: 0, hours: 0 };
                    }
                    deptMap[deptId].positions[posId].users[h.user_id].total += cost;
                    deptMap[deptId].positions[posId].users[h.user_id].hours += hours;
                }
            });

            setTotalCost(globalTotal);

            // Format arrays and sort
            const wfs = Object.values(wfMap).sort((a, b) => b.total - a.total);
            wfs.forEach(w => {
                (w as any).actArr = Object.values(w.activities).sort((a: any, b: any) => b.total - a.total);
            });
            setWorkflowCosts(wfs);

            const depts = Object.values(deptMap).sort((a, b) => b.total - a.total);
            depts.forEach(d => {
                const posArr = Object.values(d.positions).sort((a: any, b: any) => b.total - a.total);
                posArr.forEach((p: any) => {
                    p.userArr = Object.values(p.users).sort((a: any, b: any) => b.total - a.total);
                });
                (d as any).posArr = posArr;
            });
            setAreaCosts(depts);

        } catch (err) {
            console.error('Error fetching cost data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
            {/* KPI Resumen */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-800 rounded-3xl p-8 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-emerald-100 font-bold uppercase tracking-widest text-xs flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4" /> Gasto Total Operativo Histórico
                        </h2>
                        <div className="text-5xl font-black drop-shadow-md tracking-tighter">
                            {formatMoney(totalCost)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Costos por Flujo y Actividad */}
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <GitBranch className="w-4 h-4" /> Costo por Flujo de Trabajo
                    </h3>

                    <div className="space-y-3">
                        {workflowCosts.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-4 text-center">No hay datos de costos registrados.</p>
                        ) : workflowCosts.map(wf => (
                            <div key={wf.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedWf(expandedWf === wf.id ? null : wf.id)}
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {expandedWf === wf.id ? <ChevronDown className="w-4 h-4 text-emerald-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                        {wf.name}
                                    </div>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400">{formatMoney(wf.total)}</span>
                                </button>

                                {expandedWf === wf.id && (
                                    <div className="bg-white dark:bg-slate-900 p-3 flex flex-col gap-2">
                                        {wf.actArr.map((act: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/20 px-3 py-2 rounded-lg ml-6 border-l-2 border-emerald-500/30">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                                        <Activity className="w-3 h-3 text-emerald-500" />
                                                        {act.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">Total: {act.hours.toFixed(1)} hrs facturadas</span>
                                                </div>
                                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(act.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Costos por Área Organizacional */}
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <Layers className="w-4 h-4" /> Costo por Área y Equipo
                    </h3>

                    <div className="space-y-3">
                        {areaCosts.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-4 text-center">No hay datos de costos registrados.</p>
                        ) : areaCosts.map(dept => (
                            <div key={dept.id} className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {expandedDept === dept.id ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                        {dept.name}
                                    </div>
                                    <span className="font-black text-blue-600 dark:text-blue-400">{formatMoney(dept.total)}</span>
                                </button>

                                {expandedDept === dept.id && (
                                    <div className="bg-white dark:bg-slate-900 p-2 flex flex-col gap-2 relative">
                                        <div className="absolute left-4 top-0 bottom-4 w-px bg-slate-200 dark:bg-slate-700 pointer-events-none" />

                                        {dept.posArr.map((pos: any) => (
                                            <div key={pos.id} className="ml-6 relative">
                                                <button
                                                    onClick={() => setExpandedPos(expandedPos === pos.id ? null : pos.id)}
                                                    className="w-full flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors relative z-10"
                                                >
                                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        {expandedPos === pos.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                        <Briefcase className="w-3 h-3 text-slate-400" />
                                                        {pos.name}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatMoney(pos.total)}</span>
                                                </button>

                                                {expandedPos === pos.id && (
                                                    <div className="ml-6 mt-1 flex flex-col gap-1 relative z-10">
                                                        {pos.userArr.map((user: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center py-1.5 px-3 rounded-md bg-slate-50/50 dark:bg-slate-900/50 border-l-2 border-slate-300 dark:border-slate-600">
                                                                <div className="flex items-center gap-2">
                                                                    <Users className="w-3 h-3 text-slate-400" />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{user.name}</span>
                                                                        <span className="text-[9px] text-slate-400">{user.hours.toFixed(1)} hrs</span>
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-500">{formatMoney(user.total)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
