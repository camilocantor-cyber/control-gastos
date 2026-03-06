import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, AlertCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProcessViewerModal } from './ProcessViewerModal';
import { ProcessTable } from './ProcessTable';
import { useAuth } from '../hooks/useAuth';
import { useExecution } from '../hooks/useExecution';

export function ProcessSearch({ onAttendTask }: { onAttendTask: (taskId: string) => void }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [processes, setProcesses] = useState<any[]>([]);
    const [workflows, setWorkflows] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [viewingProcessId, setViewingProcessId] = useState<string | null>(null);
    const { user } = useAuth();
    const { deleteProcessInstance } = useExecution();

    useEffect(() => {
        if (user) {
            loadWorkflows();
            loadUsers();
            loadProcesses();
        }
    }, [user]);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 when filters change
        loadProcesses();
    }, [searchQuery, selectedWorkflow, selectedStatus, selectedUser, dateFrom, dateTo]);

    async function loadWorkflows() {
        let query = supabase.from('workflows').select('id, name').order('name');
        if (user?.organization_id) {
            query = query.or(`organization_id.eq.${user.organization_id},is_public.eq.true`);
        } else {
            query = query.eq('is_public', true);
        }
        const { data } = await query;
        setWorkflows(data || []);
    }

    async function loadUsers() {
        if (!user?.organization_id) return;
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('organization_id', user.organization_id)
            .order('full_name');
        setUsers(data || []);
    }

    async function loadProcesses() {
        try {
            setLoading(true);
            setError('');

            let query = supabase
                .from('process_instances')
                .select('*, workflows(name), activities(name, type), profiles(full_name, email), process_data:process_data(count)')
                .order('created_at', { ascending: false });

            if (user?.organization_id) {
                query = query.eq('organization_id', user?.organization_id);
            }

            // Filter by workflow
            if (selectedWorkflow) {
                query = query.eq('workflow_id', selectedWorkflow);
            }

            // Filter by status
            if (selectedStatus) {
                query = query.eq('status', selectedStatus);
            }

            // Filter by user (creator)
            if (selectedUser) {
                query = query.eq('created_by', selectedUser);
            }

            // Filter by date range
            if (dateFrom) {
                query = query.gte('created_at', new Date(dateFrom).toISOString());
            }
            if (dateTo) {
                // Add 1 day so dateTo is inclusive
                const toDate = new Date(dateTo);
                toDate.setDate(toDate.getDate() + 1);
                query = query.lt('created_at', toDate.toISOString());
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            // Client-side search filter
            let filtered = data || [];
            if (searchQuery.trim()) {
                const lowerQuery = searchQuery.toLowerCase().replace(/^#/, '');
                filtered = filtered.filter((p: any) =>
                    p.id.toLowerCase().includes(lowerQuery) ||
                    (p.process_number && p.process_number.toString().padStart(8, '0').includes(lowerQuery)) ||
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

    async function handleToDelete(id: string) {
        const result = await deleteProcessInstance(id);
        if (result.success) {
            loadProcesses();
        } else {
            alert('Error al eliminar: ' + result.error);
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full relative transition-all duration-300">
            {/* Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                        <Search className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Buscar Trámites</h3>
                </div>

                {/* Search Input */}
                <div className="relative mb-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por ID, nombre, actividad o flujo..."
                        className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-xs"
                    />
                </div>

                {/* Filters Row 1: Flujo / Estado / Usuario */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
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

                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="w-full pl-8 pr-4 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-[11px] appearance-none cursor-pointer"
                        >
                            <option value="">Todos los usuarios</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filters Row 2: Date Range — una sola línea */}
                <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Desde</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo || undefined}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-[11px] cursor-pointer"
                    />
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Hasta</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom || undefined}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-[11px] cursor-pointer"
                    />
                    {(searchQuery || selectedWorkflow || selectedStatus || selectedUser || dateFrom || dateTo) && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedWorkflow('');
                                setSelectedStatus('');
                                setSelectedUser('');
                                setDateFrom('');
                                setDateTo('');
                            }}
                            className="text-[9px] font-black text-blue-600 hover:text-blue-700 transition-colors shrink-0 uppercase tracking-wider"
                        >
                            Limpiar
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
                searchQuery={searchQuery}
                onDelete={handleToDelete}
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
