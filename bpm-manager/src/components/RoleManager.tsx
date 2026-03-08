import { useState, useEffect } from 'react';
import { Shield, Layout, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../utils/cn';
import type { UserRole } from '../types';

const CAPABILITIES = [
    { key: 'view_reports', label: 'Ver Reportes', description: 'Acceso a la sección de analíticas y reportes.' },
    { key: 'edit_workflows', label: 'Editar Flujos', description: 'Capacidad para crear y modificar flujos de trabajo.' },
    { key: 'manage_users', label: 'Gestionar Usuarios', description: 'Administrar colaboradores y sus roles.' },
    { key: 'access_settings', label: 'Configuración Global', description: 'Acceso a parámetros de la empresa y monitor de API.' },
    { key: 'view_all_reports', label: 'Ver Reportes Globales', description: 'Acceso a reportes de todos los departamentos.' },
];

const WIDGETS = [
    { id: 'stats', label: 'Resumen de Estadísticas', description: 'Contadores superiores (En curso, Finalizados, etc).' },
    { id: 'inbox', label: 'Bandeja de Entrada', description: 'Lista de tareas pendientes por atender.' },
    { id: 'efficiency', label: 'Mi Eficiencia', description: 'Gráficos de productividad personal.' },
    { id: 'workload', label: 'Mapa de Carga', description: 'Distribución de carga por actividad.' },
    { id: 'ai', label: 'AI Copilot', description: 'Asistente inteligente de analíticas.' },
];

export function RoleManager() {
    const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
    const [rolePerms, setRolePerms] = useState<string[]>([]);
    const [roleWidgets, setRoleWidgets] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadRoleConfig();
    }, [selectedRole]);

    async function loadRoleConfig() {
        setLoading(true);
        try {
            // Load Permissions
            const { data: perms } = await supabase
                .from('role_capabilities')
                .select('capability')
                .eq('role_name', selectedRole);

            setRolePerms(perms?.map(p => p.capability) || []);

            // Load Widgets
            const { data: widgets } = await supabase
                .from('role_dashboard_config')
                .select('widget_id')
                .eq('role_name', selectedRole)
                .order('order_index');

            setRoleWidgets(widgets?.map(w => w.widget_id) || []);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar configuración del rol');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            // 1. Save Permissions (Clean & Insert)
            await supabase.from('role_capabilities').delete().eq('role_name', selectedRole);
            if (rolePerms.length > 0) {
                await supabase.from('role_capabilities').insert(
                    rolePerms.map(p => ({ role_name: selectedRole, capability: p }))
                );
            }

            // 2. Save Widgets (Clean & Insert)
            await supabase.from('role_dashboard_config').delete().eq('role_name', selectedRole);
            if (roleWidgets.length > 0) {
                await supabase.from('role_dashboard_config').insert(
                    roleWidgets.map((w, idx) => ({
                        role_name: selectedRole,
                        widget_id: w,
                        order_index: idx
                    }))
                );
            }

            toast.success(`Configuración para ${selectedRole} guardada correctamente`);
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    }

    const togglePerm = (key: string) => {
        setRolePerms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const toggleWidget = (id: string) => {
        setRoleWidgets(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Gestión de Roles y Permisos</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">Configura las capacidades y el dashboard para cada perfil de usuario.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 dark:shadow-none transition-all disabled:opacity-50 active:scale-95"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Cambios
                </button>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                {(['admin', 'editor', 'viewer', 'turista'] as UserRole[]).map(role => (
                    <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={cn(
                            "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            selectedRole === role
                                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-600"
                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                    >
                        {role}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Permissions Column */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Capacidades del Rol</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Permisos de acceso granular</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {CAPABILITIES.map(cap => (
                            <button
                                key={cap.key}
                                onClick={() => togglePerm(cap.key)}
                                className={cn(
                                    "w-full flex items-start gap-4 p-4 rounded-3xl border transition-all text-left group",
                                    rolePerms.includes(cap.key)
                                        ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30"
                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/50 hover:border-blue-100 dark:hover:border-blue-900/40"
                                )}
                            >
                                <div className={cn(
                                    "mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                    rolePerms.includes(cap.key)
                                        ? "bg-blue-600 border-blue-600 text-white"
                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                )}>
                                    {rolePerms.includes(cap.key) && <CheckCircle2 className="w-3 h-3" />}
                                </div>
                                <div className="flex-1">
                                    <p className={cn(
                                        "text-sm font-black uppercase tracking-tighter leading-none mb-1",
                                        rolePerms.includes(cap.key) ? "text-blue-900 dark:text-blue-200" : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {cap.label}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                        {cap.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Dashboard Widgets Column */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl text-emerald-600 dark:text-emerald-400">
                            <Layout className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Dashboard Widgets</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Control de visualización de reportes</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {WIDGETS.map(widget => (
                            <button
                                key={widget.id}
                                onClick={() => toggleWidget(widget.id)}
                                className={cn(
                                    "w-full flex items-start gap-4 p-4 rounded-3xl border transition-all text-left group",
                                    roleWidgets.includes(widget.id)
                                        ? "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30"
                                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/50 hover:border-emerald-100 dark:hover:border-emerald-900/40"
                                )}
                            >
                                <div className={cn(
                                    "mt-1 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                    roleWidgets.includes(widget.id)
                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                                )}>
                                    {roleWidgets.includes(widget.id) && <CheckCircle2 className="w-3 h-3" />}
                                </div>
                                <div className="flex-1">
                                    <p className={cn(
                                        "text-sm font-black uppercase tracking-tighter leading-none mb-1",
                                        roleWidgets.includes(widget.id) ? "text-emerald-900 dark:text-emerald-200" : "text-slate-700 dark:text-slate-300"
                                    )}>
                                        {widget.label}
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                        {widget.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2">
                            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium italic">
                                El orden en el que se seleccionan los widgets determinará su aparición en el dashboard (próximamente reordenable por drag & drop).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
