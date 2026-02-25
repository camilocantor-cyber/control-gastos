import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useExecution } from '../hooks/useExecution';
import { X, Clock, CheckCircle2, ChevronRight, Info, Save, GitBranch, History, Eye } from 'lucide-react';
import type { Transition, Provider } from '../types';
import { evaluateCondition } from '../utils/conditions';
import { FileAttachments } from './FileAttachments';
import clsx from 'clsx';
import { ProcessViewerModal } from './ProcessViewerModal';

export function ProcessExecution({ processId, onClose, onComplete }: { processId: string, onClose: () => void, onComplete: () => void }) {
    const {
        advanceProcess,
        getFieldDefinitions,
        getProcessData,
        saveProcessData,
        completeProcess,
        loading: hookLoading
    } = useExecution();

    const [instance, setInstance] = useState<any>(null);
    const [transitions, setTransitions] = useState<Transition[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [fields, setFields] = useState<any[]>([]);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('');
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [showCopyTooltip, setShowCopyTooltip] = useState(false);
    const [showProcessViewer, setShowProcessViewer] = useState(false);


    useEffect(() => {
        loadData();
    }, [processId]);

    async function loadData() {
        try {
            setLoading(true);
            const { data: ins, error: insError } = await supabase
                .from('process_instances')
                .select('*, workflows(*), activities(*)')
                .eq('id', processId)
                .single();

            if (insError) throw insError;
            setInstance(ins);

            if (ins) {
                const { data: trans } = await supabase
                    .from('transitions')
                    .select('*, target:activities!target_id(name)')
                    .eq('source_id', ins.current_activity_id);

                const formattedTransitions = (trans || []).map((t: any) => ({
                    ...t,
                    target_name: t.target?.name || 'Siguiente Actividad'
                }));
                setTransitions(formattedTransitions);

                const { data: history, error: historyError } = await supabase
                    .from('process_history')
                    .select('*, activities(name), profiles(full_name, email)')
                    .eq('process_id', processId)
                    .order('created_at', { ascending: false });

                if (historyError) throw historyError;
                setHistory(history || []);

                const fieldDefs = await getFieldDefinitions(ins.current_activity_id);
                setFields(fieldDefs || []);

                const hasProviderField = fieldDefs?.some((f: any) => f.type === 'provider');
                if (hasProviderField && ins.organization_id) {
                    const { data: providerData } = await supabase
                        .from('providers')
                        .select('*')
                        .eq('organization_id', ins.organization_id)
                        .order('name', { ascending: true });
                    setProviders(providerData || []);
                }

                const existingData = await getProcessData(processId, ins.current_activity_id);
                const initialData: Record<string, string> = {};
                existingData?.forEach((d: any) => {
                    initialData[d.field_name] = d.value;
                });

                for (const field of (fieldDefs || [])) {
                    if (!initialData[field.name] && field.source_activity_id && field.source_field_name) {
                        try {
                            const sourceData = await getProcessData(processId, field.source_activity_id);
                            const sourceValue = sourceData?.find((d: any) => d.field_name === field.source_field_name)?.value;
                            if (sourceValue) {
                                initialData[field.name] = sourceValue;
                            }
                        } catch (err) {
                            console.warn(`Failed to auto-populate field ${field.name} from source:`, err);
                        }
                    }
                }
                setFormData(initialData);
            }
        } catch (error) {
            console.error('Error loading execution state:', error);
            alert('Error al cargar el trámite.');
        } finally {
            setLoading(false);
        }
    }

    const validateForm = () => {
        const errors: string[] = [];
        fields.forEach(field => {
            const value = formData[field.name];

            // Required check
            if (field.required && (!value || value.trim() === '')) {
                errors.push(`El campo "${field.label || field.name}" es obligatorio.`);
            }

            if (value && value.trim() !== '') {
                // Regex check
                if (field.regex_pattern) {
                    try {
                        const regex = new RegExp(field.regex_pattern);
                        if (!regex.test(value)) {
                            errors.push(`El campo "${field.label || field.name}" no tiene un formato válido.`);
                        }
                    } catch (e) {
                        console.error('Invalid regex pattern:', field.regex_pattern);
                    }
                }

                // Min/Max check
                if (field.type === 'number' || field.type === 'currency') {
                    const numVal = parseFloat(value);
                    if (!isNaN(numVal)) {
                        if (field.min_value != null && numVal < field.min_value) {
                            errors.push(`El valor de "${field.label || field.name}" debe ser al menos ${field.min_value}.`);
                        }
                        if (field.max_value != null && numVal > field.max_value) {
                            errors.push(`El valor de "${field.label || field.name}" no debe exceder ${field.max_value}.`);
                        }
                    }
                }

                // Email check
                if (field.type === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        errors.push(`El campo "${field.label || field.name}" debe ser un correo válido.`);
                    }
                }
            }
        });
        return errors;
    };

    async function handleSave() {
        setSavingDraft(true);
        const result = await saveProcessData(processId, instance.current_activity_id, formData);
        setSavingDraft(false);
        if (result.success) {
            setDraftSaved(true);
            setTimeout(() => setDraftSaved(false), 3000);
        } else {
            alert('❌ Error al guardar: ' + result.error);
        }
    }

    function isFieldVisible(field: any) {
        if (!field.visibility_condition) return true;

        try {
            const condition = field.visibility_condition.trim();
            const matches = condition.match(/^(\w+)\s*(==|!=|>=|<=|>|<)\s*['"]?([^'"]*)['"]?$/);

            if (matches) {
                const [_, otherFieldName, operator, value] = matches;
                const otherValue = formData[otherFieldName];

                switch (operator) {
                    case '==': return String(otherValue) === String(value);
                    case '!=': return String(otherValue) !== String(value);
                    case '>=': return Number(otherValue) >= Number(value);
                    case '<=': return Number(otherValue) <= Number(value);
                    case '>': return Number(otherValue) > Number(value);
                    case '<': return Number(otherValue) < Number(value);
                }
            }
            return true;
        } catch (e) {
            return true;
        }
    }

    async function handleAdvance(transitionId: string) {
        const errors = validateForm();
        if (errors.length > 0) {
            alert('Por favor corrija los siguientes errores:\n\n' + errors.join('\n'));
            return;
        }

        const dataSave = await saveProcessData(processId, instance.current_activity_id, formData);
        if (!dataSave.success) {
            alert('Error al guardar datos: ' + dataSave.error);
            return;
        }

        const result = await advanceProcess(processId, transitionId, comment);
        if (result.success) {
            onComplete();
            onClose();
        } else {
            alert('Error al avanzar: ' + result.error);
        }
    }

    async function handleFinalize() {
        const errors = validateForm();
        if (errors.length > 0) {
            alert('Por favor corrija los siguientes errores:\n\n' + errors.join('\n'));
            return;
        }

        const dataSave = await saveProcessData(processId, instance.current_activity_id, formData);
        if (!dataSave.success) {
            alert('Error al guardar datos: ' + dataSave.error);
            return;
        }

        const result = await completeProcess(processId, comment);
        if (result.success) {
            onComplete();
            onClose();
        } else {
            alert('Error al finalizar: ' + result.error);
        }
    }

    async function handleAttendAll() {
        const activeTransitions = transitions.filter(t => evaluateCondition(t.condition, formData));
        if (activeTransitions.length === 0) {
            alert('No hay caminos activos para atender.');
            return;
        }

        if (!window.confirm(`¿Estás seguro de atender los ${activeTransitions.length} caminos activos simultáneamente?`)) return;

        const dataSave = await saveProcessData(processId, instance.current_activity_id, formData);
        if (!dataSave.success) {
            alert('Error al guardar datos: ' + dataSave.error);
            return;
        }

        try {
            const result = await advanceProcess(processId, activeTransitions[0].id, `[Atención Masiva] ${comment}`);
            if (result.success) {
                onComplete();
                onClose();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            alert('Error al atender todos los caminos: ' + err.message);
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(processId);
        setShowCopyTooltip(true);
        setTimeout(() => setShowCopyTooltip(false), 2000);
    };

    async function handleHistoryClick(historyItem: any) {
        const { data: dataFields } = await supabase
            .from('process_data')
            .select('*')
            .eq('process_id', processId)
            .eq('activity_id', historyItem.activity_id);

        const { data: activityFields } = await supabase
            .from('activity_field_definitions')
            .select('*')
            .eq('activity_id', historyItem.activity_id);

        setSelectedHistoryItem({
            ...historyItem,
            fields: activityFields || [],
            data: dataFields || []
        });
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 relative mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!instance) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl border border-white/10 dark:border-slate-800 overflow-hidden relative">
                {/* Header */}
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 dark:shadow-blue-900/20">
                            <GitBranch className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{instance.workflows?.name}</h2>
                                <div className="relative">
                                    <button
                                        onClick={copyToClipboard}
                                        className="group/id px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-tighter hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center gap-1.5"
                                    >
                                        #{instance?.process_number ? instance.process_number.toString().padStart(8, '0') : processId.split('-')[0].toUpperCase()}
                                        <Save className="w-2.5 h-2.5 opacity-0 group-hover/id:opacity-100 transition-opacity" />
                                    </button>
                                    {showCopyTooltip && (
                                        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded shadow-xl animate-in fade-in zoom-in duration-200 z-50 whitespace-nowrap">
                                            ¡ID COPIADO!
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{instance.activities?.name}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actividad en Curso</span>
                            </div>
                        </div>
                    </div>


                    <div className="flex-1 px-8 min-w-0">
                        <div className="max-w-3xl mx-auto">
                            <FileAttachments processInstanceId={processId} />
                        </div>
                    </div>

                    <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 dark:border-slate-700 flex-shrink-0">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden bg-slate-200/50 dark:bg-[#0b0e14]">
                    {/* Main Form Area */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                        <div className="max-w-5xl mx-auto space-y-10">
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-3 mb-8">
                                    <Info className="w-5 h-5 text-blue-600" />
                                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Información de la Actividad</h3>
                                </div>
                                <div className={clsx(
                                    "grid gap-x-6 gap-y-5",
                                    instance.activities?.form_columns === 1 ? "grid-cols-1" :
                                        instance.activities?.form_columns === 3 ? "grid-cols-1 md:grid-cols-3" :
                                            "grid-cols-1 md:grid-cols-2"
                                )}>
                                    {fields.length > 0 ? (
                                        fields.filter(isFieldVisible).map((field) => (
                                            <div key={field.id} className={clsx(
                                                "space-y-2",
                                                field.type === 'textarea' ? "col-span-full" : ""
                                            )}>
                                                <div className="flex items-center px-1 h-5">
                                                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] leading-none">
                                                        {field.label || field.name}
                                                        {field.required && <span className="text-rose-500 ml-1 text-xs">*</span>}
                                                    </label>
                                                </div>
                                                <div className="h-12">
                                                    {field.type === 'textarea' ? (
                                                        <textarea
                                                            value={formData[field.name] || ''}
                                                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                                            className="w-full bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 outline-none min-h-[100px] transition-all resize-none shadow-sm"
                                                            placeholder={field.placeholder || `Ingrese ${field.label || field.name}...`}
                                                        />
                                                    ) : field.type === 'select' ? (
                                                        <div className="relative group w-full h-full">
                                                            <select
                                                                value={formData[field.name] || ''}
                                                                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                                                className="w-full h-full bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer shadow-sm pr-10 font-bold"
                                                            >
                                                                <option value="">Seleccione una opción...</option>
                                                                {field.options?.map((opt: string) => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                                                        </div>
                                                    ) : field.type === 'currency' ? (
                                                        <div className="relative group w-full h-full">
                                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">$</div>
                                                            <input
                                                                type={focusedField === field.id ? "number" : "text"}
                                                                step="0.01"
                                                                value={focusedField === field.id
                                                                    ? (formData[field.name] || '')
                                                                    : (formData[field.name]
                                                                        ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(Number(formData[field.name]))
                                                                        : '')
                                                                }
                                                                onFocus={() => setFocusedField(field.id)}
                                                                onBlur={() => setFocusedField(null)}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                                        setFormData({ ...formData, [field.name]: val });
                                                                    }
                                                                }}
                                                                className="w-full h-full bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl pl-9 pr-4 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all shadow-sm"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    ) : field.type === 'provider' ? (
                                                        <div className="relative group w-full h-full">
                                                            <select
                                                                value={formData[field.name] || ''}
                                                                onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                                                className="w-full h-full bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer shadow-sm pr-10 font-bold"
                                                            >
                                                                <option value="">Seleccione...</option>
                                                                {providers.map(p => (
                                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none group-focus-within:text-blue-500 transition-colors" />
                                                        </div>
                                                    ) : field.type === 'date' ? (
                                                        <input
                                                            type="date"
                                                            value={formData[field.name] || ''}
                                                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                                            className="w-full h-full bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all shadow-sm font-bold"
                                                        />
                                                    ) : field.type === 'boolean' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, [field.name]: formData[field.name] === 'true' ? 'false' : 'true' })}
                                                            className={clsx(
                                                                "flex items-center gap-3 w-full h-full px-5 rounded-2xl border-2 transition-all shadow-sm outline-none",
                                                                formData[field.name] === 'true'
                                                                    ? "bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                                                                    : "bg-slate-50/40 border-slate-100/50 text-slate-400 dark:bg-slate-900/50 dark:border-slate-800"
                                                            )}
                                                        >
                                                            <div className={clsx(
                                                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors",
                                                                formData[field.name] === 'true'
                                                                    ? "bg-blue-600 border-blue-600 shadow-sm"
                                                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                                            )}>
                                                                {formData[field.name] === 'true' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                            <span className="text-xs font-bold uppercase tracking-widest">{formData[field.name] === 'true' ? 'Activado' : 'Desactivado'}</span>
                                                        </button>
                                                    ) : (
                                                        <input
                                                            type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                                                            value={formData[field.name] || ''}
                                                            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                                            className="w-full h-full bg-slate-50/50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all shadow-sm font-bold placeholder:font-normal placeholder:text-slate-400"
                                                            placeholder={field.placeholder || `Completar ${field.label || field.name}...`}
                                                        />
                                                    )}
                                                </div>
                                                {field.description && <p className="text-[10px] text-slate-400 ml-1 mt-1 leading-tight">{field.description}</p>}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center py-10 text-slate-400 font-bold uppercase text-[9px] tracking-widest">Sin campos configurados</p>
                                    )}
                                </div>
                            </div>



                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <History className="w-4 h-4 text-slate-400" />
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Observaciones</label>
                                        </div>
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 outline-none min-h-[50px] focus:border-blue-500/50 transition-all font-medium"
                                            placeholder="Detalle de la gestión..."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <GitBranch className="w-4 h-4 text-blue-600" />
                                            <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Acciones Disponibles</h4>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {transitions.map((t) => {
                                                const isActive = evaluateCondition(t.condition, formData);
                                                return (
                                                    <button
                                                        key={t.id}
                                                        disabled={hookLoading || !isActive}
                                                        onClick={() => handleAdvance(t.id)}
                                                        className={clsx(
                                                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all group/btn outline-none",
                                                            isActive
                                                                ? "border-blue-100 bg-blue-50/50 text-blue-700 hover:border-blue-600 hover:bg-white hover:shadow-xl hover:shadow-blue-900/10 hover:-translate-y-1"
                                                                : "border-slate-50 bg-slate-50/30 text-slate-300 opacity-40 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <div className="text-left">
                                                            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Pasar a:</p>
                                                            <p className="text-xs font-extrabold">{t.target_name}</p>
                                                        </div>
                                                        <ChevronRight className={clsx(
                                                            "w-4 h-4 transition-transform group-hover/btn:translate-x-1",
                                                            isActive ? "text-blue-600" : "text-slate-300"
                                                        )} />
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex-1 flex gap-3">
                                                <button
                                                    onClick={handleSave}
                                                    disabled={hookLoading || savingDraft}
                                                    className={clsx(
                                                        "flex-1 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-lg",
                                                        draftSaved
                                                            ? "bg-emerald-600 text-white shadow-emerald-200"
                                                            : "!bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300/50"
                                                    )}
                                                >
                                                    {savingDraft ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                                    {draftSaved ? '¡Guardado!' : 'Guardar'}
                                                </button>
                                                {transitions.length > 1 && (
                                                    <button
                                                        onClick={handleAttendAll}
                                                        disabled={hookLoading}
                                                        className="flex-1 bg-blue-600 text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 transition-all active:scale-95"
                                                        title="Atender todas las transiciones activas"
                                                    >
                                                        <GitBranch className="w-5 h-5" /> Atender Todos
                                                    </button>
                                                )}
                                            </div>
                                            {(instance.activities?.type === 'end' || transitions.length === 0) && (
                                                <button
                                                    onClick={handleFinalize}
                                                    disabled={hookLoading}
                                                    className="flex-1 bg-emerald-600 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg shadow-emerald-200"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" /> Completar Gestión
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History Sidebar */}
                    <div className="w-64 border-l border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-slate-400" />
                                <h3 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Línea de Tiempo</h3>
                            </div>
                            <button
                                onClick={() => setShowProcessViewer(true)}
                                className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50"
                                title="Ver Mapa de Navegación"
                            >
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {history.length > 0 ? history.map((h, i) => (
                                <div key={h.id} onClick={() => handleHistoryClick(h)} className="relative pl-6 group cursor-pointer">
                                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 flex items-center justify-center transition-colors group-hover:bg-blue-500">
                                        {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 group-hover:bg-white animate-pulse" />}
                                    </div>
                                    <div className="bg-white dark:bg-slate-800/40 p-3 rounded-xl border border-transparent group-hover:border-blue-100 transition-all shadow-sm group-hover:shadow-blue-50/50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{h.activities?.name}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center py-10 text-slate-400 text-[10px] font-bold uppercase tracking-widest">Sin actividad</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {
                selectedHistoryItem && (
                    <HistoryDetailModal item={selectedHistoryItem} onClose={() => setSelectedHistoryItem(null)} />
                )
            }
            {
                showProcessViewer && (
                    <ProcessViewerModal
                        processId={processId}
                        onClose={() => setShowProcessViewer(false)}
                    />
                )
            }
        </div >
    );
}

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
