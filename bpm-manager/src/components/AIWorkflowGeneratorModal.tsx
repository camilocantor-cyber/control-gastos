import React, { useState } from 'react';
import { X, Wand2, Loader2, Key, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Activity } from '../types';

interface AIWorkflowGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (activities: Activity[], method: 'replace' | 'append') => void;
}

export function AIWorkflowGeneratorModal({ isOpen, onClose, onGenerate }: AIWorkflowGeneratorModalProps) {
    const [prompt, setPrompt] = useState('');
    const [apiKey, setApiKey] = useState(localStorage.getItem('bpm_openai_key') || '');
    const [method, setMethod] = useState<'replace' | 'append'>('replace');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError("Por favor, ingresa una descripción del proceso.");
            return;
        }
        if (!apiKey.trim()) {
            setError("Se requiere una API Key de OpenAI válida.");
            return;
        }

        setError(null);
        setIsGenerating(true);

        try {
            // Guardar API key en localStorage para conveniencia
            localStorage.setItem('bpm_openai_key', apiKey);

            // Importar dinámicamente el servicio para evitar cargar todo de una vez
            const { generateWorkflowWithAI } = await import('../services/aiService');

            const activities = await generateWorkflowWithAI(prompt, apiKey);
            onGenerate(activities, method);
            onClose();
            setPrompt('');
        } catch (err: any) {
            console.error("Error generating workflow:", err);
            setError(err.message || "Ocurrió un error al generar el flujo.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col border border-indigo-500/20">

                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Arquitecto IA
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Describe tu proceso y la IA creará el flujo por ti.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        disabled={isGenerating}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-start gap-3 border border-red-100 dark:border-red-900/30">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* API Key */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Key className="w-4 h-4 text-gray-400" />
                            OpenAI API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white dark:placeholder-gray-500 text-sm"
                        />
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Tu API key se guarda localmente en tu navegador.
                        </p>
                    </div>

                    {/* Prompt */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between">
                            <span>Descripción del Proceso</span>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400">Sé tan detallado como quieras</span>
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ejemplo: Necesito un flujo para solicitud de vacaciones. El primer paso es que el empleado llene sus datos y fechas. El segundo paso es que su jefe lo apruebe o rechace. Si se aprueba, el tercer paso es que RRHH lo registre en el sistema."
                            className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white resize-none text-sm leading-relaxed"
                        />
                    </div>

                    {/* Method */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Modo de Inserción
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMethod('replace')}
                                className={cn(
                                    "px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                                    method === 'replace'
                                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                <X className="w-4 h-4" />
                                Reemplazar Todo
                            </button>
                            <button
                                type="button"
                                onClick={() => setMethod('append')}
                                className={cn(
                                    "px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2",
                                    method === 'append'
                                        ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                                )}
                            >
                                <span className="text-lg leading-none">+</span>
                                Añadir al Final
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim() || !apiKey.trim()}
                        className={cn(
                            "px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-md flex items-center gap-2",
                            isGenerating
                                ? "bg-indigo-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 hover:shadow-lg hover:-translate-y-0.5"
                        )}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generando Magia...
                            </>
                        ) : (
                            <>
                                <Wand2 className="w-5 h-5" />
                                Generar Flujo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
