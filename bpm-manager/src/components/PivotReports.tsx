import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { clsx } from 'clsx';
import {
    Table as TableIcon,
    ChevronLeft, ChevronRight, RefreshCw, Search,
    ArrowUpDown, Download
} from 'lucide-react';
import { toast } from 'sonner';

interface PivotField {
    name: string;
    label: string;
    type: string;
}

interface RowData {
    id: string;
    process_number: string;
    name: string;
    status: string;
    created_at: string;
    [key: string]: any;
}

export function PivotReports() {
    const { user } = useAuth();
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
    const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
    const [fields, setFields] = useState<PivotField[]>([]);
    const [rows, setRows] = useState<RowData[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        loadWorkflows();
    }, []);

    useEffect(() => {
        if (selectedWorkflow) {
            loadFields(selectedWorkflow);
        } else {
            setFields([]);
            setRows([]);
        }
    }, [selectedWorkflow]);

    async function loadWorkflows() {
        if (!user?.organization_id) return;
        const { data } = await supabase
            .from('workflows')
            .select('id, name')
            .eq('organization_id', user.organization_id)
            .order('name');
        if (data) setWorkflows(data);
    }

    async function loadFields(workflowId: string) {
        try {
            const { data: activities } = await supabase
                .from('activities')
                .select('id')
                .eq('workflow_id', workflowId);

            if (!activities || activities.length === 0) return;
            const activityIds = activities.map(a => a.id);

            const { data: fieldDefs } = await supabase
                .from('activity_field_definitions')
                .select('name, label, type')
                .in('activity_id', activityIds)
                .order('order_index');

            if (fieldDefs) {
                const uniqueFields: PivotField[] = [];
                const seen = new Set();
                fieldDefs.forEach(f => {
                    if (!seen.has(f.name)) {
                        uniqueFields.push(f);
                        seen.add(f.name);
                    }
                });
                setFields(uniqueFields);
            }
        } catch (err) {
            console.error('Error loading fields:', err);
        }
    }

    async function fetchData() {
        if (!selectedWorkflow) return;
        try {
            setLoading(true);
            
            // 1. Get Instances
            const { data: instances, error: insError } = await supabase
                .from('process_instances')
                .select('id, name, process_number, status, created_at')
                .eq('workflow_id', selectedWorkflow)
                .order('created_at', { ascending: false });

            if (insError) throw insError;

            // 2. Get Data
            const instanceIds = (instances || []).map(i => i.id);
            const { data: processData, error: dataError } = await supabase
                .from('process_data')
                .select('process_id, field_name, value')
                .in('process_id', instanceIds);

            if (dataError) throw dataError;

            // 3. Pivot Data
            const pivotedRows: RowData[] = (instances || []).map(inst => {
                const row: RowData = {
                    id: inst.id,
                    process_number: inst.process_number || `#${inst.id.slice(0, 8)}`,
                    name: inst.name || '—',
                    status: inst.status,
                    created_at: inst.created_at
                };

                const dataEntries = (processData || []).filter(d => d.process_id === inst.id);
                dataEntries.forEach(d => {
                    row[d.field_name] = d.value;
                });

                return row;
            });

            setRows(pivotedRows);
            setPage(1);
        } catch (err) {
            console.error('Error fetching pivot data:', err);
            toast.error('Error al cargar datos dinámicos');
        } finally {
            setLoading(false);
        }
    }

    const filteredAndSortedRows = useMemo(() => {
        let result = [...rows];
        
        // Filter
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(r => 
                Object.values(r).some(val => String(val).toLowerCase().includes(q))
            );
        }

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                const valA = a[sortConfig.key] || '';
                const valB = b[sortConfig.key] || '';
                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [rows, search, sortConfig]);

    const pageRows = filteredAndSortedRows.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(filteredAndSortedRows.length / pageSize);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc' ? { key, direction: 'desc' } : null;
            }
            return { key, direction: 'asc' };
        });
    };

    const exportToExcel = async () => {
        try {
            const xlsx = await import('xlsx');
            const headers = ['N° Proceso', 'Nombre', 'Estado', ...fields.map(f => f.label), 'Fecha Creación'];
            const data = filteredAndSortedRows.map(r => [
                r.process_number,
                r.name,
                r.status,
                ...fields.map(f => r[f.name] || ''),
                new Date(r.created_at).toLocaleDateString()
            ]);

            const ws = xlsx.utils.aoa_to_sheet([headers, ...data]);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Reporte Dinámico');
            xlsx.writeFile(wb, `Pivot_${selectedWorkflow.slice(0, 8)}_${new Date().getTime()}.xlsx`);
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Error al exportar');
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Control Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1.5 flex-1 min-w-[240px]">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleccionar Flujo</label>
                        <select 
                            value={selectedWorkflow}
                            onChange={(e) => setSelectedWorkflow(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">— Elegir un workflow —</option>
                            {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={fetchData}
                        disabled={!selectedWorkflow || loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 active:scale-95"
                    >
                        <RefreshCw className={clsx("w-3.5 h-3.5", loading && "animate-spin")} />
                        GENERAR TABLA
                    </button>

                    {rows.length > 0 && (
                        <button
                            onClick={exportToExcel}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[11px] font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none active:scale-95"
                        >
                            <Download className="w-3.5 h-3.5" />
                            EXCEL
                        </button>
                    )}
                </div>
            </div>

            {/* Results Table */}
            {rows.length > 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                    {/* Table Filters */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar en esta tabla..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-transparent focus:border-blue-500 rounded-xl text-xs font-bold outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filas:</span>
                             {[10, 25, 50, 100].map(size => (
                                 <button 
                                    key={size}
                                    onClick={() => setPageSize(size)}
                                    className={clsx(
                                        "px-2 py-1 rounded-lg text-[10px] font-black transition-all",
                                        pageSize === size ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                 >
                                     {size}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-950 text-white">
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('process_number')} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                            N° Proceso <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                        </button>
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest">
                                            Nombre <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                        </button>
                                    </th>
                                    {fields.map(f => (
                                        <th key={f.name} className="px-4 py-3 text-left">
                                            <button onClick={() => handleSort(f.name)} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                                                {f.label} <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                            </button>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Estado</th>
                                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest">Creado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {pageRows.map((row, idx) => (
                                    <tr key={row.id} className={clsx("hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors", idx % 2 === 1 ? 'bg-slate-50/30 dark:bg-white/5' : '')}>
                                        <td className="px-4 py-3 text-[10px] font-black text-blue-600 dark:text-blue-400 font-mono">{row.process_number}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{row.name}</td>
                                        {fields.map(f => (
                                            <td key={f.name} className="px-4 py-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                                                {row[f.name] || '—'}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                row.status === 'completed' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                            )}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-slate-400 tabular-nums">
                                            {new Date(row.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-slate-400">
                             Mostrando {pageRows.length} de {filteredAndSortedRows.length} registros
                         </span>
                         <div className="flex items-center gap-1">
                             <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 disabled:opacity-30"
                             >
                                 <ChevronLeft className="w-4 h-4" />
                             </button>
                             <div className="flex items-center px-4">
                                 <span className="text-[10px] font-black">PÁGINA {page} DE {totalPages || 1}</span>
                             </div>
                             <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || totalPages === 0}
                                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 disabled:opacity-30"
                             >
                                 <ChevronRight className="w-4 h-4" />
                             </button>
                         </div>
                    </div>
                </div>
            ) : !loading && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-20 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-4">
                        <TableIcon className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Generar Tabla Dinámica</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Selecciona un flujo arriba para cruzar toda la información capturada en una sola vista de tabla.</p>
                </div>
            )}
        </div>
    );
}
