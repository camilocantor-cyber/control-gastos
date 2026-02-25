import { useState } from 'react';
import { X, Calendar as CalendarIcon, Repeat, Trash2 } from 'lucide-react';
import type { RecurrencePattern } from '../types';
import { useScheduledProcesses } from '../hooks/useScheduledProcesses';
import { useAuth } from '../hooks/useAuth';

interface ScheduleProcessModalProps {
    onClose: () => void;
    onScheduled: () => void;
    workflows: { id: string; name: string }[];
    initialDate?: Date;
    editProcess?: any; // To support editing
}

export function ScheduleProcessModal({ onClose, onScheduled, workflows, initialDate, editProcess }: ScheduleProcessModalProps) {
    const { user } = useAuth();
    const { scheduleProcess, updateScheduledProcess, deleteScheduledProcess, loading } = useScheduledProcesses(user?.organization_id);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState(editProcess?.workflow_id || '');
    const [processName, setProcessName] = useState(editProcess?.name || '');
    const [scheduledDate, setScheduledDate] = useState(
        editProcess?.scheduled_at
            ? new Date(editProcess.scheduled_at).toISOString().split('T')[0]
            : (initialDate ? initialDate.toISOString().split('T')[0] : '')
    );
    const [scheduledTime, setScheduledTime] = useState(
        editProcess?.scheduled_at
            ? new Date(editProcess.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : '09:00'
    );
    const [isRecurring, setIsRecurring] = useState(editProcess?.is_recurring || false);
    const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(editProcess?.recurrence_pattern || 'weekly');
    const [recurrenceInterval, setRecurrenceInterval] = useState(editProcess?.recurrence_interval || 1);

    async function handleSave() {
        if (!selectedWorkflowId || !processName || !scheduledDate || !user) return;

        const scheduledTimeStr = `${scheduledDate}T${scheduledTime}:00`;
        const payload = {
            workflow_id: selectedWorkflowId,
            name: processName,
            scheduled_at: scheduledTimeStr,
            is_recurring: isRecurring,
            recurrence_pattern: isRecurring ? recurrencePattern : ('none' as RecurrencePattern),
            recurrence_interval: isRecurring ? recurrenceInterval : undefined,
            created_by: user.id,
            status: 'pending' as 'pending'
        };

        let result;
        if (editProcess) {
            result = await updateScheduledProcess(editProcess.id, payload);
        } else {
            result = await scheduleProcess(payload);
        }

        if (result.success) {
            onScheduled();
            onClose();
        } else {
            alert('Error: ' + result.error);
        }
    }

    async function handleDelete() {
        if (!editProcess) return;
        if (confirm('¿Estás seguro de que deseas eliminar este trámite programado?')) {
            const result = await deleteScheduledProcess(editProcess.id);
            if (result.success) {
                onScheduled();
                onClose();
            }
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-950 rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                            <CalendarIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">
                                {editProcess ? 'Editar Trámite' : 'Programar Inicio'}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                {editProcess ? 'Gestión de programación' : 'Planificación de operaciones'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">Workflow</label>
                            <select
                                value={selectedWorkflowId}
                                onChange={(e) => setSelectedWorkflowId(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-sm text-slate-700 dark:text-slate-200"
                            >
                                <option value="">Selecciona plantilla...</option>
                                {workflows.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">Nombre</label>
                            <input
                                type="text"
                                value={processName}
                                onChange={(e) => setProcessName(e.target.value)}
                                placeholder="Ej: Compra de Materiales"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-sm text-slate-700 dark:text-slate-200"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">Fecha</label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-sm text-slate-700 dark:text-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">Hora</label>
                                <input
                                    type="time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-sm text-slate-700 dark:text-slate-200"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Repeat className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Recurrencia</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {isRecurring && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Frecuencia</label>
                                            <select
                                                value={recurrencePattern}
                                                onChange={e => setRecurrencePattern(e.target.value as any)}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black"
                                            >
                                                <option value="daily">Diaria</option>
                                                <option value="weekly">Semanal</option>
                                                <option value="custom_days">Cada N días</option>
                                            </select>
                                        </div>
                                        {recurrencePattern === 'custom_days' && (
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Días</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={recurrenceInterval}
                                                    onChange={e => setRecurrenceInterval(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-black"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {editProcess && (
                            <button
                                onClick={handleDelete}
                                className="p-3 bg-white dark:bg-slate-900 text-rose-500 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all hover:border-rose-200"
                                title="Eliminar Programación"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={loading || !selectedWorkflowId || !processName || !scheduledDate}
                            className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100 dark:shadow-blue-900/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 text-sm"
                        >
                            {loading ? 'Guardando...' : (editProcess ? 'Guardar Cambios' : 'Programar Trámite')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
