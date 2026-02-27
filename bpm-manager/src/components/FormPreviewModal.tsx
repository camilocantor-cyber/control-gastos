import { useState, useEffect } from 'react';
import { X, Eye, Info, ChevronRight, Plus, Settings2, Trash2, Layout, CheckCircle2, Save } from 'lucide-react';
import type { FieldDefinition, FieldType } from '../types';
import { evaluateCondition } from '../utils/conditions';
import clsx from 'clsx';

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
];

export function FormPreviewModal({ fields, formColumns = 1, activityName, workflowName, onClose, onAddField, onUpdateField, onDeleteField, onReorderFields, onSave }: FormPreviewModalProps) {
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [saving, setSaving] = useState(false);

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

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId === targetId) return;

        const newFields = [...fields];
        const draggedIdx = newFields.findIndex(f => f.id === draggedId);
        const targetIdx = newFields.findIndex(f => f.id === targetId);

        const [draggedField] = newFields.splice(draggedIdx, 1);
        newFields.splice(targetIdx, 0, draggedField);

        onReorderFields(newFields.map((f, i) => ({ ...f, order_index: i })));
        setDraggedFieldId(null);
    };

    const handleSaveClick = async () => {
        if (!onSave) {
            // Visual feedback only if no save function provided
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
                {/* Header - Matching ProcessExecution */}
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/50 backdrop-blur-xl z-20">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 dark:shadow-blue-900/20">
                            <Eye className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{workflowName}</h2>
                                <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 uppercase tracking-tighter">
                                    #MODO_DISEÑO_EN_VIVO
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{activityName}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previsualización Interactiva</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onAddField}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 text-[11px] uppercase tracking-widest group/add"
                        >
                            <Plus className="w-5 h-5 group-hover/add:rotate-90 transition-transform" />
                            Nueva Propiedad
                        </button>
                        <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-500 transition-all border border-slate-100 dark:border-white/5">
                            <X className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden bg-slate-200/50 dark:bg-[#080a0f]">
                    {/* Main Form Area */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar" onClick={() => setSelectedFieldId(null)}>
                        <div className="max-w-5xl mx-auto space-y-10">
                            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <Info className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Diseña y Prueba el Formulario</h3>
                                    </div>
                                    <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-xl border border-amber-100 dark:border-amber-800/50 uppercase tracking-widest animate-pulse">
                                        Simulación Activa
                                    </div>
                                </div>
                                <div className={clsx(
                                    "grid gap-x-6 gap-y-5",
                                    formColumns === 1 ? "grid-cols-1" :
                                        formColumns === 3 ? "grid-cols-1 md:grid-cols-3" :
                                            formColumns === 4 ? "grid-cols-1 md:grid-cols-4" :
                                                "grid-cols-1 md:grid-cols-2"
                                )}>
                                    {fields.length > 0 ? (
                                        fields.map((field) => (
                                            <div
                                                key={field.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, field.id)}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, field.id)}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedFieldId(field.id);
                                                }}
                                                className={clsx(
                                                    "space-y-1.5 p-2 rounded-xl transition-all cursor-grab active:cursor-grabbing group/field relative border-2",
                                                    field.type === 'textarea' ? "col-span-full" : "",
                                                    selectedFieldId === field.id
                                                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-500/5 shadow-inner"
                                                        : "border-transparent hover:border-slate-200 dark:hover:border-slate-800",
                                                    draggedFieldId === field.id ? "opacity-30" : "",
                                                    !evaluateCondition(field.visibility_condition || '', formData) ? "hidden" : "block"
                                                )}
                                            >
                                                {selectedFieldId === field.id && (
                                                    <div className="absolute -top-2.5 -right-2 px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded-full shadow-lg z-10 animate-bounce">
                                                        Editando
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between px-1 min-h-[1rem] h-auto mb-1 pointer-events-none">
                                                    <label className="block text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                                                        {field.label || field.name}
                                                        {field.required && <span className="text-rose-500 ml-1 text-xs">*</span>}
                                                    </label>
                                                    <span className="text-[8px] font-black text-blue-500/0 group-hover/field:text-blue-500 transition-colors uppercase tracking-widest flex items-center gap-1 pointer-events-auto">
                                                        <Settings2 className="w-2.5 h-2.5" />
                                                        Propiedades
                                                    </span>
                                                </div>
                                                <div className={clsx(
                                                    "relative",
                                                    field.type === 'textarea' ? "h-auto" : "h-10"
                                                )}>
                                                    {field.type === 'textarea' ? (
                                                        <textarea
                                                            value={formData[field.name] || ''}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                            className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none min-h-[120px] transition-all resize-none shadow-sm focus:border-blue-500/50"
                                                            placeholder={field.placeholder || `Ingrese ${field.label || field.name}...`}
                                                        />
                                                    ) : field.type === 'select' ? (
                                                        <div className="relative group w-full h-full">
                                                            <select
                                                                value={formData[field.name] || ''}
                                                                onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                                className="w-full h-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer shadow-sm font-bold"
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
                                                            onClick={() => setFormData(prev => ({ ...prev, [field.name]: prev[field.name] === 'true' ? 'false' : 'true' }))}
                                                            className={clsx(
                                                                "flex items-center gap-3 w-full h-full px-5 rounded-2xl border-2 transition-all",
                                                                formData[field.name] === 'true'
                                                                    ? "bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400"
                                                                    : "bg-white border-slate-100 text-slate-400 dark:bg-slate-900 dark:border-slate-800"
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
                                                                className="w-full h-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl pl-8 pr-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all shadow-sm font-bold"
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                                            value={formData[field.name] || ''}
                                                            onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                                                            className="w-full h-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl px-3 text-[11px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all shadow-sm font-bold"
                                                            placeholder={field.placeholder || `Completar...`}
                                                        />
                                                    )}
                                                </div>
                                                {field.description && <p className="text-[9px] text-slate-400 ml-1 mt-0.5 leading-tight italic">{field.description}</p>}
                                            </div>
                                        ))
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

                    {/* Editor Sidebar - Ultra Narrow */}
                    <div className="w-64 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col relative transition-all">
                        {selectedField ? (
                            <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
                                {/* Sidebar Header with Discrete Save */}
                                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900/40">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                            <Settings2 className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">Editor</h3>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                if (confirm('¿Eliminar este campo?')) {
                                                    onDeleteField(selectedField.id);
                                                    setSelectedFieldId(null);
                                                }
                                            }}
                                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 hover:text-rose-500 rounded-lg transition-all"
                                            title="Eliminar Campo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={handleSaveClick}
                                            disabled={saving}
                                            className={clsx(
                                                "px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-1.5 disabled:opacity-50",
                                                showSaveSuccess
                                                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                            )}
                                        >
                                            {showSaveSuccess ? (
                                                <CheckCircle2 className="w-3 h-3 animate-in zoom-in duration-300" />
                                            ) : (
                                                <Save className={clsx("w-3 h-3", saving && "animate-pulse")} />
                                            )}
                                            {showSaveSuccess ? '¡Guardado!' : (saving ? 'Guardando...' : 'Guardar')}
                                        </button>
                                    </div>
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
                                                        const label = e.target.value;
                                                        const name = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                                                        onUpdateField(selectedField.id, { label, name });
                                                    }}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-[11px] font-bold text-slate-900 dark:text-white"
                                                    placeholder="Ej: Nombre Completo"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">Tipo de Dato</label>
                                                <select
                                                    value={selectedField.type}
                                                    onChange={(e) => onUpdateField(selectedField.id, { type: e.target.value as FieldType })}
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
                                                    placeholder="campo_id"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <h4 className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest px-1">Lógica y Visibilidad</h4>

                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Condición para Mostrar</label>
                                                    <Info className="w-2.5 h-2.5 text-slate-300 pointer-events-none" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={selectedField.visibility_condition || ''}
                                                    onChange={(e) => onUpdateField(selectedField.id, { visibility_condition: e.target.value })}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-[10px] font-mono text-blue-600 dark:text-blue-400"
                                                    placeholder="Ej: valor > 1000"
                                                />
                                                <p className="px-1 text-[8px] text-slate-400 leading-tight italic">Usa nombres de otros campos para crear condiciones dinámicas.</p>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">Valor por Defecto</label>
                                                <input
                                                    type="text"
                                                    value={selectedField.default_value || ''}
                                                    onChange={(e) => onUpdateField(selectedField.id, { default_value: e.target.value })}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-[10px] text-slate-600 dark:text-slate-400"
                                                    placeholder="Ej: Pendiente"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">Validación (Regex)</label>
                                                <input
                                                    type="text"
                                                    value={selectedField.regex_pattern || ''}
                                                    onChange={(e) => onUpdateField(selectedField.id, { regex_pattern: e.target.value })}
                                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none text-[10px] font-mono text-slate-500"
                                                    placeholder="Ej: ^[0-9]{10}$"
                                                />
                                            </div>

                                            <label className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg cursor-pointer border border-transparent hover:border-blue-500/30 transition-all">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">¿Es Obligatorio?</span>
                                                <button
                                                    onClick={() => onUpdateField(selectedField.id, { required: !selectedField.required })}
                                                    className={clsx(
                                                        "w-8 h-4 rounded-full transition-all relative overflow-hidden",
                                                        selectedField.required ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
                                                    )}
                                                >
                                                    <div className={clsx(
                                                        "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm",
                                                        selectedField.required ? "left-4.5" : "left-0.5"
                                                    )} />
                                                </button>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Options for Select */}
                                    {selectedField.type === 'select' && (
                                        <div className="space-y-1.5 bg-blue-50/20 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100/50 dark:border-blue-800/30">
                                            <label className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block px-1">Opciones de Lista</label>
                                            <textarea
                                                value={selectedField.options?.join('\n') || ''}
                                                onChange={(e) => onUpdateField(selectedField.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-800 rounded-lg outline-none text-[10px] font-bold min-h-[70px]"
                                                placeholder="Una opción por línea..."
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-1 pt-2">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 leading-none">Descripción / Ayuda</label>
                                        <textarea
                                            value={selectedField.description || ''}
                                            onChange={(e) => onUpdateField(selectedField.id, { description: e.target.value })}
                                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-[10px] text-slate-500 dark:text-slate-400 min-h-[50px] resize-none"
                                            placeholder="Detalle para el usuario..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <Layout className="w-8 h-8 text-slate-300" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Editor de Diseño</p>
                                    <p className="text-[9px] text-slate-400 italic leading-relaxed">Selecciona un campo para configurar su lógica.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
