import React, { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../context/AuthContext';
import type { TransactionType } from '../types';
import { Plus, Trash2, Tag } from 'lucide-react';
import clsx from 'clsx';

export function CategoryManager() {
    const { user } = useAuth();
    const { categories, addCategory, deleteCategory } = useCategories(user?.id);
    const [activeTab, setActiveTab] = useState<TransactionType>('expense');
    const [newCategory, setNewCategory] = useState('');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCategory.trim()) {
            addCategory(activeTab, newCategory.trim());
            setNewCategory('');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Administrar Categorías</h2>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('expense')}
                        className={clsx(
                            "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                            activeTab === 'expense'
                                ? "text-rose-600 border-rose-600 bg-rose-50/50"
                                : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        Gastos
                    </button>
                    <button
                        onClick={() => setActiveTab('income')}
                        className={clsx(
                            "flex-1 py-4 text-sm font-bold transition-all border-b-2",
                            activeTab === 'income'
                                ? "text-emerald-600 border-emerald-600 bg-emerald-50/50"
                                : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        Ingresos
                    </button>
                </div>

                <div className="p-6">
                    <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder={`Nueva categoría de ${activeTab === 'income' ? 'ingreso' : 'gasto'}...`}
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newCategory.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-xl font-bold transition-colors flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">Agregar</span>
                        </button>
                    </form>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {categories[activeTab].map((cat) => (
                            <div
                                key={cat}
                                className={clsx(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all hover:shadow-sm",
                                    activeTab === 'income'
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-900"
                                        : "bg-rose-50 border-rose-100 text-rose-900"
                                )}
                            >
                                <span className="font-medium truncate">{cat}</span>
                                <button
                                    onClick={() => deleteCategory(activeTab, cat)}
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-colors",
                                        activeTab === 'income'
                                            ? "text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100"
                                            : "text-rose-400 hover:text-rose-700 hover:bg-rose-100"
                                    )}
                                    title="Eliminar categoría"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {categories[activeTab].length === 0 && (
                            <div className="col-span-full py-8 text-center text-slate-400">
                                No hay categorías personalizadas. Agrega una nueva.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
