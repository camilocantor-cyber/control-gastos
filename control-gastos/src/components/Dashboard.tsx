import { useState, useMemo } from 'react';
import type { Transaction, SummaryStats } from '../types';
import { formatCurrency, formatDate } from '../utils/helpers';
import { ArrowUpCircle, ArrowDownCircle, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

interface DashboardProps {
    stats: SummaryStats;
    transactions: Transaction[];
}

export function Dashboard({ stats, transactions }: DashboardProps) {
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

    const filteredTransactions = useMemo(() => {
        if (filter === 'all') return transactions;
        return transactions.filter(t => t.type === filter);
    }, [transactions, filter]);

    const recentTransactions = filteredTransactions.slice(0, 5);

    // Data for Trend Area Chart
    const trendData = useMemo(() => {
        // Sort transactions by date ascending
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const data: Record<string, { date: string, income: number, expense: number }> = {};

        sorted.forEach(t => {
            const dateStr = t.date;
            if (!data[dateStr]) {
                data[dateStr] = { date: dateStr, income: 0, expense: 0 };
            }

            if (t.type === 'income') {
                data[dateStr].income += t.amount;
            } else {
                data[dateStr].expense += t.amount;
            }
        });

        return Object.values(data);
    }, [transactions]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Resumen General</h2>

            {/* Stats Cards (Clickable for Filtering) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                    onClick={() => setFilter('all')}
                    className={clsx(
                        "text-left bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]",
                        filter === 'all' ? "ring-4 ring-blue-200" : "opacity-90 hover:opacity-100"
                    )}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <Wallet className="w-5 h-5 opacity-80" />
                        <span className="text-sm font-medium opacity-80">Saldo Total</span>
                    </div>
                    <p className="text-3xl font-bold tracking-tight">{formatCurrency(stats.balance)}</p>
                </button>

                <button
                    onClick={() => setFilter('income')}
                    className={clsx(
                        "text-left bg-white rounded-2xl p-6 border transition-all hover:scale-[1.02] active:scale-[0.98]",
                        filter === 'income' ? "border-emerald-500 ring-4 ring-emerald-100 shadow-md" : "border-slate-100 shadow-sm hover:border-emerald-200"
                    )}
                >
                    <div className="flex items-center gap-3 mb-2 text-emerald-600">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Ingresos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalIncome)}</p>
                </button>

                <button
                    onClick={() => setFilter('expense')}
                    className={clsx(
                        "text-left bg-white rounded-2xl p-6 border transition-all hover:scale-[1.02] active:scale-[0.98]",
                        filter === 'expense' ? "border-rose-500 ring-4 ring-rose-100 shadow-md" : "border-slate-100 shadow-sm hover:border-rose-200"
                    )}
                >
                    <div className="flex items-center gap-3 mb-2 text-rose-600">
                        <div className="p-2 bg-rose-50 rounded-lg">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Gastos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.totalExpense)}</p>
                </button>
            </div>

            {/* Recent Transactions (Filtered) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Actividad Reciente {filter !== 'all' && (filter === 'income' ? '(Sólo Ingresos)' : '(Sólo Gastos)')}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentTransactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No hay movimientos recientes en esta vista
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

            {/* Trend Chart (Below Transaction List) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in duration-500">
                <h3 className="text-lg font-bold text-slate-700 mb-4">
                    {filter === 'all' ? 'Tendencia General' : filter === 'income' ? 'Evolución de Ingresos' : 'Evolución de Gastos'}
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="dashColorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="dashColorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                fontSize={12}
                                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                            />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => [formatCurrency(value), '']}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            {(filter === 'all' || filter === 'income') && (
                                <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" fillOpacity={1} fill="url(#dashColorIncome)" strokeWidth={2} />
                            )}
                            {(filter === 'all' || filter === 'expense') && (
                                <Area type="monotone" dataKey="expense" name="Gastos" stroke="#f43f5e" fillOpacity={1} fill="url(#dashColorExpense)" strokeWidth={2} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
