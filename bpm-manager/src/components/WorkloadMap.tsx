import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { clsx } from 'clsx';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, Clock, Filter, ChevronDown, Inbox } from 'lucide-react';

interface UserWorkload {
    user_id: string;
    user_name: string;
    department?: string;
    total: number;
    overdue: number;
    near_due: number;
    on_time: number;
    processes: { id: string; name: string; activity: string; status: 'overdue' | 'near_due' | 'on_time' }[];
}

export function WorkloadMap() {
    const { user } = useAuth();
    const [workloads, setWorkloads] = useState<UserWorkload[]>([]);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [showFilter, setShowFilter] = useState(false);

    useEffect(() => {
        loadDepartments();
    }, []);

    useEffect(() => {
        loadWorkload();
    }, [selectedDept]);

    async function loadDepartments() {
        if (!user?.organization_id) return;
        const { data } = await supabase.from('departments').select('id, name').eq('organization_id', user.organization_id);
        if (data) setDepartments(data);
    }

    const loadWorkload = useCallback(async () => {
        try {
            setLoading(true);
            const now = new Date();

            // Fetch active process instances with assigned user and current activity
            let q = supabase
                .from('process_instances')
                .select(`
                    id, name, created_at, current_activity_id,
                    assigned_user_id,
                    profiles!process_instances_assigned_user_id_fkey(id, full_name, email),
                    activities!process_instances_current_activity_id_fkey(id, name, due_date_hours, assigned_department_id,
                        departments(name))
                `)
                .in('status', ['active', 'waiting']);

            if (user?.organization_id) q = q.eq('organization_id', user.organization_id);

            const { data, error } = await q;
            if (error) throw error;

            // Group by user
            const userMap: Record<string, UserWorkload> = {};

            (data || []).forEach((inst: any) => {
                const profile = inst.profiles;
                const userId = inst.assigned_user_id || 'unassigned';
                const userName = profile?.full_name || profile?.email || 'Sin Asignar';
                const deptName = inst.activities?.departments?.name;
                const deptId = inst.activities?.assigned_department_id;

                // Department filter
                if (selectedDept && deptId !== selectedDept) return;

                if (!userMap[userId]) {
                    userMap[userId] = {
                        user_id: userId,
                        user_name: userName,
                        department: deptName,
                        total: 0,
                        overdue: 0,
                        near_due: 0,
                        on_time: 0,
                        processes: []
                    };
                }

                const dueHours = inst.activities?.due_date_hours || 24;
                const createdAt = new Date(inst.created_at);
                const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

                let status: 'overdue' | 'near_due' | 'on_time' = 'on_time';
                if (hoursElapsed > dueHours) status = 'overdue';
                else if ((dueHours - hoursElapsed) <= 4) status = 'near_due';

                userMap[userId].total++;
                userMap[userId][status]++;
                userMap[userId].processes.push({
                    id: inst.id,
                    name: inst.name || `#${inst.id.slice(0, 6)}`,
                    activity: inst.activities?.name || '',
                    status
                });
            });

            // Sort by overdue desc, then total desc
            const sorted = Object.values(userMap).sort((a, b) => {
                if (b.overdue !== a.overdue) return b.overdue - a.overdue;
                return b.total - a.total;
            });

            setWorkloads(sorted);
        } catch (err) {
            console.error('Error loading workload:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedDept, user?.organization_id]);

    const maxTotal = Math.max(...workloads.map(w => w.total), 1);

    const getSemaphore = (w: UserWorkload) => {
        if (w.overdue > 0) return { color: 'rose', label: 'Crítico', emoji: '🔴' };
        if (w.near_due > 0) return { color: 'amber', label: 'Alerta', emoji: '🟡' };
        return { color: 'emerald', label: 'Normal', emoji: '🟢' };
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-900 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-blue-900 dark:text-white tracking-tight">Mapa de Carga</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {workloads.length} responsables activos
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {departments.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-300 hover:border-blue-300 transition-all shadow-sm"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                {selectedDept ? departments.find(d => d.id === selectedDept)?.name : 'Todos los Dptos.'}
                                <ChevronDown className={clsx("w-3 h-3 transition-transform", showFilter && "rotate-180")} />
                            </button>
                            {showFilter && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                                    <div className="absolute top-full right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-20">
                                        <button onClick={() => { setSelectedDept(''); setShowFilter(false); }} className={clsx("w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all", !selectedDept ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300")}>Todos</button>
                                        {departments.map(d => (
                                            <button key={d.id} onClick={() => { setSelectedDept(d.id); setShowFilter(false); }} className={clsx("w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all", selectedDept === d.id ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300")}>{d.name}</button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <button onClick={loadWorkload} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                        <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-1.5">🔴 Crítico (vencido)</div>
                <div className="flex items-center gap-1.5">🟡 Alerta (por vencer)</div>
                <div className="flex items-center gap-1.5">🟢 Normal</div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : workloads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                        <Inbox className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">Sin carga activa</p>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                    {workloads.map(w => {
                        const sem = getSemaphore(w);
                        const pct = (w.total / maxTotal) * 100;
                        const barColors: Record<string, string> = {
                            rose: 'bg-rose-500',
                            amber: 'bg-amber-500',
                            emerald: 'bg-emerald-500'
                        };

                        return (
                            <div
                                key={w.user_id}
                                className={clsx(
                                    "p-6 rounded-2xl border transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 bg-blue-900",
                                    w.overdue > 0 ? "border-rose-400/30 shadow-rose-900/10" :
                                        w.near_due > 0 ? "border-amber-400/30 shadow-amber-900/10" :
                                            "border-blue-800 shadow-blue-900/10"
                                )}
                            >
                                {/* User Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white",
                                            sem.color === 'rose' ? 'bg-rose-500' :
                                                sem.color === 'amber' ? 'bg-amber-500' : 'bg-blue-800'
                                        )}>
                                            {w.user_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white leading-none">{w.user_name}</p>
                                            {w.department && <p className="text-[9px] text-blue-300 mt-0.5 font-black uppercase tracking-widest">{w.department}</p>}
                                        </div>
                                    </div>
                                    <span className="text-lg">{sem.emoji}</span>
                                </div>

                                {/* Bar */}
                                <div className="mb-5">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-[0.1em] text-blue-400/80 mb-2">
                                        <span>Carga total</span>
                                        <span className="text-white">{w.total} trámites</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-black/30 rounded-full overflow-hidden">
                                        <div
                                            className={clsx("h-full rounded-full transition-all duration-1000", barColors[sem.color])}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-2.5 bg-black/20 rounded-xl border border-rose-500/20">
                                        <div className="flex items-center justify-center mb-1"><AlertTriangle className="w-3 h-3 text-rose-400" /></div>
                                        <p className="text-lg font-black text-white leading-none">{w.overdue}</p>
                                        <p className="text-[7px] font-black text-rose-400/80 uppercase tracking-widest mt-0.5">Vencidos</p>
                                    </div>
                                    <div className="text-center p-2.5 bg-black/20 rounded-xl border border-amber-500/20">
                                        <div className="flex items-center justify-center mb-1"><Clock className="w-3 h-3 text-amber-400" /></div>
                                        <p className="text-lg font-black text-white leading-none">{w.near_due}</p>
                                        <p className="text-[7px] font-black text-amber-400/80 uppercase tracking-widest mt-0.5">Por vencer</p>
                                    </div>
                                    <div className="text-center p-2.5 bg-black/20 rounded-xl border border-emerald-500/20">
                                        <div className="flex items-center justify-center mb-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /></div>
                                        <p className="text-lg font-black text-white leading-none">{w.on_time}</p>
                                        <p className="text-[7px] font-black text-emerald-400/80 uppercase tracking-widest mt-0.5">A tiempo</p>
                                    </div>
                                </div>

                                {/* Mini process list */}
                                {w.processes.slice(0, 3).length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                                        {w.processes.slice(0, 3).map(p => (
                                            <div key={p.id} className="flex items-center gap-2 text-[9px]">
                                                <div className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                    p.status === 'overdue' ? 'bg-rose-400' :
                                                        p.status === 'near_due' ? 'bg-amber-400' : 'bg-emerald-400'
                                                )} />
                                                <span className="text-blue-100 truncate font-bold">{p.name}</span>
                                                <span className="text-blue-400/50 flex-shrink-0">· {p.activity}</span>
                                            </div>
                                        ))}
                                        {w.processes.length > 3 && (
                                            <p className="text-[9px] text-blue-400/70 font-black mt-2 uppercase tracking-tighter">+{w.processes.length - 3} procesos adicionales</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
