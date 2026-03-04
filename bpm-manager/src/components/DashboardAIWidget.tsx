import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { askDashboardAI } from '../services/aiService';
import type { AIProviderName } from '../services/aiService';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useDashboardAnalytics } from '../hooks/useDashboardAnalytics';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function DashboardAIWidget() {
    const { user } = useAuth();
    const stats = useDashboardStats();
    const analytics = useDashboardAnalytics();

    // AI State
    const [isOpen, setIsOpen] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    // Provider Config
    const [provider, setProvider] = useState<AIProviderName>('gemini');
    const [apiKey, setApiKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [showConfig, setShowConfig] = useState(false);

    // Initial load from localStorage as fallback
    useEffect(() => {
        setApiKey(localStorage.getItem('bpm_openai_key') || '');
        setGeminiKey(localStorage.getItem('bpm_gemini_key') || '');
    }, []);

    // Load from Organization Settings
    useEffect(() => {
        async function loadOrgSettings() {
            if (!user?.organization_id) {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('organizations')
                    .select('settings')
                    .eq('id', user.organization_id)
                    .single();

                if (!error && data?.settings) {
                    const settings = data.settings;
                    if (settings.AI_OPENAI_KEY) setApiKey(settings.AI_OPENAI_KEY);
                    if (settings.AI_GEMINI_KEY) setGeminiKey(settings.AI_GEMINI_KEY);
                    if (settings.AI_DEFAULT_PROVIDER) setProvider(settings.AI_DEFAULT_PROVIDER as AIProviderName);
                }
            } catch (err) {
                console.error('Error loading AI settings from org:', err);
            }
        }
        loadOrgSettings();
    }, [user?.organization_id]);

    // Extra Data Snapshot
    const [extraData, setExtraData] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatHistory, isOpen, isThinking]);

    const activeKey = provider === 'openai' ? apiKey : geminiKey;

    // Load deep stats for AI context (costs, all user speeds, etc)
    const prepareDeepContext = async () => {
        if (!user?.organization_id) return null;
        try {
            // Fetch process instances cost data
            const { data: costData } = await supabase
                .from('process_instances')
                .select('id, total_cost, workflows(name)')
                .eq('organization_id', user.organization_id)
                .not('total_cost', 'is', null);

            // Group costs by workflow
            const costByWf: Record<string, number> = {};
            costData?.forEach(p => {
                const wfData = Array.isArray(p.workflows) ? p.workflows[0] : p.workflows;
                const name = wfData?.name || 'Desconocido';
                costByWf[name] = (costByWf[name] || 0) + (Number(p.total_cost) || 0);
            });

            // Fetch a dump of process history to analyze active tasks and delays
            const { data: historyData } = await supabase
                .from('process_history')
                .select('process_id, action, created_at, profiles(full_name)')
                .order('created_at', { ascending: false })
                .limit(500);

            return {
                costosTotalesPorFlujo: costByWf,
                ultimos500EventosHistóricos: historyData?.map(h => ({
                    accion: h.action,
                    usuario: (h.profiles as any)?.full_name || 'Desconocido',
                    fecha: h.created_at
                }))
            };
        } catch (e) {
            console.error(e);
            return null;
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isThinking) return;

        if (!activeKey) {
            setShowConfig(true);
            toast.error("Por favor, configura tu API Key primero.");
            return;
        }

        const userMsg = prompt.trim();
        setPrompt('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsThinking(true);

        try {
            // Save key
            if (provider === 'openai') localStorage.setItem('bpm_openai_key', apiKey);
            if (provider === 'gemini') localStorage.setItem('bpm_gemini_key', geminiKey);

            // Pre-load extra context if not loaded yet
            let deepContext = extraData;
            if (!deepContext) {
                deepContext = await prepareDeepContext();
                setExtraData(deepContext);
            }

            const aiResponse = await askDashboardAI(
                userMsg,
                activeKey,
                { ...analytics, contextExtra: deepContext },
                stats,
                provider
            );

            setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);

        } catch (error: any) {
            toast.error(error.message || 'Error consultando al agente IA');
            setChatHistory(prev => [...prev, { role: 'ai', content: `❌ Error: ${error.message}` }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300 w-full mb-2">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none text-white overflow-hidden relative">
                        <Sparkles className="w-4 h-4 absolute opacity-30 animate-pulse" />
                        <Bot className="w-5 h-5 z-10" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Copilot Director</h2>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Chat con tus datos operacionales</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-500 hover:text-blue-600 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                    >
                        {showConfig ? 'Ocultar Config' : 'Configurar IA'}
                    </button>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="px-4 py-1.5 text-[10px] font-black uppercase text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 dark:shadow-none rounded-lg transition-colors"
                    >
                        {isOpen ? 'Cerrar Chat' : 'Abrir Chat'}
                    </button>
                </div>
            </div>

            {isOpen && (
                <div className="flex flex-col h-[250px]">
                    {showConfig && (
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Motor IA</label>
                                <select
                                    className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value as AIProviderName)}
                                >
                                    <option value="openai">OpenAI (GPT-4o Mini)</option>
                                    <option value="gemini">Google Gemini 2.5 Flash</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">API Key</label>
                                <input
                                    type="password"
                                    value={provider === 'openai' ? apiKey : geminiKey}
                                    onChange={(e) => provider === 'openai' ? setApiKey(e.target.value) : setGeminiKey(e.target.value)}
                                    placeholder="sk-... o AIza..."
                                    className="w-full text-xs font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex-1 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 space-y-4 custom-scrollbar">
                        {chatHistory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-50 px-6 text-center">
                                <Bot className="w-10 h-10 text-slate-400 mb-3" />
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">¡Hola! Soy tu asistente directivo.</p>
                                <p className="text-[10px] text-slate-500 mt-2">Puedes preguntarme cosas como: <br />"¿Cuál es el proceso que genera más cuellos de botella?" <br />"¿Quién es el usuario que tiene más tareas pendientes?" <br />"Resume los costos totales por workflow."</p>
                            </div>
                        ) : (
                            chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`shadow-sm max-w-[85%] rounded-2xl px-4 py-3 text-[12px] ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                                        }`}>
                                        <div className="prose dark:prose-invert prose-sm max-w-none text-[12px] leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMarkdownAsHtml(msg.content) }} />
                                    </div>
                                </div>
                            ))
                        )}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 rounded-tl-sm flex gap-2 items-center">
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                    <span className="text-xs font-bold text-slate-400 animate-pulse">Analizando operaciones...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleAsk} className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Escribe tu consulta analítica aquí..."
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!prompt.trim() || isThinking}
                                className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

// Simple bold parsing for AI responses
function formatMarkdownAsHtml(text: string): string {
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\n/g, '<br/>');
    return html;
}
