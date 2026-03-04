import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { TaskInbox } from './TaskInbox';
import { Calendar as CalendarView } from './Calendar';
import { ProcessSearch } from './ProcessSearch';
import { StartProcessModal } from './StartProcessModal';
import { LogOut, Calendar, Inbox, Moon, Sun, User as UserIcon, Building2, Search, Activity, CheckCircle2, TrendingUp, Plus, BarChart3 } from 'lucide-react';
import { ProcessExecution } from './ProcessExecution';
import { useDashboardStats } from '../hooks/useDashboardStats';
import clsx from 'clsx';
import { useEffect } from 'react';

function NavButton({ active, onClick, icon: Icon, label, color }: { active: boolean, onClick: () => void, icon: any, label: string, color: 'blue' | 'emerald' | 'indigo' }) {
    const colors = {
        blue: active ? "text-blue-600 bg-blue-50 dark:bg-blue-400/20 dark:text-blue-300" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 dark:text-slate-400 dark:hover:text-blue-300",
        emerald: active ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-400/20 dark:text-emerald-300" : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300",
        indigo: active ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-400/20 dark:text-indigo-300" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:text-slate-400 dark:hover:text-indigo-300",
    };

    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                colors[color]
            )}
        >
            <Icon className={clsx("w-3.5 h-3.5", active && "fill-current/10")} />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
}

export function SelfServicePortal() {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'inbox' | 'calendar' | 'search'>('inbox');
    const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
    const [showStartProcess, setShowStartProcess] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const { instancesActive, instancesCompleted, historyCount } = useDashboardStats();
    const currentOrgName = user?.available_organizations?.find(o => o.id === user.organization_id)?.name || 'BPM FLOW';

    useEffect(() => {
        // Initialize theme from localStorage or system preference
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);

        if (isDark) {
            document.documentElement.classList.add('dark');
            setIsDarkMode(true);
        } else {
            document.documentElement.classList.remove('dark');
            setIsDarkMode(false);
        }
    }, []);

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);

        if (newMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    if (executingTaskId) {
        return (
            <ProcessExecution
                processId={executingTaskId}
                onClose={() => setExecutingTaskId(null)}
                onComplete={() => {
                    setExecutingTaskId(null);
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#030712] flex flex-col font-sans transition-colors duration-500 text-slate-900 dark:text-slate-100">
            {/* Header Mvil / Desktop integrated */}
            <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#030712]/90 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-4 py-2 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-xl text-white font-black text-base shadow-md shadow-blue-500/10 flex-shrink-0">
                            {user?.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col min-w-0 mr-2">
                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest leading-none mb-0.5 truncate">
                                {currentOrgName}
                            </span>
                            <h1 className="text-[11px] font-black text-slate-900 dark:text-white leading-none truncate">
                                {user?.name || 'Empleado'}
                            </h1>
                        </div>

                        {/* Navigation integrated next to name */}
                        <div className="hidden sm:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/40 p-1 rounded-xl border border-transparent dark:border-slate-800/50">
                            <NavButton active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={Inbox} label="Trámites" color="blue" />
                            <NavButton active={activeTab === 'search'} onClick={() => setActiveTab('search')} icon={Search} label="Buscar" color="emerald" />
                            <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={Calendar} label="Calendario" color="indigo" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Mobile view navigation (Icons only if very narrow) */}
                        <div className="flex sm:hidden items-center gap-1">
                            <button onClick={() => setActiveTab('inbox')} className={clsx("p-2 rounded-lg transition-colors", activeTab === 'inbox' ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-slate-400")}>
                                <Inbox className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActiveTab('search')} className={clsx("p-2 rounded-lg transition-colors", activeTab === 'search' ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30" : "text-slate-400")}>
                                <Search className="w-4 h-4" />
                            </button>
                            <button onClick={() => setActiveTab('calendar')} className={clsx("p-2 rounded-lg transition-colors", activeTab === 'calendar' ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30" : "text-slate-400")}>
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={() => setShowStartProcess(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                            title="Iniciar Nuevo Trámite"
                        >
                            <Plus className="w-4 h-4" />
                        </button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                        <button
                            onClick={toggleTheme}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={signOut}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="flex-1 overflow-x-hidden p-4">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Tarjeta de Saludo */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-xl font-black mb-1">Hola, {user?.name?.split(' ')[0] || 'allí'} 👋</h2>
                            <p className="text-sm text-blue-100 font-medium">Aquí tienes todo lo que necesitas para tu jornada.</p>

                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 shadow-lg shadow-black/20 group hover:bg-white/20 transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[8px] font-black text-blue-50 uppercase tracking-widest">En Curso {instancesActive}</p>
                                        <Activity className="w-3 h-3 text-blue-300 dark:text-blue-200" />
                                    </div>
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 w-2/3 shadow-[0_0_12px_rgba(96,165,250,0.4)]" />
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 shadow-lg shadow-black/20 group hover:bg-white/20 transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[8px] font-black text-blue-50 uppercase tracking-widest">Finalizados {instancesCompleted}</p>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-300 dark:text-emerald-200" />
                                    </div>
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400 w-full shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 shadow-lg shadow-black/20 group hover:bg-white/20 transition-all">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[8px] font-black text-blue-50 uppercase tracking-widest">Acciones {historyCount}</p>
                                        <TrendingUp className="w-3 h-3 text-purple-300 dark:text-purple-200" />
                                    </div>
                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-400 w-1/2 shadow-[0_0_12px_rgba(192,132,252,0.4)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-indigo-900/40 rounded-full blur-2xl"></div>
                    </div>

                    {/* Vistas */}
                    <div className="w-full">
                        {activeTab === 'inbox' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Mis Tareas Pendientes</h3>
                                <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-xl shadow-black/5 dark:shadow-black/20 border border-slate-100 dark:border-white/5 p-1 overflow-hidden">
                                    <TaskInbox
                                        onAttendTask={(id) => setExecutingTaskId(id)}
                                        refreshTrigger={refreshTrigger}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'calendar' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-[#0f172a] rounded-3xl p-4 shadow-xl shadow-black/20 border border-slate-100 dark:border-white/5">
                                <CalendarView />
                            </div>
                        )}

                        {activeTab === 'search' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Búsqueda de Trámites</h3>
                                <div className="bg-white dark:bg-[#0f172a] rounded-3xl shadow-xl shadow-black/20 border border-slate-100 dark:border-white/5 p-2 min-h-[500px] overflow-hidden">
                                    <ProcessSearch onAttendTask={(id) => setExecutingTaskId(id)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {showStartProcess && (
                <StartProcessModal
                    onClose={() => setShowStartProcess(false)}
                    onStarted={() => {
                        setShowStartProcess(false);
                        setRefreshTrigger(prev => prev + 1);
                    }}
                />
            )}
        </div>
    );
}
