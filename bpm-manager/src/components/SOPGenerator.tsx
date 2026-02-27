import { useState } from 'react';
import { FileText, Download, Sparkles, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Activity, Workflow } from '../types';

interface SOPGeneratorProps {
    workflow: Workflow;
    activities: Activity[];
    onClose: () => void;
}

export function SOPGenerator({ workflow, activities, onClose }: SOPGeneratorProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedSOP, setGeneratedSOP] = useState<string | null>(null);

    const generateSOP = async () => {
        setIsGenerating(true);
        // Simulate AI processing
        await new Promise(resolve => setTimeout(resolve, 2500));

        const date = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date());

        let content = `# Manual de Operación Estándar (SOP)\n`;
        content += `**Proceso:** ${workflow.name}\n`;
        content += `**Fecha de Generación:** ${date}\n`;
        content += `**Descripción:** ${workflow.description || 'Sin descripción'}\n\n`;

        content += `## 1. Introducción\n`;
        content += `Este documento describe los pasos detallados para ejecutar el proceso "${workflow.name}". El objetivo es garantizar la consistencia, eficiencia y cumplimiento normativo en cada ejecución.\n\n`;

        content += `## 2. Diagrama de Flujo (Lógica)\n`;
        content += `El proceso consta de ${activities.length} actividades principales organizadas de forma secuencial y condicional.\n\n`;

        content += `## 3. Descripción de Actividades\n\n`;

        activities.forEach((act, index) => {
            content += `### 3.${index + 1}. ${act.name}\n`;
            content += `**Tipo:** ${act.type.toUpperCase()}\n`;
            content += `**Responsable:** ${act.assignment_type === 'specific_user' ? 'Usuario Designado' :
                act.assignment_type === 'department' ? 'Departamento de ' + (act.assigned_department_id || 'Área') :
                    act.assignment_type === 'position' ? 'Cargo específico' : 'Iniciador'}\n`;
            content += `**Tiempo Límite (SLA):** ${act.due_date_hours || 24} horas\n`;
            content += `**Descripción:** ${act.description || 'Realizar las tareas correspondientes a este paso.'}\n\n`;

            if (act.fields && act.fields.length > 0) {
                content += `#### Requisitos de Información (Campos):\n`;
                act.fields.forEach(field => {
                    content += `- **${field.label || field.name}** (${field.type}): ${field.required ? 'Obligatorio' : 'Opcional'}. ${field.placeholder || ''}\n`;
                });
                content += `\n`;
            }

            if (act.action_type && act.action_type !== 'none') {
                content += `> [!NOTE]\n`;
                content += `> **Automatización:** Este paso incluye una integración de tipo ${act.action_type.toUpperCase()}.\n\n`;
            }
        });

        content += `## 4. Control de Cambios\n`;
        content += `- Versión 1.0: Generación inicial mediante Asistente de IA BPM.\n`;

        setGeneratedSOP(content);
        setIsGenerating(false);
    };

    const downloadSOP = () => {
        if (!generatedSOP) return;
        const blob = new Blob([generatedSOP], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SOP_${workflow.name.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">Generador de Manuales (SOP)</h2>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Documentación Automática con IA</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <AlertCircle className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 dark:bg-slate-950/50">
                    {!generatedSOP ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-8">
                            <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm">
                                <FileText className="w-10 h-10 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">Generar Documentación Estándar</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">
                                    Nuestra IA analizará la estructura de tu flujo, las responsabilidades y los campos de datos para redactar un manual de operación detallado.
                                </p>
                            </div>
                            <button
                                onClick={generateSOP}
                                disabled={isGenerating}
                                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Redactando Manual...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        <span>Generar SOP con IA</span>
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">¡Manual generado con éxito!</span>
                                </div>
                                <button
                                    onClick={downloadSOP}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-all shadow-lg"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar Markdown
                                </button>
                            </div>
                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300 leading-relaxed overflow-x-auto">
                                    {generatedSOP}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
