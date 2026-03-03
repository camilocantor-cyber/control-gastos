import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Building2,
    UserCircle,
    Mail,
    Key,
    ShieldAlert,
    CheckCircle2,
    Loader2
} from 'lucide-react';

export function SuperAdminPanel() {
    const [companyName, setCompanyName] = useState('');
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        setSuccessMessage('');

        try {
            // 1. Create user in auth.users
            // Notice: this will log the browser into this new account automatically by Supabase web client behavior
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: adminEmail,
                password: adminPassword,
                options: {
                    data: {
                        full_name: adminName
                    }
                }
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            // 2. We need to wait a second for the profile trigger to create the row in profiles
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 3. Call RPC to create Organization and link it
            const { error: rpcError } = await supabase.rpc('create_new_tenant', {
                new_tenant_name: companyName,
                admin_user_id: authData.user.id
            });

            if (rpcError) throw rpcError;

            // Update local profile directly to ensure it has the org id locally if session changed
            await supabase.from('profiles').update({
                full_name: adminName,
                email: adminEmail
            }).eq('id', authData.user.id);

            setSuccessMessage(`¡Empresa "${companyName}" creada exitosamente! La sesión actual ahora pertenece al administrador de esta nueva empresa.`);
            setCompanyName('');
            setAdminName('');
            setAdminEmail('');
            setAdminPassword('');

        } catch (err: any) {
            console.error('Error creando la empresa:', err);
            setErrorMsg(err.message || 'Ocurrió un error inesperado al crear la empresa.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10 px-4 animate-in fade-in duration-500">
            <div className="mb-8 flex flex-col items-center text-center">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-4">
                    <ShieldAlert className="w-10 h-10" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Registro Maestro de Empresas</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-lg font-medium">
                    Área restringida. Utiliza este formulario para dar de alta a un nuevo cliente (Empresa) y su Administrador principal en la plataforma.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800/50">
                    <span className="flex w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Atención: Al crear la cuenta, tu sesión cambiará automáticamente a la de este nuevo administrador.
                </div>
            </div>

            <div className="bg-white dark:bg-[#080a14] p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                {errorMsg && (
                    <div className="mb-6 p-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-sm font-bold flex gap-3">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <p>{errorMsg}</p>
                    </div>
                )}
                {successMessage && (
                    <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl text-sm font-bold flex gap-3 items-center">
                        <CheckCircle2 className="w-6 h-6 shrink-0" />
                        <p>{successMessage}</p>
                    </div>
                )}

                <form onSubmit={handleCreateCompany} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Company Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">1. Datos de la Empresa</h3>

                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    placeholder="Nombre o Razón Social"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Admin Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">2. Administrador Principal</h3>

                            <div className="relative group">
                                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text"
                                    required
                                    value={adminName}
                                    onChange={e => setAdminName(e.target.value)}
                                    placeholder="Nombre del Administrador"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    placeholder="Correo Electrónico"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-900 dark:text-white"
                                />
                            </div>

                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input
                                    type="text" // Type text usually better here so the admin creating it sees what they type
                                    required
                                    value={adminPassword}
                                    onChange={e => setAdminPassword(e.target.value)}
                                    placeholder="Contraseña Inicial"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 transition-all font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                            {loading ? 'Creando Empresa y Usuario...' : 'Registrar Nueva Empresa'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
