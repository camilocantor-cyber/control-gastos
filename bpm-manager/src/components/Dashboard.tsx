import { useEffect } from 'react';
import {
    TrendingUp, Clock, Activity, CheckCircle2
} from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { TaskInbox } from './TaskInbox';
import { WorkloadMap } from './WorkloadMap';
import { DashboardAIWidget } from './DashboardAIWidget';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

export function Dashboard({ onAction, refreshTrigger }: { onAction?: (action: string, data?: any) => void, refreshTrigger?: number }) {
    const { user } = useAuth();
    const currentRole = user?.available_organizations?.find((o: any) => o.id === user.organization_id)?.role || user?.role || 'viewer';
    const isViewer = currentRole === 'viewer';

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
        <div className="space-y-4 animate-in fade-in duration-700 pb-10">
            {/* Header / Summary Row - Very Compact */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-2">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-0">
                {/* Efficiency Widget */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-full">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">Mi Eficiencia</h3>
                    </div>

                    {userEfficiency.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {userEfficiency.map((wf) => (
                                <div
                                    key={wf.workflow_name}
                                    className="p-2.5 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-800/40 hover:border-orange-500/20 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-1 min-w-0">
                                        <p className="text-[8.5px] font-black text-slate-500 dark:text-slate-400 truncate max-w-[85%]">{wf.workflow_name}</p>
                                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 rounded whitespace-nowrap">{wf.count}</span>
                                    </div>
                                    <p className="text-[13px] font-black text-slate-900 dark:text-white leading-none">{formatTime(wf.avg_hours)}</p>
                                    <div className="mt-1.5 w-full h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
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
                {!isViewer && <WorkloadMap data={topActivities} />}
            </div>

            {/* AI Assistant Widget */}
            <DashboardAIWidget />
        </div>
    );
}

function StatCard({ label, value, color, icon: Icon = TrendingUp }: { label: string, value: string, color: 'blue' | 'orange' | 'emerald' | 'purple', icon?: any }) {
    const bars = {
        blue: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]",
        emerald: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
        purple: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]",
        orange: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]",
    }[color];

    const icons = {
        blue: "text-blue-500 dark:text-blue-400",
        emerald: "text-emerald-500 dark:text-emerald-400",
        purple: "text-purple-500 dark:text-purple-400",
        orange: "text-orange-500 dark:text-orange-400",
    }[color];

    return (
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-xl p-2.5 border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-xl dark:shadow-black/20 group hover:border-slate-200 dark:hover:bg-slate-800/60 transition-all cursor-default">
            <div className="flex items-center justify-between mb-1.5">
                <p className="text-[8px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    {label}
                    <span className="text-[10px] text-slate-900 dark:text-white">{value}</span>
                </p>
                <Icon className={cn("w-3 h-3", icons)} />
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-1000", bars)}
                    style={{ width: value !== '0' ? (label === 'En Curso' ? '65%' : label === 'Finalizados' ? '100%' : '45%') : '0%' }}
                />
            </div>
        </div>
    );
}
