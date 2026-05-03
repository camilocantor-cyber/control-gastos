import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccountingOperations } from '../hooks/useAccountingOperations';
import {
    Play,
    ChevronRight,
    Zap,
    Search
} from 'lucide-react';
import type { AccountingOperation } from '../types/accounting';
import { ExecuteOperationModal } from './ExecuteOperationModal';

export function AccountingOperationCatalog() {
    const { user } = useAuth();
    const { operations, loading } = useAccountingOperations(user?.id);
    const [executingOp, setExecutingOp] = useState<AccountingOperation | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOperations = operations.filter(op =>
        op.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && operations.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Cargando catálogo de operaciones...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Zap className="w-10 h-10 text-blue-600 fill-blue-600/10" />
                        Ejecutar Operaciones
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-1">
                        Selecciona una operación para procesar movimientos rápidos
                    </p>
                </div>

                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar operación..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full md:w-80 shadow-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-white"
                    />
                </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredOperations.map(op => (
                    <div
                        key={op.id}
                        className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 hover:border-blue-500/50 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xl overflow-hidden cursor-pointer"
                        onClick={() => setExecutingOp(op)}
                    >
                        {/* Decorative background element */}
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl group-hover:bg-blue-600/10 transition-colors" />

                        <div className="mb-6">
                            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                <Play className="w-7 h-7 fill-current" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-none">{op.name}</h3>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-slate-200 dark:border-white/5">
                                    {op.code}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[3rem] font-medium leading-relaxed">
                                {op.description || 'Sin descripción detallada para esta operativa.'}
                            </p>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                Iniciar Proceso
                            </span>
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        </div>
                    </div>
                ))}

                {filteredOperations.length === 0 && (
                    <div className="col-span-full py-32 bg-slate-100/50 dark:bg-white/5 rounded-[3rem] border-4 border-dashed border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-8">
                            <Search className="w-10 h-10 text-slate-400" />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-3">No se encontraron operaciones</h4>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">Prueba con otro término de búsqueda o asegúrate de haber definido operaciones en la configuración.</p>
                    </div>
                )}
            </div>

            {executingOp && (
                <ExecuteOperationModal
                    operation={executingOp}
                    onClose={() => setExecutingOp(null)}
                    onSuccess={() => { setExecutingOp(null); }}
                />
            )}
        </div>
    );
}
