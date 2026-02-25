import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, RefreshCw, Calendar, Search, CheckCircle2 } from 'lucide-react';
import { cn } from '../utils/cn';

interface IntegrationError {
    id: string;
    process_id: string;
    process_name: string;
    workflow_name: string;
    activity_name: string;
    error_message: string;
    failed_at: string;
    current_process_status: string;
}

export function IntegrationMonitor() {
    const [errors, setErrors] = useState<IntegrationError[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadErrors();
    }, []);

    async function loadErrors() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('vw_integration_errors')
                .select('*')
                .eq('current_process_status', 'active') // Only show errors for active processes
                .order('failed_at', { ascending: false });

            if (error) throw error;
            setErrors(data || []);
        } catch (err) {
            console.error('Error loading integration errors:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const handleRefresh = () => {
        setRefreshing(true);
        loadErrors();
    };

    const filteredErrors = errors.filter(err =>
        err.process_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        err.error_message.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Filters & Actions */}
            <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="flex-1 relative group w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por trámite o mensaje de error..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-xs text-slate-700 dark:text-white placeholder:uppercase placeholder:text-[9px] placeholder:font-black placeholder:tracking-widest"
                    />
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl font-black text-[9px] uppercase tracking-widest border border-rose-100 dark:border-rose-800/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {filteredErrors.length} Fallos Críticos
                    </div>

                    <button
                        onClick={handleRefresh}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-none",
                            refreshing && "animate-pulse"
                        )}
                        title="Actualizar lista"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Error List */}
            <div className="bg-white dark:bg-[#080a14] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-800">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trámite / Proceso</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividad / Paso</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mensaje de Error</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Fecha y Hora</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-8 py-10">
                                            <div className="h-4 bg-slate-50 dark:bg-slate-800 rounded-full w-2/3 mb-4" />
                                            <div className="h-3 bg-slate-50 dark:bg-slate-800 rounded-full w-1/3" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredErrors.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-full mb-4">
                                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                            </div>
                                            <p className="text-slate-900 dark:text-white font-black text-lg">¡Todo en orden!</p>
                                            <p className="text-slate-500">No se han detectado fallos en las integraciones automáticas.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredErrors.map((error) => (
                                    <tr key={error.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all cursor-default text-sm">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                                                    {error.process_name}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {error.workflow_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 px-1 py-1" />
                                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                                    {error.activity_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl">
                                                <p className="text-rose-600 dark:text-rose-400 font-mono text-xs leading-relaxed">
                                                    {error.error_message.replace('❌ Error en Acción Automática: ', '')}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-black mb-1">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {new Date(error.failed_at).toLocaleDateString()}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 tracking-widest">
                                                    {new Date(error.failed_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Insight */}
                <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
                        <AlertCircle className="w-4 h-4" />
                        Los fallos detectados aquí pueden requerir intervención en el Bridge COM+ o revisión de credenciales.
                    </div>
                </div>
            </div>
        </div>
    );
}
