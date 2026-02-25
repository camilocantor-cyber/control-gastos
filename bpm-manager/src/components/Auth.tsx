import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User as UserIcon, ArrowRight, ShieldCheck, Zap, LayoutDashboard, Database, Sparkles, KeyRound } from 'lucide-react';
import { PasswordResetModal } from './PasswordResetModal';

// Simple in-memory store for dev codes (in production, use a proper backend)
const devCodes = new Map<string, { code: string; timestamp: number }>();

export function Auth() {
    const [isLogin, setIsLogin] = useState(true);
    const [useMagicCode, setUseMagicCode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [codeSent, setCodeSent] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const generateCode = () => {
        return Math.floor(100000 + Math.random() * 900000).toString();
    };

    const handleSendCode = async () => {
        if (!email) {
            setError('Por favor ingresa tu email');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const code = generateCode();
            const timestamp = Date.now();

            // Store code with timestamp (expires in 10 minutes)
            devCodes.set(email.toLowerCase(), { code, timestamp });

            // Log to console for development
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔐 CÓDIGO DE VERIFICACIÓN');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📧 Email: ${email}`);
            console.log(`🔑 Código: ${code}`);
            console.log(`⏰ Válido por: 10 minutos`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            setCodeSent(true);
            setSuccess(`¡Código enviado! Revisa la consola del navegador (F12) para ver tu código de 6 dígitos.`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        setLoading(true);
        setError(null);

        try {
            const storedData = devCodes.get(email.toLowerCase());

            if (!storedData) {
                throw new Error('No se encontró un código para este email. Solicita uno nuevo.');
            }

            // Check if code expired (10 minutes)
            const now = Date.now();
            const tenMinutes = 10 * 60 * 1000;
            if (now - storedData.timestamp > tenMinutes) {
                devCodes.delete(email.toLowerCase());
                throw new Error('El código ha expirado. Solicita uno nuevo.');
            }

            if (verificationCode !== storedData.code) {
                throw new Error('Código incorrecto. Verifica e intenta de nuevo.');
            }

            // Code is valid, sign in with OTP
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true,
                },
            });

            if (error) throw error;

            // Clean up used code
            devCodes.delete(email.toLowerCase());
            setSuccess('¡Código verificado! Iniciando sesión...');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (useMagicCode && !codeSent) {
            await handleSendCode();
            return;
        }

        if (useMagicCode && codeSent) {
            await handleVerifyCode();
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (isLogin) {
                // Password Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                // Sign Up
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        },
                    },
                });
                if (error) throw error;
                setSuccess('Registro exitoso. Revisa tu correo para confirmar la cuenta.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden selection:bg-blue-500/30">
            {/* Animated Dynamic Background */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 bg-[#0f172a]/40 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden relative z-10 scale-100 transition-transform duration-500 hover:shadow-blue-500/5">

                {/* Visual Section: Showcases value and branding */}
                <div className="hidden lg:flex flex-col justify-between p-16 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 relative group">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] flex-1"></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-12">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform">
                                <Zap className="w-7 h-7 text-white fill-white/20" />
                            </div>
                            <span className="text-3xl font-black text-white tracking-widest uppercase">BPM FLOW</span>
                        </div>

                        <div className="space-y-8 mt-12">
                            <h2 className="text-5xl font-black text-white leading-[1.1]">
                                El futuro del <br />
                                <span className="text-blue-400 bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-200">modelado de negocios.</span>
                            </h2>
                            <p className="text-xl text-blue-100/70 font-medium leading-relaxed max-w-md">
                                Construye, automatiza y escala tus flujos de trabajo con una interfaz diseñada para la excelencia.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 grid grid-cols-2 gap-4">
                        <Feature icon={Database} label="Data Persistente" />
                        <Feature icon={LayoutDashboard} label="Dashboard Real-time" />
                        <Feature icon={ShieldCheck} label="Seguridad Bancaria" />
                        <Feature icon={Zap} label="Desempeño Ultra-Rápido" />
                    </div>
                </div>

                {/* Authentication Form Section */}
                <div className="flex flex-col justify-center p-8 md:p-20 relative bg-[#020617]/50 lg:bg-transparent">
                    <div className="mb-12">
                        <h3 className="text-4xl font-black text-white mb-3 tracking-tight">
                            {isLogin ? 'Acceder' : 'Crea tu cuenta'}
                        </h3>
                        <p className="text-slate-500 font-semibold tracking-wide">
                            {isLogin ? 'Continúa optimizando tu empresa.' : 'Únete a la nueva era del BPM.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!isLogin && !useMagicCode && (
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                                <div className="relative group">
                                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Camilo Cantor"
                                        className="w-full pl-12 pr-6 py-4.5 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Email Profesional</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@empresa.com"
                                    disabled={codeSent}
                                    className="w-full pl-12 pr-6 py-4.5 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {!useMagicCode && (
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Contraseña</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-12 pr-6 py-4.5 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700"
                                    />
                                </div>
                            </div>
                        )}

                        {useMagicCode && codeSent && (
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Código de Verificación</label>
                                <div className="relative group">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        placeholder="123456"
                                        maxLength={6}
                                        className="w-full pl-12 pr-6 py-4.5 bg-white/5 border-2 border-white/5 rounded-2xl focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-white font-bold placeholder:text-slate-700 text-center text-2xl tracking-[0.5em]"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 font-semibold pl-1">
                                    💡 Abre la consola del navegador (F12) para ver tu código
                                </p>
                            </div>
                        )}

                        {isLogin && !codeSent && (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseMagicCode(!useMagicCode);
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group"
                                >
                                    <Sparkles className={`w-4 h-4 ${useMagicCode ? 'text-blue-400 fill-blue-400/20' : ''} transition-all`} />
                                    {useMagicCode ? 'Usar contraseña' : 'Usar código de verificación (sin contraseña)'}
                                </button>

                                {!useMagicCode && (
                                    <button
                                        type="button"
                                        onClick={() => setShowResetModal(true)}
                                        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors group"
                                    >
                                        <KeyRound className="w-4 h-4" />
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                )}
                            </div>
                        )}

                        {codeSent && (
                            <button
                                type="button"
                                onClick={() => {
                                    setCodeSent(false);
                                    setVerificationCode('');
                                    setError(null);
                                    setSuccess(null);
                                }}
                                className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-400 transition-colors"
                            >
                                ← Solicitar nuevo código
                            </button>
                        )}

                        {success && (
                            <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-2xl text-emerald-400 text-sm font-black flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                {success}
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl text-rose-400 text-sm font-black animate-shake flex items-center gap-3">
                                <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group relative flex items-center justify-center gap-3 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-blue-700 hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-blue-500/40"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {useMagicCode && !codeSent ? 'Enviar código' : (codeSent ? 'Verificar código' : (isLogin ? 'Entrar al Dashboard' : 'Crear mi cuenta'))}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-12 border-t border-white/5">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="w-full text-center group"
                        >
                            <span className="text-sm font-bold text-slate-500 group-hover:text-blue-400 transition-colors">
                                {isLogin ? '¿Aún no tienes acceso? ' : '¿Ya eres miembro? '}
                            </span>
                            <span className="text-sm font-black text-white group-hover:text-blue-500 underline underline-offset-4 decoration-blue-500 transition-all ml-1">
                                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Minimalist Footer */}
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] z-20">
                &copy; {new Date().getFullYear()} BPM Manager • High Productivity Platform
            </p>

            {/* Password Reset Modal */}
            <PasswordResetModal
                isOpen={showResetModal}
                onClose={() => setShowResetModal(false)}
            />
        </div>
    );
}

function Feature({ icon: Icon, label }: { icon: any, label: string }) {
    return (
        <div className="flex flex-col gap-2 p-4 bg-white/5 backdrop-blur-md rounded-[1.5rem] border border-white/10 hover:bg-white/10 transition-colors">
            <Icon className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-wider">{label}</span>
        </div>
    );
}
