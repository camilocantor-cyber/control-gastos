import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
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
    const { createEntry } = useJournalEntries();

    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        const defaults: Record<string, any> = {};
        operation.parameters?.forEach(p => {
            defaults[p.name] = p.default_value || (p.data_type === 'NUMBER' ? 0 : '');
        });
        setFormValues(defaults);
    }, [operation]);

    const parseFormula = (formula: string | null, params: Record<string, any>, contextDetails: any[]): string => {
        if (!formula) return '';
        let result = formula;

        Object.entries(params).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            result = result.replace(regex, value?.toString() || '');
        });

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

            const details: JournalEntryDetailFormData[] = [];

            operation.templates.forEach((t, index) => {
                const parsedValueStr = parseFormula(t.value_formula, formValues, details);
                const value = evaluateExpression(parsedValueStr);

                details.push({
                    line_number: index + 1,
                    account_code: t.account_code,
                    description: parseFormula(t.description_formula || operation.name, formValues, []),
                    debit_amount: t.movement_type === 'DEBITO' ? value : 0,
                    credit_amount: t.movement_type === 'CREDITO' ? value : 0,
                    provider_id: null
                });
            });

            const totalDebit = details.reduce((sum, d) => sum + d.debit_amount, 0);
            const totalCredit = details.reduce((sum, d) => sum + d.credit_amount, 0);

            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new Error(`El asiento generado no está balanceado (D: ${totalDebit} / C: ${totalCredit}). Verifica las fórmulas.`);
            }

            const entryData: JournalEntryFormData = {
                entry_date: new Date().toISOString().split('T')[0],
                concept_id: operation.concept_id,
                operation_id: operation.id,
                description: `Operación: ${operation.name} - ${parseFormula(formValues.detalle || '', formValues, [])}`,
                reference: operation.code,
                details,
                organization_id: user?.organization_id || '',
                user_id: user?.id || ''
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
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-6 h-6 text-blue-500 fill-blue-500/20" />
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Ejecutar {operation.name}</h3>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Completa los datos para generar el comprobante</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleExecute} className="space-y-5">
                        <div className="grid grid-cols-1 gap-5">
                            {operation.parameters?.sort((a, b) => a.position - b.position).map(p => (
                                <div key={p.id} className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{p.label}</label>
                                    <input
                                        type={p.data_type === 'NUMBER' ? 'number' : p.data_type === 'DATE' ? 'date' : 'text'}
                                        required={p.required}
                                        value={formValues[p.name] || ''}
                                        onChange={e => setFormValues({ ...formValues, [p.name]: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder={`Ingresa ${p.label.toLowerCase()}...`}
                                        step={p.data_type === 'NUMBER' ? '0.01' : undefined}
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-50 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Calculator className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 fill-current" /> Generar Comprobante
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Validación de partida doble automática</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
