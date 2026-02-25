import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, ArrowRight, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

export function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

    useEffect(() => {
        // Check if we have a valid recovery token
        const checkToken = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsValidToken(!!session);
        };
        checkToken();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            setSuccess(true);

            // Redirect to home after 3 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    if (isValidToken === null) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-white"></div>
            </div>
        );
    }

    if (isValidToken === false) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated Background */}
                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                <div className="max-w-md w-full bg-[#0f172a]/40 backdrop-blur-3xl rounded-3xl border border-white/10 p-12 text-center relative z-10">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-rose-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                        Enlace Inválido o Expirado
                    </h2>
                    <p className="text-slate-400 font-semibold leading-relaxed mb-8">
                        Este enlace de recuperación no es válido o ha expirado. Por favor, solicita un nuevo enlace de recuperación.
                    </p>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-blue-500 hover:text-white transition-all"
                    >
                        Volver al inicio
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="max-w-md w-full bg-[#0f172a]/40 backdrop-blur-3xl rounded-3xl border border-white/10 overflow-hidden relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <div className="p-8 md:p-12">
                    {!success ? (
                        <>
                            {/* Header */}
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                    <KeyRound className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                                    Nueva Contraseña
                                </h2>
                                <p className="text-slate-400 font-semibold leading-relaxed">
                                    Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta.
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-12 pr-6 py-4.5 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 font-semibold pl-1">
                                        Mínimo 6 caracteres
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                        Confirmar Contraseña
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-12 pr-6 py-4.5 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700"
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl text-rose-400 text-sm font-black animate-shake flex items-center gap-3">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full group relative flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            Restablecer Contraseña
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Success State */
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-scaleIn">
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                                ¡Contraseña Actualizada!
                            </h2>
                            <p className="text-slate-400 font-semibold leading-relaxed mb-6">
                                Tu contraseña ha sido restablecida exitosamente.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-bold">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                Redirigiendo al inicio de sesión...
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] z-20">
                &copy; {new Date().getFullYear()} BPM Manager • High Productivity Platform
            </p>
        </div>
    );
}
