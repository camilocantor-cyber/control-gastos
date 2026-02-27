import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Zap, Save, FileText, Settings2, FolderOpen } from 'lucide-react';
import { cn } from '../utils/cn';
import { FormPreviewModal } from './FormPreviewModal';
import type { WorkflowDetail, FieldDefinition, AutomatedAction, AutomatedActionType, ActionExecutionTiming } from '../types';

interface DetailsManagerModalProps {
    workflowId: string;
    details: WorkflowDetail[];
    setDetails: React.Dispatch<React.SetStateAction<WorkflowDetail[]>>;
    onClose: () => void;
    onSave: () => void;
}

export function DetailsManagerModal({ workflowId, details, setDetails, onClose, onSave }: DetailsManagerModalProps) {
    const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'fields' | 'actions'>('general');
    const [editingActionId, setEditingActionId] = useState<string | null>(null);
    const [showFormPreview, setShowFormPreview] = useState(false);

    const handleAddDetail = () => {
        const newDetail: WorkflowDetail = {
            id: crypto.randomUUID(),
            workflow_id: workflowId,
            name: 'Nueva Carpeta',
            description: '',
            fields: [],
            actions: []
        };
        setDetails(prev => [...prev, newDetail]);
        setSelectedDetailId(newDetail.id);
        setActiveTab('general');
    };

    const handleDeleteDetail = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('¿Eliminar esta carpeta? Se perderá su configuración.')) {
            setDetails(prev => prev.filter(d => d.id !== id));
            if (selectedDetailId === id) setSelectedDetailId(null);
        }
    };

    // --- Fields Handlers ---
    const handleAddField = () => {
        if (!selectedDetailId) return;
        const newField: FieldDefinition = {
            id: crypto.randomUUID(),
            activity_id: `detail_${selectedDetailId}`, // pseudo activity id for details
            name: 'nuevo_campo',
            label: 'Nuevo Campo',
            type: 'text',
            required: false,
            order_index: (details.find(d => d.id === selectedDetailId)?.fields?.length || 0)
        };
        setDetails(prev => prev.map(d => d.id === selectedDetailId ? { ...d, fields: [...d.fields, newField] } : d));
    };

    const handleUpdateField = (fieldId: string, updates: Partial<FieldDefinition>) => {
        if (!selectedDetailId) return;
        setDetails(prev => prev.map(d =>
            d.id === selectedDetailId
                ? { ...d, fields: d.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f) }
                : d
        ));
    };

    const handleDeleteField = (fieldId: string) => {
        if (!selectedDetailId) return;
        setDetails(prev => prev.map(d =>
            d.id === selectedDetailId
                ? { ...d, fields: d.fields.filter(f => f.id !== fieldId) }
                : d
        ));
    };

    // --- Actions Handlers ---
    const handleAddAction = (type: AutomatedActionType) => {
        if (!selectedDetailId) return;
        const newAction: AutomatedAction = {
            id: crypto.randomUUID(),
            type,
            name: `Nueva Acción ${type.toUpperCase()}`,
            execution_timing: 'on_save_row',
            config: {}
        };
        setDetails(prev => prev.map(d =>
            d.id === selectedDetailId
                ? { ...d, actions: [...(d.actions || []), newAction] }
                : d
        ));
        setEditingActionId(newAction.id);
    };

    const handleUpdateAction = (actionId: string, updates: Partial<AutomatedAction>) => {
        if (!selectedDetailId) return;
        setDetails(prev => prev.map(d =>
            d.id === selectedDetailId
                ? { ...d, actions: (d.actions || []).map(act => act.id === actionId ? { ...act, ...updates } : act) }
                : d
        ));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-inner">
                            <FolderOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Gestor de Carpetas (Maestro-Detalle)</h2>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Defina sub-estructuras repetibles para el flujo</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { onSave(); onClose(); }} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all font-black text-[12px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95">
                            <Save className="w-4 h-4" />
                            Aplicar Cambios
                        </button>
                        <button onClick={onClose} className="p-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar: List of Details */}
                    <div className="w-80 border-r border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 overflow-y-auto flex flex-col">
                        <div className="p-4">
                            <button onClick={handleAddDetail} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 text-slate-700 dark:text-slate-300 transition-all text-sm font-bold shadow-sm">
                                <Plus className="w-4 h-4" />
                                Nueva Carpeta
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                            {details.map(detail => (
                                <div
                                    key={detail.id}
                                    onClick={() => setSelectedDetailId(detail.id)}
                                    className={cn(
                                        "p-3 rounded-xl border cursor-pointer transition-all group flex items-start gap-3",
                                        selectedDetailId === detail.id
                                            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-sm"
                                            : "bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-indigo-200"
                                    )}
                                >
                                    <div className="mt-1 opacity-70">
                                        <FolderOpen className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={cn("font-bold text-sm truncate", selectedDetailId === detail.id ? "text-indigo-900 dark:text-indigo-100" : "text-slate-700 dark:text-slate-300")}>{detail.name}</h4>
                                        <p className="text-xs text-slate-500 truncate">{detail.fields.length} campos • {detail.actions?.length || 0} acciones</p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteDetail(detail.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {details.length === 0 && (
                                <div className="text-center p-8 text-slate-400">
                                    <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No hay carpetas</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content: Edit Detail */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-950">
                        {selectedDetailId ? (
                            <>
                                {/* Tabs */}
                                <div className="flex gap-2 px-8 pt-4 bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800/50">
                                    {[
                                        { id: 'general', label: 'General', icon: Edit2 },
                                        { id: 'fields', label: 'Estructura (Formulario)', icon: FileText },
                                        { id: 'actions', label: 'Acciones (Al guardar/enviar)', icon: Zap },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={cn(
                                                "flex items-center gap-2 px-5 py-3 font-black text-[10px] uppercase tracking-widest transition-all relative",
                                                activeTab === tab.id
                                                    ? "text-indigo-600 dark:text-indigo-400"
                                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                            )}
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            {tab.label}
                                            {activeTab === tab.id && (
                                                <div className="absolute bottom-0 left-5 right-5 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-y-auto p-8">
                                    {activeTab === 'general' && (
                                        <div className="space-y-6 max-w-2xl">
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Nombre de la Carpeta</label>
                                                <input
                                                    type="text"
                                                    value={details.find(d => d.id === selectedDetailId)?.name || ''}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setDetails(prev => prev.map(d => d.id === selectedDetailId ? { ...d, name: newVal } : d));
                                                    }}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900 dark:text-white"
                                                    placeholder="Ej: Contratos Adicionales"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Descripción</label>
                                                <textarea
                                                    value={details.find(d => d.id === selectedDetailId)?.description || ''}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setDetails(prev => prev.map(d => d.id === selectedDetailId ? { ...d, description: newVal } : d));
                                                    }}
                                                    rows={3}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-600 dark:text-slate-400"
                                                    placeholder="¿Para qué sirve esta carpeta maestra?"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Columnas del Formulario</label>
                                                <select
                                                    value={details.find(d => d.id === selectedDetailId)?.form_columns || 1}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        setDetails(prev => prev.map(d => d.id === selectedDetailId ? { ...d, form_columns: val } : d));
                                                    }}
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-900 dark:text-white appearance-none max-w-xs"
                                                >
                                                    <option value={1}>1 Columna (Vertical)</option>
                                                    <option value={2}>2 Columnas (Ancho Total)</option>
                                                    <option value={3}>3 Columnas (Compacto)</option>
                                                    <option value={4}>4 Columnas (Mini)</option>
                                                </select>
                                            </div>
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
                                                <h4 className="flex items-center gap-2 text-sm font-bold text-indigo-900 dark:text-indigo-100 mb-2">
                                                    <Settings2 className="w-4 h-4" /> ¿Cómo usar esta carpeta?
                                                </h4>
                                                <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                                                    Una vez configurada la estructura y acciones de esta carpeta, cierra este gestor, selecciona una Actividad en el lienzo, ve a sus Propiedades y asóciala buscando en la lista de "Carpetas/Detalles Asociados".
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'fields' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Campos del Detalle</h3>
                                                    <p className="text-sm text-slate-500">Defina la estructura de datos que se pedirá por cada fila ingresada en esta carpeta.</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setShowFormPreview(true)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-[10px] uppercase tracking-widest shadow-sm"
                                                    >
                                                        Vista Previa
                                                    </button>
                                                    <button
                                                        onClick={handleAddField}
                                                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 transition-all text-sm font-bold shadow-lg"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Añadir Campo
                                                    </button>
                                                </div>
                                            </div>

                                            {/* We will render a simplified list of fields for now to save space, but ideally reuse FieldBuilder from WorkflowBuilder if it was extracted */}
                                            <div className="space-y-4">
                                                {details.find(d => d.id === selectedDetailId)?.fields.map((field, idx) => (
                                                    <div key={field.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex gap-4 min-w-[700px] shadow-sm">
                                                        {/* Simple representation for the demo. In a fully refactored app, FieldEditor component would be used here */}
                                                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-4 gap-4">
                                                            <div className="col-span-1">
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Nombre (Variable)</label>
                                                                <input
                                                                    type="text"
                                                                    value={field.name}
                                                                    onChange={e => handleUpdateField(field.id, { name: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Etiqueta Visual</label>
                                                                <input
                                                                    type="text"
                                                                    value={field.label || ''}
                                                                    onChange={e => handleUpdateField(field.id, { label: e.target.value })}
                                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                />
                                                            </div>
                                                            <div className="col-span-1">
                                                                <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                                                                <select
                                                                    value={field.type}
                                                                    onChange={e => handleUpdateField(field.id, { type: e.target.value as any })}
                                                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                >
                                                                    <option value="text">Texto</option>
                                                                    <option value="number">Número</option>
                                                                    <option value="date">Fecha</option>
                                                                    <option value="boolean">Verdadero/Falso</option>
                                                                    <option value="select">Selección Múltiple</option>
                                                                    <option value="provider">Proveedor</option>
                                                                    <option value="currency">Moneda</option>
                                                                    <option value="lookup">Búsqueda Interactiva (Lookup)</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-span-1 flex items-end justify-between">
                                                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={field.required}
                                                                        onChange={e => handleUpdateField(field.id, { required: e.target.checked })}
                                                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                                    />
                                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Obligatorio</span>
                                                                </label>
                                                                <button onClick={() => handleDeleteField(field.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg mb-1">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {field.type === 'lookup' && (
                                                            <div className="mt-4 p-4 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl space-y-3">
                                                                <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                                                                    <FolderOpen className="w-3.5 h-3.5" /> Configuración de Búsqueda Interactiva (Lookup)
                                                                </h5>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">URL del Endpoint</label>
                                                                        <input
                                                                            type="text"
                                                                            value={field.lookup_config?.url || ''}
                                                                            onChange={e => handleUpdateField(field.id, { lookup_config: { ...field.lookup_config, url: e.target.value, type: 'rest', method: field.lookup_config?.method || 'GET', search_param: field.lookup_config?.search_param || '', display_fields: field.lookup_config?.display_fields || [], value_field: field.lookup_config?.value_field || '' } })}
                                                                            placeholder="https://api.ejemplo.com/datos"
                                                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Parámetro de Búsqueda</label>
                                                                        <input
                                                                            type="text"
                                                                            value={field.lookup_config?.search_param || ''}
                                                                            onChange={e => handleUpdateField(field.id, { lookup_config: { ...field.lookup_config, search_param: e.target.value, type: 'rest', method: field.lookup_config?.method || 'GET', url: field.lookup_config?.url || '', display_fields: field.lookup_config?.display_fields || [], value_field: field.lookup_config?.value_field || '' } })}
                                                                            placeholder="q, query, name..."
                                                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Campos a Mostrar (Separados por coma)</label>
                                                                        <input
                                                                            type="text"
                                                                            value={field.lookup_config?.display_fields?.join(', ') || ''}
                                                                            onChange={e => handleUpdateField(field.id, { lookup_config: { ...field.lookup_config, display_fields: e.target.value.split(',').map(s => s.trim()), type: 'rest', method: field.lookup_config?.method || 'GET', search_param: field.lookup_config?.search_param || '', url: field.lookup_config?.url || '', value_field: field.lookup_config?.value_field || '' } })}
                                                                            placeholder="nombre, email, telefono"
                                                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Campo de Valor (El ID a guardar)</label>
                                                                        <input
                                                                            type="text"
                                                                            value={field.lookup_config?.value_field || ''}
                                                                            onChange={e => handleUpdateField(field.id, { lookup_config: { ...field.lookup_config, value_field: e.target.value, type: 'rest', method: field.lookup_config?.method || 'GET', search_param: field.lookup_config?.search_param || '', display_fields: field.lookup_config?.display_fields || [], url: field.lookup_config?.url || '' } })}
                                                                            placeholder="id, uuid..."
                                                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mapeo de Campos adicionales (JSON)</label>
                                                                    <textarea
                                                                        value={field.lookup_config?.mapping ? JSON.stringify(field.lookup_config.mapping, null, 2) : ''}
                                                                        onChange={e => {
                                                                            try {
                                                                                const mapping = JSON.parse(e.target.value);
                                                                                handleUpdateField(field.id, { lookup_config: { ...field.lookup_config, mapping, type: 'rest', method: field.lookup_config?.method || 'GET', search_param: field.lookup_config?.search_param || '', display_fields: field.lookup_config?.display_fields || [], url: field.lookup_config?.url || '', value_field: field.lookup_config?.value_field || '' } });
                                                                            } catch (err) {
                                                                                // Ignore parse errors while typing
                                                                            }
                                                                        }}
                                                                        placeholder='{"email_cliente": "correo_formulario"}'
                                                                        rows={2}
                                                                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {(!details.find(d => d.id === selectedDetailId)?.fields || details.find(d => d.id === selectedDetailId)?.fields.length === 0) && (
                                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                                        <p className="text-slate-400 font-medium">No se han definido campos para este detalle.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'actions' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Acciones del Detalle</h3>
                                                    <p className="text-sm text-slate-500">Estas acciones se ejecutarán sobre CADA fila vinculada al detalle.</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleAddAction('webhook')} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-bold uppercase tracking-wider">Webhook</button>
                                                    <button onClick={() => handleAddAction('email')} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold uppercase tracking-wider">Correo</button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {details.find(d => d.id === selectedDetailId)?.actions.map(action => (
                                                    <div key={action.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col gap-4 shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre de Acción</label>
                                                                    <input
                                                                        type="text"
                                                                        value={action.name}
                                                                        onChange={e => handleUpdateAction(action.id, { name: e.target.value })}
                                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Momento de Ejecución</label>
                                                                    <select
                                                                        value={action.execution_timing || 'on_submit_activity'}
                                                                        onChange={e => handleUpdateAction(action.id, { execution_timing: e.target.value as ActionExecutionTiming })}
                                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                                                                    >
                                                                        <option value="on_save_row">Al Guardar/Actualizar Fila Individual</option>
                                                                        <option value="on_submit_activity">Al Enviar Todo el Maestro (Carpeta)</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setDetails(prev => prev.map(d =>
                                                                        d.id === selectedDetailId
                                                                            ? { ...d, actions: d.actions.filter(a => a.id !== action.id) }
                                                                            : d
                                                                    ));
                                                                }}
                                                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg mt-5"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-center text-slate-500">
                                                            [Configuración de Acción Oculta para la demo - Use el gestor de acciones estándar del código]
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!details.find(d => d.id === selectedDetailId)?.actions || details.find(d => d.id === selectedDetailId)?.actions.length === 0) && (
                                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                                        <p className="text-slate-400 font-medium">No se han definido acciones automáticas.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>

                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <FolderOpen className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg font-bold text-slate-500">Seleccione una carpeta para configurar</p>
                                <p className="text-sm opacity-70">o cree una nueva en la barra lateral.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showFormPreview && selectedDetailId && (
                <FormPreviewModal
                    workflowName="Vista Previa del Detalle"
                    activityName={details.find(d => d.id === selectedDetailId)?.name || 'Carpeta'}
                    fields={details.find(d => d.id === selectedDetailId)?.fields || []}
                    formColumns={details.find(d => d.id === selectedDetailId)?.form_columns || 1}
                    onClose={() => setShowFormPreview(false)}
                    onAddField={handleAddField}
                    onUpdateField={handleUpdateField}
                    onDeleteField={handleDeleteField}
                    onReorderFields={(newFields: FieldDefinition[]) => {
                        setDetails(prev => prev.map(d => {
                            if (d.id === selectedDetailId) {
                                return { ...d, fields: newFields.map((f, i) => ({ ...f, order_index: i })) };
                            }
                            return d;
                        }))
                    }}
                    onSave={onSave}
                />
            )}
        </div>
    );
}
