import { useState, useEffect } from 'react';
import { X, Maximize, Network } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Activity, Transition } from '../types';
import { HistoryDetailModal } from './HistoryDetailModal';
import { FlowCanvas } from './FlowCanvas';

interface ProcessViewerModalProps {
    processId: string;
    onClose: () => void;
}

interface ProcessExecutionState {
    executedActivityIds: Set<string>;
    currentActivityId: string | null;
    status: 'active' | 'completed';
}

export function ProcessViewerModal({ processId, onClose }: ProcessViewerModalProps) {
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [workflowName, setWorkflowName] = useState('');
    const [processNumber, setProcessNumber] = useState<number | null>(null);
    const [executionState, setExecutionState] = useState<ProcessExecutionState>({
        executedActivityIds: new Set(),
        currentActivityId: null,
        status: 'active'
    });

    // History Data for Click Details
    const [historyLog, setHistoryLog] = useState<any[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);

    // Canvas state (passed to FlowCanvas)
    const [zoom, setZoom] = useState(0.75);
    const [offset, setOffset] = useState({ x: 60, y: 40 });

    useEffect(() => {
        loadProcessData();
    }, [processId]);

    async function loadProcessData() {
        try {
            setLoading(true);

            const { data: process, error: processError } = await supabase
                .from('process_instances')
                .select('process_number, workflow_id, current_activity_id, status, workflows(name)')
                .eq('id', processId)
                .single();

            if (processError) throw processError;

            const workflowData = process.workflows as any;
            const wfName = Array.isArray(workflowData) ? workflowData[0]?.name : workflowData?.name;
            setWorkflowName(wfName || 'Proceso');
            setProcessNumber(process.process_number);

            const [activitiesResult, transitionsResult] = await Promise.all([
                supabase.from('activities').select('*').eq('workflow_id', process.workflow_id),
                supabase.from('transitions').select('*').eq('workflow_id', process.workflow_id)
            ]);

            if (activitiesResult.error) throw activitiesResult.error;
            if (transitionsResult.error) throw transitionsResult.error;

            setActivities(activitiesResult.data || []);
            setTransitions(transitionsResult.data || []);

            const { data: history, error: historyError } = await supabase
                .from('process_history')
                .select('*, activities(name), profiles(full_name, email)')
                .eq('process_id', processId)
                .order('created_at', { ascending: false });

            if (historyError) throw historyError;
            setHistoryLog(history || []);

            const executedIds = new Set(history?.map((h: any) => h.activity_id) || []);
            setExecutionState({
                executedActivityIds: executedIds,
                currentActivityId: process.current_activity_id,
                status: process.status
            });

        } catch (error) {
            console.error('Error loading process visualization:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleNodeClick(activityId: string) {
        const historyItem = historyLog.find((h: any) => h.activity_id === activityId);
        if (historyItem) {
            try {
                const { data: dataFields } = await supabase
                    .from('process_data')
                    .select('*')
                    .eq('process_id', processId)
                    .eq('activity_id', activityId);

                const { data: activityFields } = await supabase
                    .from('activity_field_definitions')
                    .select('*')
                    .eq('activity_id', activityId)
                    .order('order_index', { ascending: true, nullsFirst: false });

                setSelectedHistoryItem({
                    ...historyItem,
                    fields: activityFields || [],
                    data: dataFields || []
                });
            } catch (err) {
                console.error("Error loading history details", err);
            }
        }
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 flex flex-col items-center animate-in zoom-in-95 shadow-2xl border border-white/10 dark:border-slate-800">
                    <div className="relative w-16 h-16 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                    </div>
                    <p className="text-slate-900 dark:text-white font-black text-lg">Preparando Vista</p>
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-xs mt-1">Cargando la estructura del proceso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] w-full max-w-7xl h-[90vh] flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden relative border border-white/10 dark:border-slate-800">

                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 backdrop-blur-xl z-10 transition-colors">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/20">
                            <Network className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none">{workflowName}</h2>
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">
                                    #{processNumber ? processNumber.toString().padStart(8, '0') : processId.split('-')[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Mapa de Navegación</span>
                                <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                {executionState.status === 'completed' ? (
                                    <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-800">Finalizado</span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">En Ejecución</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setZoom(0.75); setOffset({ x: 60, y: 40 }); }}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-slate-100 dark:border-slate-700"
                            title="Centrar Vista"
                        >
                            <Maximize className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 dark:border-slate-700 active:scale-95"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Canvas — reusing FlowCanvas with same styles as WorkflowBuilder */}
                <div className="flex-1 flex overflow-hidden">
                    <FlowCanvas
                        activities={activities}
                        transitions={transitions}
                        zoom={zoom}
                        setZoom={setZoom}
                        offset={offset}
                        setOffset={setOffset}
                        isReadOnly={true}
                        executionState={executionState}
                        onNodeClick={handleNodeClick}
                        gridSize={20}
                    />
                </div>

                {/* Legend */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-xl z-20">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Activo Ahora</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Ejecutado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-200 dark:bg-slate-700 border border-blue-300 dark:border-slate-600"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pendiente</span>
                    </div>
                </div>

            </div>

            {/* History Details Modal */}
            {selectedHistoryItem && (
                <HistoryDetailModal
                    item={selectedHistoryItem}
                    onClose={() => setSelectedHistoryItem(null)}
                />
            )}
        </div>
    );
}
