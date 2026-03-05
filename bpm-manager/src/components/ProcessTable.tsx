import { useState, useEffect } from 'react';
import { Eye, ArrowRight, Search, ChevronLeft, ChevronRight, Lock, ChevronUp, ChevronDown, ChevronsUpDown, UserCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface ProcessTableProps {
    processes: any[];
    loading: boolean;
    onView: (id: string) => void;
    onAttend: (id: string) => void;
    currentPage: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    searchQuery?: string;
    onReload?: () => void;
}

export function ProcessTable({
    processes,
    loading,
    onView,
    onAttend,
    currentPage,
    pageSize,
    onPageChange,
    onPageSizeChange,
    searchQuery = '',
    onReload
}: ProcessTableProps) {
    const { user } = useAuth();
    const currentRole = user?.available_organizations?.find(o => o.id === user.organization_id)?.role || user?.role || 'viewer';
    const isViewer = currentRole === 'viewer';
    const isAdmin = currentRole === 'admin';

    const [sortBy, setSortBy] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [reassigningId, setReassigningId] = useState<string | null>(null);
    const [orgUsers, setOrgUsers] = useState<any[]>([]);
    const [reassigning, setReassigning] = useState(false);

    useEffect(() => {
        if (user?.organization_id && isAdmin) {
            supabase.from('profiles')
                .select('id, full_name, email')
                .eq('organization_id', user.organization_id)
                .order('full_name')
                .then(({ data }) => setOrgUsers(data || []));
        }
    }, [user?.organization_id, isAdmin]);

    function handleSort(col: string) {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
        onPageChange(1);
    }

    function SortIcon({ col }: { col: string }) {
        if (sortBy !== col) return <ChevronsUpDown className="w-2.5 h-2.5 opacity-30 inline-block ml-0.5" />;
        return sortDir === 'asc'
            ? <ChevronUp className="w-2.5 h-2.5 inline-block ml-0.5" />
            : <ChevronDown className="w-2.5 h-2.5 inline-block ml-0.5" />;
    }

    function highlight(text: string | undefined | null) {
        if (!text) return <>{text}</>;
        const clean = searchQuery.replace(/^#/, '').trim();
        if (!clean) return <>{text}</>;
        const idx = text.toLowerCase().indexOf(clean.toLowerCase());
        if (idx === -1) return <>{text}</>;
        return (
            <>
                {text.slice(0, idx)}
                <mark className="bg-yellow-200 dark:bg-yellow-700/60 text-yellow-900 dark:text-yellow-100 rounded px-0.5 not-italic font-inherit">
                    {text.slice(idx, idx + clean.length)}
                </mark>
                {text.slice(idx + clean.length)}
            </>
        );
    }

    async function handleReassign(processId: string, userId: string) {
        if (!userId) return;
        setReassigning(true);
        await supabase.from('process_instances')
            .update({ current_assigned_user_id: userId })
            .eq('id', processId);
        setReassigningId(null);
        setReassigning(false);
        onReload?.();
    }

    function getElapsedBadge(createdAt: string, status: string) {
        if (status !== 'active') return null;
        const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const color = days > 7
            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
            : days >= 3
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        return (
            <span className={`inline-flex items-center px-1 py-0 rounded text-[8px] font-black border ml-1 whitespace-nowrap ${color}`}>
                {days === 0 ? 'Hoy' : `${days}d`}
            </span>
        );
    }

    if (loading && processes.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const sortedProcesses = [...processes].sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortBy) {
            case 'process_number': aVal = a.process_number || 0; bVal = b.process_number || 0; break;
            case 'name': aVal = a.name || ''; bVal = b.name || ''; break;
            case 'workflow': aVal = a.workflows?.name || ''; bVal = b.workflows?.name || ''; break;
            case 'activity': aVal = a.activities?.name || ''; bVal = b.activities?.name || ''; break;
            case 'user': aVal = a.profiles?.full_name || ''; bVal = b.profiles?.full_name || ''; break;
            case 'status': aVal = a.status || ''; bVal = b.status || ''; break;
            default: aVal = a.created_at || ''; bVal = b.created_at || '';
        }
        if (typeof aVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedProcesses = sortedProcesses.slice(startIndex, endIndex);

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-sm transition-colors">
                        <tr className="bg-slate-300/70 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700">
                            <th onClick={() => handleSort('process_number')} className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-400/20 transition-colors select-none">ID Trámite <SortIcon col="process_number" /></th>
                            <th onClick={() => handleSort('name')} className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Nombre <SortIcon col="name" /></th>
                            <th onClick={() => handleSort('workflow')} className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Flujo <SortIcon col="workflow" /></th>
                            <th onClick={() => handleSort('activity')} className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Actividad Actual <SortIcon col="activity" /></th>
                            <th onClick={() => handleSort('user')} className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Usuario <SortIcon col="user" /></th>
                            <th onClick={() => handleSort('status')} className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Estado <SortIcon col="status" /></th>
                            <th onClick={() => handleSort('created_at')} className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-400/20 transition-colors select-none">Fecha <SortIcon col="created_at" /></th>
                            <th className="px-3 py-2.5 text-left text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest whitespace-nowrap">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {processes.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-12 text-center bg-white dark:bg-slate-900 transition-colors">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-slate-800">
                                        <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400 dark:text-slate-500">No se encontraron trámites</p>
                                    <p className="text-xs text-slate-300 dark:text-slate-600">Intenta ajustar los filtros</p>
                                </td>
                            </tr>
                        ) : (
                            paginatedProcesses.map((process) => {
                                // Determine if the viewer is authorized to open this process
                                const isAuthorized = !isViewer ||
                                    process.created_by === user?.id ||
                                    process.current_assigned_user_id === user?.id ||
                                    process.assigned_user_id === user?.id;

                                return (
                                    <tr
                                        key={process.id}
                                        className={`group transition-all items-center justify-center ${!isAuthorized ? 'opacity-70 bg-slate-50/50 dark:bg-slate-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
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
                                                    <div className="w-7" />
                                                )}

                                                {/* Reasignar — solo admin, solo activos */}
                                                {isAdmin && process.status === 'active' && (
                                                    reassigningId === process.id ? (
                                                        <select
                                                            autoFocus
                                                            disabled={reassigning}
                                                            defaultValue=""
                                                            onChange={(e) => handleReassign(process.id, e.target.value)}
                                                            onBlur={() => setReassigningId(null)}
                                                            className="text-[9px] border border-indigo-300 dark:border-indigo-700 rounded-lg px-1.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
                                                        >
                                                            <option value="" disabled>Reasignar a...</option>
                                                            {orgUsers.map(u => (
                                                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <button
                                                            onClick={() => setReassigningId(process.id)}
                                                            title="Reasignar tarea"
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shadow-sm border bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 hover:bg-indigo-600 hover:text-white border-slate-100 dark:border-slate-800/50 active:scale-90"
                                                        >
                                                            <UserCheck className="w-3 h-3" />
                                                        </button>
                                                    )
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

            {/* Pagination Controls */}
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
