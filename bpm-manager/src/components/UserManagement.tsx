import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { User as UserIcon, X, Plus, Mail, Edit2, Shield, UserCircle, UserMinus, Briefcase, MapPin } from 'lucide-react';
import type { UserRole } from '../types';

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    updated_at: string;
    position?: string;
    department?: string;
    status?: 'active' | 'pending' | 'suspended';
}

export function UserManagement() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('viewer');
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState<UserRole>('viewer');
    const [editPositionId, setEditPositionId] = useState<string>('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [positions, setPositions] = useState<any[]>([]);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) return;

        if (user?.organization_id) {
            fetchProfiles();
            fetchPositions();
        } else {
            setLoading(false);
        }
    }, [user?.organization_id, authLoading]);

    async function fetchPositions() {
        if (!user?.organization_id) return;
        const { data } = await supabase
            .from('positions')
            .select('id, title, department:departments(name)')
            .eq('organization_id', user.organization_id);
        setPositions(data || []);
    }

    async function fetchProfiles() {
        console.log('Iniciando fetchProfiles... Usuario:', user);
        try {
            if (!user?.organization_id) {
                console.log('No hay organization_id para el usuario actual');
                return;
            }
            const { data, error } = await supabase
                .from('organization_members')
                .select(`
                    user_id, 
                    role, 
                    profile:profiles(id, full_name, email, status)
                `)
                .eq('organization_id', user.organization_id);

            if (error) {
                console.error('Error en Supabase:', error);
                alert('Error al cargar colaboradores: ' + error.message);
                throw error;
            }

            console.log('Miembros encontrados:', data?.length, data);

            const mappedProfiles = (data || []).map((item: any) => {
                if (!item.profile) {
                    console.warn('Miembro sin perfil encontrado:', item.user_id);
                    return {
                        id: item.user_id,
                        full_name: 'Perfil no visible',
                        email: 'N/A',
                        role: item.role,
                        status: 'active',
                        updated_at: new Date().toISOString()
                    };
                }

                return {
                    id: item.profile.id,
                    full_name: item.profile.full_name || 'Sin Nombre',
                    email: item.profile.email || 'Sin Email',
                    role: item.role,
                    status: item.profile.status || 'active',
                    updated_at: new Date().toISOString()
                };
            });

            setProfiles(mappedProfiles);
        } catch (error) {
            console.error('Error fetching profiles:', error);
        } finally {
            setLoading(false);
        }
    }

    async function updateRole(userId: string, newRole: UserRole) {
        setUpdating(userId);
        try {
            if (!user?.organization_id) return;

            const { error } = await supabase
                .from('organization_members')
                .update({ role: newRole })
                .eq('organization_id', user.organization_id)
                .eq('user_id', userId);

            if (error) throw error;
            await fetchProfiles();
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Error al actualizar el rol');
        } finally {
            setUpdating(null);
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        try {
            if (!user?.organization_id) throw new Error('No tienes una organización asignada.');

            setLoading(true);

            // 1. Check if user exists
            const { data: existingUser } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', inviteEmail)
                .single();

            let userId = existingUser?.id;

            // 2. Handle non-existent user
            if (!userId) {
                throw new Error('El usuario aún no tiene una cuenta en el sistema. Debe registrarse primero para poder ser invitado.');
            }

            // 3. Add to Organization Members
            const { error: memberError } = await supabase
                .from('organization_members')
                .insert({
                    organization_id: user.organization_id,
                    user_id: userId,
                    role: inviteRole
                });

            if (memberError) {
                if (memberError.code === '23505') throw new Error('El usuario ya pertenece a esta organización.');
                throw memberError;
            }

            setInviteEmail('');
            setShowInviteModal(false);
            fetchProfiles();
            alert('Usuario invitado/asignado correctamente.');

        } catch (err: any) {
            alert('Error al invitar: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!editingProfile || !user?.organization_id) return;

        setLoading(true);
        try {
            // 1. Update Profile (Name)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: editName })
                .eq('id', editingProfile.id);

            if (profileError) throw profileError;

            // 2. Update Organization Member (Role)
            const { error: memberError } = await supabase
                .from('organization_members')
                .update({ role: editRole })
                .eq('organization_id', user.organization_id)
                .eq('user_id', editingProfile.id);

            if (memberError) throw memberError;

            // 3. Update Position
            if (editPositionId) {
                // Delete existing first
                await supabase.from('employee_positions').delete().eq('user_id', editingProfile.id);
                // Insert new
                await supabase.from('employee_positions').insert({
                    user_id: editingProfile.id,
                    position_id: editPositionId,
                    is_primary: true,
                    start_date: new Date().toISOString().split('T')[0]
                });
            }

            await fetchProfiles();
            setShowEditModal(false);
            setEditingProfile(null);
            alert('Usuario actualizado correctamente.');
        } catch (error: any) {
            console.error('Error updating user:', error);
            alert('Error al actualizar el usuario: ' + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function removeMember(userId: string) {
        if (!window.confirm('¿Estás seguro de que deseas eliminar a este colaborador de la organización? Esta acción no se puede deshacer.')) return;

        setUpdating(userId);
        try {
            if (!user?.organization_id) return;

            const { error } = await supabase
                .from('organization_members')
                .delete()
                .eq('organization_id', user.organization_id)
                .eq('user_id', userId);

            if (error) throw error;
            await fetchProfiles();
            alert('Colaborador eliminado correctamente.');
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Error al eliminar el colaborador');
        } finally {
            setUpdating(null);
        }
    }

    const openEditModal = async (profile: Profile) => {
        setEditingProfile(profile);
        setEditName(profile.full_name || '');
        setEditRole(profile.role);

        // Fetch current position for this user
        const { data } = await supabase
            .from('employee_positions')
            .select('position_id')
            .eq('user_id', profile.id)
            .maybeSingle();

        setEditPositionId(data?.position_id || '');
        setShowEditModal(true);
    };

    if (loading && profiles.length === 0) {
        return <div className="p-8 text-center text-slate-400">Cargando usuarios...</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Unified Action Bar */}
            <header className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
                <div className="flex items-center gap-3 pl-2">
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full border border-blue-100 dark:border-blue-800/30">
                        {user?.available_organizations?.find(o => o.id === user?.organization_id)?.name || 'CANTOR CORP'}
                    </span>
                    <div className="flex-1" />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                        <UserIcon className="w-3 h-3 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{profiles.length} Miembros</span>
                    </div>
                    {user?.role === 'admin' && (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center gap-2 group uppercase tracking-wider"
                        >
                            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                            Invitar
                        </button>
                    )}
                </div>
            </header>



            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 border border-white/20 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">Vincular Colaborador</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Se añadirá a: <span className="text-blue-600 dark:text-blue-400 font-bold">{user?.available_organizations?.find(o => o.id === user.organization_id)?.name}</span></p>
                            </div>
                            <button onClick={() => setShowInviteModal(false)} className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-400 w-4 h-4" /></button>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Correo Electrónico</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={inviteEmail}
                                        onChange={e => setInviteEmail(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-semibold text-sm text-slate-900 dark:text-slate-100"
                                        placeholder="ej: juan@empresa.com"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold pl-1 italic">
                                    * El usuario debe estar previamente registrado en la plataforma.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Seleccionar Rol</label>
                                <select
                                    value={inviteRole}
                                    onChange={e => setInviteRole(e.target.value as UserRole)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-sm text-slate-900 dark:text-slate-100"
                                >
                                    <option value="viewer">Viewer (Lectura)</option>
                                    <option value="editor">Editor (Operador)</option>
                                    <option value="admin">Admin (Control Total)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-2 py-3 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-200 dark:shadow-none text-xs tracking-widest uppercase"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 animate-in zoom-in-95 border border-white/20 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">Editar Usuario</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Modifica la información de <span className="text-blue-600 dark:text-blue-400 font-bold">{editingProfile.email}</span></p>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setEditingProfile(null); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="text-slate-400 w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Nombre Completo</label>
                                <div className="relative group">
                                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-semibold text-sm text-slate-900 dark:text-slate-100"
                                        placeholder="ej: Juan Pérez"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Seleccionar Rol</label>
                                <div className="relative group">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                    <select
                                        value={editRole}
                                        onChange={e => setEditRole(e.target.value as UserRole)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-sm text-slate-900 dark:text-slate-100 appearance-none"
                                    >
                                        <option value="viewer">Viewer (Lectura)</option>
                                        <option value="editor">Editor (Operador)</option>
                                        <option value="admin">Admin (Control Total)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Cargo / Puesto</label>
                                <div className="relative group">
                                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                                    <select
                                        value={editPositionId}
                                        onChange={e => setEditPositionId(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-50 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500/30 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-sm text-slate-900 dark:text-slate-100 appearance-none"
                                    >
                                        <option value="">Sin cargo asignado</option>
                                        {positions.map(p => (
                                            <option key={p.id} value={p.id}>{p.title} ({p.department?.name})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditingProfile(null); }}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-2 py-3 bg-slate-900 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-slate-800 dark:hover:bg-blue-700 transition-all shadow-xl shadow-slate-200 dark:shadow-blue-900/40 text-sm tracking-wide disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <th className="px-4 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Colaborador</th>
                                <th className="px-4 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contacto</th>
                                <th className="px-4 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Rol</th>
                                <th className="px-4 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {profiles.map((profile) => (
                                <tr key={profile.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                                    <td className="px-4 py-1.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center group-hover:from-blue-500 group-hover:to-indigo-600 transition-all duration-500 shadow-sm">
                                                <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-white transition-colors" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[13px] text-slate-900 dark:text-slate-100 leading-none mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{profile.full_name || 'Nuevo Usuario'}</p>
                                                <div className="flex items-center gap-2">
                                                    {profile.status === 'pending' && (
                                                        <span className="px-1 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[7px] font-black uppercase tracking-widest rounded border border-amber-100 dark:border-amber-800/30">Pendiente</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {profile.position ? (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded flex items-center gap-1">
                                                            <Briefcase className="w-2 h-2" />
                                                            {profile.position}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600 italic">Sin cargo</span>
                                                    )}
                                                    {profile.department && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded flex items-center gap-1">
                                                            <MapPin className="w-2 h-2" />
                                                            {profile.department}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5">
                                        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{profile.email || 'N/A'}</p>
                                    </td>
                                    <td className="px-4 py-1.5">
                                        <RoleBadge role={profile.role} />
                                    </td>
                                    <td className="px-4 py-1.5 text-right">
                                        <div className="flex justify-end items-center gap-1.5">
                                            <button
                                                onClick={() => openEditModal(profile)}
                                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all border border-slate-100 dark:border-slate-800"
                                                title="Editar Usuario"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </button>

                                            <button
                                                onClick={() => removeMember(profile.id)}
                                                disabled={updating === profile.id || profile.id === user?.id}
                                                className="w-7 h-7 flex items-center justify-center text-rose-300 hover:text-rose-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all border border-slate-100 dark:border-slate-800 disabled:opacity-10"
                                                title="Eliminar de la empresa"
                                            >
                                                <UserMinus className="w-3 h-3" />
                                            </button>

                                            <div className="border-l border-slate-100 dark:border-slate-800 pl-2 ml-1">
                                                <select
                                                    value={profile.role}
                                                    onChange={(e) => updateRole(profile.id, e.target.value as UserRole)}
                                                    disabled={updating === profile.id || profile.id === user?.id}
                                                    className="bg-slate-900 dark:bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-md px-2 py-1 outline-none hover:bg-slate-800 dark:hover:bg-blue-700 transition-all cursor-pointer shadow-sm"
                                                >
                                                    <option value="viewer">VIEW</option>
                                                    <option value="editor">EDIT</option>
                                                    <option value="admin">ADM</option>
                                                </select>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function RoleBadge({ role }: { role: UserRole }) {
    const styles: Record<string, string> = {
        admin: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800",
        editor: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-800",
        viewer: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800",
    };

    return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${styles[role] || styles.viewer}`}>
            {role}
        </span>
    );
}
