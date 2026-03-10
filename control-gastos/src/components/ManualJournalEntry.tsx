import { useState } from 'react';
import { useJournalEntries } from '../hooks/useJournalEntries';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import { useAccountingConcepts } from '../hooks/useAccountingConcepts';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import type { JournalEntryFormData, JournalEntryDetailFormData } from '../types/accounting';

export function ManualJournalEntry({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
    const { user } = useAuth();
    const { createEntry } = useJournalEntries(user?.id);
    const { getMovementAccounts } = useChartOfAccounts();
    const { concepts } = useAccountingConcepts();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const movementAccounts = getMovementAccounts();

    const [formData, setFormData] = useState<JournalEntryFormData>({
        entry_date: new Date().toISOString().split('T')[0],
        concept_id: null,
        description: '',
        reference: '',
        details: [
            {
                line_number: 1,
                account_code: '',
                description: '',
                debit_amount: 0,
                credit_amount: 0,
                provider_id: null
            },
            {
                line_number: 2,
                account_code: '',
                description: '',
                debit_amount: 0,
                credit_amount: 0,
                provider_id: null
            }
        ]
    });

    // Calcular totales
    const totalDebit = formData.details.reduce((sum, d) => sum + (d.debit_amount || 0), 0);
    const totalCredit = formData.details.reduce((sum, d) => sum + (d.credit_amount || 0), 0);
    const difference = totalDebit - totalCredit;
    const isBalanced = Math.abs(difference) < 0.01;

    const addLine = () => {
        setFormData({
            ...formData,
            details: [
                ...formData.details,
                {
                    line_number: formData.details.length + 1,
                    account_code: '',
                    description: '',
                    debit_amount: 0,
                    credit_amount: 0,
                    provider_id: null
                }
            ]
        });
    };

    const removeLine = (index: number) => {
        if (formData.details.length <= 2) {
            alert('Debe haber al menos 2 líneas en el asiento');
            return;
        }
        const newDetails = formData.details.filter((_, i) => i !== index);
        // Renumerar líneas
        newDetails.forEach((detail, i) => detail.line_number = i + 1);
        setFormData({ ...formData, details: newDetails });
    };

    const updateDetail = (index: number, field: keyof JournalEntryDetailFormData, value: any) => {
        const newDetails = [...formData.details];
        newDetails[index] = { ...newDetails[index], [field]: value };

        // Si se modifica débito, limpiar crédito y viceversa
        if (field === 'debit_amount' && value > 0) {
            newDetails[index].credit_amount = 0;
        } else if (field === 'credit_amount' && value > 0) {
            newDetails[index].debit_amount = 0;
        }

        setFormData({ ...formData, details: newDetails });
    };

    const autoBalance = () => {
        if (formData.details.length < 2) return;

        // Encontrar la última línea vacía o con menor monto
        const lastIndex = formData.details.length - 1;
        const newDetails = [...formData.details];

        if (difference > 0) {
            // Hay más débito, agregar crédito
            newDetails[lastIndex].credit_amount = Math.abs(difference);
            newDetails[lastIndex].debit_amount = 0;
        } else if (difference < 0) {
            // Hay más crédito, agregar débito
            newDetails[lastIndex].debit_amount = Math.abs(difference);
            newDetails[lastIndex].credit_amount = 0;
        }

        setFormData({ ...formData, details: newDetails });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validaciones
        if (!formData.description.trim()) {
            setError('La descripción es obligatoria');
            return;
        }

        if (formData.details.length < 2) {
            setError('Debe haber al menos 2 líneas en el asiento');
            return;
        }

        if (!isBalanced) {
            setError('El asiento no está balanceado. Use el botón "Balancear" o ajuste los montos.');
            return;
        }

        // Validar que todas las líneas tengan cuenta
        const hasEmptyAccounts = formData.details.some(d => !d.account_code);
        if (hasEmptyAccounts) {
            setError('Todas las líneas deben tener una cuenta asignada');
            return;
        }

        // Validar que todas las líneas tengan monto
        const hasEmptyAmounts = formData.details.some(d => d.debit_amount === 0 && d.credit_amount === 0);
        if (hasEmptyAmounts) {
            setError('Todas las líneas deben tener un monto (débito o crédito)');
            return;
        }

        setSaving(true);
        try {
            const entryId = await createEntry(formData);
            if (entryId) {
                onSaved?.();
                onClose();
            } else {
                setError('Error al crear el asiento. Verifique los datos e intente nuevamente.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                Nuevo Asiento Contable Manual
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                Cree un asiento contable ingresando débitos y créditos manualmente
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col h-[calc(95vh-100px)]">
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
                            </div>
                        )}

                        {/* Información General */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Información General
                            </h4>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Fecha *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.entry_date}
                                        onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Concepto (Opcional)
                                    </label>
                                    <select
                                        value={formData.concept_id || ''}
                                        onChange={(e) => setFormData({ ...formData, concept_id: e.target.value || null })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    >
                                        <option value="">Sin concepto</option>
                                        {concepts.map(concept => (
                                            <option key={concept.id} value={concept.id}>
                                                {concept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Referencia
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.reference || ''}
                                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        placeholder="Ej: Factura #001"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Descripción *
                                </label>
                                <textarea
                                    required
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    rows={2}
                                    placeholder="Descripción del asiento contable"
                                />
                            </div>
                        </div>

                        {/* Detalles del Asiento */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Detalle del Asiento (Partida Doble)
                                </h4>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg font-bold text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Línea
                                </button>
                            </div>

                            {/* Table Header */}
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 grid grid-cols-12 gap-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                <div className="col-span-1">#</div>
                                <div className="col-span-3">Cuenta</div>
                                <div className="col-span-3">Descripción</div>
                                <div className="col-span-2 text-right">Débito</div>
                                <div className="col-span-2 text-right">Crédito</div>
                                <div className="col-span-1 text-center">Acción</div>
                            </div>

                            {/* Detail Lines */}
                            <div className="space-y-2">
                                {formData.details.map((detail, index) => (
                                    <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 grid grid-cols-12 gap-3 items-center hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                        <div className="col-span-1">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {detail.line_number}
                                            </div>
                                        </div>

                                        <div className="col-span-3">
                                            <input
                                                list="accounts-list-manual"
                                                required
                                                value={detail.account_code}
                                                onChange={(e) => updateDetail(index, 'account_code', e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="Código o nombre..."
                                            />
                                        </div>

                                        <div className="col-span-3">
                                            <input
                                                type="text"
                                                value={detail.description}
                                                onChange={(e) => updateDetail(index, 'description', e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                placeholder="Descripción de la línea"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={detail.debit_amount || ''}
                                                onChange={(e) => updateDetail(index, 'debit_amount', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 text-sm text-right border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-bold"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={detail.credit_amount || ''}
                                                onChange={(e) => updateDetail(index, 'credit_amount', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 text-sm text-right border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-mono font-bold"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        <div className="col-span-1 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeLine(index)}
                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                                                title="Eliminar línea"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals */}
                            <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/20 rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700">
                                <div className="grid grid-cols-12 gap-3">
                                    <div className="col-span-7"></div>
                                    <div className="col-span-2 text-right">
                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Total Débito</div>
                                        <div className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                                            ${totalDebit.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-right">
                                        <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">Total Crédito</div>
                                        <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                                            ${totalCredit.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                    <div className="col-span-1"></div>
                                </div>

                                <div className="mt-4 pt-4 border-t-2 border-slate-300 dark:border-slate-600">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {isBalanced ? (
                                                <>
                                                    <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                                    <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                                                        ✓ Asiento Balanceado
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                                    <div>
                                                        <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                                                            Diferencia: ${Math.abs(difference).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                                        </span>
                                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                                            {difference > 0 ? 'Falta crédito' : 'Falta débito'}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {!isBalanced && (
                                            <button
                                                type="button"
                                                onClick={autoBalance}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                                            >
                                                <Calculator className="w-4 h-4" />
                                                Balancear Automáticamente
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={saving}
                                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !isBalanced}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Guardar Asiento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <datalist id="accounts-list-manual">
                {movementAccounts.map(acc => (
                    <option key={acc.id} value={acc.code}>
                        {acc.name}
                    </option>
                ))}
            </datalist>
        </div>
    );
}
