import { useState, useEffect } from 'react';
import { X, PlayCircle, GitBranch, Terminal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useExecution } from '../hooks/useExecution';
import { useAuth } from '../hooks/useAuth';
import type { Workflow } from '../types';

export function StartProcessModal({ onClose, onStarted }: { onClose: () => void, onStarted: () => void }) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
    const [processName, setProcessName] = useState('');
    const { user } = useAuth();
    const { startProcess, loading, error } = useExecution();

    useEffect(() => {
        loadWorkflows();
    }, []);

    async function loadWorkflows() {
        // TODO: Filter by organization_id once RLS is active or here manually
        const { data } = await supabase.from('workflows').select('*').eq('status', 'active');
        setWorkflows(data || []);
    }

    async function handleStart() {
        if (!selectedWorkflowId || !processName || !user?.organization_id) {
            alert('Error: Datos incompletos o sesión inválida');
            return;
        }
        const result = await startProcess(selectedWorkflowId, processName, user.organization_id);
        if (result.success) {
            onStarted();
            onClose();
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                            <PlayCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 leading-none mb-1">Iniciar Trámite</h3>
                            <p className="text-xs text-slate-400 font-medium">Crea una nueva instancia de ejecución</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                <div className="p-8 space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                            <Terminal className="w-4 h-4" />
                            <p className="text-xs font-bold">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Seleccionar Workflow</label>
                            <div className="relative">
                                <select
                                    value={selectedWorkflowId}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setSelectedWorkflowId(id);
                                        const wf = workflows.find(w => w.id === id);
                                        if (wf) setProcessName(wf.name);
                                    }}
                                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-700 appearance-none"
                                >
                                    <option value="">Selecciona una plantilla...</option>
                                    {workflows.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                                <GitBranch className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre del Trámite</label>
                            <input
                                type="text"
                                value={processName}
                                onChange={(e) => setProcessName(e.target.value)}
                                placeholder="Ej: Compra de Materiales #442"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-bold text-slate-700 placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    <div className="p-5 bg-blue-50/50 rounded-3xl border border-blue-100/50">
                        <p className="text-[10px] font-medium text-blue-600 leading-relaxed">
                            Al iniciar, se generará la primera actividad definida en el flujo y aparecerá automáticamente en tu bandeja de entrada.
                        </p>
                    </div>

                    <button
                        onClick={handleStart}
                        disabled={loading || !selectedWorkflowId || !processName}
                        className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                    >
                        {loading ? 'Iniciando...' : 'Iniciar ahora'}
                    </button>
                </div>
            </div>
        </div>
    );
}
