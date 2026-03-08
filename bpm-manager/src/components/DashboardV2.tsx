import {
    Zap,
    Users,
    Settings,
    Box,
    Plus,
    Activity,
    CheckCircle2,
    Clock,
    TrendingUp,
    Workflow as WorkflowIcon,
    ChevronRight,
    Search as SearchIcon
} from 'lucide-react';
import clsx from 'clsx';

// Components for the V2 concept
const StatCard = ({ label, value, trend, icon: Icon, color }: any) => {
    const colors = {
        blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        emerald: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
        purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    };

    return (
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50 group">
            <div className="flex items-start justify-between mb-4">
                <div className={clsx("p-3 rounded-2xl border transition-colors", colors[color as keyof typeof colors])}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-600">{trend}</span>
                </div>
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{value}</h3>
            </div>
        </div>
    );
};

export function DashboardV2() {
    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#02040a] p-8 font-sans">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Modern Header / Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">Dashboard Experimental V2</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                            Command Center <span className="text-indigo-600">.</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            Nueva propuesta de gestión inteligente de flujos.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Fake Command Search */}
                        <div
                            className="hidden lg:flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl cursor-pointer hover:border-indigo-500/50 transition-all w-64 shadow-sm"
                        >
                            <SearchIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-400 font-medium flex-1">Buscar acción o trámite...</span>
                            <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 border border-slate-200 dark:border-slate-700">⌘</span>
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 border border-slate-200 dark:border-slate-700">K</span>
                            </div>
                        </div>

                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-blue-500/20 transition-all active:scale-95 group font-black text-xs uppercase tracking-widest">
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                            Nuevo Trámite
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Flujos Activos" value="24" trend="+12%" icon={Activity} color="blue" />
                    <StatCard label="Tasa de Cierre" value="89.4%" trend="+2.5%" icon={CheckCircle2} color="emerald" />
                    <StatCard label="Tiempo Promedio" value="2.4d" trend="-15%" icon={Clock} color="indigo" />
                    <StatCard label="Usuarios On" value="156" trend="+8%" icon={Users} color="purple" />
                </div>

                {/* Layout Explorer (The "Meat" of the experiment) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left: Proposal for a Modular Sidebar */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-8 shadow-xl shadow-slate-200/20 dark:shadow-none">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Explorador de Navegación V2</h3>
                                    <p className="text-sm text-slate-500 font-medium mt-1">Organización modular por dominios de negocio.</p>
                                </div>
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                    <Box className="w-5 h-5 text-indigo-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Navigation Block 1 */}
                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                                            <WorkflowIcon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Operaciones</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ejecución y Seguimiento</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Trámites</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Calendario</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Buscador</span>
                                    </div>
                                </div>

                                {/* Navigation Block 2 */}
                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Inteligencia</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Análisis y Predicciones</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Reportes</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Predictivo</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Costos</span>
                                    </div>
                                </div>

                                {/* Navigation Block 3 */}
                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-xl bg-purple-500 text-white shadow-lg shadow-purple-500/20">
                                            <Settings className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Estructura</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configuración Base</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Flujos</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Empresa</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Cuentas</span>
                                    </div>
                                </div>

                                {/* Navigation Block 4 */}
                                <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-white/5 hover:border-rose-500/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Personas</h4>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Recursos y Permisos</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Usuarios</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Roles</span>
                                        <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">Organigrama</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Concept: Interactive Board for Decisions */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-2 italic">Próxima Parada: Menú Inteligente</h3>
                                <p className="text-slate-400 font-medium max-w-lg mb-8">
                                    Imagina un menú que aprende de tu uso diario y trae al frente los 3 flujos que más utilizas. Menos clics, más eficiencia.
                                </p>
                                <div className="flex items-center gap-4">
                                    <button className="px-6 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-white/10 hover:scale-105 transition-all">Ver Prototipo</button>
                                    <button className="px-6 py-3 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all">Sugerir Mejora</button>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-indigo-500/30 transition-all duration-500"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>
                        </div>
                    </div>

                    {/* Right: Quick Insights / Activity */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 shadow-xl shadow-slate-200/10">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6">Estado del Sistema</h4>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">API Gateway</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Latencia: 45ms</p>
                                    </div>
                                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Supabase Sync</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Última sync: hace 2m</p>
                                    </div>
                                    <TrendingUp className="w-3 h-3 text-blue-500" />
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">IA Engine</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Carga: 12%</p>
                                    </div>
                                    <TrendingUp className="w-3 h-3 text-indigo-500" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-600/20">
                            <h4 className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-4">Nota de Diseño</h4>
                            <p className="text-xs font-medium leading-relaxed opacity-90">
                                Una interfaz orientada a bloques modulares permite que el menú lateral no se sobrecargue. Podríamos mover secciones enteras a este tablero principal tipo "Switchboard".
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
