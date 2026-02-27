import { useEffect } from 'react';
import {
    TrendingUp, Clock, Activity, CheckCircle2
} from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { TaskInbox } from './TaskInbox';
import { WorkloadMap } from './WorkloadMap';
import { cn } from '../utils/cn';

export function Dashboard({ onAction, refreshTrigger }: { onAction?: (action: string, data?: any) => void, refreshTrigger?: number }) {
    const { instancesActive, instancesCompleted, historyCount, loading, refresh: statsRefresh } = useDashboardStats();
    const { userEfficiency, topActivities, refresh: analyticsRefresh } = useDashboardAnalytics();

    const refreshAll = () => {
        statsRefresh();
        analyticsRefresh();
    };

    useEffect(() => {
        const interval = setInterval(() => {
            refreshAll();
        }, 30000);
        return () => clearInterval(interval);
    }, [statsRefresh, analyticsRefresh]);

    useEffect(() => {
        if (refreshTrigger && refreshTrigger > 0) {
            refreshAll();
        }
    }, [refreshTrigger, statsRefresh, analyticsRefresh]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800" />
                ))}
            </div>
        );
    }

    const formatTime = (hours: number) => {
        if (hours < 0.1) return Math.round(hours * 60) + 'm';
        return hours.toFixed(1) + 'h';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-700 pb-10">
            {/* Header / Summary Row - Very Compact */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <StatCard
                        label="En Curso"
                        value={instancesActive.toString()}
                        color="blue"
                        icon={Activity}
                    />
                    <StatCard
                        label="Finalizados"
                        value={instancesCompleted.toString()}
                        color="emerald"
                        icon={CheckCircle2}
                    />
                    <StatCard
                        label="Log Acciones"
                        value={historyCount.toString()}
                        color="purple"
                        icon={TrendingUp}
                    />
                </div>
            </div>

            {/* Bandeja de Entrada - Main Area */}
            <div className="w-full">
                <TaskInbox
                    onAttendTask={(id) => onAction?.('attend-task', id)}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* Bottom Widgets - Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                {/* Efficiency Widget */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">Mi Eficiencia en Atención</h3>
                    </div>

                    {userEfficiency.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {userEfficiency.map((wf) => (
                                <div
                                    key={wf.workflow_name}
                                    className="p-3 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-orange-500/20 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-1.5 min-w-0">
                                        <p className="text-[9px] font-black text-slate-500 truncate">{wf.workflow_name}</p>
                                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 rounded whitespace-nowrap">{wf.count}</span>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{formatTime(wf.avg_hours)}</p>
                                    <div className="mt-2 w-full h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-orange-500 rounded-full"
                                            style={{ width: `${Math.min(100, (wf.avg_hours / 48) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-xl">
                            <p className="text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">Sin datos históricos</p>
                        </div>
                    )}
                </div>

                {/* Workload Map Widget */}
                <WorkloadMap data={topActivities} />
            </div>
        </div>
    );
}

function StatCard({ label, value, color, icon: Icon = TrendingUp }: { label: string, value: string, color: 'blue' | 'orange' | 'emerald' | 'purple', icon?: any }) {
    const styles = {
        blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100/50 dark:border-blue-800/30",
        orange: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-100/50 dark:border-orange-800/30",
        emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100/50 dark:border-emerald-800/30",
        purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-100/50 dark:border-purple-800/30",
    }[color];

    return (
        <div className={cn(
            "flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-300",
            "bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 shadow-sm",
            "hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 group cursor-default"
        )}>
            <div className={cn("p-1.5 rounded-lg border transition-transform group-hover:scale-110", styles)}>
                <Icon className="w-3 h-3" />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{label}</p>
                <p className="text-base font-black text-slate-900 dark:text-white leading-none">{value}</p>
            </div>
        </div>
    );
}
