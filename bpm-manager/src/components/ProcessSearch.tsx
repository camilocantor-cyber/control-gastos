import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProcessViewerModal } from './ProcessViewerModal';
import { ProcessTable } from './ProcessTable';

export function ProcessSearch({ onAttendTask }: { onAttendTask: (taskId: string) => void }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [processes, setProcesses] = useState<any[]>([]);
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [viewingProcessId, setViewingProcessId] = useState<string | null>(null);

    useEffect(() => {
        loadWorkflows();
        loadProcesses();
    }, []);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
        loadProcesses();
    }, [searchQuery, selectedWorkflow, selectedStatus]);

    async function loadWorkflows() {
        const { data } = await supabase
            .from('workflows')
            .select('id, name')
            .order('name');
        setWorkflows(data || []);
    }

    async function loadProcesses() {
        try {
            setLoading(true);
            setError('');

            let query = supabase
                .from('process_instances')
                .select('*, workflows(name), activities(name, type)')
                .order('created_at', { ascending: false });

            // Filter by workflow
            if (selectedWorkflow) {
                query = query.eq('workflow_id', selectedWorkflow);
            }

            // Filter by status
            if (selectedStatus) {
                query = query.eq('status', selectedStatus);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Client-side search filter
            let filtered = data || [];
            if (searchQuery.trim()) {
                const lowerQuery = searchQuery.toLowerCase();
                filtered = filtered.filter((p: any) =>
                    p.id.toLowerCase().includes(lowerQuery) ||
                    (p.process_number && p.process_number.toString().includes(lowerQuery)) ||
                    p.name.toLowerCase().includes(lowerQuery) ||
                    p.activities?.name?.toLowerCase().includes(lowerQuery) ||
                    p.workflows?.name?.toLowerCase().includes(lowerQuery)
                );
            }

            setProcesses(filtered);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full relative transition-all duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                        <Search className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Buscar Trámites</h3>
                </div>

                {/* Search Input */}
                <div className="relative mb-3">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por ID, nombre, actividad o flujo..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-xs"
                    />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <select
                            value={selectedWorkflow}
                            onChange={(e) => setSelectedWorkflow(e.target.value)}
                            className="w-full pl-8 pr-4 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-[11px] appearance-none cursor-pointer"
                        >
                            <option value="">Todos los flujos</option>
                            {workflows.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full pl-8 pr-4 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-[11px] appearance-none cursor-pointer"
                        >
                            <option value="">Todos los estados</option>
                            <option value="active">Activos</option>
                            <option value="completed">Completados</option>
                        </select>
                    </div>
                </div>

                {/* Results Counter */}
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">
                        {loading ? 'Buscando...' : `${processes.length} resultado${processes.length !== 1 ? 's' : ''}`}
                    </span>
                    {(searchQuery || selectedWorkflow || selectedStatus) && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedWorkflow('');
                                setSelectedStatus('');
                            }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            {/* ERROR DISPLAY */}
            {error && (
                <div className="p-8 bg-rose-50 dark:bg-rose-900/20 rounded-3xl border border-rose-100 dark:border-rose-800 flex flex-col items-center text-center m-6">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-300">Error al cargar trámites</p>
                    <p className="text-xs text-rose-400 dark:text-rose-500">{error}</p>
                </div>
            )}

            {/* Results Table (Reusable Component) */}
            <ProcessTable
                processes={processes}
                loading={loading}
                onView={(id) => setViewingProcessId(id)}
                onAttend={(id) => onAttendTask(id)}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
            />

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
