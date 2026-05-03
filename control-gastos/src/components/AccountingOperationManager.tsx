import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccountingOperations } from '../hooks/useAccountingOperations';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import {
    Plus,
    Trash2,
    Save,
    Settings,
    Table2,
    Play,
    ChevronRight,
    Layout,
    Info
} from 'lucide-react';
import type {
    AccountingOperation,
    OperationParameter,
    OperationTemplate
} from '../types/accounting';
import { ExecuteOperationModal } from './ExecuteOperationModal';

export function AccountingOperationManager() {
    const { user } = useAuth();
    const { operations, loading, saveOperation, deleteOperation } = useAccountingOperations(user?.id);
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
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Layout className="w-8 h-8 text-blue-600" />
                        Operaciones Contables
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Define y ejecuta procesos contables automatizados</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
                    >
                        <Plus className="w-5 h-5" />
                        Nueva Operativa
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Configuración Básica - Barra Horizontal Superior */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-6 shadow-xl">
                        <div className="flex flex-col lg:flex-row gap-6 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nombre de la Operación</label>
                                <input
                                    value={opForm.name}
                                    onChange={e => setOpForm({ ...opForm, name: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-2 text-slate-900 dark:text-white font-bold focus:border-blue-500/30 transition-all outline-none text-sm"
                                    placeholder="Ej: Pago de Nómina"
                                />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Código Único</label>
                                <input
                                    value={opForm.code}
                                    onChange={e => setOpForm({ ...opForm, code: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-2 text-slate-900 dark:text-white font-bold focus:border-blue-500/30 transition-all outline-none text-sm"
                                    placeholder="OP-NOMINA-01"
                                />
                            </div>
                            <div className="flex-[2] min-w-[300px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Descripción</label>
                                <input
                                    value={opForm.description || ''}
                                    onChange={e => setOpForm({ ...opForm, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-white/5 border-2 border-slate-100 dark:border-white/5 rounded-2xl px-4 py-2 text-slate-900 dark:text-white font-bold focus:border-blue-500/30 transition-all outline-none text-sm"
                                    placeholder="Describa brevemente la operativa..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Plantilla de Generación (Izquierda, 2/3) */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 shadow-xl flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        <Table2 className="w-7 h-7 text-blue-600" />
                                        Plantilla de Generación (Formulada)
                                    </h3>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={addTemplateLine}
                                            className="px-4 py-2 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 rounded-xl font-bold text-xs hover:bg-blue-200 transition-all flex items-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Nueva Línea
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-y-2">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                                <th className="px-4 pb-2">Cuenta</th>
                                                <th className="px-4 pb-2">Tipo</th>
                                                <th className="px-4 pb-2">Tercero (Formula)</th>
                                                <th className="px-4 pb-2">Descripción</th>
                                                <th className="px-4 pb-2">Valor/Formula</th>
                                                <th className="px-4 pb-2 text-center">X</th>
                                            </tr>
                                        </thead>
                                        <tbody className="space-y-4">
                                            {templates.map((t, i) => (
                                                <tr key={i} className="group hover:bg-white/5 transition-all outline-none">
                                                    <td className="px-2">
                                                        <input
                                                            list="accounts-list"
                                                            value={t.account_code || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].account_code = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            placeholder="Buscar cuenta..."
                                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-[10px] text-slate-900 dark:text-white font-bold outline-none"
                                                        />
                                                    </td>
                                                    <td className="px-2">
                                                        <select
                                                            value={t.movement_type}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].movement_type = e.target.value as 'DEBITO' | 'CREDITO';
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-2 py-2 text-[10px] text-slate-900 dark:text-white font-bold outline-none"
                                                        >
                                                            <option value="DEBITO">D</option>
                                                            <option value="CREDITO">C</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2">
                                                        <input
                                                            value={t.third_party_formula || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].third_party_formula = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-900 dark:text-white font-mono font-bold"
                                                            placeholder="{{tercero}}"
                                                        />
                                                    </td>
                                                    <td className="px-2">
                                                        <input
                                                            value={t.description_formula || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].description_formula = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-900 dark:text-white font-mono font-bold"
                                                            placeholder="{{descripcion}}"
                                                        />
                                                    </td>
                                                    <td className="px-2">
                                                        <input
                                                            value={t.value_formula || ''}
                                                            onChange={e => {
                                                                const newT = [...templates];
                                                                newT[i].value_formula = e.target.value;
                                                                setTemplates(newT);
                                                            }}
                                                            className="w-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl px-3 py-2 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-400"
                                                            placeholder="{{valor}}"
                                                        />
                                                    </td>
                                                    <td className="text-center px-2">
                                                        <button onClick={() => setTemplates(templates.filter((_, idx) => idx !== i))} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 flex gap-4">
                                    <button
                                        onClick={() => { setIsEditing(false); }}
                                        className="flex-1 py-4 border-2 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 font-bold"
                                    >
                                        <Save className="w-5 h-5" /> Guardar Operativa
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Parámetros (Derecha, 1/3) */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-6 shadow-xl relative overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-blue-600" />
                                        Parámetros
                                    </h3>
                                    <button
                                        onClick={addParameter}
                                        className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                                    {parameters.map((p, i) => (
                                        <div key={i} className="flex gap-2 items-center bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 group/param transition-all hover:border-blue-200 dark:hover:border-blue-500/30">
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <input
                                                    value={p.name}
                                                    onChange={e => {
                                                        const newP = [...parameters];
                                                        newP[i].name = e.target.value;
                                                        setParameters(newP);
                                                    }}
                                                    placeholder="Variable"
                                                    className="w-full bg-transparent border-b-2 border-slate-200 dark:border-white/10 text-[10px] font-black py-0.5 outline-none text-blue-600 dark:text-blue-400 focus:border-blue-500 transition-all truncate"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        value={p.label}
                                                        onChange={e => {
                                                            const newP = [...parameters];
                                                            newP[i].label = e.target.value;
                                                            setParameters(newP);
                                                        }}
                                                        placeholder="Etiqueta"
                                                        className="flex-[2] bg-transparent border-b border-slate-100 dark:border-white/5 text-[10px] font-bold py-0.5 outline-none text-slate-500 dark:text-slate-400 truncate"
                                                    />
                                                    <select
                                                        value={p.data_type}
                                                        onChange={e => {
                                                            const newP = [...parameters];
                                                            newP[i].data_type = e.target.value as any;
                                                            setParameters(newP);
                                                        }}
                                                        className="flex-1 bg-transparent border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-tighter outline-none text-slate-400 hover:text-blue-500 transition-colors cursor-pointer"
                                                    >
                                                        <option value="NUMBER">Num</option>
                                                        <option value="TEXT">Txt</option>
                                                        <option value="DATE">Fec</option>
                                                        <option value="PROVIDER">Prov</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setParameters(parameters.filter((_, idx) => idx !== i))}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all shrink-0"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {parameters.length === 0 && (
                                        <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem]">
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Sin Parámetros</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Guía de Fórmulas */}
                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-3xl p-6 flex items-start gap-4">
                                <Info className="w-8 h-8 text-blue-600 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-1">Guía de Fórmulas</h4>
                                    <p className="text-xs text-blue-800 dark:text-blue-300/70 font-medium leading-relaxed">
                                        Usa <code className="text-blue-600 dark:text-blue-400 font-bold">{"{{nombre_parametro}}"}</code> para insertar valores del formulario.<br />
                                        Usa <code className="text-blue-600 dark:text-blue-400 font-bold">{"cta{{110505}}"}</code> para referenciar el valor de otra cuenta en esta misma operativa.<br />
                                        <span className="opacity-60 italic mt-2 block">Ejemplo: cta{"{{110501}}"} + cta{"{{110502}}"}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in zoom-in duration-500">
                    {operations.map(op => (
                        <div key={op.id} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 hover:border-blue-500/30 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-xl overflow-hidden flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors group-hover:text-white text-slate-400">
                                        <Settings className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => deleteOperation(op.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{op.name}</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{op.code}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[3rem] font-medium leading-relaxed">
                                    {op.description || 'Sin descripción'}
                                </p>
                            </div>

                            <button
                                onClick={() => handleEdit(op)}
                                className="mt-8 w-full py-4 border-2 border-slate-100 dark:border-white/5 bg-slate-50 hover:bg-blue-600 hover:text-white dark:bg-white/5 rounded-2xl text-slate-600 dark:text-white font-black uppercase tracking-widest text-[10px] transition-all"
                            >
                                Configurar Plantilla
                            </button>
                        </div>
                    ))}

                    {operations.length === 0 && (
                        <div className="col-span-full py-20 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                                <Layout className="w-10 h-10 text-slate-600" />
                            </div>
                            <h4 className="text-xl font-black text-white mb-2 tracking-tight">No hay operaciones definidas</h4>
                            <p className="text-slate-500 max-w-xs mx-auto mb-8 font-medium italic">Comienza creando una nueva operativa contable para automatizar tus procesos.</p>
                            <button onClick={handleNew} className="px-8 py-4 bg-blue-600/10 text-blue-500 border border-blue-500/30 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                                <Plus className="w-5 h-5 inline mr-2" /> Crear Primera Operación
                            </button>
                        </div>
                    )}
                </div>
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
