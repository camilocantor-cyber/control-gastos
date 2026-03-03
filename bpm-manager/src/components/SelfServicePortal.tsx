import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { TaskInbox } from './TaskInbox';
import { Calendar as CalendarView } from './Calendar';
import { LogOut, Calendar, Inbox, Moon, Sun, User as UserIcon } from 'lucide-react';
import { ProcessExecution } from './ProcessExecution';
import clsx from 'clsx';
import { useEffect } from 'react';

export function SelfServicePortal() {
    const { user, signOut } = useAuth();
    const [activeTab, setActiveTab] = useState<'inbox' | 'calendar'>('inbox');
    const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        setIsDarkMode(isDark);
    }, []);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        if (isDarkMode) {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        } else {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
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
        <div className="min-h-screen bg-slate-50 dark:bg-[#080a14] flex flex-col font-sans transition-colors duration-300">
            {/* Header Mvil */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-4 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
                        {user?.name?.charAt(0) || <UserIcon className="w-5 h-5" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Mi Portal</span>
                        <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                            {user?.name || 'Empleado'}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={signOut}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="flex-1 overflow-x-hidden p-4 pb-24">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Tarjeta de Saludo */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-xl font-black mb-1">Hola, {user?.name?.split(' ')[0] || 'allí'} 👋</h2>
                            <p className="text-sm text-blue-100 font-medium">Aquí tienes todo lo que necesitas para tu jornada.</p>
                        </div>
                        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-indigo-900/40 rounded-full blur-xl"></div>
                    </div>

                    {/* Vistas */}
                    <div className="w-full">
                        {activeTab === 'inbox' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Mis Tareas Pendientes</h3>
                                <TaskInbox
                                    onAttendTask={(id) => setExecutingTaskId(id)}
                                    refreshTrigger={refreshTrigger}
                                />
                            </div>
                        )}

                        {activeTab === 'calendar' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                                <CalendarView />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Bottom Navigation (Mobile First) */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-6 py-3 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-none">
                <div className="max-w-md mx-auto flex items-center justify-around gap-4">
                    <button
                        onClick={() => setActiveTab('inbox')}
                        className={clsx(
                            "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all w-24",
                            activeTab === 'inbox'
                                ? "text-blue-600 scale-110"
                                : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                    >
                        <div className={clsx(
                            "p-2 rounded-xl transition-colors",
                            activeTab === 'inbox' ? "bg-blue-50 dark:bg-blue-500/10" : "bg-transparent"
                        )}>
                            <Inbox className={clsx("w-6 h-6", activeTab === 'inbox' && "fill-blue-600/20")} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Trámites</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={clsx(
                            "flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all w-24",
                            activeTab === 'calendar'
                                ? "text-indigo-600 scale-110"
                                : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                    >
                        <div className={clsx(
                            "p-2 rounded-xl transition-colors",
                            activeTab === 'calendar' ? "bg-indigo-50 dark:bg-indigo-500/10" : "bg-transparent"
                        )}>
                            <Calendar className={clsx("w-6 h-6", activeTab === 'calendar' && "fill-indigo-600/20")} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Calendario</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}
