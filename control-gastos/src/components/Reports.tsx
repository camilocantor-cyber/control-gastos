import { useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { formatCurrency } from '../utils/helpers';
import clsx from 'clsx';

interface ReportsProps {
    transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#845ec2'];

export function Reports({ transactions }: ReportsProps) {
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    // Data for Expense Pie Chart
    const expenseByCategory = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense');
        const grouped = expenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    // Data for Bar Chart (Balance)
    const barChartData = useMemo(() => {
        const data: Record<string, { label: string, income: number, expense: number, sortKey: string }> = {};

        transactions.forEach(t => {
            const date = new Date(t.date);
            let key = '';
            let label = '';
            let sortKey = '';

            if (period === 'year') {
                key = `${date.getFullYear()}-${date.getMonth()}`;
                label = date.toLocaleDateString('es-CO', { month: 'short' });
                sortKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            } else if (period === 'month') {
                // Group by Week inside the month
                const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const weekNumber = Math.ceil((((date.getTime() - firstDayOfMonth.getTime()) / 86400000) + firstDayOfMonth.getDay() + 1) / 7);
                key = `${date.getFullYear()}-${date.getMonth()}-W${weekNumber}`;
                label = `Sem ${weekNumber}`;
                sortKey = key;
            } else {
                // Week view: Daily breakdown
                key = t.date; // YYYY-MM-DD
                label = date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
                sortKey = t.date;
            }

            if (!data[key]) {
                data[key] = { label, income: 0, expense: 0, sortKey };
            }

            if (t.type === 'income') {
                data[key].income += t.amount;
            } else {
                data[key].expense += t.amount;
            }
        });

        return Object.values(data).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [transactions, period]);

    // Data for Trend Area Chart
    const trendData = useMemo(() => {
        // Sort transactions by date ascending
        const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const data: Record<string, { date: string, income: number, expense: number }> = {};

        sorted.forEach(t => {
            // Filter based on period if needed, or just show all time trend?
            // Let's show trend consistent with selected view filter, but maybe daily for better granularity

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

        // Fill in missing dates? For now, let's just show days with activity to keep it simple
        return Object.values(data);
    }, [transactions]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Reportes y Gráficos</h2>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setPeriod('week')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                            period === 'week' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setPeriod('month')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                            period === 'month' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Mes
                    </button>
                    <button
                        onClick={() => setPeriod('year')}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
                            period === 'year' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Año
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Balance Chart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Balance por Periodo</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="label"
                                    fontSize={12}
                                />
                                <YAxis hide />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [formatCurrency(value), '']}
                                />
                                <Legend />
                                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Gastos por Categoría</h3>
                    <div className="h-64 flex items-center justify-center">
                        {expenseByCategory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expenseByCategory}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {expenseByCategory.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [formatCurrency(value), '']}
                                    />
                                    <Legend layout="vertical" align="right" verticalAlign="middle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-400">No hay gastos registrados</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Trend Chart (New) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-700 mb-4">Tendencia de Ingresos y Gastos</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
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
                            <Legend />
                            <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                            <Area type="monotone" dataKey="expense" name="Gastos" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
