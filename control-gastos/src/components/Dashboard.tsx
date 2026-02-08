import type { Transaction, SummaryStats } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';

interface DashboardProps {
    stats: SummaryStats;
    recentTransactions: Transaction[];
}

export function Dashboard({ stats, recentTransactions }: DashboardProps) {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Resumen General</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                        <Wallet className="w-5 h-5 opacity-80" />
                        <span className="text-sm font-medium opacity-80">Saldo Total</span>
                    </div>
                    <p className="text-3xl font-bold tracking-tight">{formatCurrency(stats.balance)}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-emerald-600">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Ingresos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalIncome)}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-rose-600">
                        <div className="p-2 bg-rose-50 rounded-lg">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Gastos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalExpense)}</p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Actividad Reciente</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentTransactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No hay movimientos recientes
                        </div>
                    ) : (
                        recentTransactions.map((t) => (
                            <div key={t.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "p-2 rounded-full",
                                        t.type === 'income' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                                    )}>
                                        {t.type === 'income' ? <ArrowUpCircle className="w-5 h-5" /> : <ArrowDownCircle className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{t.category}</p>
                                        <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
                                    </div>
                                </div>
                                <span className={clsx(
                                    "font-bold",
                                    t.type === 'income' ? "text-emerald-600" : "text-slate-900"
                                )}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
