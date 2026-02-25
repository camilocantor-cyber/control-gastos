import { X, Download, ZoomIn, ZoomOut, RotateCw, FileText, Image as ImageIcon, Paperclip } from 'lucide-react';
import { useState, useEffect } from 'react';

interface FilePreviewModalProps {
    fileUrl: string;
    fileName: string;
    fileType: string;
    onClose: () => void;
    onDownload: () => void;
}

export function FilePreviewModal({ fileUrl, fileName, fileType, onClose, onDownload }: FilePreviewModalProps) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);

    const isImage = fileType.includes('image');
    const isPDF = fileType.includes('pdf');

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-2xl animate-in fade-in duration-300 pointer-events-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Close button outside for quick access */}
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all z-[110] hover:scale-110 active:scale-90 border border-white/20"
                title="Cerrar (Esc)"
            >
                <X className="w-6 h-6" />
            </button>

            <div
                className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-6xl shadow-[0_0_80px_-20px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300 flex flex-col border border-white/10 overflow-hidden relative"
                style={{ height: '90vh' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Compacted */}
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shadow-sm ${isImage ? 'bg-blue-500/10 text-blue-600' :
                            isPDF ? 'bg-rose-500/10 text-rose-600' :
                                'bg-indigo-500/10 text-indigo-600'
                            }`}>
                            {isImage ? <ImageIcon className="w-4 h-4" /> : isPDF ? <FileText className="w-4 h-4" /> : <Paperclip className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-none mb-1 truncate max-w-xs md:max-w-md">
                                {fileName}
                            </h3>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                Previsualización
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isImage && (
                            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 mr-2">
                                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors">
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <span className="px-1.5 text-[9px] font-black text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors">
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-1" />
                                <button onClick={() => setRotation(r => r + 90)} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md text-slate-500 transition-colors">
                                    <RotateCw className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={onDownload}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-[9px] font-black rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 uppercase tracking-widest"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Descargar
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-slate-100/50 dark:bg-slate-950/50 flex items-center justify-center relative">
                    {isImage ? (
                        <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar">
                            <img
                                src={fileUrl}
                                alt={fileName}
                                className="max-w-full max-h-full rounded-lg shadow-2xl bg-white transition-transform duration-200 ease-out object-contain"
                                style={{
                                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                                }}
                            />
                        </div>
                    ) : isPDF ? (
                        <iframe
                            src={`${fileUrl}#toolbar=0`}
                            className="w-full h-full rounded-xl shadow-inner border-0 bg-white"
                            title={fileName}
                        />
                    ) : (
                        <div className="text-center">
                            <div className="flex justify-center mb-6">
                                <div className="p-6 bg-slate-200 dark:bg-slate-800 rounded-full">
                                    <Paperclip className="w-16 h-16 text-slate-400" />
                                </div>
                            </div>
                            <h4 className="text-xl font-bold text-slate-400">Previsualización no disponible</h4>
                            <p className="text-sm text-slate-300 mb-6">Este tipo de archivo no puede previsualizarse directamente.</p>
                            <button
                                onClick={onDownload}
                                className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
                            >
                                DESCARGAR PARA VER
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
