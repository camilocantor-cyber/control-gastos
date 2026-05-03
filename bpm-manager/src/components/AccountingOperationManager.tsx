import React, { useState } from 'react';
import { useAccountingOperations } from '../hooks/useAccountingOperations';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import {
    Plus,
    Trash2,
    Save,
    Settings,
    Table2,
    Layout,
    Info,
    ChevronLeft,
    Play
} from 'lucide-react';
import type {
    AccountingOperation,
    OperationParameter,
    OperationTemplate
} from '../types/accounting';
import { ExecuteOperationModal } from './ExecuteOperationModal';

export function AccountingOperationManager({ onBack }: { onBack?: () => void }) {
    const { operations, loading, saveOperation, deleteOperation } = useAccountingOperations();
    const { getMovementAccounts } = useChartOfAccounts();
    const movementAccounts = getMovementAccounts();

    const [isEditing, setIsEditing] = useState(false);
    const [executingOp, setExecutingOp] = useState<AccountingOperation | null>(null);

    // Estado para edición
    const [opForm, setOpForm] = useState<Partial<AccountingOperation>>({});
    const [parameters, setParameters] = useState<Partial<OperationParameter>[]>([]);
    const [templates, setTemplates] = useState<Partial<OperationTemplate>[]>([]);

    const handleNew = () => {
        setOpForm({ name: '', code: '', description: '', is_active: true });
        setParameters([{ name: 'valor', label: 'Valor', data_type: 'NUMBER' }]);
        setTemplates([{ account_code: '', movement_type: 'DEBITO', value_formula: '{{valor}}' }]);
        setIsEditing(true);
    };

    const handleEdit = (op: AccountingOperation) => {
        setOpForm(op);
        setParameters(op.parameters || []);
        setTemplates(op.templates || []);
        setIsEditing(true);
    };

    const addParameter = () => {
        setParameters([...parameters, { name: '', label: '', data_type: 'TEXT' }]);
    };

    const addTemplateLine = () => {
        setTemplates([...templates, {
            account_code: '',
            movement_type: 'DEBITO',
            third_party_formula: '{{tercero}}',
            description_formula: '{{descripcion}}',
            value_formula: '{{valor}}'
        }]);
    };

    const handleSave = async () => {
        if (!opForm.name || !opForm.code) {
            alert('Nombre y Código son obligatorios');
            return;
        }
        const success = await saveOperation(opForm, parameters, templates);
        if (success) {
            setIsEditing(false);
        }
    };

    if (loading && operations.length === 0) {
        return <div className="p-8 text-center text-slate-400">Cargando operaciones...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <Layout className="w-6 h-6 text-blue-600" />
                            Operaciones Contables
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Define y ejecuta procesos contables automatizados</p>
                    </div>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Operativa
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-6">
                    {/* Configuración Básica */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nombre de la Operación</label>
                                <input
                                    value={opForm.name}
                                    onChange={e => setOpForm({ ...opForm, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white font-bold outline-none"
                                    placeholder="Ej: Pago de Nómina"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Código Único</label>
                                <input
                                    value={opForm.code}
                                    onChange={e => setOpForm({ ...opForm, code: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white font-bold outline-none"
                                    placeholder="OP-NOMINA-01"
                                />
                            </div>
                            <div className="flex-[2]">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Descripción</label>
                                <input
                                    value={opForm.description || ''}
                                    onChange={e => setOpForm({ ...opForm, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white font-bold outline-none"
                                    placeholder="Describa brevemente la operativa..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <Table2 className="w-6 h-6 text-blue-600" />
                                        Plantilla Formulada
                                    </h3>
                                    <button
                                        onClick={addTemplateLine}
                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs hover:bg-blue-100 transition-all flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Nueva Línea
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-2 pb-2">Cuenta</th>
                                                <th className="px-2 pb-2">Tipo</th>
                                                <th className="px-2 pb-2">Tercero</th>
                                                <th className="px-2 pb-2">Descripción</th>
                                                <th className="px-2 pb-2">Valor</th>
                                                <th className="px-2 pb-2 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {templates.map((t, i) => (
                                                <tr key={i} className="group border-b border-slate-50 dark:border-slate-800/50">
                                                    <td className="p-2">
                                                        <input
                                                            list="accounts-list"
                                                            value={t.account_code || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].account_code = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-bold outline-none"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <select
                                                            value={t.movement_type}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].movement_type = e.target.value as 'DEBITO' | 'CREDITO';
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white font-bold outline-none"
                                                        >
                                                            <option value="DEBITO">D</option>
                                                            <option value="CREDITO">C</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            value={t.third_party_formula || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].third_party_formula = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono"
                                                            placeholder="{{tercero}}"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            value={t.description_formula || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].description_formula = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono"
                                                            placeholder="{{descripcion}}"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            value={t.value_formula || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].value_formula = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-2 py-1.5 text-xs font-mono text-blue-700 dark:text-blue-400 font-bold"
                                                            placeholder="{{valor}}"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button onClick={() => setTemplates(templates.filter((_, idx) => idx !== i))} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                                    <button
                                        onClick={() => { setIsEditing(false); }}
                                        className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                    >
                                        <Save className="w-5 h-5" /> Guardar Operativa
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-blue-600" />
                                        Parámetros
                                    </h3>
                                    <button
                                        onClick={addParameter}
                                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                    {parameters.map((p, i) => (
                                        <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 group transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <input
                                                    value={p.name}
                                                    onChange={e => {
                                                        const newP = [...parameters];
                                                        newP[i].name = e.target.value;
                                                        setParameters(newP);
                                                    }}
                                                    placeholder="Nombre variable"
                                                    className="bg-transparent border-none text-[11px] font-black py-0 outline-none text-blue-600 dark:text-blue-400 w-full"
                                                />
                                                <button
                                                    onClick={() => setParameters(parameters.filter((_, idx) => idx !== i))}
                                                    className="text-slate-300 hover:text-rose-500 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    value={p.label}
                                                    onChange={e => {
                                                        const newP = [...parameters];
                                                        newP[i].label = e.target.value;
                                                        setParameters(newP);
                                                    }}
                                                    placeholder="Etiqueta"
                                                    className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold py-0.5 outline-none text-slate-500 dark:text-slate-400"
                                                />
                                                <select
                                                    value={p.data_type}
                                                    onChange={e => {
                                                        const newP = [...parameters];
                                                        newP[i].data_type = e.target.value as any;
                                                        setParameters(newP);
                                                    }}
                                                    className="bg-transparent border-b border-slate-200 dark:border-slate-700 text-[9px] font-black uppercase outline-none text-slate-400"
                                                >
                                                    <option value="NUMBER">Num</option>
                                                    <option value="TEXT">Txt</option>
                                                    <option value="DATE">Fec</option>
                                                    <option value="PROVIDER">Prov</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5 flex items-start gap-4">
                                <Info className="w-6 h-6 text-blue-600 shrink-0" />
                                <div>
                                    <h4 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-1">Guía de Fórmulas</h4>
                                    <p className="text-[11px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                        Usa <code>{"{{nombre}}"}</code> para insertar valores.<br />
                                        Usa <code>{"cta{{1105}}"}</code> para referenciar otra cuenta.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {operations.map(op => (
                        <div key={op.id} className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-blue-500/30 transition-all shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <button onClick={() => deleteOperation(op.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{op.name}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{op.code}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2.5rem] font-medium leading-relaxed">
                                    {op.description || 'Sin descripción'}
                                </p>
                            </div>

                            <div className="mt-6 flex gap-2">
                                <button
                                    onClick={() => handleEdit(op)}
                                    className="flex-1 py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-white font-bold text-[10px] transition-all border border-slate-200 dark:border-slate-700 uppercase tracking-widest"
                                >
                                    Configurar
                                </button>
                                <button
                                    onClick={() => setExecutingOp(op)}
                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] transition-all shadow-md shadow-blue-500/20 uppercase tracking-widest flex items-center justify-center gap-1.5"
                                >
                                    <Play className="w-3 h-3 fill-current" />
                                    Ejecutar
                                </button>
                            </div>
                        </div>
                    ))}

                    {operations.length === 0 && (
                        <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                            <Layout className="w-12 h-12 text-slate-300 mb-4" />
                            <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">No hay operaciones definidas</h4>
                            <button onClick={handleNew} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
                                Crear Primera Operación
                            </button>
                        </div>
                    )}
                </div>
            )}

            {executingOp && (
                <ExecuteOperationModal
                    operation={executingOp}
                    onClose={() => setExecutingOp(null)}
                    onSuccess={() => {
                        setExecutingOp(null);
                        alert('¡Comprobante generado con éxito!');
                    }}
                />
            )}

            <datalist id="accounts-list">
                {movementAccounts.map(acc => (
                    <option key={acc.code} value={acc.code}>
                        {acc.name}
                    </option>
                ))}
            </datalist>
        </div>
    );
}
