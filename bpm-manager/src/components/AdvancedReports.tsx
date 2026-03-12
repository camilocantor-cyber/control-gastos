import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { clsx } from 'clsx';
import {
    FileSpreadsheet, Filter,
    ChevronLeft, ChevronRight, RefreshCw, X, Search, FileText, CheckCircle2,
    Clock, AlertCircle, XCircle, Calendar, Eye
} from 'lucide-react';

interface ReportRow {
    id: string;
    process_number: string;
    name: string;
    workflow_name: string;
    activity_name: string;
    status: string;
    assigned_to: string;
    department: string;
    created_at: string;
    metadata?: Record<string, string>;
    detail_rows?: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    active: { label: 'Activo', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock },
    waiting: { label: 'En espera', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertCircle },
    completed: { label: 'Completado', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2 },
    cancelled: { label: 'Cancelado', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 dark:text-rose-400', icon: XCircle },
};

const PAGE_SIZES = [25, 50, 100];

export function AdvancedReports() {
    const { user } = useAuth();
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

    // Filters
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedWorkflow, setSelectedWorkflow] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [search, setSearch] = useState('');
    const [metadataSearch, setMetadataSearch] = useState('');
    const [showFilters, setShowFilters] = useState(true);
    const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null);

    // Pagination
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    // Export state
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        loadMetadata();
    }, []);

    async function loadMetadata() {
        if (!user?.organization_id) return;
        const [wfRes, deptRes, usersRes] = await Promise.all([
            supabase.from('workflows').select('id, name').eq('organization_id', user.organization_id),
            supabase.from('departments').select('id, name').eq('organization_id', user.organization_id),
            supabase.from('profiles').select('id, full_name, email').eq('organization_id', user.organization_id),
        ]);
        if (wfRes.data) setWorkflows(wfRes.data);
        if (deptRes.data) setDepartments(deptRes.data);
        if (usersRes.data) setUsers(usersRes.data.map(u => ({ id: u.id, name: u.full_name || u.email })));
    }

    async function fetchData() {
        try {
            setLoading(true);
            setPage(1);

            let q = supabase
                .from('process_instances')
                .select(`
                    id, name, status, created_at, workflow_id, process_number,
                    workflows(name),
                    activities!process_instances_current_activity_id_fkey(name, assigned_department_id, departments(name)),
                    profiles!process_instances_assigned_user_id_fkey(full_name, email),
                    process_data(field_name, value),
                    process_detail_rows(data)
                `)
                .order('created_at', { ascending: false })
                .limit(500);

            if (user?.organization_id) q = q.eq('organization_id', user.organization_id);
            if (selectedWorkflow) q = q.eq('workflow_id', selectedWorkflow);
            if (selectedStatus) q = q.eq('status', selectedStatus);
            if (dateFrom) q = q.gte('created_at', dateFrom);
            if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
            if (selectedUser) q = q.eq('assigned_user_id', selectedUser);

            const { data, error } = await q;
            if (error) throw error;

            let mapped: ReportRow[] = (data || []).map((row: any) => {
                const metadata: Record<string, string> = {};
                row.process_data?.forEach((d: any) => {
                    metadata[d.field_name] = d.value;
                });

                return {
                    id: row.id,
                    process_number: row.process_number || `#${row.id.slice(0, 8)}`,
                    name: row.name || '—',
                    workflow_name: row.workflows?.name || '—',
                    activity_name: row.activities?.name || (row.status === 'completed' ? 'Finalizado' : '—'),
                    status: row.status,
                    assigned_to: row.profiles?.full_name || row.profiles?.email || 'Sin asignar',
                    department: row.activities?.departments?.name || '—',
                    created_at: row.created_at,
                    metadata: metadata,
                    detail_rows: row.process_detail_rows || []
                };
            });

            // Client-side filters
            if (selectedDept) {
                const rawWithDept = (data || []) as any[];
                mapped = mapped.filter(r => {
                    const rawRow = rawWithDept.find((d: any) => d.id === r.id);
                    return rawRow?.activities?.assigned_department_id === selectedDept;
                });
            }

            setRows(mapped);
        } catch (err) {
            console.error('Error fetching advanced reports:', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredRows = useMemo(() => {
        const q = search.toLowerCase().trim();
        const ms = metadataSearch.toLowerCase().trim();

        return rows.filter(r => {
            // 1. Priority: Deep Search from Filter Panel
            if (ms) {
                const inMetadata = r.metadata && Object.values(r.metadata).some(val =>
                    String(val).toLowerCase().includes(ms)
                );
                const inDetailRows = r.detail_rows && r.detail_rows.some(dr =>
                    JSON.stringify(dr.data).toLowerCase().includes(ms)
                );
                
                if (!inMetadata && !inDetailRows) return false;
            }

            // 2. Secondary: General Search (search bar)
            if (!q) return true;

            const matchesBasic = (r.process_number || '').toLowerCase().includes(q) ||
                r.name.toLowerCase().includes(q) ||
                r.workflow_name.toLowerCase().includes(q) ||
                r.assigned_to.toLowerCase().includes(q) ||
                r.activity_name.toLowerCase().includes(q);

            if (matchesBasic) return true;

            // Also search in metadata/details with the general search but only if matchesBasic is false
            const inMetadataGen = r.metadata && Object.values(r.metadata).some(val =>
                String(val).toLowerCase().includes(q)
            );
            if (inMetadataGen) return true;

            const inDetailRowsGen = r.detail_rows && r.detail_rows.some(dr =>
                JSON.stringify(dr.data).toLowerCase().includes(q)
            );
            if (inDetailRowsGen) return true;

            return false;
        });
    }, [rows, search, metadataSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    const pageRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

    async function exportToExcel() {
        try {
            setExporting(true);
            const xlsx = await import('xlsx');
            const wsData = [
                ['N° Proceso', 'Nombre', 'Flujo', 'Actividad Actual', 'Estado', 'Asignado a', 'Departamento', 'Fecha Creación'],
                ...filteredRows.map(r => [
                    r.id.slice(0, 8),
                    r.name,
                    r.workflow_name,
                    r.activity_name,
                    STATUS_CONFIG[r.status]?.label || r.status,
                    r.assigned_to,
                    r.department,
                    new Date(r.created_at).toLocaleDateString('es-CO'),
                ])
            ];
            const ws = xlsx.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [8, 30, 20, 20, 12, 20, 18, 14].map(w => ({ wch: w }));
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Reporte');
            xlsx.writeFile(wb, `reporte_avanzado_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) {
            console.error('Error exporting to Excel:', err);
        } finally {
            setExporting(false);
        }
    }

    function exportToPDF() {
        const printContent = `
            <html><head><title>Reporte Avanzado BPM</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                h1 { font-size: 18px; margin-bottom: 4px; }
                p { color: #64748b; font-size: 10px; margin-bottom: 16px; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #0f172a; color: white; padding: 8px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; }
                td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
                tr:nth-child(even) td { background: #f8fafc; }
                .status { padding: 2px 6px; border-radius: 20px; font-size: 9px; font-weight: bold; }
            </style></head><body>
            <h1>Reportes Avanzados</h1>
            <p>Generado: ${new Date().toLocaleString('es-CO')} · ${filteredRows.length} registros</p>
            <table>
                <thead><tr><th>N° Proceso</th><th>Nombre</th><th>Flujo</th><th>Actividad</th><th>Estado</th><th>Asignado a</th><th>Fecha</th></tr></thead>
                <tbody>
                    ${filteredRows.map(r => `
                        <tr>
                            <td>${r.id.slice(0, 8)}</td>
                            <td>${r.name}</td>
                            <td>${r.workflow_name}</td>
                            <td>${r.activity_name}</td>
                            <td>${STATUS_CONFIG[r.status]?.label || r.status}</td>
                            <td>${r.assigned_to}</td>
                            <td>${new Date(r.created_at).toLocaleDateString('es-CO')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            </body></html>
        `;
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(printContent);
            win.document.close();
            setTimeout(() => win.print(), 500);
        }
    }

    const resetFilters = () => {
        setDateFrom(''); setDateTo(''); setSelectedWorkflow('');
        setSelectedStatus(''); setSelectedDept(''); setSelectedUser('');
        setMetadataSearch(''); setSearch(''); setRows([]);
    };

    const activeFiltersCount = [dateFrom, dateTo, selectedWorkflow, selectedStatus, selectedDept, selectedUser, metadataSearch].filter(Boolean).length;

    return (
        <div className="animate-in fade-in duration-500 space-y-4 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Reportes Avanzados</h2>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                            {filteredRows.length} registros {rows.length !== filteredRows.length && `(filtrado de ${rows.length})`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={clsx("flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[11px] font-black transition-all shadow-sm",
                            showFilters ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filtros {activeFiltersCount > 0 && <span className="bg-white/30 text-white px-1.5 py-0.5 rounded-full text-[9px]">{activeFiltersCount}</span>}
                    </button>
                    {rows.length > 0 && (
                        <>
                            <button
                                onClick={exportToExcel}
                                disabled={exporting}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-60"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                {exporting ? 'Exportando…' : 'Excel'}
                            </button>
                            <button
                                onClick={exportToPDF}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[11px] font-black hover:bg-slate-700 transition-all shadow-sm"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                PDF
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 font-bold" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasta</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 font-bold" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flujo de Trabajo</label>
                            <select value={selectedWorkflow} onChange={e => setSelectedWorkflow(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer">
                                <option value="">Todos</option>
                                {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer">
                                <option value="">Todos</option>
                                {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Departamento</label>
                            <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer">
                                <option value="">Todos</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asignado a</label>
                            <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer">
                                <option value="">Todos</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Búsqueda en Metadata / Detalles (Deep Search)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                <input 
                                    type="text" 
                                    value={metadataSearch} 
                                    onChange={e => setMetadataSearch(e.target.value)}
                                    placeholder="Ej: materia19, delta, nit, observación técnica..."
                                    className="w-full pl-9 pr-3 py-2 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-100 outline-none focus:border-blue-500 font-bold placeholder:text-slate-400" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 disabled:opacity-60"
                        >
                            <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
                            {loading ? 'Cargando...' : 'Aplicar Filtros'}
                        </button>
                        {activeFiltersCount > 0 && (
                            <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-black text-slate-500 hover:text-rose-500 transition-colors">
                                <X className="w-3.5 h-3.5" /> Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Search + Page size */}
            {rows.length > 0 && (
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Buscar en resultados..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 font-bold placeholder:text-slate-400 placeholder:font-normal"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filas:</span>
                        <div className="flex gap-1">
                            {PAGE_SIZES.map(s => (
                                <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                                    className={clsx("px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                        pageSize === s ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-blue-300"
                                    )}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            {rows.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#020617] text-white">
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">N° Proceso</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Nombre</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Flujo</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Actividad</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Estado</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Detalles</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Asignado a</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Depto.</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Creado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {pageRows.map((row, i) => {
                                    const sc = STATUS_CONFIG[row.status] || STATUS_CONFIG.active;
                                    const Icon = sc.icon;
                                    return (
                                        <tr key={row.id} 
                                            onClick={() => setSelectedRow(row)}
                                            className={clsx("hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors cursor-pointer group", i % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-950/40')}>
                                            <td className="px-4 py-3 text-[10px] font-black text-blue-600 dark:text-blue-400 font-mono group-hover:underline">
                                                {row.process_number}
                                            </td>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">{row.name}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[150px] truncate">{row.workflow_name}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-[150px] truncate">{row.activity_name}</td>
                                            <td className="px-4 py-3">
                                                <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black", sc.color)}>
                                                    <Icon className="w-2.5 h-2.5" />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedRow(row); }}
                                                    className="inline-flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg"
                                                >
                                                    <Eye className="w-3 h-3" /> Ver Todo
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{row.assigned_to}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{row.department}</td>
                                            <td className="px-4 py-3 text-[10px] text-slate-400 whitespace-nowrap">{new Date(row.created_at).toLocaleDateString('es-CO')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <span className="text-[10px] text-slate-400 font-bold">
                            Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} de {filteredRows.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all bg-white dark:bg-slate-900">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                                return (
                                    <button key={p} onClick={() => setPage(p)}
                                        className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-black transition-all",
                                            p === page ? "bg-blue-600 text-white" : "border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-blue-300 bg-white dark:bg-slate-900"
                                        )}>
                                        {p}
                                    </button>
                                );
                            })}
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all bg-white dark:bg-slate-900">
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : !loading && (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                        <FileSpreadsheet className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">Configura los filtros y presiona "Aplicar Filtros"</p>
                    <p className="text-slate-300 text-xs mt-1">Los resultados aparecerán aquí con soporte de exportación a Excel y PDF.</p>
                </div>
            )}

            {/* Metadata Modal */}
            {selectedRow && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#0d111d] w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-none">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedRow.process_number}</h3>
                                        <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest", STATUS_CONFIG[selectedRow.status]?.color)}>
                                            {STATUS_CONFIG[selectedRow.status]?.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 font-bold mt-0.5">{selectedRow.workflow_name} · {selectedRow.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRow(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Captured Fields */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                        Campos del Formulario
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        {Object.entries(selectedRow.metadata || {}).length > 0 ? (
                                            Object.entries(selectedRow.metadata || {}).map(([key, value]) => (
                                                <div key={key} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/60 transition-colors hover:border-blue-200 dark:hover:border-blue-800/40">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{key}</p>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 break-words">{value || '—'}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No hay datos de formulario registrados.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Detail Tables */}
                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-current rounded-full" />
                                        Tablas de Detalles
                                    </h4>
                                    {selectedRow.detail_rows && selectedRow.detail_rows.length > 0 ? (
                                        <div className="space-y-4">
                                            {selectedRow.detail_rows.map((dr, idx) => (
                                                <div key={idx} className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                                                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">Registro #{idx + 1}</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {Object.entries(dr.data || {}).map(([k, v]) => (
                                                            <div key={k} className="flex justify-between items-start gap-4 text-xs py-1.5 border-b border-emerald-100/30 dark:border-emerald-800/20 last:border-0">
                                                                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0">{k}:</span>
                                                                <span className="text-slate-700 dark:text-slate-300 text-right font-medium">{String(v)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No hay registros en carpetas de detalles.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button 
                                onClick={() => setSelectedRow(null)}
                                className="px-8 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                            >
                                Cerrar Detalle
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
