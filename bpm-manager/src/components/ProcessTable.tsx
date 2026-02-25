import { Eye, ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProcessTableProps {
    processes: any[];
    loading: boolean;
    onView: (id: string) => void;
    onAttend: (id: string) => void;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
}

export function ProcessTable({
    processes,
    loading,
    onView,
    onAttend,
    currentPage,
    pageSize,
    onPageChange,
    onPageSizeChange
}: ProcessTableProps) {

    if (loading && processes.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProcesses = processes.slice(startIndex, endIndex);

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm transition-colors">
                        <tr className="bg-slate-200/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                            <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">ID Trámite</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Nombre</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Flujo</th>
                            <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Actividad Actual</th>
                            <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Estado</th>
                            <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Fecha</th>
                            <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {processes.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-12 text-center bg-white dark:bg-slate-900 transition-colors">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                        <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No se encontraron trámites</p>
                                    <p className="text-xs text-slate-300 dark:text-slate-600">Intenta ajustar los filtros</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedProcesses.map((process) => (
                                <tr
                                    key={process.id}
                                    className="group transition-all hover:bg-slate-50 dark:hover:bg-slate-800 items-center justify-center"
                                >
                                    <td className="px-3 py-1.5">
                                        <span className="inline-flex items-center px-1.5 py-0 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 whitespace-nowrap border border-blue-100 dark:border-blue-800">
                                            #{process.process_number ? process.process_number.toString().padStart(8, '0') : process.id.split('-')[0].toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {process.name}
                                        </h4>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                            {process.workflows?.name}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                            {process.activities?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${process.status === 'active'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                            }`}>
                                            {process.status === 'active' ? 'Activo' : 'Completado'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        <span className="text-[11px] font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                                            {new Date(process.created_at).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-1.5 text-center">
                                        <div className="flex justify-center items-center gap-1.5 ">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onView(process.id);
                                                }}
                                                title="Ver Flujo del Proceso"
                                                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:bg-blue-600 hover:text-white border border-slate-100 dark:border-slate-800/50 active:scale-90"
                                            >
                                                <Eye className="w-3 h-3" />
                                            </button>

                                            {process.status === 'active' ? (
                                                <button
                                                    onClick={() => onAttend(process.id)}
                                                    title="Continuar Trámite"
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:bg-blue-600 hover:text-white border border-slate-100 dark:border-slate-800/50 active:scale-90"
                                                >
                                                    <ArrowRight className="w-3 h-3" />
                                                </button>
                                            ) : (
                                                <div className="w-7" />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {processes.length > 0 && (
                <div className="p-2.5 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Mostrar:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                onPageSizeChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                            className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, processes.length)} de {processes.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                            Página {currentPage} de {Math.ceil(processes.length / pageSize)}
                        </span>

                        <button
                            onClick={() => onPageChange(Math.min(Math.ceil(processes.length / pageSize), currentPage + 1))}
                            disabled={currentPage >= Math.ceil(processes.length / pageSize)}
                            className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-900 transition-all shadow-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
