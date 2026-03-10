import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { clsx } from 'clsx';
import { Columns, RefreshCw, Clock, AlertTriangle, CheckCircle2, Filter, ChevronDown, Inbox, ExternalLink } from 'lucide-react';

interface KanbanCard {
    id: string;
    name: string;
    workflow_name: string;
    created_at: string;
    current_activity_id: string;
    activity_name: string;
    due_date_hours?: number;
    status: 'on_time' | 'near_due' | 'overdue';
}

interface KanbanColumn {
    activity_id: string;
    activity_name: string;
    cards: KanbanCard[];
}

interface KanbanBoardProps {
    onOpenProcess?: (processId: string) => void;
}

export function KanbanBoard({ onOpenProcess }: KanbanBoardProps) {
    const { user } = useAuth();
    const [columns, setColumns] = useState<KanbanColumn[]>([]);
    const [loading, setLoading] = useState(true);
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
    const [showFilter, setShowFilter] = useState(false);

    useEffect(() => {
        loadWorkflows();
    }, []);

    useEffect(() => {
        loadKanbanData();
    }, [selectedWorkflowId]);

    async function loadWorkflows() {
        let q = supabase.from('workflows').select('id, name');
        if (user?.organization_id) q = q.eq('organization_id', user.organization_id);
        const { data } = await q;
        if (data) setWorkflows(data);
    }

    async function loadKanbanData() {
        try {
            setLoading(true);
            const now = new Date();

            // Fetch active process instances
            let q = supabase
                .from('process_instances')
                .select(`id, name, workflow_id, created_at, current_activity_id,
                    workflows(name),
                    activities!process_instances_current_activity_id_fkey(id, name, due_date_hours)
                `)
                .in('status', ['active', 'waiting']);

            if (user?.organization_id) q = q.eq('organization_id', user.organization_id);
            if (selectedWorkflowId) q = q.eq('workflow_id', selectedWorkflowId);

            const { data, error } = await q;
            if (error) throw error;

            // Build columns
            const colMap: Record<string, KanbanColumn> = {};

            (data || []).forEach((inst: any) => {
                const actId = inst.current_activity_id;
                const actName = inst.activities?.name || 'Sin Actividad';
                const dueHours = inst.activities?.due_date_hours || 24;
                const createdAt = new Date(inst.created_at);
                const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

                let status: KanbanCard['status'] = 'on_time';
                if (hoursElapsed > dueHours) status = 'overdue';
                else if ((dueHours - hoursElapsed) <= 4) status = 'near_due';

                if (!colMap[actId]) {
                    colMap[actId] = { activity_id: actId, activity_name: actName, cards: [] };
                }

                colMap[actId].cards.push({
                    id: inst.id,
                    name: inst.name || `Trámite #${inst.id.slice(0, 6)}`,
                    workflow_name: inst.workflows?.name || '',
                    created_at: inst.created_at,
                    current_activity_id: actId,
                    activity_name: actName,
                    due_date_hours: dueHours,
                    status,
                });
            });

            // Sort cards within each column: overdue first
            const orderedCols = Object.values(colMap).map(col => ({
                ...col,
                cards: col.cards.sort((a, b) => {
                    const order = { overdue: 0, near_due: 1, on_time: 2 };
                    return order[a.status] - order[b.status];
                })
            }));

            setColumns(orderedCols);
        } catch (err) {
            console.error('Error loading Kanban:', err);
        } finally {
            setLoading(false);
        }
    }

    const totalCards = columns.reduce((acc, col) => acc + col.cards.length, 0);
    const overdueCount = columns.reduce((acc, col) => acc + col.cards.filter(c => c.status === 'overdue').length, 0);

    return (
        <div className="animate-in fade-in duration-500 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-900 rounded-2xl shadow-lg shadow-blue-100 dark:shadow-none">
                        <Columns className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-blue-900 dark:text-white tracking-tight">Vista Kanban</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {totalCards} trámites activos
                            {overdueCount > 0 && <span className="ml-2 text-rose-600 font-black tracking-tighter">• {overdueCount} vencidos</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowFilter(!showFilter)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-black text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm"
                        >
                            <Filter className="w-3.5 h-3.5" />
                            {selectedWorkflowId ? workflows.find(w => w.id === selectedWorkflowId)?.name : 'Todos los Flujos'}
                            <ChevronDown className={clsx("w-3 h-3 transition-transform", showFilter && "rotate-180")} />
                        </button>
                        {showFilter && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-20">
                                    <button
                                        onClick={() => { setSelectedWorkflowId(''); setShowFilter(false); }}
                                        className={clsx("w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all", !selectedWorkflowId ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300")}
                                    >
                                        Todos los Flujos
                                    </button>
                                    {workflows.map(wf => (
                                        <button
                                            key={wf.id}
                                            onClick={() => { setSelectedWorkflowId(wf.id); setShowFilter(false); }}
                                            className={clsx("w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all", selectedWorkflowId === wf.id ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300")}
                                        >
                                            {wf.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <button
                        onClick={loadKanbanData}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm"
                    >
                        <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Vencido</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Por vencer (&lt;4h)</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> A tiempo</div>
            </div>

            {/* Board */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : columns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                        <Inbox className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">No hay trámites activos</p>
                    <p className="text-slate-300 text-xs mt-1">Cuando inicies procesos, aparecerán aquí organizados por actividad.</p>
                </div>
            ) : (
                <div className="flex gap-6 overflow-x-auto pb-6 pt-2 -mx-2 px-2 custom-scrollbar-horizontal select-none" style={{ minHeight: 'calc(100vh - 300px)' }}>
                    {columns.map(col => (
                        <div key={col.activity_id} className="flex-shrink-0 w-80 flex flex-col gap-4">
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-900" />
                                    <span className="text-[12px] font-black text-blue-900 dark:text-white uppercase tracking-tighter truncate max-w-[160px]">{col.activity_name}</span>
                                </div>
                                <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-400 text-[10px] font-black rounded-full border border-blue-100 dark:border-blue-800">
                                    {col.cards.length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex flex-col gap-2">
                                {col.cards.map(card => {
                                    const slaColors = {
                                        overdue: 'border-rose-400/30 bg-blue-900 shadow-rose-900/20',
                                        near_due: 'border-amber-400/30 bg-blue-900 shadow-amber-900/20',
                                        on_time: 'border-blue-800 bg-blue-900 shadow-blue-900/20',
                                    };
                                    const slaDot = {
                                        overdue: 'bg-rose-400',
                                        near_due: 'bg-amber-400',
                                        on_time: 'bg-emerald-400',
                                    };
                                    const slaIcon = {
                                        overdue: <AlertTriangle className="w-3 h-3 text-rose-400" />,
                                        near_due: <Clock className="w-3 h-3 text-amber-400" />,
                                        on_time: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
                                    };
                                    const hoursAgo = Math.floor((new Date().getTime() - new Date(card.created_at).getTime()) / (1000 * 60 * 60));

                                    return (
                                        <div
                                            key={card.id}
                                            onClick={() => onOpenProcess?.(card.id)}
                                            className={clsx(
                                                "p-4 rounded-2xl border shadow-lg transition-all group cursor-pointer hover:shadow-xl hover:-translate-y-1 active:scale-[0.98]",
                                                slaColors[card.status]
                                            )}
                                        >
                                            <div className="flex items-start justify-between mb-2.5">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse", slaDot[card.status])} />
                                                    <span className="text-[8px] font-black text-blue-300 uppercase tracking-[0.15em]">{card.workflow_name}</span>
                                                </div>
                                                <ExternalLink className="w-3 h-3 text-blue-400/50 group-hover:text-white transition-colors flex-shrink-0" />
                                            </div>
                                            <p className="text-xs font-bold text-white leading-tight mb-3 line-clamp-2">{card.name}</p>
                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/20">
                                                    {slaIcon[card.status]}
                                                    <span className={clsx(
                                                        "text-[8px] font-black uppercase tracking-wider",
                                                        card.status === 'overdue' ? 'text-rose-400' :
                                                            card.status === 'near_due' ? 'text-amber-400' : 'text-emerald-400'
                                                    )}>
                                                        {card.status === 'overdue' ? `${hoursAgo - (card.due_date_hours || 0)}h` :
                                                            card.status === 'near_due' ? `Pronto` : 'OK'}
                                                    </span>
                                                </div>
                                                <span className="text-[8px] font-bold text-blue-400/60 uppercase tracking-tighter">{hoursAgo}H ATRÁS</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
