import type { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ArrowUpCircle, ArrowDownCircle, Trash2, Edit2 } from 'lucide-react';
import clsx from 'clsx';

interface TransactionListProps {
    transactions: Transaction[];
    onDelete: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, onDelete, onEdit }: TransactionListProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Movimientos</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {transactions.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <p>No hay movimientos registrados.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {transactions.map((t) => (
                            <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "p-3 rounded-full transition-colors",
                                        t.type === 'income' ? "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200" : "bg-rose-100 text-rose-600 group-hover:bg-rose-200"
                                    )}>
                                        {t.type === 'income' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t.category}</h4>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{formatDate(t.date)}</span>
                                            {t.description && (
                                                <>
                                                    <span>•</span>
                                                    <span>{t.description}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={clsx(
                                        "font-bold text-lg",
                                        t.type === 'income' ? "text-emerald-600" : "text-slate-900"
                                    )}>
                                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                    </span>
                                    <button
                                        onClick={() => onEdit(t)}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Editar"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(t.id)}
                                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
