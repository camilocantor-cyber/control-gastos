import { X } from 'lucide-react';

export function HistoryDetailModal({ item, onClose }: { item: any, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10 dark:border-slate-800">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Detalle de Gestión</h3>
                    <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-10">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Responsable</label>
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {(item.profiles as any)?.full_name || item.user_name || 'Desconocido'}
                                </p>
                                {((item.profiles as any)?.email || item.user_email) && (
                                    <p className="text-[10px] text-slate-400 font-medium italic">
                                        {(item.profiles as any)?.email || item.user_email}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Fecha</label>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                    </div>

                    {item.comment && (
                        <div className="bg-blue-50/30 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100/50 dark:border-blue-900/30 shadow-sm shadow-blue-50/50">
                            <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase mb-3 block tracking-[0.2em]">Observaciones de Gestión</label>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                "{item.comment}"
                            </p>
                        </div>
                    )}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Datos Capturados</h4>
                        <div className="border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Campo</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                    {(item.fields || []).map((field: any) => {
                                        const dataVal = item.data?.find((d: any) => d.field_name === field.name);
                                        return (
                                            <tr key={field.id} className="text-[11px] font-bold">
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{field.label || field.name}</td>
                                                <td className="px-6 py-4 text-slate-700 dark:text-slate-200">{dataVal?.value || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="p-8 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={onClose} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100">Cerrar</button>
                </div>
            </div>
        </div>
    );
}
