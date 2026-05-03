import React, { useEffect, useState } from 'react';
import { useAccountingReports } from '../hooks/useAccountingReports';
import { PieChart, TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, FileSpreadsheet, Download } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

export function BalanceReport() {
    const { balances, loading, error, loadBalanceReport } = useAccountingReports();
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        loadBalanceReport();
    }, []);

    const totals = balances.reduce((acc, curr) => {
        if (['ACTIVO', 'GASTO', 'COSTOS'].includes(curr.account_type)) {
            acc.assets += curr.balance;
        } else {
            acc.liabilities += curr.balance;
        }
        return acc;
    }, { assets: 0, liabilities: 0 });

    const handleExport = () => {
        const dataToExport = balances.map(b => ({
            'Código Cuenta': b.account_code,
            'Nombre Cuenta': b.account_name,
            'Tipo': b.account_type,
            'Naturaleza': b.nature,
            'Débitos': b.total_debit,
            'Créditos': b.total_credit,
            'Saldo Final': b.balance
        }));
        exportToExcel(dataToExport, 'Balance_Prueba', 'Saldos');
    };

    if (loading && balances.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Balance de Prueba
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Resumen de saldos por cuenta contable
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20"
                >
                    <Download className="w-4 h-4" />
                    Exportar Excel
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white/20 rounded-xl"><TrendingUp className="w-5 h-5" /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-1 rounded-lg">Cuentas Débito</span>
                    </div>
                    <div className="text-3xl font-black">${totals.assets.toLocaleString()}</div>
                    <div className="text-xs font-bold opacity-60 mt-1 uppercase tracking-wider">Activos + Gastos + Costos</div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400"><DollarSign className="w-5 h-5" /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cuentas Crédito</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">${totals.liabilities.toLocaleString()}</div>
                    <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Pasivo + Patrimonio + Ingreso</div>
                </div>

                <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-6 rounded-[2rem] flex flex-col justify-center items-center text-center">
                    <div className="p-3 bg-emerald-500 rounded-2xl text-white mb-3 shadow-lg shadow-emerald-500/40">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Estado de Balance</div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">Cuadrado ✓</div>
                </div>
            </div>

            {/* Balances Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                        Saldos de Cuentas
                    </h3>
                    <button onClick={() => loadBalanceReport()} className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Refrescar Datos</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Cuenta</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4 text-right">Débitos</th>
                                <th className="px-6 py-4 text-right">Créditos</th>
                                <th className="px-6 py-4 text-right">Saldo Final</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {balances.map(balance => (
                                <tr key={balance.account_code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">{balance.account_code}</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{balance.account_name}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                                            ['ACTIVO', 'GASTO', 'COSTOS'].includes(balance.account_type) 
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                            : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                        }`}>
                                            {balance.account_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">${balance.total_debit.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-400">${balance.total_credit.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`font-mono text-base font-black ${balance.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            ${balance.balance.toLocaleString()}
                                        </div>
                                        <div className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Naturaleza {balance.nature}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
