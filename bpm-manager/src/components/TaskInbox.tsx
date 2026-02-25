import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, CheckCircle2, AlertCircle, Eye, Globe } from 'lucide-react';
import { useExecution } from '../hooks/useExecution';
import { ProcessViewerModal } from './ProcessViewerModal';

export function TaskInbox({ onAttendTask, refreshTrigger }: { onAttendTask: (taskId: string) => void, refreshTrigger?: number }) {
    const { getActiveTasks, loading, error } = useExecution();
    const [tasks, setTasks] = useState<any[]>([]);
    const [viewingProcessId, setViewingProcessId] = useState<string | null>(null);

    useEffect(() => {
        loadTasks();
    }, [refreshTrigger]);

    async function loadTasks() {
        const data = await getActiveTasks();
        setTasks(data || []);
    }

    if (loading && tasks.length === 0) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-rose-50 dark:bg-rose-900/20 rounded-3xl border border-rose-100 dark:border-rose-800 flex flex-col items-center text-center">
                <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                <p className="text-sm font-bold text-rose-900 dark:text-rose-300">Error al cargar tareas</p>
                <p className="text-xs text-rose-400 dark:text-rose-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full relative">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-200/50 dark:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 dark:shadow-none translate-y-[-1px]">
                        <Mail className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="leading-tight">
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tighter">Bandeja de Entrada</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Mis Tareas Pendientes</p>
                    </div>
                </div>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black rounded-full border border-blue-100 dark:border-blue-800 uppercase tracking-widest">
                    {tasks.length} Pendientes
                </span>
            </div>

            <div className="flex-1 overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-2 py-2 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-12">Tipo</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nombre del Trámite</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Actividad Actual</th>
                            <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                            <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-24">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {tasks.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                        <CheckCircle2 className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Todo al día</p>
                                    <p className="text-xs text-slate-300 dark:text-slate-600">No tienes actividades pendientes por atender.</p>
                                </td>
                            </tr>
                        ) : (
                            // Group tasks by workflow
                            Object.entries(tasks.reduce((acc: any, task) => {
                                const flowName = task.workflows.name;
                                if (!acc[flowName]) acc[flowName] = [];
                                acc[flowName].push(task);
                                return acc;
                            }, {})).map(([flowName, flowTasks]: [string, any]) => (
                                <React.Fragment key={`group-${flowName}`}>
                                    <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                                        <td colSpan={6} className="px-3 py-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-y border-slate-100 dark:border-slate-800">
                                            {flowName}
                                        </td>
                                    </tr>
                                    {flowTasks.map((task: any) => {
                                        // Calculate if task is overdue
                                        const createdAt = new Date(task.created_at);
                                        const now = new Date();
                                        const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
                                        const dueHours = task.activities.due_date_hours || 24;
                                        const isOverdue = hoursElapsed > dueHours;

                                        // Calculate time remaining
                                        const timeRemaining = dueHours - hoursElapsed;
                                        const isNearDue = timeRemaining > 0 && timeRemaining <= 4; // Within 4 hours of due

                                        return (
                                            <tr
                                                key={task.id}
                                                onClick={() => onAttendTask(task.id)}
                                                className={`group cursor-pointer transition-all border-l-4 ${isOverdue
                                                    ? 'bg-red-50/30 dark:bg-red-950/20 hover:bg-red-50/50 border-red-600'
                                                    : isNearDue
                                                        ? 'bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/50 border-amber-500'
                                                        : 'hover:bg-slate-50 dark:hover:bg-blue-900/10 border-transparent hover:border-slate-900 dark:hover:border-blue-500'
                                                    }`}
                                            >
                                                <td className="px-2 py-1.5 text-center">
                                                    <div className="flex justify-center">
                                                        <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${task.activities.type === 'start' ? 'bg-emerald-500' :
                                                            (task.activities.type === 'end' || task.activities.type === 'fin') ? 'bg-rose-500' :
                                                                'bg-blue-500'
                                                            }`} />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-black tracking-widest border ${isOverdue ? 'bg-red-50 dark:bg-red-900/40 text-red-700 border-red-100' :
                                                        isNearDue ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 border-amber-100' :
                                                            'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800'
                                                        }`}>
                                                        #{task.process_number ? task.process_number.toString().padStart(8, '0') : task.id.split('-')[0].toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <h4 className={`text-[11px] font-bold transition-colors truncate max-w-[180px] leading-tight ${isOverdue
                                                        ? 'text-red-900 dark:text-red-200'
                                                        : isNearDue
                                                            ? 'text-amber-900 dark:text-amber-200'
                                                            : 'text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                                        }`}>
                                                        {task.name}
                                                    </h4>
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${isOverdue ? 'text-red-700 dark:text-red-400' :
                                                        isNearDue ? 'text-amber-700 dark:text-amber-400' :
                                                            'text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {task.activities.name}
                                                        {!task.assigned_user_id && (
                                                            <Globe className="w-2.5 h-2.5 text-blue-500/30" />
                                                        )}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={`text-[10px] font-black leading-none ${isOverdue ? 'text-red-900 dark:text-red-200' :
                                                            isNearDue ? 'text-amber-900 dark:text-amber-200' :
                                                                'text-slate-700 dark:text-slate-300'
                                                            }`}>
                                                            {new Date(task.created_at).toLocaleDateString()}
                                                        </span>
                                                        {isOverdue && (
                                                            <span className="text-[7px] font-black text-red-600 uppercase tracking-tighter">VENCIDA</span>
                                                        )}
                                                        {isNearDue && (
                                                            <span className="text-[7px] font-black text-amber-600 uppercase tracking-tighter">POR VENCER</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <div className="flex justify-center items-center gap-1.5">
                                                        {/* View Flow Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewingProcessId(task.id);
                                                            }}
                                                            title="Ver Flujo del Proceso"
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white border border-slate-100 dark:border-slate-800/50 active:scale-90"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                        </button>

                                                        {/* Attend Button */}
                                                        <div className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm active:scale-95 ${isOverdue
                                                            ? 'bg-red-100 dark:bg-red-900/40 text-red-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:text-white border border-red-200'
                                                            : isNearDue
                                                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:text-white border border-amber-200'
                                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-600 group-hover:text-white border border-slate-100 dark:border-slate-800/50'
                                                            }`}>
                                                            <ArrowRight className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Process Viewer Modal */}
            {viewingProcessId && (
                <ProcessViewerModal
                    processId={viewingProcessId}
                    onClose={() => setViewingProcessId(null)}
                />
            )}
        </div>
    );
}
