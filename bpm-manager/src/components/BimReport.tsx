import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { IfcViewer } from './IfcViewer';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { Box, Layers, Activity, Info, ChevronRight, FileText } from 'lucide-react';
import { cn } from '../utils/cn';

interface BimState {
    express_id: number;
    status: 'completed' | 'processing' | 'delayed' | 'pending';
    process_id: string;
    process_name?: string;
}

interface IfcAttachment {
    id: string;
    file_name: string;
    file_path: string;
    process_id: string;
    process_number?: number;
}

export function BimReport() {
    const [ifcFiles, setIfcFiles] = useState<IfcAttachment[]>([]);
    const [selectedFile, setSelectedFile] = useState<IfcAttachment | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [bimStates, setBimStates] = useState<Record<number, 'completed' | 'processing' | 'delayed' | 'pending'>>({});
    const [objectDetails, setObjectDetails] = useState<BimState[]>([]);
    const [selectedObject, setSelectedObject] = useState<any>(null);

    useEffect(() => {
        loadIfcFiles();
    }, []);

    useEffect(() => {
        if (selectedFile) {
            loadFileAndStates(selectedFile);
        }
    }, [selectedFile]);

    async function loadIfcFiles() {
        try {
            const { data, error } = await supabase
                .from('process_attachments')
                .select('*, process_instances(id, process_number, name)')
                .ilike('file_name', '%.ifc');

            if (error) throw error;

            const formattedFiles = data?.map((f: any) => ({
                id: f.id,
                file_name: f.file_name,
                file_path: f.file_path,
                process_id: f.process_instance_id,
                process_number: f.process_instances?.process_number,
                process_name: f.process_instances?.name
            })) || [];

            setIfcFiles(formattedFiles);
            if (formattedFiles.length > 0) {
                setSelectedFile(formattedFiles[0]);
            }
        } catch (err) {
            console.error('Error loading IFC files:', err);
        }
    }

    async function loadFileAndStates(file: IfcAttachment) {
        try {

            // 1. Get Signed URL for IFC
            const { data: urlData, error: urlError } = await supabase.storage
                .from('process-files')
                .createSignedUrl(file.file_path, 3600);

            if (urlError) throw urlError;
            setFileUrl(urlData.signedUrl);

            // 2. Load States for this process (and potentially others if we implement multi-process BIM)
            const { data: states, error: statesError } = await supabase
                .from('process_bim_states')
                .select('*, process_instances(name)')
                .eq('process_id', file.process_id);

            if (statesError) throw statesError;

            const statesMap: Record<number, 'completed' | 'processing' | 'delayed' | 'pending'> = {};
            const details: BimState[] = [];

            states?.forEach((s: any) => {
                statesMap[s.express_id] = s.status;
                details.push({
                    express_id: s.express_id,
                    status: s.status,
                    process_id: s.process_id,
                    process_name: s.process_instances?.name
                });
            });

            setBimStates(statesMap);
            setObjectDetails(details);
        } catch (err) {
            console.error('Error loading BIM details:', err);
        }
    }

    const stats = [
        { name: 'Completado', value: Object.values(bimStates).filter(s => s === 'completed').length, color: '#22c55e' },
        { name: 'En Proceso', value: Object.values(bimStates).filter(s => s === 'processing').length, color: '#3b82f6' },
        { name: 'Retrasado', value: Object.values(bimStates).filter(s => s === 'delayed').length, color: '#ef4444' },
        { name: 'Pendiente', value: Object.values(bimStates).filter(s => s === 'pending').length, color: '#f59e0b' },
    ].filter(s => s.value > 0);

    const totalObjects = Object.keys(bimStates).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Selector */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-none">
                        <Box className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight">Métricas BIM 4D</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Visualización de avance en modelo digital</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <select
                            value={selectedFile?.id || ''}
                            onChange={(e) => {
                                const file = ifcFiles.find(f => f.id === e.target.value);
                                if (file) setSelectedFile(file);
                            }}
                            className="w-full h-12 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-10 text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                        >
                            {ifcFiles.length === 0 && <option value="">No hay modelos IFC cargados</option>}
                            {ifcFiles.map(f => (
                                <option key={f.id} value={f.id}>{f.file_name} (#{f.process_number})</option>
                            ))}
                        </select>
                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-[700px]">
                {/* 3D Viewer */}
                <div className="xl:col-span-3 bg-white dark:bg-[#080a14] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative">
                    {fileUrl ? (
                        <IfcViewer
                            fileUrl={fileUrl}
                            objectStates={bimStates}
                            onObjectSelected={(props) => {
                                const details = objectDetails.find(d => d.express_id === props.id);
                                setSelectedObject({ ...props, ...details });
                            }}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                            <Box className="w-16 h-16 mb-6 opacity-10" />
                            <h3 className="text-lg font-black uppercase tracking-widest mb-2">Seleccione un Modelo</h3>
                            <p className="text-xs font-medium max-w-xs leading-relaxed opacity-60">
                                Elija un archivo IFC de la lista superior para cargar la visualización 3D y los estados de ejecución.
                            </p>
                        </div>
                    )}
                </div>

                {/* BIM Analytics Sidebar */}
                <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                    {/* Distribution Card */}
                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribución de Estados</h3>
                        </div>

                        {stats.length > 0 ? (
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats}
                                            innerRadius={50}
                                            outerRadius={70}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '12px',
                                                border: 'none',
                                                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                fontSize: '10px',
                                                fontWeight: 'bold'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-slate-300 text-[10px] uppercase font-black italic">
                                Sin datos de estado
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {stats.map(s => (
                                <div key={s.name} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                                        <span className="text-[8px] font-black text-slate-400 uppercase truncate">{s.name}</span>
                                    </div>
                                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">{s.value}</p>
                                </div>
                            ))}
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 col-span-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Layers className="w-3 h-3 text-indigo-600" />
                                    <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Total Objetos Controlados</span>
                                </div>
                                <p className="text-xl font-black text-indigo-700 dark:text-indigo-300">{totalObjects}</p>
                            </div>
                        </div>
                    </div>

                    {/* Object Inspector */}
                    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
                        <div className="flex items-center gap-2 mb-6">
                            <Info className="w-4 h-4 text-blue-600" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspector de Objeto</h3>
                        </div>

                        {selectedObject ? (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Tipo BIM</p>
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{selectedObject.type || 'Desconocido'}</h4>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ID Express</p>
                                    <p className="text-lg font-black text-blue-600 flex items-center gap-2">
                                        #{selectedObject.id}
                                        {selectedObject.status && (
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                selectedObject.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                    selectedObject.status === 'processing' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                        selectedObject.status === 'delayed' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                            "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                {selectedObject.status}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {selectedObject.process_name ? (
                                    <div className="pt-2">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Vinculado a:</p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <FileText className="w-4 h-4 text-indigo-500" />
                                            {selectedObject.process_name}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                                        <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed italic">
                                            Este objeto no tiene una actividad vinculada en el flujo de trabajo actual.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">Propiedades IFC</p>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2">
                                        {Object.entries(selectedObject.rawProps || {}).map(([key, val]: [string, any]) => (
                                            <div key={key} className="flex justify-between text-[10px] py-1 border-b border-slate-50 dark:border-slate-800/40">
                                                <span className="text-slate-400 font-bold uppercase">{key}</span>
                                                <span className="text-slate-700 dark:text-slate-300 font-black">{typeof val === 'object' ? val?.value || 'N/A' : String(val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-10 opacity-50">
                                <Box className="w-10 h-10 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-center">Selecciona un objeto<br />en el visor para inspeccionar</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
