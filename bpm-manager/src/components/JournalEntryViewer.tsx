import { useState } from 'react';
import { useJournalEntries } from '../hooks/useJournalEntries';
import { BookMarked, Search, Eye, XCircle, Calendar, Trash2, Download } from 'lucide-react';
import type { JournalEntry, JournalEntryDetail } from '../types/accounting';
import { exportToExcel } from '../utils/excelExport';

export function JournalEntryViewer() {
    const { entries, loading, error, getEntryDetails, voidEntry, deleteEntry, reload } = useJournalEntries();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [entryDetails, setEntryDetails] = useState<JournalEntryDetail[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const filteredEntries = entries.filter(entry => {
        const matchesSearch =
            entry.entry_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.reference && entry.reference.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = filterStatus === 'ALL' || entry.status === filterStatus;
        const matchesDateFrom = !filterDateFrom || entry.entry_date >= filterDateFrom;
        const matchesDateTo = !filterDateTo || entry.entry_date <= filterDateTo;

        return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });

    const handleViewDetails = async (entry: JournalEntry) => {
        setSelectedEntry(entry);
        setLoadingDetails(true);
        const details = await getEntryDetails(entry.id);
        setEntryDetails(details);
        setLoadingDetails(false);
    };

    const handleVoid = async (entry: JournalEntry) => {
        if (confirm(`¿Anular el asiento ${entry.entry_number}? Esta acción no se puede deshacer.`)) {
            const success = await voidEntry(entry.id);
            if (success) {
                setSelectedEntry(null);
            }
        }
    };

    const handleDelete = async (entry: JournalEntry) => {
        if (confirm(`¿Eliminar permanentemente el asiento ${entry.entry_number}? Esta acción borrará el registro de la contabilidad.`)) {
            const success = await deleteEntry(entry.id);
            if (success) {
                setSelectedEntry(null);
            }
        }
    };

    const stats = {
        total: entries.length,
        draft: entries.filter(e => e.status === 'DRAFT').length,
        posted: entries.filter(e => e.status === 'POSTED').length,
        void: entries.filter(e => e.status === 'VOID').length
    };

    const handleExport = () => {
        const dataToExport = filteredEntries.map(e => ({
            'Número': e.entry_number,
            'Fecha': e.entry_date,
            'Descripción': e.description,
            'Referencia': e.reference || '',
            'Débito': e.total_debit,
            'Crédito': e.total_credit,
            'Diferencia': e.total_debit - e.total_credit,
            'Estado': e.status
        }));
        exportToExcel(dataToExport, 'Libro_Diario', 'Asientos');
    };

    if (loading && entries.length === 0) {
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
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                        <BookMarked className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Libro Diario / Comprobantes
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {entries.length} registros contables
                        </p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                    <button
                        onClick={() => reload()}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                        Actualizar
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Asientos</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.draft}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Borradores</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-2xl font-black text-green-600 dark:text-green-400">{stats.posted}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contabilizados</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">{stats.void}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Anulados</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="POSTED">Contabilizados</option>
                        <option value="DRAFT">Borradores</option>
                        <option value="VOID">Anulados</option>
                    </select>

                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                    />

                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm outline-none"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Número</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Descripción</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Débito</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Crédito</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">Estado</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredEntries.map(entry => (
                                <tr key={entry.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                            {entry.entry_number}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(entry.entry_date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                                            {entry.description}
                                        </div>
                                        {entry.reference && (
                                            <div className="text-[10px] text-slate-500 uppercase font-bold">Ref: {entry.reference}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                            ${entry.total_debit.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                                            ${entry.total_credit.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                            entry.status === 'POSTED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            entry.status === 'DRAFT' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                            {entry.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleViewDetails(entry)}
                                                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                                title="Ver detalles"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {entry.status === 'POSTED' && (
                                                <button
                                                    onClick={() => handleVoid(entry)}
                                                    className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg transition-colors"
                                                    title="Anular"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(entry)}
                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedEntry && (
                <EntryDetailsModal
                    entry={selectedEntry}
                    details={entryDetails}
                    loading={loadingDetails}
                    onClose={() => setSelectedEntry(null)}
                />
            )}
        </div>
    );
}

function EntryDetailsModal({ entry, details, loading, onClose }: { entry: JournalEntry, details: JournalEntryDetail[], loading: boolean, onClose: () => void }) {
    const totalDebit = details.reduce((sum, d) => sum + (d.debit_amount || 0), 0);
    const totalCredit = details.reduce((sum, d) => sum + (d.credit_amount || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">Asiento Contable {entry.entry_number}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{entry.description}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <XCircle className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                    {loading ? (
                        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                    ) : (
                        <div className="space-y-6">
                            <table className="w-full text-left">
                                <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <tr>
                                        <th className="px-2 pb-2">Cuenta</th>
                                        <th className="px-2 pb-2">Descripción</th>
                                        <th className="px-2 pb-2 text-right">Débito</th>
                                        <th className="px-2 pb-2 text-right">Crédito</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {details.map((d, i) => (
                                        <tr key={i}>
                                            <td className="py-3 px-2">
                                                <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{d.account_code}</div>
                                                <div className="text-[10px] text-slate-500 font-bold">{(d as any).account?.name}</div>
                                            </td>
                                            <td className="py-3 px-2 text-sm text-slate-700 dark:text-slate-300">{d.description}</td>
                                            <td className="py-3 px-2 text-right">
                                                {d.debit_amount > 0 && <span className="font-mono font-bold text-emerald-600">${d.debit_amount.toLocaleString()}</span>}
                                            </td>
                                            <td className="py-3 px-2 text-right">
                                                {d.credit_amount > 0 && <span className="font-mono font-bold text-rose-600">${d.credit_amount.toLocaleString()}</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 border-slate-100 dark:border-slate-800">
                                    <tr className="bg-slate-50 dark:bg-slate-800/30">
                                        <td colSpan={2} className="py-4 px-2 text-right font-black text-xs uppercase tracking-widest">Totales</td>
                                        <td className="py-4 px-2 text-right font-mono font-black text-emerald-600 text-sm">${totalDebit.toLocaleString()}</td>
                                        <td className="py-4 px-2 text-right font-mono font-black text-rose-600 text-sm">${totalCredit.toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
