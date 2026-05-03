import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useJournalEntries } from '../hooks/useJournalEntries';
import {
    X,
    Play,
    CheckCircle,
    AlertCircle,
    Calculator,
    Zap
} from 'lucide-react';
import type {
    AccountingOperation,
    JournalEntryFormData,
    JournalEntryDetailFormData
} from '../types/accounting';

interface Props {
    operation: AccountingOperation;
    onClose: () => void;
    onSuccess: () => void;
}

export function ExecuteOperationModal({ operation, onClose, onSuccess }: Props) {
    const { user } = useAuth();
    const { createEntry } = useJournalEntries(user?.id);

    // Estado para los valores del formulario dinámico
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Inicializar valores por defecto
    React.useEffect(() => {
        const defaults: Record<string, any> = {};
        operation.parameters?.forEach(p => {
            defaults[p.name] = p.default_value || (p.data_type === 'NUMBER' ? 0 : '');
        });
        setFormValues(defaults);
    }, [operation]);

    // --- Motor de Fórmulas ---
    const parseFormula = (formula: string | null, params: Record<string, any>, contextDetails: any[]): string => {
        if (!formula) return '';
        let result = formula;

        // 1. Reemplazar parámetros {{variable}}
        Object.entries(params).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value?.toString() || '');
        });

        // 2. Reemplazar referencias a otras líneas cta{{110505}}
        // Se asume que cta{{code}} devuelve el valor numérico de esa línea
        const ctaRegex = /cta{{(\d+)}}/g;
        result = result.replace(ctaRegex, (_, code) => {
            const line = contextDetails.find(d => d.account_code === code);
            if (line) {
                return (line.debit_amount || line.credit_amount || 0).toString();
            }
            return '0';
        });

        return result;
    };

    const evaluateExpression = (expr: string): number => {
        try {
            // Limpiar expresión de caracteres no permitidos antes de eval por seguridad mínima
            const sanitized = expr.replace(/[^-+*/().0-9]/g, '');
            // eslint-disable-next-line no-eval
            const val = eval(sanitized);
            return parseFloat(val) || 0;
        } catch (e) {
            console.error('Error evaluando formula:', expr, e);
            return 0;
        }
    };

    const handleExecute = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (!operation.templates || operation.templates.length === 0) {
                throw new Error('La operación no tiene una plantilla definida');
            }

            // 1. Generar detalles del asiento procesando fórmulas
            const details: JournalEntryDetailFormData[] = [];

            // Procesamos las líneas una por una para que puedan referenciarse entre sí (en orden)
            operation.templates.forEach((t, index) => {
                const parsedValueStr = parseFormula(t.value_formula, formValues, details);
                const value = evaluateExpression(parsedValueStr);

                details.push({
                    line_number: index + 1,
                    account_code: t.account_code,
                    description: parseFormula(t.description_formula || operation.name, formValues, []),
                    debit_amount: t.movement_type === 'DEBITO' ? value : 0,
                    credit_amount: t.movement_type === 'CREDITO' ? value : 0,
                    provider_id: null // TODO: Implementar búsqueda de tercero si es necesario
                });
            });

            // 2. Validar balance
            const totalDebit = details.reduce((sum, d) => sum + d.debit_amount, 0);
            const totalCredit = details.reduce((sum, d) => sum + d.credit_amount, 0);

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new Error(`El asiento generado no está balanceado (D: ${totalDebit} / C: ${totalCredit}). Verifica las fórmulas.`);
            }

            // 3. Crear el asiento
            const entryData: JournalEntryFormData = {
                entry_date: new Date().toISOString().split('T')[0],
                concept_id: operation.concept_id,
                description: `Operación: ${operation.name} - ${parseFormula(formValues.descripcion || '', formValues, [])}`,
                reference: operation.code,
                details
            };

            const entryId = await createEntry(entryData);
            if (entryId) {
                onSuccess();
            } else {
                throw new Error('Fallo al crear el asiento contable');
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-[#0f172a] rounded-[3rem] w-full max-w-xl border border-white/10 shadow-[0_0_100px_rgba(37,99,235,0.2)] overflow-hidden scale-100 transition-all animate-in zoom-in-95 duration-300">
                <div className="p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-6 h-6 text-blue-500 fill-blue-500/20" />
                                <h3 className="text-2xl font-black text-white tracking-tight">Ejecutar {operation.name}</h3>
                            </div>
                            <p className="text-slate-400 font-medium text-sm">Completa los datos para generar el comprobante</p>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl text-slate-500 hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-2xl text-rose-400 text-sm font-black flex items-center gap-3 animate-shake">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleExecute} className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            {operation.parameters?.sort((a, b) => a.position - b.position).map(p => (
                                <div key={p.id} className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{p.label}</label>
                                    <input
                                        type={p.data_type === 'NUMBER' ? 'number' : p.data_type === 'DATE' ? 'date' : 'text'}
                                        required={p.required}
                                        value={formValues[p.name] || ''}
                                        onChange={e => setFormValues({ ...formValues, [p.name]: e.target.value })}
                                        className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:border-blue-500/50 focus:bg-white/10 transition-all outline-none"
                                        placeholder={`Ingresa ${p.label.toLowerCase()}...`}
                                        step={p.data_type === 'NUMBER' ? '0.01' : undefined}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-5 border-2 border-white/5 text-slate-500 rounded-2xl font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Calculator className="w-6 h-6 animate-spin" />
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 fill-current" /> Generar Comprobante
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-2 text-slate-600">
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Validación de partida doble automática</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
