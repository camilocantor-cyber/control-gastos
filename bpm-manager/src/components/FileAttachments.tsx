import { useState, useEffect } from 'react';
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
    const { uploadFile, deleteFile, uploading } = useFileUpload();

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
        <div className="flex items-center gap-4 h-full">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-200/60 dark:border-slate-800 h-8 flex-shrink-0">
                <div className="flex flex-col">
                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Anexos</h3>
                    <p className="text-[8px] font-bold text-slate-300 dark:text-slate-500 uppercase leading-none text-right">{attachments.length} archivos</p>
                </div>
                <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                    <div className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-md active:scale-90 flex items-center justify-center gap-1">
                        {uploading ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    </div>
                </label>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-1.5 py-1 min-w-0 mask-linear-fade">
                {loading ? (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        <Loader className="w-3 h-3 animate-spin" /> Cargando...
                    </div>
                ) : attachments.length === 0 ? (
                    <span className="text-[10px] font-bold text-slate-300 italic whitespace-nowrap">No hay archivos adjuntos</span>
                ) : (
                    attachments.map((attachment) => (
                        <div
                            key={attachment.id}
                            onClick={() => handleOpenApart(attachment)}
                            className="flex items-center gap-2.5 pl-2 pr-10 py-1 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-800/60 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all group relative flex-shrink-0 min-w-[155px] cursor-pointer"
                        >
                            {/* Miniature scaled down */}
                            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all duration-300 shadow-sm
                                ${attachment.file_type.includes('pdf')
                                    ? 'bg-rose-50 border-rose-100/50 text-rose-500'
                                    : attachment.file_type.includes('image')
                                        ? 'bg-blue-50 border-blue-100/50 text-blue-500'
                                        : 'bg-indigo-50 border-indigo-100/50 text-indigo-500'}`}>
                                {getFileIcon(attachment.file_type)}
                            </div>

                            <div className="flex flex-col min-w-0 flex-1 ml-0.5">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {attachment.file_name}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                        {(attachment.file_size / 1024).toFixed(0)} KB
                                    </span>
                                    <div className="w-0.5 h-0.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                                    <span className="text-[8px] font-black text-blue-500/70 dark:text-blue-400/70 uppercase tracking-widest">
                                        {attachment.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                                    </span>
                                </div>
                            </div>

                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md pl-1.5 py-1 rounded-lg">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(attachment);
                                    }}
                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                                    title="Eliminar"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
