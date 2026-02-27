import { Building2, Shield, CreditCard, Users, CheckCircle2, Plus, Settings, Trash2, Package } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Organization } from '../types';

export function OrganizationSettings({ onlyParameters }: { onlyParameters?: boolean }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [creating, setCreating] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (user?.organization_id) {
            fetchOrg(user.organization_id);
        } else {
            setLoading(false);
        }
    }, [user, authLoading]);

    async function fetchOrg(orgId: string) {
        try {
            const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
            if (!error && data) setOrg(data);
        } catch (err) {
            console.error('Error fetching org:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateOrg(e: React.FormEvent) {
        e.preventDefault();
        if (!newOrgName.trim()) return;
        setCreating(true);
        try {
            const newOrgId = crypto.randomUUID();
            const { error: orgError } = await supabase.from('organizations').insert({ id: newOrgId, name: newOrgName, plan: 'free' });
            if (orgError) throw orgError;
            const { error: memberError } = await supabase.from('organization_members').insert({ organization_id: newOrgId, user_id: user?.id, role: 'admin' });
            if (memberError) throw memberError;
            if (user) {
                await supabase.from('profiles').update({ organization_id: newOrgId }).eq('id', user.id);
                window.location.reload();
            }
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setCreating(false);
        }
    }

    async function updateParameter(oldKey: string, newKey: string, newValue: string) {
        if (!org) return;
        const newSettings = { ...org.settings };
        if (oldKey !== newKey) {
            delete newSettings[oldKey];
        }
        newSettings[newKey] = newValue;
        const { error } = await supabase.from('organizations').update({ settings: newSettings }).eq('id', org.id);
        if (!error) setOrg({ ...org, settings: newSettings });
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sincronizando...</p>
        </div>
    );

    if (!org) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-6">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Sin Organización</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">Crea una organización para comenzar.</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                Configurar Empresa
            </button>
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-10 border border-slate-100 dark:border-slate-800">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8">Nueva Empresa</h3>
                        <form onSubmit={handleCreateOrg} className="space-y-6">
                            <input
                                type="text"
                                required
                                value={newOrgName}
                                onChange={e => setNewOrgName(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                placeholder="Nombre de la empresa"
                            />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest rounded-2xl">Volver</button>
                                <button type="submit" disabled={creating} className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-blue-500/20">
                                    {creating ? 'Creando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    const parametersHeader = (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Matriz de Parámetros</h3>
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest pl-1">Variables de entorno globales para automatización.</p>
            </div>
            <button
                onClick={async () => {
                    const key = prompt("Asigne un nombre (ID) al parámetro:");
                    if (key) {
                        const cleanKey = key.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
                        await updateParameter(cleanKey, cleanKey, 'Sin valor');
                    }
                }}
                className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3"
            >
                <Plus className="w-4 h-4" />
                Nueva Entrada
            </button>
        </div>
    );

    const parametersGrid = (
        <div className="overflow-hidden bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador (Key)</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor de Configuración</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-20">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {Object.entries(org.settings || {}).length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-8 py-20 text-center">
                                <Package className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay datos registrados</p>
                            </td>
                        </tr>
                    ) : (
                        Object.entries(org.settings || {}).map(([key, value]) => (
                            <tr key={key} className="group/row hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            defaultValue={key}
                                            onBlur={(e) => {
                                                const newKey = e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
                                                if (newKey && newKey !== key) updateParameter(key, newKey, value);
                                            }}
                                            className="bg-slate-50/50 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full transition-all"
                                        />
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    <input
                                        type="text"
                                        defaultValue={value}
                                        onBlur={(e) => updateParameter(key, key, e.target.value)}
                                        className="bg-slate-50/50 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full transition-all"
                                        placeholder="Ingrese valor..."
                                    />
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <button
                                        onClick={async () => {
                                            if (confirm(`¿Eliminar ${key}?`)) {
                                                const updatedSettings = { ...org.settings };
                                                delete updatedSettings[key];
                                                const { error } = await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', org.id);
                                                if (!error) setOrg({ ...org, settings: updatedSettings });
                                            }
                                        }}
                                        className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-row:opacity-100 group-hover/row:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    if (onlyParameters) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-10 group/params">
                    {parametersHeader}
                    {parametersGrid}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            {/* Unified Action Bar */}
            <header className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                <div className="flex-1" />

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-slate-900 dark:bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none uppercase tracking-wider flex items-center gap-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nueva Empresa
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Organization Details */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Detalles de la Empresa</h3>
                                <p className="text-sm text-slate-400 font-medium">Información general e identificadores únicos.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                                <Building2 className="w-6 h-6 text-slate-400" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nombre Legal</label>
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{org.name}</div>
                                        {user?.role === 'admin' && (
                                            <button
                                                onClick={() => {
                                                    const newName = prompt("Nuevo nombre de la empresa:", org.name);
                                                    if (newName && newName !== org.name) {
                                                        supabase.from('organizations').update({ name: newName }).eq('id', org.id)
                                                            .then(({ error }) => {
                                                                if (error) alert("Error al actualizar");
                                                                else {
                                                                    setOrg({ ...org, name: newName });
                                                                }
                                                            });
                                                    }
                                                }}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-blue-600 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">ID de Organización</label>
                                    <div className="text-xs font-mono bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-500 select-all tracking-tighter">
                                        {org.id}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-50 dark:border-blue-900/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    <span className="text-[10px] font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest">Seguridad y Auditoría</span>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Fecha de Creación</label>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {new Date(org.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <div className="text-[10px] text-blue-600/70 font-bold italic leading-relaxed">
                                        Esta organización está protegida por cifrado de extremo a extremo y aislamiento multi-tenant.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Company Parameters */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 group/params">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Parámetros Globales</h3>
                                <p className="text-sm text-slate-400 font-medium">Configura variables y constantes para tus flujos de trabajo.</p>
                            </div>
                            <button
                                onClick={async () => {
                                    const key = prompt("Nombre del parámetro (ej: ERP_URL, API_TOKEN):");
                                    if (key) {
                                        const cleanKey = key.toUpperCase().replace(/\s+/g, '_');
                                        const value = prompt(`Valor para ${cleanKey}:`);
                                        if (value !== null) {
                                            const updatedSettings = { ...(org.settings || {}), [cleanKey]: value };
                                            const { error } = await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', org.id);
                                            if (error) alert("Error al guardar: " + error.message);
                                            else setOrg({ ...org, settings: updatedSettings });
                                        }
                                    }
                                }}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Añadir Parámetro
                            </button>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(org.settings || {}).length === 0 ? (
                                <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <Settings className="w-10 h-10 text-slate-200 dark:text-slate-800 mb-4" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">No hay parámetros personalizados<br /><span className="text-[10px] text-slate-300">Usa el botón superior para agregar el primero</span></p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(org.settings || {}).map(([key, value]) => (
                                        <div key={key} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 group/item relative hover:border-blue-200 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key}</span>
                                                <button
                                                    onClick={async () => {
                                                        if (confirm(`¿Eliminar parámetro ${key}?`)) {
                                                            const updatedSettings = { ...org.settings };
                                                            delete updatedSettings[key];
                                                            const { error } = await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', org.id);
                                                            if (error) alert("Error al eliminar");
                                                            else setOrg({ ...org, settings: updatedSettings });
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={value}
                                                    onChange={async (e) => {
                                                        const newVal = e.target.value;
                                                        // Optimistic update
                                                        setOrg({ ...org, settings: { ...org.settings, [key]: newVal } });
                                                    }}
                                                    onBlur={async (e) => {
                                                        const updatedSettings = { ...org.settings, [key]: e.target.value };
                                                        await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', org.id);
                                                    }}
                                                    className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-900 dark:text-white focus:ring-0 placeholder:text-slate-300"
                                                    placeholder="Valor del parámetro..."
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Plan Info & Sidebar */}
                <div className="space-y-6">
                    <div className="bg-slate-900 dark:bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-slate-200 dark:shadow-none p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 text-blue-300">
                                <CreditCard className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Plan de Servicio</span>
                            </div>
                            <h3 className="text-4xl font-black mb-8 capitalize">{org.plan}</h3>

                            <div className="space-y-4 mb-10">
                                <FeatureItem text="Usuarios Ilimitados" active={true} />
                                <FeatureItem text="Flujos Ilimitados" active={true} />
                                <FeatureItem text="Soporte Prioritario" active={org.plan === 'enterprise'} />
                                <FeatureItem text="API Access Global" active={org.plan !== 'free'} />
                                <FeatureItem text="Copia de Seguridad" active={true} />
                            </div>

                            <button className="w-full py-4 bg-white text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-50 transition-all active:scale-95 shadow-lg">
                                Gestionar Suscripción
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Equipo</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
                            Estás operando con el rol de <strong className="text-slate-900 dark:text-slate-200 underline decoration-blue-500/30">{user?.role === 'admin' ? 'Administrador' : 'Miembro'}</strong>.
                            {user?.role === 'admin'
                                ? ' Tienes control total sobre los parámetros y miembros de la organización.'
                                : ' Contacta a tu administrador para solicitar acceso a parámetros globales.'}
                        </p>
                        <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-center">
                            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
                                Ver todos los miembros →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ text, active }: { text: string, active: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${active ? 'text-white' : 'text-slate-500 opacity-50'}`}>
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">{text}</span>
        </div>
    );
}
