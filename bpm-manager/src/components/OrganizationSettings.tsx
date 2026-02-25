import { Building2, Shield, CreditCard, Users, CheckCircle2, Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Organization } from '../types';

export function OrganizationSettings() {
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
            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', orgId)
                .single();

            if (!error && data) {
                setOrg(data);
            }
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
            // 0. Client-side ID (Bypass RLS Select issue)
            const newOrgId = crypto.randomUUID();

            // 1. Create Org (No .select() needed as we have ID)
            const { error: orgError } = await supabase
                .from('organizations')
                .insert({
                    id: newOrgId,
                    name: newOrgName,
                    plan: 'free'
                });

            if (orgError) throw orgError;

            // 2. Add Member as Admin
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: newOrgId,
                    user_id: user?.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            // 3. Switch Context (Manual update to handle new org not in state)
            if (user) {
                await supabase.from('profiles').update({ organization_id: newOrgId }).eq('id', user.id);
                window.location.reload();
            }

        } catch (err: any) {
            console.error(err);
            alert("Error al crear empresa: " + err.message);
            setCreating(false);
        }
    }

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando información de la empresa...</div>;

    // Empty State (No Org)
    if (!org) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-6 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-2">
                <Building2 className="w-10 h-10 text-slate-300" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-900">No tienes una organización activa</h3>
                <p className="text-slate-500 max-w-md mx-auto mt-2">Para comenzar, selecciona una organización existente o crea una nueva empresa para invitar a tu equipo.</p>
            </div>
            <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-105"
            >
                Crear mi primera empresa
            </button>

            {/* Create Org Modal (Reused) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Nueva Empresa</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <Users className="w-5 h-5 text-slate-400" /> {/* Using Users as close icon placeholder if X not imported, wait X IS NOT IMPORTED in original file? let me check imports. X is NO imported. I should import X or use something else. I'll add X to imports or use Users as placeholder? No, that's bad. I'll just use text 'Cerrar' or a simple SVG if I can't change imports easily in this tool call. Wait, I can see imports line 1. Imports are: Building2, Shield, CreditCard, Users, CheckCircle2. X is NOT imported. I will use 'Cerrar' text button or just add X to imports in a separate call? 
                                Actually, I can render an SVG directly. */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nombre de la Organización</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newOrgName}
                                    onChange={e => setNewOrgName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-semibold text-slate-900"
                                    placeholder="Ej. Acme Corp"
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={creating || !newOrgName.trim()}
                                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Creando...</span>
                                        </>
                                    ) : (
                                        'Crear Empresa'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            {/* Modal for Header usage too */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">Nueva Empresa</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-400"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrg} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nombre de la Organización</label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newOrgName}
                                    onChange={e => setNewOrgName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-semibold text-slate-900"
                                    placeholder="Ej. Acme Corp"
                                />
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={creating || !newOrgName.trim()}
                                    className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Creando...</span>
                                        </>
                                    ) : (
                                        'Crear Empresa'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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

            {/* Existing Grid ... */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* ... content ... */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Detalles de la Empresa</h3>
                                <p className="text-xs text-slate-400">Información general e identificadores.</p>
                            </div>
                            <div className="flex items-center gap-2">
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
                                                            alert("Nombre actualizado");
                                                        }
                                                    });
                                            }
                                        }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Editar
                                    </button>
                                )}
                                <div className="bg-slate-50 p-2 rounded-xl">
                                    <Shield className="w-5 h-5 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nombre Legal</label>
                                <div className="text-xl font-bold text-slate-900">{org.name}</div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ID de Organización</label>
                                <div className="text-sm font-mono bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-500 select-all">
                                    {org.id}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Creación</label>
                                <div className="text-sm font-bold text-slate-600">
                                    {new Date(org.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50/50 rounded-[2rem] border border-blue-100 p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-blue-900">Equipo</h3>
                        </div>
                        <p className="text-sm text-blue-700/80 mb-4">
                            Actualmente tienes permiso de <strong>{user?.role === 'admin' ? 'Administrador' : 'Miembro'}</strong>.
                            {user?.role === 'admin' ? ' Puedes invitar a otros usuarios y gestionar roles.' : ' Contacta a tu administrador para gestionar permisos.'}
                        </p>
                    </div>
                </div>

                {/* Plan Info */}
                <div>
                    <div className="bg-slate-900 text-white rounded-[2rem] shadow-xl shadow-slate-200 p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 text-blue-300">
                                <CreditCard className="w-5 h-5" />
                                <span className="text-xs font-bold uppercase tracking-widest">Plan Actual</span>
                            </div>
                            <h3 className="text-3xl font-black mb-6 capitalize">{org.plan}</h3>

                            <div className="space-y-3 mb-8">
                                <FeatureItem text="Usuarios Ilimitados" active={true} />
                                <FeatureItem text="Flujos Ilimitados" active={true} />
                                <FeatureItem text="Soporte Prioritario" active={org.plan === 'enterprise'} />
                                <FeatureItem text="API Access" active={org.plan !== 'free'} />
                            </div>

                            <button className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-blue-50 transition-colors">
                                Gestionar Suscripción
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
