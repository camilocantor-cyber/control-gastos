import { useState, useEffect } from 'react';
import { Wand2, Database, Hash, ShieldCheck, Zap, X, Settings2, Trash2, Plus, ChevronRight, Eye, Info, CheckCircle2, Save, Layout } from 'lucide-react';
import type { FieldDefinition, FieldType } from '../types';
import { evaluateCondition } from '../utils/conditions';
import { GeoSelector } from './GeoSelector';
import { InteractiveLookup } from './InteractiveLookup';
import { clsx } from 'clsx';

interface FormPreviewModalProps {
    fields: FieldDefinition[];
    formColumns?: number;
    activityName: string;
    workflowName: string;
    onClose: () => void;
    onAddField: () => void;
    onUpdateField: (fieldId: string, updates: Partial<FieldDefinition>) => void;
    onDeleteField: (fieldId: string) => void;
    onReorderFields: (newFields: FieldDefinition[]) => void;
    onSave?: () => Promise<void> | void;
    isReadOnly?: boolean;
    dbTables?: string[];
    tableColumnsMap?: Record<string, string[]>;
    onFetchColumns?: (tableName: string) => void;
    initialSelectedFieldId?: string | null;
    initialShowAdvanced?: boolean;
    previousActivities?: any[];
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
    { value: 'text', label: 'Texto Corto' },
    { value: 'textarea', label: 'Texto Largo' },
    { value: 'number', label: 'Número' },
    { value: 'currency', label: 'Moneda ($)' },
    { value: 'date', label: 'Fecha' },
    { value: 'select', label: 'Lista Desplegable' },
    { value: 'boolean', label: 'Interruptor (Sí/No)' },
    { value: 'email', label: 'Correo Electrónico' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'lookup', label: 'Búsqueda Interactiva (Lookup)' },
    { value: 'location', label: 'Georreferenciación (Mapa)' },
    { value: 'consecutivo', label: 'Consecutivo (Autogenerado)' },
    { value: 'label', label: 'Información / Mensaje' },
    { value: 'accordion', label: 'Contenedor / Acordeón' },
];

export function FormPreviewModal({
    fields,
    formColumns = 1,
    activityName,
    workflowName,
    onClose,
    onAddField,
    onUpdateField,
    onDeleteField,
    onReorderFields,
    onSave,
    isReadOnly = false,
    dbTables = [],
    tableColumnsMap = {},
    onFetchColumns,
    initialSelectedFieldId = null,
    initialShowAdvanced = false,
    previousActivities = []
}: FormPreviewModalProps) {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(initialSelectedFieldId);
    const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [saving, setSaving] = useState(false);
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
    const [showAdvancedModal, setShowAdvancedModal] = useState(initialShowAdvanced);

    const toggleAccordion = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Initialize default values when fields change
    useEffect(() => {
        const defaults: Record<string, string> = {};
        fields.forEach(f => {
            if (f.default_value) {
                defaults[f.name] = f.default_value;
            }
        });
        setFormData(prev => ({ ...defaults, ...prev }));
    }, [fields]);

    const selectedField = fields.find(f => f.id === selectedFieldId);

    // Always sort by order_index so preview matches production render order
    const sortedFields = [...fields].sort((a, b) => (Number(a.order_index ?? 9999) - Number(b.order_index ?? 9999)));

    // Simulation visibility logic
    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedFieldId(id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId) return;

        // If dropping onto another field (reordering)
        if (targetId && draggedId !== targetId) {
            const targetField = fields.find(f => f.id === targetId);
            const draggedField = fields.find(f => f.id === draggedId);

            if (!targetField || !draggedField) return;

            // Maintain the same hierarchy if just reordering
            const newFields = [...fields];
            const draggedIdx = newFields.findIndex(f => f.id === draggedId);
            newFields.splice(draggedIdx, 1);

            const targetIdx = newFields.findIndex(f => f.id === targetId);
            newFields.splice(targetIdx, 0, {
                ...draggedField,
                parent_accordion_id: targetField.parent_accordion_id // Match target's parent
            });

            onReorderFields(newFields.map((f, i) => ({ ...f, order_index: i })));
        }
        // If dropping into root empty space
        else if (targetId === null) {
            const draggedIdx = fields.findIndex(f => f.id === draggedId);
            if (draggedIdx === -1) return;

            const newFields = [...fields];
            const [field] = newFields.splice(draggedIdx, 1);
            newFields.push({ ...field, parent_accordion_id: undefined }); // Remove parent
            onReorderFields(newFields.map((f, i) => ({ ...f, order_index: i })));
        }

        setDraggedFieldId(null);
    };

    const handleAccordionDrop = (e: React.DragEvent, accordionId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === accordionId) return;

        // Don't allow nesting an accordion inside another for now (simplify)
        const draggedField = fields.find(f => f.id === draggedId);
        if (draggedField?.type === 'accordion') return;

        const newFields = fields.map(f =>
            f.id === draggedId ? { ...f, parent_accordion_id: accordionId } : f
        );
        onReorderFields(newFields);
        setDraggedFieldId(null);
    };

    const renderField = (field: FieldDefinition) => {
        const isVisible = evaluateCondition(field.visibility_condition || '', formData);
        if (!isVisible) return null;

        return (
            <div
                key={field.id}
                draggable={!isReadOnly}
                onDragStart={(e) => handleDragStart(e, field.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, field.id)}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isReadOnly) setSelectedFieldId(field.id);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (!isReadOnly) {
                        setSelectedFieldId(field.id);
                        setShowAdvancedModal(true);
                    }
                }}
                className={clsx(
                    "p-2 rounded-xl transition-all relative border-2 flex flex-col group/field",
                    !isReadOnly && "cursor-grab active:cursor-grabbing",
                    (field.type === 'textarea' || field.type === 'label' || field.type === 'accordion') ? "col-span-full" : "",
                    selectedFieldId === field.id
                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/5 shadow-inner"
                        : "border-transparent hover:border-slate-200 dark:hover:border-slate-800",
                    draggedFieldId === field.id ? "opacity-30" : "opacity-100"
                )}
            >
                {selectedFieldId === field.id && (
                    <div className="absolute -top-2.5 -right-2 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded-full shadow-lg z-10 animate-bounce">
                        Editando
                    </div>
                )}

                {field.type !== 'label' && field.type !== 'accordion' && (
                    <div className="flex items-center justify-between px-1 min-h-[1rem] h-auto mb-1 pointer-events-none">
                        <label className="block text-[10px] font-black text-[#0f172a] dark:text-slate-300 uppercase tracking-[0.15em] leading-none">
                            {field.label || field.name}
                            {field.required && <span className="text-rose-500 ml-1 text-xs">*</span>}
                        </label>
                        {!isReadOnly && (
                            <span
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedFieldId(field.id);
                                    setShowAdvancedModal(true);
                                }}
                                className="text-[8px] font-black text-blue-500/0 group-hover/field:text-blue-500 transition-colors uppercase tracking-widest flex items-center gap-1 pointer-events-auto cursor-pointer"
                            >
                                <Settings2 className="w-2.5 h-2.5" />
                                Propiedades
                            </span>
                        )}
                    </div>
                )}

                <div className={clsx(
                    "relative",
                    (field.type === 'textarea' || field.type === 'label' || field.type === 'accordion') ? "h-auto" : "h-10"
                )}>
                    {field.type === 'textarea' ? (
                        <textarea
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                            className={clsx(
                                "w-full bg-white dark:bg-slate-900 border-2 rounded-xl p-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none min-h-[120px] transition-all resize-none shadow-xl focus:border-blue-500 hover:shadow-2xl hover:scale-[1.005]",
                                (field.is_readonly || isReadOnly) && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 grayscale-[0.3]",
                                field.regex_pattern && formData[field.name] && !new RegExp(field.regex_pattern).test(formData[field.name]) ? "border-rose-500 focus:border-rose-600" : "border-slate-300 dark:border-slate-700 focus:border-blue-500"
                            )}
                            placeholder={field.placeholder || ("Ingrese " + (field.label || field.name) + "...")}
                            readOnly={field.is_readonly || isReadOnly}
                            maxLength={field.max_length}
                        />
                    ) : field.type === 'select' ? (
                        <div className="relative group w-full h-full">
                            <select
                                value={formData[field.name] || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                                disabled={field.is_readonly || isReadOnly}
                                className={clsx(
                                    "w-full h-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl px-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-xl font-bold hover:shadow-2xl hover:scale-[1.01]",
                                    (field.is_readonly || isReadOnly) && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50"
                                )}
                            >
                                <option value="">Seleccione...</option>
                                {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 rotate-90" />
                        </div>
                    ) : field.type === 'boolean' ? (
                        <button
                            onClick={() => !(field.is_readonly || isReadOnly) && setFormData(prev => ({ ...prev, [field.name]: prev[field.name] === 'true' ? 'false' : 'true' }))}
                            disabled={field.is_readonly || isReadOnly}
                            className={clsx(
                                "flex items-center gap-3 w-full h-full px-5 rounded-2xl border-2 transition-all",
                                formData[field.name] === 'true'
                                    ? "bg-blue-50/50 border-blue-600 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400"
                                    : "bg-white border-slate-300 text-slate-400 dark:bg-slate-900 dark:border-slate-700",
                                (field.is_readonly || isReadOnly) && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 grayscale"
                            )}
                        >
                            <div className={clsx(
                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors",
                                formData[field.name] === 'true' ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            )}>
                                {formData[field.name] === 'true' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">{formData[field.name] === 'true' ? 'Activado' : 'Desactivado'}</span>
                        </button>
                    ) : field.type === 'currency' ? (
                        <div className="relative w-full h-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-bold">$</span>
                            </div>
                            <input
                                type="text"
                                value={formData[field.name] ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(Number(formData[field.name])) : ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    setFormData(prev => ({ ...prev, [field.name]: val }));
                                }}
                                readOnly={field.is_readonly || isReadOnly}
                                className={clsx(
                                    "w-full h-full bg-white dark:bg-slate-900 border-2 rounded-xl pl-8 pr-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none transition-all shadow-xl font-bold hover:shadow-2xl hover:scale-[1.01]",
                                    (field.is_readonly || isReadOnly) && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50",
                                    field.regex_pattern && formData[field.name] && !new RegExp(field.regex_pattern).test(formData[field.name]) ? "border-rose-500 focus:border-rose-600" : "border-slate-300 dark:border-slate-700 focus:border-blue-500"
                                )}
                                placeholder="0"
                            />
                        </div>
                    ) : field.type === 'location' ? (
                        <div className="h-auto">
                            <GeoSelector
                                value={formData[field.name]}
                                onChange={(val) => setFormData(prev => ({ ...prev, [field.name]: val }))}
                            />
                        </div>
                    ) : field.type === 'lookup' ? (
                        <div className="h-auto">
                            <InteractiveLookup
                                field={field}
                                value={formData[field.name]}
                                onChange={(val: any) => !(field.is_readonly || isReadOnly) && setFormData(prev => ({ ...prev, [field.name]: val }))}
                                formData={formData}
                                setFormData={setFormData}
                                disabled={field.is_readonly || isReadOnly}
                            />
                        </div>
                    ) : field.type === 'consecutivo' ? (
                        <input
                            type="text"
                            readOnly
                            value={formData[field.name] || 'XXX-#### (Autogenerado)'}
                            className="w-full h-full bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] text-slate-500 dark:text-slate-400 font-bold border-dashed cursor-not-allowed selection:bg-transparent"
                            title="Este valor se generará automáticamente"
                        />
                    ) : field.type === 'label' ? (
                        <div className="col-span-full py-4 px-6 bg-blue-50/50 dark:bg-blue-500/5 border-l-4 border-blue-500 rounded-lg shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest leading-none mb-1.5">{field.label || field.name}</p>
                                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                                        {field.placeholder || field.description || 'Sin información disponible.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : field.type === 'accordion' ? (
                        <div
                            className="col-span-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all group/acc"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleAccordionDrop(e, field.id)}
                        >
                            <div
                                className="w-full px-5 py-2.5 flex items-center justify-between bg-[#0f172a] dark:bg-slate-900 hover:bg-[#1e293b] dark:hover:bg-slate-800 transition-all cursor-pointer border-b border-slate-700 dark:border-slate-700"
                                onClick={(e) => toggleAccordion(field.id, e)}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    if (!isReadOnly) {
                                        setSelectedFieldId(field.id);
                                        setShowAdvancedModal(true);
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <ChevronRight className={clsx("w-3.5 h-3.5 text-white transition-transform", openAccordions[field.id] ? "rotate-90" : "")} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-[11px] font-black text-white uppercase tracking-tight leading-none">{field.label || field.name}</h3>
                                        {field.description && <p className="text-[8px] text-blue-200/50 mt-1 font-bold uppercase tracking-widest leading-none">{field.description}</p>}
                                    </div>
                                </div>
                                {!isReadOnly && (
                                    <span
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedFieldId(field.id);
                                            setShowAdvancedModal(true);
                                        }}
                                        className="text-[8px] font-black text-blue-500/0 group-hover/acc:text-blue-500 transition-colors uppercase tracking-widest flex items-center gap-1 pointer-events-auto cursor-pointer"
                                    >
                                        <Settings2 className="w-2.5 h-2.5" />
                                        Propiedades
                                    </span>
                                )}
                            </div>
                            <div className={clsx(
                                "grid transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
                                openAccordions[field.id] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}>
                                <div className="overflow-hidden">
                                    <div className="p-6 bg-slate-50/20 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                        <div className={clsx(
                                            "grid gap-x-6 gap-y-4 animate-in fade-in slide-in-from-top-2 duration-500",
                                            formColumns === 1 ? "grid-cols-1" :
                                                formColumns === 3 ? "grid-cols-1 md:grid-cols-3" :
                                                    formColumns === 4 ? "grid-cols-1 md:grid-cols-4" :
                                                        "grid-cols-1 md:grid-cols-2"
                                        )}>
                                            {sortedFields.filter(f => f.parent_accordion_id === field.id).map(child => (
                                                <div key={child.id} className="contents">
                                                    {renderField(child)}
                                                </div>
                                            ))}
                                            {!isReadOnly && (
                                                <div className="col-span-full border border-dashed border-slate-200 dark:border-slate-800 rounded-xl py-4 text-center">
                                                    <p className="text-[9px] text-slate-400 italic">Campos agrupados aquí</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            value={formData[field.name] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                            readOnly={field.is_readonly || isReadOnly}
                            className={clsx(
                                "w-full h-full bg-white dark:bg-slate-900 border-2 rounded-xl px-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none transition-all shadow-xl font-bold hover:scale-[1.01]",
                                (field.is_readonly || isReadOnly) && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50",
                                field.regex_pattern && formData[field.name] && !new RegExp(field.regex_pattern).test(formData[field.name]) ? "border-rose-500 focus:border-rose-600" : "border-slate-300 dark:border-slate-700 focus:border-blue-500"
                            )}
                            placeholder={field.placeholder || "Completar..."}
                            maxLength={field.max_length}
                            pattern={field.regex_pattern}
                        />
                    )}
                </div>
                {field.description && field.type !== 'label' && field.type !== 'accordion' && <p className="text-[9px] text-slate-400 ml-1 mt-0.5 leading-tight italic">{field.description}</p>}
            </div>
        );
    };

    const handleSaveClick = async () => {
        if (!onSave) {
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
            return;
        }

        try {
            setSaving(true);
            await onSave();
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 2000);
        } catch (error) {
            console.error('Error saving:', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] w-full max-w-7xl h-[95vh] flex flex-col shadow-2xl border border-white/10 dark:border-slate-800 overflow-hidden relative">
                {/* Header */}
                <div className="px-8 py-4 border-b border-slate-800 flex items-center justify-between bg-[#020617] text-white z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                            <Eye className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-white leading-none">{workflowName}</h2>
                                <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-bold rounded-md border border-blue-500/30 uppercase tracking-tighter">
                                    #DISEÑO_PREMIUM
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 text-slate-300 rounded-full border border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{activityName}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contraste Alto Activo</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {!isReadOnly && (
                            <button
                                onClick={onAddField}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 text-[11px] uppercase tracking-widest group/add"
                            >
                                <Plus className="w-5 h-5 group-hover/add:rotate-90 transition-transform" />
                                Nueva Propiedad
                            </button>
                        )}
                        <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 dark:border-white/5">
                            <X className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-[#02040a]">
                    {/* Main Form Area */}
                    <div className="flex-1 overflow-y-auto p-12 custom-scrollbar" onClick={() => setSelectedFieldId(null)}>
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border-2 border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-8">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-600 rounded-lg">
                                            <Info className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-xl font-black text-[#0f172a] dark:text-white uppercase tracking-tight">Estructura del Formulario</h3>
                                    </div>
                                    <div className="px-3 py-1 bg-[#020617] text-white text-[9px] font-black rounded-lg border border-slate-700 uppercase tracking-widest">
                                        Campos Activos
                                    </div>
                                </div>

                                <div className={clsx(
                                    "grid gap-x-6 gap-y-4 max-w-5xl mx-auto transition-all duration-500",
                                    formColumns === 1 ? "grid-cols-1" :
                                        formColumns === 3 ? "grid-cols-1 md:grid-cols-3" :
                                            formColumns === 4 ? "grid-cols-1 md:grid-cols-4" :
                                                "grid-cols-1 md:grid-cols-2"
                                )}>
                                    {sortedFields.length > 0 ? (
                                        sortedFields.filter(f => !f.parent_accordion_id).map((field) => renderField(field))
                                    ) : (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
                                            <p className="text-slate-400 italic font-medium mb-4">Aún no has añadido campos a esta actividad.</p>
                                            <button
                                                onClick={onAddField}
                                                className="px-6 py-3 bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30 font-black rounded-xl transition-all uppercase text-[10px] tracking-widest"
                                            >
                                                Comenzar a diseñar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Editor Sidebar */}
                    {!isReadOnly && (
                        <div className="w-64 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col relative transition-all">
                            {selectedField ? (
                                <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
                                    {/* Sidebar Header */}
                                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/40">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <h3 className="text-[10px] font-black text-[#0f172a] dark:text-slate-300 uppercase tracking-widest leading-none">Controles</h3>
                                        </div>
                                    </div>

                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                                        <button
                                            onClick={() => setShowAdvancedModal(true)}
                                            className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group"
                                        >
                                            <Wand2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                                            Parámetros Avanzados
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                                        <div className="space-y-3">
                                            <h4 className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest px-1">Básico</h4>
                                            <div className="space-y-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">Etiqueta del Campo</label>
                                                    <input
                                                        type="text"
                                                        value={selectedField.label || ''}
                                                        onChange={(e) => {
                                                            const newLabel = e.target.value;
                                                            const newName = newLabel.toLowerCase()
                                                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                                                .replace(/\s+/g, '_')
                                                                .replace(/[^a-z0-9_]/g, '');
                                                            onUpdateField(selectedField.id, {
                                                                label: newLabel,
                                                                name: newName || selectedField.name
                                                            });
                                                        }}
                                                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-[11px] font-bold text-slate-900 dark:text-white"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">Tipo de Dato</label>
                                                    <select
                                                        value={selectedField.type}
                                                        onChange={(e) => {
                                                            const newType = e.target.value as FieldType;
                                                            const updates: Partial<FieldDefinition> = { type: newType };

                                                            // Provide default regex for email/phone if none is set
                                                            if (newType === 'email' && !selectedField.regex_pattern) {
                                                                updates.regex_pattern = '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$';
                                                            } else if (newType === 'phone' && !selectedField.regex_pattern) {
                                                                updates.regex_pattern = '^\\+?[1-9]\\d{1,14}$';
                                                            }

                                                            onUpdateField(selectedField.id, updates);
                                                        }}
                                                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-[11px] font-bold text-slate-900 dark:text-white appearance-none cursor-pointer"
                                                    >
                                                        {FIELD_TYPES.map(t => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">Identificador (Name)</label>
                                                    <input
                                                        type="text"
                                                        value={selectedField.name || ''}
                                                        onChange={(e) => onUpdateField(selectedField.id, { name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                                                        className="w-full px-2.5 py-1.5 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800/50 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold"
                                                    />
                                                </div>

                                            </div>
                                        </div>


                                        {selectedField.type === 'select' && (
                                            <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <label className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block px-1">Opciones</label>
                                                <textarea
                                                    value={selectedField.options?.join('\n') || ''}
                                                    onChange={(e) => onUpdateField(selectedField.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[10px] font-bold min-h-[80px]"
                                                    placeholder="Una opción por línea..."
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Footer Acciones */}
                                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col gap-1.5">
                                        <button
                                            onClick={handleSaveClick}
                                            disabled={saving}
                                            className={clsx(
                                                "w-full py-2 px-4 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2",
                                                showSaveSuccess
                                                    ? "bg-emerald-500 text-white shadow-emerald-200"
                                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                            )}
                                        >
                                            {showSaveSuccess ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <Save className={clsx("w-3.5 h-3.5", saving && "animate-pulse")} />
                                            )}
                                            {showSaveSuccess ? '¡Cambios Guardados!' : (saving ? 'Guardando...' : 'Guardar Cambios')}
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (confirm('¿Estás seguro de que deseas eliminar este control? Esta acción no se puede deshacer.')) {
                                                    onDeleteField(selectedField.id);
                                                    setSelectedFieldId(null);
                                                }
                                            }}
                                            className="w-full py-2 px-4 text-[9px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-lg shadow-rose-200 dark:shadow-rose-900/20 active:scale-95 flex items-center justify-center gap-2 group"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 group-hover:animate-bounce" />
                                            Eliminar Control
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
                                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <Layout className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor de Diseño</p>
                                            <p className="text-[9px] text-slate-400 italic">Selecciona un campo para editar o guarda los cambios globales.</p>
                                        </div>

                                        <button
                                            onClick={handleSaveClick}
                                            disabled={saving}
                                            className={clsx(
                                                "w-full py-4 px-6 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50",
                                                showSaveSuccess
                                                    ? "bg-emerald-500 text-white shadow-emerald-200"
                                                    : "bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800"
                                            )}
                                        >
                                            {showSaveSuccess ? (
                                                <CheckCircle2 className="w-4 h-4 animate-in zoom-in duration-300" />
                                            ) : (
                                                <Save className={clsx("w-4 h-4", saving && "animate-pulse")} />
                                            )}
                                            {showSaveSuccess ? '¡Cambios Guardados!' : (saving ? 'Guardando...' : 'Guardar Todo')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {/* Modal de Propiedades Avanzadas */}
            {showAdvancedModal && selectedField && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        {/* Header del Modal */}
                        <div className="bg-[#0f172a] p-6 flex items-center justify-between text-white border-b border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                                    <Settings2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 opacity-80">Configuración Avanzada</p>
                                    <h3 className="text-lg font-black uppercase tracking-tight">{selectedField.label || selectedField.name}</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAdvancedModal(false)}
                                className="p-2 hover:bg-white/10 rounded-xl transition-all outline-none"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Contenido Scrolleable */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin">
                            {/* Sección 1: Validaciones y Restricciones */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#0f172a] dark:text-slate-300">Validaciones y Restricciones</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {(selectedField.type === 'number' || selectedField.type === 'currency' || selectedField.type === 'date') && (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Valor Mínimo</label>
                                                <input
                                                    type="number"
                                                    value={selectedField.min_value ?? ''}
                                                    onChange={e => onUpdateField(selectedField.id, { min_value: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 font-bold text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                                    placeholder="Ej: 0"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Valor Máximo</label>
                                                <input
                                                    type="number"
                                                    value={selectedField.max_value ?? ''}
                                                    onChange={e => onUpdateField(selectedField.id, { max_value: e.target.value ? Number(e.target.value) : undefined })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 font-bold text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                                    placeholder="Ej: 9999"
                                                />
                                            </div>
                                        </>
                                    )}

                                    {(selectedField.type === 'text' || selectedField.type === 'textarea' || selectedField.type === 'email' || selectedField.type === 'phone' || selectedField.type === 'consecutivo') && (
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Longitud Máxima (Caracteres)</label>
                                            <input
                                                type="number"
                                                value={selectedField.max_length ?? ''}
                                                onChange={e => onUpdateField(selectedField.id, { max_length: e.target.value ? Number(e.target.value) : undefined })}
                                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 font-bold text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                                placeholder="Ej: 255"
                                            />
                                        </div>
                                    )}
                                    <div className="col-span-full space-y-1.5">
                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Patrón de Validación (Regex)</label>
                                        <input
                                            type="text"
                                            value={selectedField.regex_pattern ?? ''}
                                            onChange={e => onUpdateField(selectedField.id, { regex_pattern: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-mono text-slate-900 dark:text-blue-400 shadow-sm placeholder:text-slate-400"
                                            placeholder={
                                                selectedField.type === 'email' ? "Ej: ^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" :
                                                    selectedField.type === 'phone' ? "Ej: ^\\+?[1-9]\\d{1,14}$" :
                                                        "Ej: ^[A-Z]{2}-\\d{4}$"
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección 2: Configuración de Origen de Datos (Lookup) */}
                            {selectedField.type === 'lookup' && (
                                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4 text-blue-600" />
                                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-300">Configuración de Búsqueda Interactiva (Lookup)</h4>
                                        </div>
                                        {/* Type Selector Toggle */}
                                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: 'database', url: undefined, method: undefined, search_param: undefined } as any })}
                                                className={clsx(
                                                    "px-3 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider",
                                                    (selectedField.lookup_config?.type === 'database') ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-blue-600"
                                                )}
                                            >
                                                Catálogo BD
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: 'rest', table_name: undefined, search_column: undefined } as any })}
                                                className={clsx(
                                                    "px-3 py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-wider",
                                                    (!selectedField.lookup_config?.type || selectedField.lookup_config?.type === 'rest') ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-blue-600"
                                                )}
                                            >
                                                API Externa
                                            </button>
                                        </div>
                                    </div>

                                    {selectedField.lookup_config?.type === 'database' ? (
                                        /* CONFIGURACIÓN BASE DE DATOS */
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                            <div className="col-span-full space-y-1.5">
                                                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">1. Seleccionar Tabla del Sistema</label>
                                                <select
                                                    value={selectedField.lookup_config?.table_name || ''}
                                                    onChange={e => {
                                                        const table = e.target.value;
                                                        if (table === selectedField.lookup_config?.table_name) return;
                                                        if (onFetchColumns && table) onFetchColumns(table);
                                                        onUpdateField(selectedField.id, {
                                                            lookup_config: {
                                                                ...selectedField.lookup_config,
                                                                type: 'database',
                                                                table_name: table,
                                                                // Solo resetear estos si cambia la tabla
                                                                search_column: '',
                                                                display_fields: [],
                                                                value_field: '',
                                                                mapping: selectedField.lookup_config?.mapping || {}
                                                            } as any
                                                        });
                                                    }}
                                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 font-bold text-sm text-slate-900 dark:text-slate-100"
                                                >
                                                    <option value="">-- Elija una tabla --</option>
                                                    {dbTables && dbTables.length > 0 ? dbTables.map(t => (
                                                        <option key={t} value={t}>{t}</option>
                                                    )) : (
                                                        <option disabled>No hay tablas disponibles</option>
                                                    )}
                                                </select>
                                            </div>

                                            {selectedField.lookup_config?.table_name && (
                                                <>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Columna de Búsqueda</label>
                                                        <select
                                                            value={selectedField.lookup_config?.search_column || ''}
                                                            onChange={e => onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: selectedField.lookup_config?.type || 'database', search_column: e.target.value } as any })}
                                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 font-bold text-sm text-slate-900 dark:text-slate-100"
                                                        >
                                                            <option value="">Seleccione columna...</option>
                                                            {tableColumnsMap?.[selectedField.lookup_config.table_name!]?.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Columna de Valor (ID)</label>
                                                        <select
                                                            value={selectedField.lookup_config?.value_field || ''}
                                                            onChange={e => onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: selectedField.lookup_config?.type || 'database', value_field: e.target.value } as any })}
                                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 font-bold text-sm text-slate-900 dark:text-slate-100"
                                                        >
                                                            <option value="">Seleccione valor...</option>
                                                            {tableColumnsMap?.[selectedField.lookup_config.table_name!]?.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-full space-y-1.5">
                                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Columnas a Mostrar en Popup</label>
                                                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl">
                                                            {tableColumnsMap?.[selectedField.lookup_config.table_name!]?.map(c => (
                                                                <label key={c} className={clsx(
                                                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-[10px] font-bold",
                                                                    selectedField.lookup_config?.display_fields?.includes(c)
                                                                        ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800"
                                                                        : "bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
                                                                )}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="w-3 h-3 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                                                        checked={selectedField.lookup_config?.display_fields?.includes(c) || false}
                                                                        onChange={(evt) => {
                                                                            const isChecked = evt.target.checked;
                                                                            const current = selectedField.lookup_config?.display_fields || [];
                                                                            const next = isChecked ? [...current, c] : current.filter(x => x !== c);
                                                                            onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: selectedField.lookup_config?.type || 'database', display_fields: next } as any });
                                                                        }}
                                                                    />
                                                                    {c}
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        /* CONFIGURACIÓN API REST */
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                            <div className="col-span-full space-y-1.5">
                                                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Endpoint / URL de API</label>
                                                <input
                                                    type="text"
                                                    value={selectedField.lookup_config?.url ?? ''}
                                                    onChange={e => onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, url: e.target.value, type: 'rest', method: selectedField.lookup_config?.method || 'GET' } })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                                    placeholder="https://su-api.com/v1/datos"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Campo de Valor (ID)</label>
                                                <input
                                                    type="text"
                                                    value={selectedField.lookup_config?.value_field ?? ''}
                                                    onChange={e => onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, value_field: e.target.value, type: 'rest' } })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                                    placeholder="id"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Parámetro de Búsqueda</label>
                                                <input
                                                    type="text"
                                                    value={selectedField.lookup_config?.search_param ?? ''}
                                                    onChange={e => onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, search_param: e.target.value, type: 'rest' } })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                                    placeholder="q"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Mapeo Automático (Común para ambos) */}
                                    <div className="col-span-full space-y-3 p-4 bg-slate-50/50 dark:bg-slate-950/50 border-2 border-slate-200 dark:border-slate-800 rounded-2xl">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Mapeo de Autollenado</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const currentMapping = selectedField.lookup_config?.mapping || {};
                                                    onUpdateField(selectedField.id, {
                                                        lookup_config: {
                                                            ...selectedField.lookup_config,
                                                            type: selectedField.lookup_config?.type || 'rest',
                                                            mapping: { ...currentMapping, '': '' }
                                                        } as any
                                                    });
                                                }}
                                                className="px-3 py-1 bg-blue-500 text-white text-[8px] font-black rounded-lg hover:bg-blue-600 transition-all uppercase tracking-widest shadow-lg shadow-blue-500/20"
                                            >
                                                + Agregar Mapeo
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedField.lookup_config?.mapping && Object.entries(selectedField.lookup_config.mapping).length > 0 ? (
                                                Object.entries(selectedField.lookup_config.mapping).map(([sourceKey, targetField], idx) => (
                                                    <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Campo Origen (API/Tabla)"
                                                            value={sourceKey}
                                                            onChange={(e) => {
                                                                const newSource = e.target.value;
                                                                if (newSource === sourceKey) return;
                                                                const mapping = { ...selectedField.lookup_config?.mapping };
                                                                // Preservamos el orden eliminando y añadiendo si es necesario,
                                                                // pero para inputs controlados en tiempo real es mejor actualizar la clave cuidadosamente
                                                                const newMapping = Object.fromEntries(
                                                                    Object.entries(mapping).map(([k, v]) => [k === sourceKey ? newSource : k, v])
                                                                );
                                                                onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: selectedField.lookup_config?.type || 'rest', mapping: newMapping } as any });
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-mono shadow-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400"
                                                        />
                                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                                        <select
                                                            value={targetField}
                                                            onChange={(e) => {
                                                                const mapping = { ...selectedField.lookup_config?.mapping, [sourceKey]: e.target.value };
                                                                onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: selectedField.lookup_config?.type || 'rest', mapping } as any });
                                                            }}
                                                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold shadow-sm text-slate-900 dark:text-slate-200"
                                                        >
                                                            <option value="">Llenar campo...</option>
                                                            {fields.filter(f => f.type !== 'label' && f.type !== 'accordion').map(f => (
                                                                <option key={f.id} value={f.name}>{f.label || f.name}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => {
                                                                const mapping = { ...selectedField.lookup_config?.mapping };
                                                                delete mapping[sourceKey];
                                                                onUpdateField(selectedField.id, { lookup_config: { ...selectedField.lookup_config, type: selectedField.lookup_config?.type || 'rest', mapping } as any });
                                                            }}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[10px] text-slate-400 italic text-center py-2">No hay mapeos. Define uno para llenar el formulario automáticamente.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Sección 3: Consecutivos y Máscaras */}
                            {selectedField.type === 'consecutivo' && (
                                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2">
                                        <Hash className="w-4 h-4 text-amber-500" />
                                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-300">Máscara de Consecutivo</h4>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Formato de Máscara</label>
                                        <input
                                            type="text"
                                            value={selectedField.consecutive_mask ?? ''}
                                            onChange={e => onUpdateField(selectedField.id, { consecutive_mask: e.target.value })}
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 font-extrabold text-sm tracking-widest text-slate-900 dark:text-blue-400 shadow-inner transition-all placeholder:text-slate-300"
                                            placeholder="Ej: CTR-YYYY-####"
                                        />
                                        <p className="text-[8px] text-slate-400 italic px-2 pt-2">YYYY: Año | MM: Mes | ####: Contador secuencial.</p>
                                    </div>
                                </div>
                            )}

                            {/* Sección: Columnas del Grid */}
                            {selectedField.type === 'grid' && (
                                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Layout className="w-4 h-4 text-indigo-500" />
                                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-300">Definición de Columnas (Grid)</h4>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const currentCols = selectedField.grid_columns || [];
                                                onUpdateField(selectedField.id, {
                                                    grid_columns: [...currentCols, { id: Math.random().toString(36).substr(2, 9), name: 'nueva_columna', label: 'Nueva Columna', type: 'text', width: '150px' }]
                                                });
                                            }}
                                            className="px-3 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Nueva Columna
                                        </button>
                                    </div>
                                    <div className="space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                        {(selectedField.grid_columns || []).map((col: any, index: number) => (
                                            <div key={col.id || index} className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 group/col transition-all hover:border-indigo-300 shadow-sm">
                                                <div className="flex-1 grid grid-cols-3 gap-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">ID Campo</label>
                                                        <input
                                                            type="text"
                                                            value={col.name}
                                                            onChange={e => {
                                                                const newCols = [...(selectedField.grid_columns || [])];
                                                                newCols[index] = { ...col, name: e.target.value };
                                                                onUpdateField(selectedField.id, { grid_columns: newCols });
                                                            }}
                                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold outline-none focus:border-indigo-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Etiqueta</label>
                                                        <input
                                                            type="text"
                                                            value={col.label}
                                                            onChange={e => {
                                                                const newCols = [...(selectedField.grid_columns || [])];
                                                                newCols[index] = { ...col, label: e.target.value };
                                                                onUpdateField(selectedField.id, { grid_columns: newCols });
                                                            }}
                                                            className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold outline-none focus:border-indigo-400"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                                                        <select
                                                            value={col.type}
                                                            onChange={e => {
                                                                const newCols = [...(selectedField.grid_columns || [])];
                                                                newCols[index] = { ...col, type: e.target.value };
                                                                onUpdateField(selectedField.id, { grid_columns: newCols });
                                                            }}
                                                            className="w-full h-[25px] px-2 py-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold outline-none focus:border-indigo-400"
                                                        >
                                                            <option value="text">Texto</option>
                                                            <option value="number">Número</option>
                                                            <option value="currency">Moneda</option>
                                                            <option value="date">Fecha</option>
                                                            <option value="select">Lista</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newCols = (selectedField.grid_columns || []).filter((_, i) => i !== index);
                                                        onUpdateField(selectedField.id, { grid_columns: newCols });
                                                    }}
                                                    className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all opacity-0 group-hover/col:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {(!selectedField.grid_columns || selectedField.grid_columns.length === 0) && (
                                            <div className="text-center py-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl opacity-50">
                                                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Sin columnas configuradas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Sección: Lógica de Visibilidad */}
                            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-indigo-500" />
                                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-300">Lógica de Visibilidad</h4>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Condición para Mostrar este Campo</label>
                                    <input
                                        type="text"
                                        value={selectedField.visibility_condition ?? ''}
                                        onChange={e => onUpdateField(selectedField.id, { visibility_condition: e.target.value })}
                                        className="w-full px-4 py-3 bg-[#0f172a] dark:bg-black text-white placeholder:text-slate-500 border-2 border-indigo-500/30 rounded-2xl outline-none focus:border-indigo-500 font-mono text-xs shadow-xl"
                                        placeholder="Ej: monto_total > 1000000 o tipo_persona === 'natural'"
                                    />
                                    <div className="flex items-start gap-2 px-1 mt-2">
                                        <Info className="w-3 h-3 text-slate-500 mt-0.5" />
                                        <p className="text-[8px] text-slate-500 italic">
                                            Usa nombres de campos y operadores JS básicos (===, !==, {'>'}, {'<'}, &&, ||). Si la condición es verdadera, el campo será visible.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Sección 4: Otros Ajustes */}
                            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-300">Otros Ajustes</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Valor por Defecto</label>
                                        <input
                                            type="text"
                                            value={selectedField.default_value ?? ''}
                                            onChange={e => onUpdateField(selectedField.id, { default_value: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-bold shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                            placeholder="Valor inicial..."
                                        />
                                    </div>

                                    <div className="space-y-1.5 col-span-full overflow-visible">
                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Auto-llenar Desde</label>
                                        <select
                                            value={selectedField.source_activity_id && selectedField.source_field_name ? `${selectedField.source_activity_id}:${selectedField.source_field_name}` : ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const [sourceActivityId, sourceFieldName] = value ? value.split(':') : [undefined, undefined];
                                                onUpdateField(selectedField.id, {
                                                    source_activity_id: sourceActivityId,
                                                    source_field_name: sourceFieldName
                                                });
                                            }}
                                            className="w-full h-[45px] px-4 py-2 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-bold shadow-sm text-slate-900 dark:text-slate-100"
                                        >
                                            <option value="">Ingreso Manual (Usuario)</option>
                                            {previousActivities.map(prevActivity =>
                                                prevActivity.fields?.map((prevField: any) => (
                                                    <option key={`${prevActivity.id}:${prevField.name}`} value={`${prevActivity.id}:${prevField.name}`}>
                                                        {prevActivity.name} → {prevField.label || prevField.name}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Layout className="w-4 h-4 text-indigo-500" />
                                            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-800 dark:text-slate-300">Organización y Visibilidad</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Agrupar en Acordeón</label>
                                                <select
                                                    value={selectedField.parent_accordion_id || ''}
                                                    onChange={(e) => onUpdateField(selectedField.id, { parent_accordion_id: e.target.value || undefined })}
                                                    className="w-full h-[45px] px-4 py-2 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-xs font-bold shadow-sm text-slate-900 dark:text-slate-100"
                                                >
                                                    <option value="">Ninguno (Raíz)</option>
                                                    {fields.filter(f => f.type === 'accordion' && f.id !== selectedField.id).map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.label || acc.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <label className="flex items-center justify-between w-full h-[45px] px-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:border-blue-200 transition-all shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Obligatorio</span>
                                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest opacity-60">(Required)</span>
                                                    </div>
                                                    <button
                                                        onClick={() => onUpdateField(selectedField.id, { required: !selectedField.required })}
                                                        className={clsx(
                                                            "w-8 h-4 rounded-full transition-all relative shrink-0 ml-2",
                                                            selectedField.required ? "bg-blue-600 shadow-md shadow-blue-200" : "bg-slate-300 dark:bg-slate-700"
                                                        )}
                                                    >
                                                        <div className={clsx(
                                                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                                            selectedField.required ? "left-4" : "left-0.5"
                                                        )} />
                                                    </button>
                                                </label>
                                                <label className="flex items-center justify-between w-full h-[45px] px-3 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:border-amber-200 transition-all shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Solo Lectura</span>
                                                        <span className="text-[6px] font-bold text-slate-400 uppercase tracking-widest opacity-60">(Read Only)</span>
                                                    </div>
                                                    <button
                                                        onClick={() => onUpdateField(selectedField.id, { is_readonly: !selectedField.is_readonly })}
                                                        className={clsx(
                                                            "w-8 h-4 rounded-full transition-all relative shrink-0 ml-2",
                                                            selectedField.is_readonly ? "bg-amber-500 shadow-md shadow-amber-200" : "bg-slate-300 dark:bg-slate-700"
                                                        )}
                                                    >
                                                        <div className={clsx(
                                                            "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                                            selectedField.is_readonly ? "left-4" : "left-0.5"
                                                        )} />
                                                    </button>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-full space-y-1.5 pt-2">
                                        <label className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">Descripción / Texto de Ayuda</label>
                                        <textarea
                                            value={selectedField.description || ''}
                                            onChange={(e) => onUpdateField(selectedField.id, { description: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-xs font-bold shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 min-h-[80px] resize-none"
                                            placeholder="Información adicional para el usuario final..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer del Modal */}
                        <div className="bg-slate-50 dark:bg-[#020617] p-8 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                            <button
                                onClick={() => setShowAdvancedModal(false)}
                                className="px-10 py-4 bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl active:scale-95 translate-y-0 hover:-translate-y-1"
                            >
                                Entendido y Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
