import { useState, useEffect, useRef } from 'react';
import { Upload, X, Loader, FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import { useFileUpload } from '../hooks/useFileUpload';
import { supabase } from '../lib/supabase';

interface Attachment {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    uploaded_at: string;
}

interface FileAttachmentsProps {
    processInstanceId: string;
}

export function FileAttachments({ processInstanceId }: FileAttachmentsProps) {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const { uploadFile, deleteFile, uploading } = useFileUpload();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        loadAttachments();
    }, [processInstanceId]);

    async function loadAttachments() {
        try {
            const { data, error } = await supabase
                .from('process_attachments')
                .select('*')
                .eq('process_instance_id', processInstanceId)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            setAttachments(data || []);
        } catch (err) {
            console.error('Error loading attachments:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const result = await uploadFile(file, processInstanceId);
        if (result) {
            await loadAttachments();
        } else {
            alert('Error al adjuntar archivo. Asegúrate que no pese más de 10MB y sea un formato permitido (PDF, DOCX, XLSX, imágenes, o IFC).');
        }
        e.target.value = '';
    }

    async function handleDelete(attachment: Attachment) {
        if (!confirm(`¿Eliminar "${attachment.file_name}"?`)) return;

        const success = await deleteFile(attachment.id, attachment.file_path);
        if (success) {
            setAttachments(attachments.filter(a => a.id !== attachment.id));
        }
    }

    async function handleOpenApart(attachment: Attachment) {
        try {
            const { data, error } = await supabase.storage
                .from('process-files')
                .createSignedUrl(attachment.file_path, 3600);

            if (error) throw error;

            // Open in new tab to avoid losing form state and provide "Control"
            window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
        } catch (err) {
            console.error('Error opening file:', err);
        }
    }

    function getFileIcon(fileType: string) {
        if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
        if (fileType.includes('image')) return <ImageIcon className="w-5 h-5 text-blue-500" />;
        if (fileType.includes('word') || fileType.includes('officedocument.word')) return <FileText className="w-5 h-5 text-blue-600" />;
        if (fileType.includes('sheet') || fileType.includes('excel')) return <FileText className="w-5 h-5 text-emerald-600" />;
        return <Paperclip className="w-5 h-5 text-slate-500" />;
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 rounded-xl transition-all border flex flex-shrink-0 items-center justify-center gap-2 relative shadow-sm bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 border-slate-100 dark:border-white/5 hover:border-transparent"
                title="Archivos Adjuntos"
            >
                <Paperclip className="w-5 h-5" />
                {attachments.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                        {attachments.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-3 right-0 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-blue-900/5 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-300">
                            <Paperclip className="w-4 h-4 text-blue-600" />
                            ANEXOS
                        </div>
                        <label className="cursor-pointer">
                            <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                            <div className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer">
                                {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                {uploading ? 'Subiendo...' : 'Subir'}
                            </div>
                        </label>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {loading ? (
                            <div className="p-4 text-center text-[11px] font-bold text-slate-400 flex items-center justify-center gap-2">
                                <Loader className="w-4 h-4 animate-spin" /> Cargando archivos...
                            </div>
                        ) : attachments.length === 0 ? (
                            <div className="p-4 text-center text-[11px] font-bold text-slate-400 italic">
                                No hay archivos adjuntos
                            </div>
                        ) : (
                            attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    onClick={() => handleOpenApart(attachment)}
                                    className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all group cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                >
                                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all duration-300 shadow-sm
                                        ${attachment.file_type.includes('pdf')
                                            ? 'bg-rose-50 border-rose-100/50 text-rose-500'
                                            : attachment.file_type.includes('image')
                                                ? 'bg-blue-50 border-blue-100/50 text-blue-500'
                                                : attachment.file_type.includes('sheet') || attachment.file_type.includes('excel')
                                                    ? 'bg-emerald-50 border-emerald-100/50 text-emerald-500'
                                                    : 'bg-indigo-50 border-indigo-100/50 text-indigo-500'}`}>
                                        {getFileIcon(attachment.file_type)}
                                    </div>
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={attachment.file_name}>
                                            {attachment.file_name}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                {(attachment.file_size / 1024).toFixed(0)} KB
                                            </span>
                                            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                            <span className="text-[8px] font-black text-blue-500/70 dark:text-blue-400/70 uppercase tracking-widest truncate">
                                                {attachment.file_type.split('/')[1]?.toUpperCase() || 'ARCHIVO'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(attachment);
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
