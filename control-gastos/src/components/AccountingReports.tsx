import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAccountingReports } from '../hooks/useAccountingReports';
import {
    FileBarChart,
    PieChart,
    TrendingUp,
    Download,
    Printer,
    RefreshCw
} from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import clsx from 'clsx';

interface ReportRowProps {
    item: {
        code: string;
        name: string;
        balance: number;
        level: number;
        account_type: string;
    };
}

function ReportRow({ item }: ReportRowProps) {
    const isHeader = item.level <= 2;
    const paddingLeft = (item.level - 1) * 1.5;

    return (
        <tr className={clsx(
            "group transition-colors",
            isHeader ? "bg-slate-50 dark:bg-slate-800/50 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
        )}>
            <td className="px-4 py-3 text-sm font-mono text-slate-500 dark:text-slate-400" style={{ paddingLeft: `${paddingLeft + 1}rem` }}>
                {item.code}
            </td>
            <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                {item.name}
            </td>
            <td className={clsx(
                "px-4 py-3 text-right text-sm font-mono font-bold",
                item.balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
            )}>
                {formatCurrency(Math.abs(item.balance))}
            </td>
        </tr>
    );
}

export function AccountingReports() {
    const { user } = useAuth();
    const { loading, getFullReport } = useAccountingReports(user?.id);
    const [activeTab, setActiveTab] = useState<'balance' | 'pyg'>('balance');
    const [reportData, setReportData] = useState<any[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filtros de fecha
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        loadReport();
    }, [activeTab, user?.id, selectedMonth, selectedYear]);

    async function loadReport() {
        if (!user?.id) return;

        setIsRefreshing(true);

        // Calcular fechas de corte
        // El PYG es por el mes seleccionado
        // El Balance es acumulado hasta el fin del mes seleccionado
        const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

        let startDate: string | null = null;
        let endDate = lastDayOfMonth;

        if (activeTab === 'pyg') {
            startDate = firstDayOfMonth;
        }

        const types = activeTab === 'balance'
            ? ['ACTIVO', 'PASIVO', 'PATRIMONIO']
            : ['INGRESO', 'GASTO', 'COSTOS'];

        const data = await getFullReport(types, startDate, endDate);
        setReportData(data);
        setIsRefreshing(false);
    }

    const handleExportCSV = () => {
        const headers = ["Código", "Nombre", "Saldo"];
        const rows = reportData.map(item => [
            item.code,
            item.name,
            Math.abs(item.balance).toString()
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `reporte_${activeTab}_${months[selectedMonth]}_${selectedYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading && reportData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                <p className="text-slate-500 font-medium font-inter">Generando informes contables...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header - Hidden on print if you want, but usually you want it */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                        <FileBarChart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Informes Contables NIIF
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Corte: {months[selectedMonth]} {selectedYear}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 px-2 py-1 outline-none border-none cursor-pointer"
                        >
                            {months.map((month, i) => (
                                <option key={month} value={i}>{month}</option>
                            ))}
                        </select>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 px-2 py-1 outline-none border-none cursor-pointer"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={loadReport}
                        disabled={isRefreshing}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Refrescar datos"
                    >
                        <RefreshCw className={clsx("w-5 h-5", isRefreshing && "animate-spin")} />
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                        <Printer className="w-4 h-4" />
                        Exportar PDF
                    </button>
                </div>
            </div>

            {/* Print Only Header */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-4">
                <h1 className="text-3xl font-black">{activeTab === 'balance' ? 'BALANCE GENERAL' : 'ESTADO DE RESULTADOS (PYG)'}</h1>
                <p className="text-lg">Periodo: {months[selectedMonth]} {selectedYear}</p>
                <p className="text-gray-500 text-sm">Generado por Mi Cartera - {new Date().toLocaleDateString()}</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl w-full max-w-md">
                <button
                    onClick={() => setActiveTab('balance')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all",
                        activeTab === 'balance'
                            ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                >
                    <PieChart className="w-4 h-4" />
                    Balance General
                </button>
                <button
                    onClick={() => setActiveTab('pyg')}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all",
                        activeTab === 'pyg'
                            ? "bg-white dark:bg-slate-800 text-emerald-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                >
                    <TrendingUp className="w-4 h-4" />
                    Estado de Resultados (PYG)
                </button>
            </div>

            {/* Notification/Help */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
                <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                    {activeTab === 'balance'
                        ? "Este informe muestra la situación financiera de la empresa (Activos, Pasivos y Patrimonio) a la fecha actual."
                        : "Este informe muestra la rentabilidad (Ingresos y Gastos) acumulada en el periodo."
                    }
                </p>
            </div>

            {/* Report Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest w-40">
                                    Código
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    Nombre de la Cuenta
                                </th>
                                <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">
                                    Saldo
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {reportData.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No hay movimientos contables registrados para este informe.
                                    </td>
                                </tr>
                            ) : (
                                reportData.map((item) => (
                                    <ReportRow key={item.code} item={item} />
                                ))
                            )}
                        </tbody>
                        {reportData.length > 0 && activeTab === 'balance' && (
                            <tfoot className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-100 dark:border-blue-800">
                                <tr>
                                    <td colSpan={2} className="px-6 py-4 text-sm font-black text-blue-900 dark:text-blue-400 text-right uppercase">
                                        Total Pasivo + Patrimonio
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono text-lg font-black text-blue-600 dark:text-blue-400">
                                            {formatCurrency(
                                                reportData
                                                    .filter(item => item.level === 1 && (item.account_type === 'PASIVO' || item.account_type === 'PATRIMONIO'))
                                                    .reduce((acc, curr) => acc + curr.balance, 0)
                                            )}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                        {reportData.length > 0 && activeTab === 'pyg' && (
                            <tfoot className="bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-100 dark:border-emerald-800">
                                <tr>
                                    <td colSpan={2} className="px-6 py-4 text-sm font-black text-emerald-900 dark:text-emerald-400 text-right uppercase">
                                        Utilidad / Pérdida del Ejercicio
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={clsx(
                                            "font-mono text-lg font-black",
                                            reportData
                                                .filter(item => item.level === 1)
                                                .reduce((acc, curr) => {
                                                    if (curr.account_type === 'INGRESO') return acc + curr.balance;
                                                    if (curr.account_type === 'GASTO' || curr.account_type === 'COSTOS') return acc - curr.balance;
                                                    return acc;
                                                }, 0) < 0
                                                ? "text-rose-600 dark:text-rose-400"
                                                : "text-emerald-600 dark:text-emerald-400"
                                        )}>
                                            {formatCurrency(
                                                reportData
                                                    .filter(item => item.level === 1)
                                                    .reduce((acc, curr) => {
                                                        if (curr.account_type === 'INGRESO') return acc + curr.balance;
                                                        if (curr.account_type === 'GASTO' || curr.account_type === 'COSTOS') return acc - curr.balance;
                                                        return acc;
                                                    }, 0)
                                            )}
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
