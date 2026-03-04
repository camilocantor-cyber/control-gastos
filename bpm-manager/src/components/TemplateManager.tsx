import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Loader2, Download, Trash2, Search, FileSignature } from 'lucide-react';
import { useTemplateUpload } from '../hooks/useTemplateUpload';
import type { WorkflowTemplate } from '../types';
import { toast } from 'sonner';
import { cn } from '../utils/cn';

interface TemplateManagerProps {
    workflowId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function TemplateManager({ workflowId, isOpen, onClose }: TemplateManagerProps) {
    const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form and Ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadTemplate, deleteTemplate, loadTemplates, downloadTemplate, uploading, error } = useTemplateUpload();

    const fetchTemplates = async () => {
        setIsLoading(true);
        const data = await loadTemplates(workflowId);
        setTemplates(data);
        setIsLoading(false);
    };

    // Load templates when opened
    useEffect(() => {
        if (isOpen && workflowId) {
            fetchTemplates();
        }
    }, [isOpen, workflowId, loadTemplates]);

    // Show error toast
    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            const files = Array.from(e.target.files);
            await processFiles(files);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const processFiles = async (files: File[]) => {
        const docxFiles = files.filter(file => file.name.toLowerCase().endsWith('.docx'));

        if (docxFiles.length === 0) {
            toast.warning('Solo se permiten archivos de Microsoft Word (.docx)');
            return;
        }

        for (const file of docxFiles) {
            const template = await uploadTemplate(file, workflowId);
            if (template) {
                toast.success(`Plantilla "${file.name}" subida exitosamente`);
                await fetchTemplates(); // Refresh list after each successful upload
            }
        }
    };

    const handleDelete = async (template: WorkflowTemplate) => {
        if (window.confirm(`¿Seguro que deseas eliminar la plantilla "${template.name}"? Cualquier acción automática configurada usándola podría fallar.`)) {
            const success = await deleteTemplate(template.id, template.file_path);
            if (success) {
                toast.success('Plantilla eliminada');
                setTemplates(prev => prev.filter(t => t.id !== template.id));
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                            <FileSignature className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Plantillas de Documentos</h2>
                            <p className="text-sm text-slate-500 font-medium mt-0.5">Sube archivos .docx para autogenerarlos después.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="p-6 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">

                    {/* Upload Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50 dark:bg-slate-950/50",
                            isDragging
                                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                                : "border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-800 hover:bg-slate-50 dark:hover:bg-slate-900/50",
                            uploading && "opacity-50 pointer-events-none"
                        )}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            multiple
                            onChange={handleFileSelect}
                            disabled={uploading}
                        />

                        <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto mb-4">
                            {uploading ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : (
                                <Upload className="w-8 h-8" />
                            )}
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
                            {uploading ? 'Subiendo plantilla...' : 'Arrastra y suelta tu plantilla .docx aquí'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-6 max-w-sm">
                            Puedes usar tags como <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-violet-600 dark:text-violet-400 font-bold">{"{{nombre_campo}}"}</code> dentro del documento para inyectar los datos del formulario.
                        </p>

                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-sm transition-all shadow-violet-500/20 hover:shadow-violet-500/40"
                        >
                            Examinar Equipo
                        </button>
                    </div>

                    {/* Templates List */}
                    <div className="flex flex-col gap-3">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center justify-between">
                            Plantillas Guardadas
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full text-xs">
                                {templates.length}
                            </span>
                        </h4>

                        {isLoading ? (
                            <div className="py-12 flex justify-center">
                                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 text-center px-4">
                                <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-base font-bold text-slate-600 dark:text-slate-400">Sin plantillas</p>
                                <p className="text-sm">Aún no hay plantillas asociadas a este flujo.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {templates.map(template => (
                                    <div key={template.id} className="flex items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex-shrink-0 w-12 h-12 bg-[#2B579A]/10 text-[#2B579A] rounded-xl flex items-center justify-center mr-4">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                                {template.name}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                                                <span>{(template.file_size / 1024).toFixed(1)} KB</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                <span>{new Date(template.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => downloadTemplate(template.file_path, template.name)}
                                                className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors"
                                                title="Descargar"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(template)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
