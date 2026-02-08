import React, { useState, useEffect } from 'react';
import type { Transaction, TransactionType } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { useProviders } from '../hooks/useProviders';
import { X, Check, Building2 } from 'lucide-react';
import clsx from 'clsx';

interface TransactionFormProps {
    onClose: () => void;
    onAdd?: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
    onUpdate?: (id: string, transaction: Partial<Transaction>) => void;
    initialData?: Transaction | null;
}

export function TransactionForm({ onClose, onAdd, onUpdate, initialData }: TransactionFormProps) {
    const { user } = useAuth();
    const { categories } = useCategories(user?.id);
    const { providers } = useProviders(user?.id);

    const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [category, setCategory] = useState(initialData?.category || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(initialData?.description || '');
    const [provider, setProvider] = useState(initialData?.provider || '');
    const [showProviderSuggestions, setShowProviderSuggestions] = useState(false);

    // Suggestions filter
    const providerSuggestions = providers.filter(p =>
        p.name.toLowerCase().includes(provider.toLowerCase()) &&
        p.name !== provider
    );

    // Update category when type changes or categories load
    useEffect(() => {
        const availableCategories = categories[type];
        if (!initialData && availableCategories.length > 0 && !availableCategories.includes(category)) {
            setCategory(availableCategories[0]);
        }
    }, [type, categories, category, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            type,
            amount: Number(amount),
            category,
            date,
            description,
            provider,
        };

        if (initialData && onUpdate) {
            onUpdate(initialData.id, data);
        } else if (onAdd) {
            onAdd(data);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">
                        {initialData ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={clsx(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                type === 'expense' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Gasto
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={clsx(
                                "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                                type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Ingreso
                        </button>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                            <input
                                type="number"
                                required
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-lg"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {/* Provider (Autocomplete) */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor / Beneficiario (Opcional)</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={provider}
                                onChange={(e) => {
                                    setProvider(e.target.value);
                                    setShowProviderSuggestions(true);
                                }}
                                onFocus={() => setShowProviderSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowProviderSuggestions(false), 200)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                placeholder={type === 'expense' ? "Ej: Supermercado Éxito" : "Ej: Empresa S.A.S"}
                            />
                        </div>
                        {/* Suggestions Dropdown */}
                        {showProviderSuggestions && providerSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {providerSuggestions.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setProvider(p.name);
                                            setShowProviderSuggestions(false);
                                        }}
                                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-slate-700 flex items-center gap-2 transition-colors"
                                    >
                                        <Building2 className="w-4 h-4 text-blue-400" />
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                        >
                            {categories[type].length === 0 ? (
                                <option value="" disabled>No hay categorías</option>
                            ) : (
                                categories[type].map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))
                            )}
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nota (Opcional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Descripción breve..."
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={categories[type].length === 0}
                            className={clsx(
                                "w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                                type === 'income' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"
                            )}
                        >
                            <Check className="w-5 h-5" />
                            {initialData ? 'Actualizar' : 'Guardar'} {type === 'income' ? 'Ingreso' : 'Gasto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
