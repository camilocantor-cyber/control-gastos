import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Clock, AlertTriangle, DollarSign, Activity, User } from 'lucide-react';
import { cn } from '../utils/cn';

interface DepartmentReportModalProps {
    deptId: string;
    deptName: string;
    onClose: () => void;
}

export function DepartmentReportModal({ deptId, deptName, onClose }: DepartmentReportModalProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        async function fetchReport() {
            setLoading(true);
            try {
                // 1. Get positions for this department
                const { data: positions } = await supabase
                    .from('positions')
                    .select('id, title, hourly_rate')
                    .eq('department_id', deptId);

                const positionIds = positions?.map(p => p.id) || [];

                // 2. Get users in these positions
                const { data: empPos } = await supabase
                    .from('employee_positions')
                    .select('user_id, position_id, users(full_name)')
                    .in('position_id', positionIds);

                const userIds = empPos?.map(ep => ep.user_id) || [];
                const userMap = new Map();
                empPos?.forEach(ep => {
                    userMap.set(ep.user_id, (ep.users as any)?.full_name || 'Usuario');
                });
                const posMap = new Map();
                positions?.forEach(p => {
                    posMap.set(p.id, p);
                });

                // 3. Get total cost for current month for these users
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                const { data: history } = await supabase
                    .from('process_history')
                    .select('step_cost, time_spent_hours, user_id, action')
                    .in('action', ['completed'])
                    .in('user_id', userIds)
                    .gte('created_at', startOfMonth.toISOString());

                let monthlyCost = 0;
                let monthlyHours = 0;
                history?.forEach(h => {
                    monthlyCost += (h.step_cost || 0);
                    monthlyHours += (h.time_spent_hours || 0);
                });

                // 4. Get active instances
                const { data: allActive } = await supabase
                    .from('process_instances')
                    .select('id, process_number, name, created_at, assigned_user_id, assigned_position_id, assigned_department_id, activities(name, due_date_hours)')
                    .eq('status', 'active');

                const activeForDept = allActive?.filter(inst => {
                    return inst.assigned_department_id === deptId ||
                        (inst.assigned_position_id && positionIds.includes(inst.assigned_position_id)) ||
                        (inst.assigned_user_id && userIds.includes(inst.assigned_user_id));
                }) || [];

                // 5. Analyze active instances
                const tasks: any[] = [];
                let overdueCount = 0;
                const overdueByPerson: Record<string, number> = {};

                activeForDept.forEach(inst => {
                    const activity = inst.activities as any;
                    const dueHours = activity?.due_date_hours || 24;
                    const createdAt = new Date(inst.created_at);
                    const now = new Date();
                    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                    const isOverdue = hoursElapsed > dueHours;

                    let assignee = 'Sin Asignar';
                    if (inst.assigned_user_id) assignee = userMap.get(inst.assigned_user_id) || 'Usuario';
                    else if (inst.assigned_position_id) assignee = posMap.get(inst.assigned_position_id)?.title || 'Cargo';
                    else if (inst.assigned_department_id) assignee = 'Área entera';

                    if (isOverdue) {
                        overdueCount++;
                        if (inst.assigned_user_id) {
                            overdueByPerson[assignee] = (overdueByPerson[assignee] || 0) + 1;
                        } else if (inst.assigned_position_id) {
                            overdueByPerson[assignee] = (overdueByPerson[assignee] || 0) + 1;
                        }
                    }

                    tasks.push({
                        id: inst.id,
                        number: inst.process_number || inst.id.substring(0, 8),
                        name: inst.name,
                        activityName: activity?.name || 'Actividad',
                        assignee,
                        hoursElapsed: hoursElapsed,
                        isOverdue
                    });
                });

                setStats({
                    activeCount: activeForDept.length,
                    overdueCount,
                    tasks: tasks.sort((a, b) => b.hoursElapsed - a.hoursElapsed),
                    monthlyCost,
                    monthlyHours,
                    overdueByPerson
                });

            } catch (error) {
                console.error('Error fetching report:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchReport();
    }, [deptId]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-[95%] max-w-4xl shadow-2xl scale-in-center animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                            <Activity className="w-6 h-6 text-blue-500" />
                            Reporte Dinámico: <span className="text-blue-600 dark:text-blue-400">{deptName}</span>
                        </h2>
                        <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">
                            Rendimiento y Cargas de Trabajo
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : stats ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-800/50 relative overflow-hidden">
                                <Activity className="absolute -right-4 -top-4 w-24 h-24 text-blue-500/10" />
                                <div className="flex items-center gap-3 mb-2 relative z-10">
                                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    <h3 className="text-[10px] font-black uppercase text-blue-800 dark:text-blue-300 tracking-widest">Trámites en Curso</h3>
                                </div>
                                <p className="text-3xl font-black text-blue-600 dark:text-blue-400 relative z-10">{stats.activeCount}</p>
                            </div>

                            <div className={cn("rounded-2xl p-5 border relative overflow-hidden", stats.overdueCount > 0 ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50")}>
                                <AlertTriangle className={cn("absolute -right-4 -top-4 w-24 h-24 opacity-10", stats.overdueCount > 0 ? "text-rose-500" : "text-emerald-500")} />
                                <div className="flex items-center gap-3 mb-2 relative z-10">
                                    <AlertTriangle className={cn("w-5 h-5", stats.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")} />
                                    <h3 className={cn("text-[10px] font-black uppercase tracking-widest", stats.overdueCount > 0 ? "text-rose-800 dark:text-rose-300" : "text-emerald-800 dark:text-emerald-300")}>Tareas Vencidas</h3>
                                </div>
                                <p className={cn("text-3xl font-black relative z-10", stats.overdueCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>{stats.overdueCount}</p>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-100 dark:border-amber-800/50 relative overflow-hidden">
                                <DollarSign className="absolute -right-4 -top-4 w-24 h-24 text-amber-500/10" />
                                <div className="flex items-center gap-3 mb-2 relative z-10">
                                    <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    <h3 className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 tracking-widest">Costo Generado (Mes)</h3>
                                </div>
                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 relative z-10">
                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(stats.monthlyCost)}
                                </p>
                                <p className="text-[10px] text-amber-600/70 font-bold uppercase mt-1 relative z-10">({stats.monthlyHours.toFixed(1)} horas reportadas)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Left Column: List of tasks */}
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">Top Tareas en Proceso</h3>
                                {stats.tasks.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No hay trámites en curso en esta área.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {stats.tasks.slice(0, 10).map((t: any) => (
                                            <div key={t.id} className={cn("p-4 rounded-xl border flex items-center justify-between", t.isOverdue ? "bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/50 shadow-sm" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm")}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500">{t.number}</span>
                                                        {t.isOverdue && <span className="text-[9px] font-black uppercase bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/50">! Vencida</span>}
                                                    </div>
                                                    <p className="text-sm font-black text-slate-800 dark:text-gray-100 leading-snug">{t.name}</p>
                                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.activityName}</p>
                                                </div>
                                                <div className="text-right ml-4">
                                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5 tracking-widest">Asignado a</p>
                                                    <p className="text-[11px] font-black text-blue-600 dark:text-blue-400 flex items-center justify-end gap-1.5"><User className="w-3 h-3" />{t.assignee}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Lleva {t.hoursElapsed.toFixed(1)} hrs</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Overdue by Person */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">Cuellos de Botella</h3>
                                {Object.keys(stats.overdueByPerson).length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No hay cuellos de botella detectados.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {Object.entries(stats.overdueByPerson).map(([person, count]) => (
                                            <div key={person} className="flex flex-col p-3 bg-red-50/30 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2 uppercase tracking-wide"><AlertTriangle className="w-3 h-3 text-rose-500" /> {person}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(((count as number) / stats.activeCount) * 100, 100)}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider">{count as number} atrasadas</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-10 text-center text-slate-500">Error al cargar datos.</div>
                )}
            </div>
        </div>
    );
}
