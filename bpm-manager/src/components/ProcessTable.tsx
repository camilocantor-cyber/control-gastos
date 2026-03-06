import { useState } from 'react';
import { Eye, ArrowRight, Search, ChevronLeft, ChevronRight, Lock, ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ProcessTableProps {
    processes: any[];
    loading: boolean;
    onView?: (id: string) => void;
    onAttend?: (id: string) => void;
    currentPage: number;
    pageSize?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
    searchQuery?: string;
    onDelete?: (id: string) => Promise<void>;
    variant?: 'current' | 'history';
}

export function ProcessTable({
    processes,
    loading,
    onView = () => { },
    onAttend = () => { },
    currentPage = 1,
    pageSize = 10,
    onPageChange,
    onPageSizeChange = () => { },
    searchQuery = '',
    onDelete,
    variant = 'current'
}: ProcessTableProps) {
    const { user } = useAuth();
    const currentRole = user?.available_organizations?.find(o => o.id === user.organization_id)?.role || user?.role || 'viewer';
    const isViewer = currentRole === 'viewer';
    const isAdmin = currentRole === 'admin';

    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const handleSort = (col: string) => {
        if (sortBy === col) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(col);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortBy !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 inline opacity-30" />;
        return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 ml-1 inline text-blue-600" /> : <ChevronDown className="w-3 h-3 ml-1 inline text-blue-600" />;
    };

    const highlight = (text: string | undefined | null) => {
        if (!text) return 'N/A';
        if (!searchQuery) return text;
        const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
        return (
            <>
                {parts.map((part, i) => (
                    part.toLowerCase() === searchQuery.toLowerCase() ?
                        <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark> :
                        part
                ))}
            </>
        );
    };



    const getElapsedBadge = (createdAt: string, status: string) => {
        if (status === 'completed') return null;
        const now = new Date();
        const start = new Date(createdAt);
        const diffHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);

        if (diffHours < 24) return null;

        return (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black bg-rose-50 text-rose-600 border border-rose-100 animate-pulse">
                ALERTA: {Math.floor(diffHours / 24)}d DE ATRASO
            </span>
        );
    };

    const sortedProcesses = [...processes].sort((a, b) => {
        let valA, valB;
        switch (sortBy) {
            case 'id': valA = a.id; valB = b.id; break;
            case 'name': valA = a.name; valB = b.name; break;
            case 'workflow': valA = a.workflows?.name; valB = b.workflows?.name; break;
            case 'activity': valA = a.activities?.name; valB = b.activities?.name; break;
            case 'status': valA = a.status; valB = b.status; break;
            case 'cost': valA = a.total_cost || 0; valB = b.total_cost || 0; break;
            default: valA = a.created_at; valB = b.created_at;
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

    const paginatedProcesses = sortedProcesses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 transition-colors">
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Actualizando...</p>
                        </div>
                    </div>
                )}

                <table className="w-full text-sm border-collapse">
                    <thead className="bg-slate-400/10 dark:bg-slate-800/50 backdrop-blur-md sticky top-0 z-10 font-black uppercase tracking-widest text-[9px]">
                        {variant === 'history' ? (
                            <tr>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">ID Trámite</th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Proceso</th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Ejecutado Por</th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Entrada</th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Salida</th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Duración</th>
                                <th className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">Inversión</th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Acción</th>
                            </tr>
                        ) : (
                            <tr>
                                <th onClick={() => handleSort('id')} className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-400/20 transition-colors select-none">ID Trámite <SortIcon col="id" /></th>
                                <th onClick={() => handleSort('name')} className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Nombre <SortIcon col="name" /></th>
                                <th onClick={() => handleSort('workflow')} className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Flujo <SortIcon col="workflow" /></th>
                                <th onClick={() => handleSort('activity')} className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Actividad Actual <SortIcon col="activity" /></th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Usuario</th>
                                <th onClick={() => handleSort('status')} className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Estado <SortIcon col="status" /></th>
                                <th onClick={() => handleSort('cost')} className="px-3 py-2.5 text-right text-emerald-600 cursor-pointer hover:bg-emerald-100/50 transition-colors select-none">Costo <SortIcon col="cost" /></th>
                                <th onClick={() => handleSort('created_at')} className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Fecha <SortIcon col="created_at" /></th>
                                <th className="px-3 py-2.5 text-left text-slate-600 dark:text-slate-300">Acción</th>
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {processes.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-12 text-center bg-white dark:bg-slate-900 transition-colors">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                        <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No se encontraron trámites</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedProcesses.map((process) => {
                                if (variant === 'history') {
                                    const proc = process.process_instances || process;
                                    const userObj = process.users || process.profiles || {};
                                    const exit = new Date(process.created_at);
                                    const durationMs = (process.time_spent_hours || 0) * 3600000;
                                    const entry = new Date(exit.getTime() - durationMs);

                                    return (
                                        <tr key={process.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group border-b border-slate-50 dark:border-slate-800">
                                            <td className="px-3 py-3">
                                                <span className="inline-flex items-center px-1.5 py-0 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                                    #{proc.process_number ? proc.process_number.toString().padStart(8, '0') : proc.id?.split('-')[0].toUpperCase() || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <h4 className="text-[11px] font-black text-slate-900 dark:text-slate-200">
                                                    {proc.name || proc.workflows?.name || 'Proceso'}
                                                </h4>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[8px] font-black">
                                                        {userObj.full_name?.[0] || '?'}
                                                    </div>
                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                                        {userObj.full_name || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{entry.toLocaleDateString()}</span>
                                                    <span className="text-[9px] text-slate-400">{entry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{exit.toLocaleDateString()}</span>
                                                    <span className="text-[9px] text-slate-400">{exit.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {process.time_spent_hours?.toFixed(1) || '0.0'}h
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span className="text-[11px] font-black text-emerald-600 tabular-nums">
                                                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(process.step_cost || 0)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onView(proc.id); }}
                                                    className="p-1.5 hover:bg-blue-600 hover:text-white text-slate-400 rounded-lg transition-all border border-slate-100"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }

                                const isAuthorized = !isViewer ||
                                    process.created_by === user?.id ||
                                    process.current_assigned_user_id === user?.id ||
                                    process.assigned_user_id === user?.id;

                                return (
                                    <tr
                                        key={process.id}
                                        className={`group transition-all ${!isAuthorized ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                    >
                                        <td className="px-3 py-2.5">
                                            <span className={`inline-flex items-center px-1.5 py-0 rounded-md text-[10px] font-bold whitespace-nowrap border ${!isAuthorized ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800'}`}>
                                                #{process.process_number ? process.process_number.toString().padStart(8, '0') : process.id.split('-')[0].toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <h4 className={`text-[11px] font-bold transition-colors ${!isAuthorized ? 'text-slate-400' : 'text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                                                {highlight(process.name)}
                                            </h4>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className={`text-[11px] font-medium whitespace-nowrap ${!isAuthorized ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {highlight(process.workflows?.name)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className={`text-[11px] font-medium ${!isAuthorized ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                {highlight(process.activities?.name || 'N/A')}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className={`flex items-center gap-1.5 ${!isAuthorized ? 'opacity-50' : ''}`}>
                                                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase shrink-0">
                                                    {process.profiles?.full_name?.[0] || '?'}
                                                </div>
                                                <span className={`text-[11px] font-medium whitespace-nowrap ${!isAuthorized ? 'text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {highlight(process.profiles?.full_name || process.profiles?.email || 'N/A')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${process.status === 'active'
                                                ? !isAuthorized ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                : !isAuthorized ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                                }`}>
                                                {process.status === 'active' ? 'Activo' : 'Completado'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-800/30">
                                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(process.total_cost || 0)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className={`text-[11px] font-bold whitespace-nowrap ${!isAuthorized ? 'text-slate-400' : 'text-slate-900 dark:text-slate-200'}`}>
                                                {new Date(process.created_at).toLocaleDateString()}
                                            </span>
                                            {getElapsedBadge(process.created_at, process.status)}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex justify-start items-center gap-1.5">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (isAuthorized) onView(process.id);
                                                    }}
                                                    disabled={!isAuthorized}
                                                    title={!isAuthorized ? "Acceso denegado" : "Ver Flujo del Proceso"}
                                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm border ${!isAuthorized ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:bg-blue-600 hover:text-white border-slate-100 dark:border-slate-800/50 active:scale-90'}`}
                                                >
                                                    {!isAuthorized ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                </button>

                                                {process.status === 'active' ? (
                                                    <button
                                                        onClick={() => isAuthorized && onAttend(process.id)}
                                                        disabled={!isAuthorized}
                                                        title={!isAuthorized ? "Acceso denegado" : "Continuar Trámite"}
                                                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm border ${!isAuthorized ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:bg-blue-600 hover:text-white border-slate-100 dark:border-slate-800/50 active:scale-90'}`}
                                                    >
                                                        {!isAuthorized ? <Lock className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                                                    </button>
                                                ) : (
                                                    <div className="w-7 h-7" />
                                                )}

                                                {isAdmin && onDelete && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDelete(process.id); }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-100 dark:border-rose-800/50 transition-all active:scale-90"
                                                        title="Eliminar Trámite"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {processes.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border-t border-emerald-100 dark:border-emerald-800/30 p-3 px-6 flex justify-end items-center gap-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] Inversión Total:">Inversión Total Selección:</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
                            processes.reduce((sum, p) => sum + (p.step_cost || p.total_cost || 0), 0)
                        )}
                    </span>
                </div>
            )}

            {processes.length > 0 && (
                <div className="p-2.5 px-4 border-t border-slate-100 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-between shrink-0 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 hidden sm:block">
                            <span className="text-blue-600 dark:text-blue-400">{processes.length}</span> resultado{processes.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 hidden sm:block">|</span>
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
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2">
                            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, processes.length)} de {processes.length}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">Página {currentPage} de {Math.ceil(processes.length / pageSize)}</span>
                        <button onClick={() => onPageChange(Math.min(Math.ceil(processes.length / pageSize), currentPage + 1))} disabled={currentPage >= Math.ceil(processes.length / pageSize)} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
