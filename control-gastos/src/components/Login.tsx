import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, Mail, Loader2, ArrowRight } from 'lucide-react';

export function Login() {
    const { signIn, verifyOtp } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);

    const handleSendLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await signIn(email);
            if (error) throw error;
            setSent(true);
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Error al enviar e-mail');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setOtpLoading(true);
        setError('');

        try {
            const { error } = await verifyOtp(email, otp);
            if (error) throw error;
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Código inválido');
        } finally {
            setOtpLoading(false);
        }
    }


    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-600 p-3 rounded-full text-white shadow-lg shadow-blue-200 mb-4">
                        <Wallet className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Bienvenido</h1>
                    <p className="text-slate-500 text-center">
                        {sent ? 'Revisa tu correo' : 'Ingresa tu correo para continuar'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100">
                        {error}
                    </div>
                )}

                {!sent ? (
                    <form onSubmit={handleSendLink} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                            {loading ? 'Enviando...' : 'Enviar Código Mágico'}
                        </button>
                        <p className="text-xs text-center text-slate-400 mt-4">
                            Te enviaremos un código temporal para iniciar sesión de forma segura.
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="text-center mb-4">
                            <p className="text-sm text-slate-600">Hemos enviado un código de 6 dígitos a <strong>{email}</strong>.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Código de verificación</label>
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center text-2xl tracking-widest font-mono"
                                placeholder="000000"
                                maxLength={6}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={otpLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
                        >
                            {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                            {otpLoading ? 'Verificando...' : 'Verificar Código'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSent(false)}
                            className="w-full text-slate-400 hover:text-slate-600 text-sm mt-2"
                        >
                            Volver / Cambiar correo
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
