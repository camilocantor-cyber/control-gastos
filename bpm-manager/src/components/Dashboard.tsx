import { useEffect } from 'react';
import {
    Clock
} from 'lucide-react';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { TaskInbox } from './TaskInbox';
import { DashboardAIWidget } from './DashboardAIWidget';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

export function Dashboard({ onAction, refreshTrigger }: { onAction?: (action: string, data?: any) => void, refreshTrigger?: number }) {
    const { user } = useAuth();
    const currentRole = user?.available_organizations?.find((o: any) => o.id === user.organization_id)?.role || user?.role || 'viewer';
    const isViewer = currentRole === 'viewer';
    const isTurista = currentRole === 'turista';

    const { instancesActive, instancesCompleted, loading, refresh: statsRefresh } = useDashboardStats();
    const { userEfficiency, refresh: analyticsRefresh } = useDashboardAnalytics();

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

    // Turista view is ultra-minimalist
    if (isTurista) {
        return (
            <div className="space-y-6 animate-in fade-in duration-700 pb-10 max-w-5xl mx-auto">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl mb-8">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-2">Mis Pendientes</h2>
                    <p className="text-blue-100 text-sm opacity-80">Gestiona tus actividades asignadas de forma rápida.</p>
                </div>
                <TaskInbox
                    onAttendTask={(id) => onAction?.('attend-task', id)}
                    onViewProcess={(id) => onAction?.('view-process', id)}
                    refreshTrigger={refreshTrigger}
                />
            </div>
        );
    }

    const currentOrg = user?.available_organizations?.find((o: any) => o.id === user.organization_id);
    const logoUrl = currentOrg?.logo_url;

    return (
        <div className={cn(
            "space-y-4 animate-in fade-in duration-700 pb-10 relative min-h-[500px]",
            isViewer && "space-y-2"
        )}>
            {/* Logo Marca de Agua */}
            {logoUrl && (
                <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 opacity-[0.03] dark:opacity-[0.05] grayscale select-none mix-blend-multiply dark:mix-blend-overlay">
                    <img
                        src={logoUrl}
                        alt="Watermark"
                        className="w-[80vw] max-w-[1000px] object-contain rotate-[-15deg] transition-opacity duration-1000"
                    />
                </div>
            )}

            <div className="relative z-10 space-y-4">
                {user?.dashboard_widgets?.map((widgetId) => {
                    switch (widgetId) {
                        case 'inbox':
                            return (
                                <div key="inbox" className="w-full">
                                    <TaskInbox
                                        onAttendTask={(id) => onAction?.('attend-task', id)}
                                        onViewProcess={(id) => onAction?.('view-process', id)}
                                        refreshTrigger={refreshTrigger}
                                        instancesActive={instancesActive}
                                        instancesCompleted={instancesCompleted}
                                    />
                                </div>
                            );

                        case 'efficiency':
                            return (
                                <div key="efficiency" className="pb-0">
                                    <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-full">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                            <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">Mi Eficiencia</h3>
                                        </div>

                                        {userEfficiency.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                                            <div className="h-[120px] flex flex-col items-center justify-center border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-xl">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">Sin datos históricos</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );

                        case 'ai':
                            return <DashboardAIWidget key="ai" />;

                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
}
