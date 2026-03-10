import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Lock, Loader2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export function Login() {
    const { signInWithPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await signInWithPassword(email, password);
            if (error) throw new Error(error);
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Error al iniciar sesión. Verifica tus credenciales.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-8 right-20 w-72 h-72 bg-slate-900 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>

            <div className="max-w-md w-full bg-[#0f172a]/40 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl p-10 relative z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="bg-gradient-to-br from-blue-700 to-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-blue-500/20 mb-6 group transition-transform hover:rotate-6">
                        <Wallet className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Control de Gastos</h1>
                    <p className="text-slate-400 font-medium mt-2">Inicia sesión con tu cuenta de BPM Manager</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold rounded-2xl animate-shake flex items-center gap-3">
                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Email Profesional</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700"
                                placeholder="correo@empresa.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <ArrowRight className="w-6 h-6" />}
                        {loading ? 'Verificando...' : 'Entrar al Dashboard'}
                    </button>
                </form>

                <div className="mt-10 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">Seguro</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                        <Zap className="w-4 h-4 text-blue-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase">Rápido</span>
                    </div>
                </div>

                <p className="mt-10 text-center text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    &copy; {new Date().getFullYear()} CONTROL GASTOS • BPM POWERED
                </p>
            </div>
        </div>
    );
}
