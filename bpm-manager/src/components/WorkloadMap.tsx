import { Activity } from 'lucide-react';

export function WorkloadMap({ data }: { data: { activity_name: string, task_count: number }[] }) {
    if (!data || data.length === 0) return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-full flex flex-col items-center justify-center text-center opacity-50">
            <Activity className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin carga de trabajo activa</p>
        </div>
    );

    const maxTasks = Math.max(...data.map(d => d.task_count));

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all h-full">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-500" />
                <h3 className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tighter">Mapa de Carga</h3>
            </div>

            <div className="space-y-3.5">
                {data.map((item) => {
                    const percentage = (item.task_count / maxTasks) * 100;
                    const isHigh = percentage > 70;
                    const isMed = percentage > 30 && percentage <= 70;

                    const barColor = isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-blue-500';
                    const textColor = isHigh ? 'text-rose-600 dark:text-rose-400' : isMed ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400';
                    const bgColor = isHigh ? 'bg-rose-50 dark:bg-rose-900/10' : isMed ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-blue-50 dark:bg-blue-900/10';

                    return (
                        <div key={item.activity_name} className="group">
                            <div className="flex justify-between items-center mb-1 min-h-[1.2rem]">
                                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[80%] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    {item.activity_name}
                                </span>
                                <div className={`px-1.5 py-0.5 rounded-full ${bgColor} ${textColor} text-[8px] font-black border border-current opacity-80`}>
                                    {item.task_count}
                                </div>
                            </div>
                            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className={`h-full transition-all duration-700 ease-out shadow-sm ${barColor}`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-tighter text-slate-400">
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-blue-500" /> Normal
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-amber-500" /> Medio
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-rose-500" /> Crítico
                    </div>
                </div>
            </div>
        </div>
    );
}
