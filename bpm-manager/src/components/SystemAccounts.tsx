import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mail,
    Calendar,
    User as UserIcon,
    UserPlus,
    Search,
    RefreshCcw,
    Building2,
    Trash2,
    PlusCircle,
    UserCircle,
    Key,
    X,
    CheckCircle2,
    Clock,
    Lock,
    ShieldCheck,
    Fingerprint,
    ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';

interface AuthAccount {
    id: string;
    email: string;
    created_at: string;
    full_name?: string;
    is_collaborator?: boolean;
    organization_name?: string;
    status?: 'active' | 'pending' | 'suspended';
}

export function SystemAccounts() {
    const [accounts, setAccounts] = useState<AuthAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewModal, setShowNewModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newPassword, setNewPassword] = useState('Bpm123456!');
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Personal Change Password States
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [selfNewPassword, setSelfNewPassword] = useState('');
    const [selfConfirmPassword, setSelfConfirmPassword] = useState('');
    const [updatingSelf, setUpdatingSelf] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);

            let orgId = null;
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', user.id)
                    .single();
                orgId = profile?.organization_id;
            }

            let collaborators: string[] = [];
            if (orgId) {
                const { data: members } = await supabase
                    .from('organization_members')
                    .select('user_id')
                    .eq('organization_id', orgId);
                collaborators = members?.map(m => m.user_id) || [];
            }

            // Fetch profiles with organization names
            let profilesQuery = supabase
                .from('profiles')
                .select(`
                    *,
                    organization:organizations(name)
                `);

            if (orgId) {
                if (collaborators.length > 0) {
                    profilesQuery = profilesQuery.or(`organization_id.eq.${orgId},id.in.(${collaborators.join(',')})`);
                } else {
                    profilesQuery = profilesQuery.eq('organization_id', orgId);
                }
            }

            const { data: profiles, error: pError } = await profilesQuery;

            if (pError) {
                alert('Error al cargar perfiles: ' + pError.message);
                throw pError;
            }

            const mappedAccounts = (profiles || []).map(p => {
                let email = p.email;
                if (user && p.id === user.id && !email) {
                    email = user.email;
                }

                return {
                    id: p.id,
                    email: email || '',
                    created_at: p.created_at || '',
                    full_name: p.full_name,
                    status: p.status || 'active',
                    organization_name: (p as any).organization?.name || 'Sin Empresa',
                    is_collaborator: collaborators.includes(p.id)
                };
            });

            setAccounts(mappedAccounts as any);

            if (user) {
                const myProfile = profiles?.find(p => p.id === user.id);
                if (myProfile && (!myProfile.email || !myProfile.full_name)) {
                    await supabase.from('profiles').update({
                        email: user.email,
                        full_name: myProfile.full_name || user.user_metadata?.full_name || 'Usuario'
                    }).eq('id', user.id);
                }
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (accountId: string, email: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();

            const orgId = profile?.organization_id;
            if (!orgId) {
                alert('No tienes una organización activa.');
                return;
            }

            setLoading(true);
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: orgId,
                    user_id: accountId,
                    role: 'viewer'
                });

            if (memberError) {
                if (memberError.code === '23505') throw new Error('El usuario ya pertenece a esta organización.');
                throw memberError;
            }

            alert(`Usuario ${email} vinculado correctamente a tu empresa.`);
            fetchAccounts();
        } catch (error: any) {
            alert('Error al vincular: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (accountId: string, newStatus: 'active' | 'suspended') => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ status: newStatus })
                .eq('id', accountId);

            if (error) throw error;
            fetchAccounts();
        } catch (error: any) {
            alert('Error al actualizar estado: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Nota: signUp() normalmente inicia sesión. Para evitarlo en un panel de admin,
            // usamos un truco: registramos con el perfil pero DEJAMOS que el usuario use 
            // la funcionalidad de invitar. 
            // Para que no cambie la sesión actual, la forma correcta en Supabase Client 
            // es usar la API de Admin (pero requiere service_role). 
            // Como no tenemos service_role en el cliente, usaremos una invitación normal.

            const { data, error } = await supabase.auth.signUp({
                email: newEmail,
                password: newPassword,
                options: {
                    data: {
                        full_name: newName
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // Obtenemos la organización actual para asignar al nuevo usuario por defecto
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('organization_id')
                    .eq('id', (await supabase.auth.getUser()).data.user?.id)
                    .single();

                await supabase.from('profiles').upsert({
                    id: data.user.id,
                    email: newEmail,
                    full_name: newName,
                    status: 'pending',
                    organization_id: profile?.organization_id
                });

                // Si el signUp cambió nuestra sesión (lo cual es molesto aquí), 
                // lamentablemente el cliente web lo hace por defecto. 
                // No hay forma fácil de evitarlo sin el Admin SDK.
            }

            alert('Cuenta creada. Si la página se recarga, es normal debido al proceso de seguridad de Supabase.');
            setShowNewModal(false);
            setNewEmail('');
            setNewName('');
            fetchAccounts();
        } catch (error: any) {
            alert('Error al crear cuenta: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async (accountId: string, email: string) => {
        if (accountId === currentUser?.id) {
            alert('No puedes eliminar tu propia cuenta (Cuenta Principal).');
            return;
        }

        if (!window.confirm(`¿Estás seguro de eliminar el perfil de ${email}?`)) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', accountId);

            if (error) throw error;
            fetchAccounts();
        } catch (error: any) {
            alert('Error al eliminar cuenta: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selfNewPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (selfNewPassword !== selfConfirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setUpdatingSelf(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: selfNewPassword
            });

            if (error) throw error;

            toast.success('¡Contraseña actualizada correctamente!');
            setShowChangePasswordModal(false);
            setSelfNewPassword('');
            setSelfConfirmPassword('');
        } catch (error: any) {
            toast.error('Error al actualizar: ' + error.message);
        } finally {
            setUpdatingSelf(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Personal Profile Section */}
            <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-200/20 dark:shadow-none mb-8 relative overflow-hidden group border border-white/10">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-all duration-700 group-hover:rotate-12 translate-x-10 -translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0">
                    <Fingerprint className="w-64 h-64" />
                </div>

                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="relative">
                        <div className="w-28 h-28 bg-white/10 backdrop-blur-2xl rounded-[2.2rem] flex items-center justify-center text-4xl font-black border border-white/20 shadow-2xl relative z-10">
                            {currentUser?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-indigo-600 flex items-center justify-center z-20 shadow-lg">
                            <ShieldCheck className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-4">
                        <div>
                            <p className="text-blue-200/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2 leading-none">Mi Perfil de Seguridad</p>
                            <h2 className="text-4xl font-black mb-1 leading-none tracking-tight uppercase">Dashboard Privado</h2>
                            <p className="text-blue-100/70 font-bold text-sm">{currentUser?.email}</p>
                        </div>

                        <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                            <button
                                onClick={() => setShowChangePasswordModal(true)}
                                className="bg-white/95 text-indigo-600 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 shadow-xl shadow-indigo-900/40"
                            >
                                <Lock className="w-3.5 h-3.5" />
                                Cambiar mi contraseña
                            </button>
                            <div className="px-6 py-3.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                Cuenta Verificada
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Unified Action Bar */}
            <header className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex-1 max-w-sm relative group ml-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por email o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-800 border focus:border-blue-500/50 rounded-xl focus:outline-none transition-all text-[11px] font-bold text-slate-700 dark:text-white placeholder:uppercase placeholder:text-[9px] placeholder:font-black placeholder:tracking-widest"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowNewModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 uppercase tracking-wide active:scale-95"
                    >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Nueva Cuenta
                    </button>
                    <button
                        onClick={fetchAccounts}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 transition-all text-slate-500 shadow-sm"
                        title="Actualizar lista"
                    >
                        <RefreshCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                </div>
            </header>

            <div className="bg-white dark:bg-[#080a14] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20">
                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-5">Usuario</th>
                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email</th>
                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Empresa / Origen</th>
                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">En tu Empresa</th>
                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fecha Registro</th>
                                <th className="px-4 py-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right pr-5">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {loading && accounts.length === 0 ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="px-8 py-8">
                                            <div className="flex items-center gap-4 animate-pulse">
                                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                                                <div className="space-y-2">
                                                    <div className="w-32 h-3 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                                                    <div className="w-48 h-2 bg-slate-100/50 dark:bg-slate-800/50 rounded-full"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredAccounts.map((account) => (
                                <tr key={account.id} className={cn(
                                    "group hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors",
                                    account.id === currentUser?.id && "bg-indigo-50/30 dark:bg-indigo-900/5"
                                )}>
                                    <td className="px-3 py-1.5 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-110",
                                                account.id === currentUser?.id
                                                    ? "bg-indigo-600 border-indigo-400"
                                                    : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100/50 dark:border-indigo-500/10"
                                            )}>
                                                <UserIcon className={cn("w-4 h-4", account.id === currentUser?.id ? "text-white" : "text-indigo-500")} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px] leading-tight mb-0.5">
                                                    {account.full_name || 'Sin Nombre'}
                                                    {account.id === currentUser?.id && (
                                                        <span className="ml-2 text-[8px] bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full uppercase tracking-widest font-black">Tú</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3 h-3 text-indigo-500/70" />
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-tight">{account.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex justify-center">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-slate-100 dark:border-slate-800">
                                                <Building2 className="w-2.5 h-2.5 opacity-50" />
                                                {account.organization_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex justify-center">
                                            {account.status === 'pending' ? (
                                                <button
                                                    onClick={() => handleStatusChange(account.id, 'active')}
                                                    className="group/status flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-amber-100 dark:border-amber-800/30 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all font-bold"
                                                    title="Click para Activar"
                                                >
                                                    <Clock className="w-2.5 h-2.5 group-hover/status:hidden" />
                                                    <CheckCircle2 className="w-2.5 h-2.5 hidden group-hover/status:block" />
                                                    <span className="group-hover/status:hidden">Pendiente</span>
                                                    <span className="hidden group-hover/status:block font-black">Activar</span>
                                                </button>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                    Activa
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex justify-center">
                                            {account.is_collaborator ? (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-indigo-100 dark:border-indigo-800/30 shadow-sm font-bold">
                                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                                    Miembro
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-800">
                                                    Sin Vincular
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                            <Calendar className="w-3 h-3 opacity-50" />
                                            <span className="text-[10px] font-medium">
                                                {(() => {
                                                    const d = new Date(account.created_at);
                                                    return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Desconocida';
                                                })()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-right pr-5">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {!account.is_collaborator && (
                                                <button
                                                    onClick={() => handleInvite(account.id, account.email)}
                                                    className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-1.5 active:scale-95"
                                                >
                                                    <UserPlus className="w-2.5 h-2.5" />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Invitar</span>
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteAccount(account.id, account.email)}
                                                disabled={account.id === currentUser?.id}
                                                className={cn(
                                                    "w-7 h-7 flex items-center justify-center rounded-lg transition-all border border-slate-100 dark:border-slate-800",
                                                    account.id === currentUser?.id
                                                        ? "text-slate-200 dark:text-slate-900 cursor-not-allowed hidden"
                                                        : "text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                                                )}
                                                title={account.id === currentUser?.id ? "Cuenta Principal" : "Eliminar"}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAccounts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-full border border-dashed border-slate-200 dark:border-slate-700">
                                                <Search className="w-10 h-10 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">No se encontraron cuentas</p>
                                                <p className="text-xs text-slate-500 mt-2 font-medium font-bold">Asegúrate de tener perfiles registrados en la base de datos.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 animate-in zoom-in-95 border border-white/10 dark:border-slate-800 text-left">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">Nueva Cuenta Global</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Crea un nuevo usuario en la plataforma</p>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-400 w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateAccount} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 text-left">Nombre Completo</label>
                                <div className="relative group">
                                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-semibold text-sm text-slate-900 dark:text-slate-100"
                                        placeholder="Ej: Camilo Cantor"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 text-left">Correo Electrónico</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-semibold text-sm text-slate-900 dark:text-slate-100"
                                        placeholder="ejemplo@correo.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1 text-left">Contraseña Prov.</label>
                                <div className="relative group">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-semibold text-sm text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewModal(false)}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs uppercase"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 py-3 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none text-xs tracking-widest uppercase"
                                >
                                    {loading ? 'Procesando...' : 'Crear Cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showChangePasswordModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md shadow-2xl p-12 border border-white/10 dark:border-slate-800 relative overflow-hidden">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -ml-16 -mb-16"></div>

                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">Seguridad</h3>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Actualiza tu contraseña de acceso</p>
                            </div>
                            <button onClick={() => setShowChangePasswordModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90">
                                <X className="text-slate-400 w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-8 relative z-10">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">Nueva Contraseña</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-500 transition-all" />
                                    <input
                                        type="password"
                                        required
                                        value={selfNewPassword}
                                        onChange={e => setSelfNewPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-[1.5rem] focus:outline-none focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">Confirmar Contraseña</label>
                                <div className="relative group">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-500 transition-all" />
                                    <input
                                        type="password"
                                        required
                                        value={selfConfirmPassword}
                                        onChange={e => setSelfConfirmPassword(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-[1.5rem] focus:outline-none focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updatingSelf}
                                className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-indigo-900/20 text-xs tracking-[0.2em] uppercase active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
                            >
                                {updatingSelf ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        Actualizar Ahora
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
