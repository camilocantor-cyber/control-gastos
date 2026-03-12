import { useState, useEffect } from 'react';
import { 
    Zap, Activity, Search, 
    ArrowUpRight, ArrowDownRight, Layout,
    Cpu, AlertTriangle, 
    ArrowRight, Sparkles, Orbit, LineChart, Settings
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer
} from 'recharts';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

// Mock data for the "Laboratorio" look
const chartData = [
    { name: 'Lun', value: 40, trend: 24 },
    { name: 'Mar', value: 30, trend: 13 },
    { name: 'Mie', value: 65, trend: 98 },
    { name: 'Jue', value: 45, trend: 39 },
    { name: 'Vie', value: 90, trend: 48 },
    { name: 'Sab', value: 70, trend: 38 },
    { name: 'Dom', value: 85, trend: 43 },
];

const StatWidget = ({ label, value, subtext, icon: Icon, color, trend }: any) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/20 dark:shadow-none transition-all group"
    >
        <div className="flex items-start justify-between relative z-10">
            <div className={clsx("p-4 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", color)}>
                <Icon className="w-6 h-6" />
            </div>
            <div className={clsx("flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg", trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
                {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(trend)}%
            </div>
        </div>
        <div className="mt-4 relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">{subtext}</p>
        </div>
        {/* Decorative Glass Circle */}
        <div className={clsx("absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[40px] opacity-10 transition-all group-hover:opacity-30", color.split(' ')[0])}></div>
    </motion.div>
);

export function DashboardV3({ onAction }: { onAction?: (action: string, data?: any) => void }) {
    const { user } = useAuth();
    const { isKommandant } = usePermissions();
    const [searchQuery, setSearchQuery] = useState('');
    const [stats, setStats] = useState({ active: 0, completed: 0, users: 0, efficiency: 0 });

    useEffect(() => {
        async function fetchStats() {
            try {
                const { count: activeCount } = await supabase.from('process_instances').select('*', { count: 'exact', head: true }).eq('status', 'active');
                const { count: completedCount } = await supabase.from('process_instances').select('*', { count: 'exact', head: true }).eq('status', 'completed');
                const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
                
                setStats({
                    active: activeCount || 0,
                    completed: completedCount || 0,
                    users: usersCount || 0,
                    efficiency: 92.4 // Hardcoded for demo
                });
            } finally {
                // Done
            }
        }
        fetchStats();
    }, []);

    const handleQuickSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim() && onAction) {
            onAction('advanced-reports', { search: searchQuery });
        }
    };

    return (
        <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#02040a] p-4 md:p-8 font-sans selection:bg-blue-500 selection:text-white">
            <div className="max-w-[1600px] mx-auto space-y-8">
                
                {/* Header: Neuro-Matrix Style */}
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-400/30">
                                <Orbit className="w-5 h-5 animate-spin-slow" />
                            </div>
                            <h2 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">Neural Analytics v3.0</h2>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                            Bienvenido, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">{isKommandant ? 'Her Kommandant' : (user?.name || 'Comandante')}</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            IA analizando 142 eventos en tiempo real.
                        </p>
                    </motion.div>

                    <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <form onSubmit={handleQuickSearch} className="relative group flex-1 min-w-[300px]">
                            <div className="absolute inset-0 bg-blue-600/20 blur-[20px] rounded-full opacity-0 group-focus-within:opacity-100 transition-all duration-700"></div>
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Deep Metadata Search... (ej: 'madera')"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl outline-none focus:border-blue-500 dark:focus:border-blue-400 shadow-xl shadow-slate-200/50 dark:shadow-none font-bold text-sm placeholder:text-slate-400 relative z-10 transition-all placeholder:font-normal"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 opacity-40 z-10">
                                <span className="px-1.5 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[10px] font-black">ENTER</span>
                            </div>
                        </form>
                        <button className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3">
                            Configurar <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Dashboard Interaction Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Left Panel: High Fidelity Stats */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <StatWidget 
                                label="Trámites en Curso" 
                                value={stats.active} 
                                subtext="4 requieren atención inmediata" 
                                icon={Activity} 
                                color="bg-blue-100 dark:bg-blue-500/20 text-blue-600 border-blue-200/50" 
                                trend={14.2}
                            />
                            <StatWidget 
                                label="Eficiencia Global" 
                                value={`${stats.efficiency}%`} 
                                subtext="SLA promedio: 1.2 días" 
                                icon={Zap} 
                                color="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 border-emerald-200/50" 
                                trend={2.5}
                            />
                        </div>

                        {/* Interactive Prediction Chart */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/20 dark:shadow-none"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Proyección de Carga</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Siete días de actividad proyectada</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black border border-blue-100">REALIDAD</span>
                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-slate-400 text-[10px] font-black border border-slate-100">PROYECTADO</span>
                                </div>
                            </div>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} 
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <Tooltip 
                                            contentStyle={{ 
                                                borderRadius: '1.5rem', 
                                                border: 'none', 
                                                background: '#0f172a', 
                                                color: '#fff', 
                                                padding: '1rem',
                                                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)'
                                            }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#3b82f6" 
                                            strokeWidth={4} 
                                            fillOpacity={1} 
                                            fill="url(#colorValue)" 
                                            animationDuration={2000}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="trend" 
                                            stroke="#6366f1" 
                                            strokeWidth={2} 
                                            strokeDasharray="5 5" 
                                            fill="transparent" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Domain Blocks: Re-imagined from V2 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Operaciones', icon: Layout, items: ['Kanban', 'Calendario'], color: 'blue' },
                                { label: 'Inteligencia', icon: LineChart, items: ['Reportes', 'Deep Search'], color: 'emerald' },
                                { label: 'Estructura', icon: Cpu, items: ['Flujos', 'Personas'], color: 'indigo' }
                            ].map((domain, i) => (
                                <motion.div 
                                    key={domain.label}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    whileHover={{ scale: 1.02 }}
                                    className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/10 cursor-pointer group"
                                >
                                    <div className={`p-3 w-fit rounded-xl bg-${domain.color}-100 dark:bg-${domain.color}-500/20 text-${domain.color}-600 mb-4 group-hover:bg-${domain.color}-600 group-hover:text-white transition-all`}>
                                        <domain.icon className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">{domain.label}</h4>
                                    <div className="flex flex-wrap gap-1.5 mt-4">
                                        {domain.items.map(it => (
                                            <span key={it} className="text-[9px] font-black text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700">{it}</span>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel: Live Feed & System Health */}
                    <div className="lg:col-span-4 space-y-8">
                        {/* Health Matrix */}
                        <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Matrix Health</h4>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black ring-1 ring-emerald-500/30">OPERACIONAL</div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-bold text-slate-300">API Gateway</p>
                                            <p className="text-[10px] text-slate-500">Node Cluster: South-East-1</p>
                                        </div>
                                        <div className="h-10 w-24 flex items-end gap-0.5">
                                            {[10, 15, 8, 20, 25, 12, 18, 22, 15, 20].map((h, i) => (
                                                <div key={i} className="flex-1 bg-emerald-500/40 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs font-bold text-slate-300">DB Sync</p>
                                            <p className="text-[10px] text-slate-500">Real-time replication</p>
                                        </div>
                                        <div className="h-10 w-24 flex items-end gap-0.5">
                                            {[20, 18, 22, 15, 10, 25, 30, 28, 25, 30].map((h, i) => (
                                                <div key={i} className="flex-1 bg-blue-500/40 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <button className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Ver Monitor Detallado</button>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        </div>

                        {/* Recent Deep Search Matches (Mocked for Surprise) */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem] p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matches Recientes de Metadata</h4>
                                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                            </div>
                            <div className="space-y-4">
                                {[
                                    { tag: 'MADERA', extra: 'Nuevo campo detectado', id: '112' },
                                    { tag: 'DELTA-NIT', extra: 'Proveedor sincronizado', id: '109' },
                                    { tag: 'CERTIF-34', extra: 'Archivo indexado vía IA', id: '088' }
                                ].map((match) => (
                                    <div key={match.tag} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer transition-all border border-transparent hover:border-blue-100 group">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs">#{match.id}</div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-slate-900 dark:text-white">{match.tag}</p>
                                            <p className="text-[10px] text-slate-500">{match.extra}</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-blue-500 transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quick Tip / Surprise Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                            <h4 className="text-lg font-black mb-2 tracking-tight">Potencia IA v4</h4>
                            <p className="text-xs opacity-75 leading-relaxed font-medium">
                                En la próxima actualización, la IA podrá sugerir rechazos automáticos basados en el historial del NIT capturado.
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <span className="p-2 bg-white/10 rounded-xl"><AlertTriangle className="w-4 h-4 text-amber-300" /></span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Beta Activa</span>
                            </div>
                            {/* SVG Decorative Network */}
                            <div className="absolute -bottom-10 -right-10 opacity-10 rotate-12">
                                <Orbit size={200} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// Subcomponent animations
const style = document.createElement('style');
style.textContent = `
    @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    .animate-spin-slow {
        animation: spin-slow 12s linear infinite;
    }
`;
document.head.appendChild(style);
