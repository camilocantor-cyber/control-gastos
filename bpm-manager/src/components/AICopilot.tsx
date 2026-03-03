import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { askAICopilot } from '../services/aiService';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface AICopilotProps {
    processContext: any;
    formData: any;
    bimObject?: any;
    bimStates?: Record<number, any>;
}

export function AICopilot({ processContext, formData, bimObject, bimStates }: AICopilotProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'assistant', content: '¡Hola! Soy tu Asistente IA. Puedo ayudarte analizando los datos actuales de esta tarea, recordando políticas o dando sugerencias. ¿En qué te ayudo?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [apiKey] = useState(localStorage.getItem('bpm_openai_key') || '');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    // BIMind Auto-open on selection
    useEffect(() => {
        if (bimObject && !isOpen) {
            setIsOpen(true);
            const status = bimStates?.[bimObject.id] || 'pending';
            const statusLabels: Record<string, string> = {
                'pending': 'Pendiente',
                'processing': 'En Proceso',
                'completed': 'Completado',
                'delayed': 'Retrasado'
            };
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: `🔍 He detectado que seleccionaste: **${bimObject.name}**. Su estado actual es **${statusLabels[status] || status}**. ¿Qué te gustaría saber sobre este elemento o cómo afecta al proceso?`
            }]);
        }
    }, [bimObject]);

    const handleSend = async (messageOverride?: string) => {
        const textToSend = messageOverride || input.trim();
        if (!textToSend || isLoading) return;
        if (!apiKey) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: '❌ Por favor configura tu API Key de OpenAI en el Arquitecto IA primero para poder usar el Co-Piloto.' }]);
            return;
        }

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMsg]);
        if (!messageOverride) setInput('');
        setIsLoading(true);

        try {
            let contextStr = `Proceso: ${processContext?.workflows?.name}\nActividad Actual: ${processContext?.activities?.name}\nDatos del formulario actual: ${JSON.stringify(formData)}`;

            if (bimObject) {
                const currentStatus = bimStates?.[bimObject.id] || 'pending';
                contextStr += `\n\nCONTEXTO BIM SELECCIONADO:\nID Objeto (ExpressID): ${bimObject.id}\nNombre: ${bimObject.name}\nTipo IFC: ${bimObject.type}\nEstado Actual: ${currentStatus}\nPropiedades Crudas: ${JSON.stringify(bimObject.rawProps || {})}`;
            }

            if (bimStates && Object.keys(bimStates).length > 0) {
                contextStr += `\n\nRESUMEN DE ESTADOS BIM DEL PROCESO:\n${JSON.stringify(bimStates)}`;
            }

            const reply = await askAICopilot(userMsg.content, contextStr, apiKey);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
        } catch (error: any) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${error.message}` }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[70] flex flex-col items-end">
            {/* Main Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-105 transition-all group border-2 border-white/20 dark:border-slate-800"
                >
                    <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
                    <span className="absolute -top-2 -right-2 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-purple-500"></span>
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px] max-h-[80vh] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md z-10">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            <h3 className="font-bold text-sm tracking-wide">{bimObject ? 'BIMind Assistant' : 'Co-Piloto IA'}</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50 custom-scrollbar">
                        {messages.map(msg => (
                            <div key={msg.id} className={clsx("flex flex-col max-w-[85%]", msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                                <div className={clsx(
                                    "p-3 rounded-2xl text-xs sm:text-sm shadow-sm",
                                    msg.role === 'user'
                                        ? "bg-indigo-600 text-white rounded-tr-sm"
                                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-sm"
                                )}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="mr-auto items-start max-w-[85%] flex">
                                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2 text-indigo-500">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs font-medium">Analizando...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                placeholder="Pregunta algo sobre esta tarea..."
                                className="w-full bg-slate-100 dark:bg-slate-800 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:ring-0 rounded-xl pl-4 pr-12 py-3 text-sm transition-all"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
