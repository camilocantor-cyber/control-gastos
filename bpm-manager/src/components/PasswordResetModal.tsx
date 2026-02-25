import React, { useState } from 'react';
import { Mail, X, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface PasswordResetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PasswordResetModal({ isOpen, onClose }: PasswordResetModalProps) {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: resetError } = await resetPassword(email);

        if (resetError) {
            setError(resetError);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Auto-close after 3 seconds
            setTimeout(() => {
                handleClose();
            }, 3000);
        }
    };

    const handleClose = () => {
        setEmail('');
        setError(null);
        setSuccess(false);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md bg-[#0f172a] rounded-3xl border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-slideUp">
                {/* Animated Background Gradient */}
                <div className="absolute top-0 -left-4 w-48 h-48 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group z-10"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                </button>

                {/* Content */}
                <div className="relative p-8 md:p-12">
                    {!success ? (
                        <>
                            {/* Header */}
                            <div className="mb-8">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                                    <KeyRound className="w-8 h-8 text-white" />
                                </div>
                                <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                                    Recuperar Contraseña
                                </h2>
                                <p className="text-slate-400 font-semibold leading-relaxed">
                                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                                        Email Profesional
                                    </label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="correo@empresa.com"
                                            className="w-full pl-12 pr-6 py-4.5 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700"
                                            autoFocus
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
                                            Enviar Enlace
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="mt-8 pt-6 border-t border-white/5">
                                <button
                                    onClick={handleClose}
                                    className="w-full text-center text-sm font-bold text-slate-500 hover:text-blue-400 transition-colors"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Success State */
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-scaleIn">
                                <CheckCircle2 className="w-10 h-10 text-white" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
                                ¡Correo Enviado!
                            </h2>
                            <p className="text-slate-400 font-semibold leading-relaxed mb-2">
                                Revisa tu bandeja de entrada en:
                            </p>
                            <p className="text-blue-400 font-black text-lg mb-6">
                                {email}
                            </p>
                            <p className="text-sm text-slate-500 font-semibold">
                                Haz clic en el enlace del correo para restablecer tu contraseña.
                            </p>
                            <div className="mt-8">
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-bold">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                    Cerrando automáticamente...
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
