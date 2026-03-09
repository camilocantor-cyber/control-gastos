import { useState } from 'react';
import { useJournalEntries } from '../hooks/useJournalEntries';
import { useAuth } from '../context/AuthContext';
import { BookMarked, Search, Filter, Eye, CheckCircle, XCircle, Calendar, FileText, Plus, Trash2 } from 'lucide-react';
import type { JournalEntry, JournalEntryDetail } from '../types/accounting';
import { ManualJournalEntry } from './ManualJournalEntry';

export function JournalEntryViewer() {
    const { user } = useAuth();
    const { entries, loading, error, getEntryDetails, postEntry, voidEntry, deleteEntry, reload } = useJournalEntries(user?.id);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [entryDetails, setEntryDetails] = useState<JournalEntryDetail[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showManualEntry, setShowManualEntry] = useState(false);

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

    const handlePost = async (entry: JournalEntry) => {
        if (confirm(`¿Contabilizar el asiento ${entry.entry_number}? Esta acción no se puede deshacer.`)) {
            const success = await postEntry(entry.id);
            if (success) {
                setSelectedEntry(null);
            }
        }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                        <BookMarked className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Asientos Contables
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {entries.length} asientos registrados
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowManualEntry(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Asiento Manual
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.draft}</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Borradores</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-green-600 dark:text-green-400">{stats.posted}</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Contabilizados</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">{stats.void}</div>
                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Anulados</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Filtros
                    </h3>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                        />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="DRAFT">Borradores</option>
                        <option value="POSTED">Contabilizados</option>
                        <option value="VOID">Anulados</option>
                    </select>

                    <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        placeholder="Desde"
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    />

                    <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        placeholder="Hasta"
                        className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
                    />
                </div>
            </div>

            {/* Entries List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Número
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Descripción
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Concepto
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Débito
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Crédito
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        No se encontraron asientos contables
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map(entry => (
                                    <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
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
                                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {entry.description}
                                            </div>
                                            {entry.reference && (
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    Ref: {entry.reference}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                                {entry.concept?.name || '-'}
                                            </span>
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
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${entry.status === 'DRAFT' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                entry.status === 'POSTED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {entry.status === 'DRAFT' && <FileText className="w-3 h-3" />}
                                                {entry.status === 'POSTED' && <CheckCircle className="w-3 h-3" />}
                                                {entry.status === 'VOID' && <XCircle className="w-3 h-3" />}
                                                {entry.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(entry)}
                                                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                                    title="Ver detalles"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {entry.status === 'DRAFT' && (
                                                    <button
                                                        onClick={() => handlePost(entry)}
                                                        className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 rounded transition-colors"
                                                        title="Contabilizar"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {entry.status === 'POSTED' && (
                                                    <button
                                                        onClick={() => handleVoid(entry)}
                                                        className="p-1.5 hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded transition-colors"
                                                        title="Anular"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(entry)}
                                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                                                    title="Eliminar permanentemente"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedEntry && (
                <EntryDetailsModal
                    entry={selectedEntry}
                    details={entryDetails}
                    loading={loadingDetails}
                    onClose={() => setSelectedEntry(null)}
                />
            )}

            {/* Manual Entry Modal */}
            {showManualEntry && (
                <ManualJournalEntry
                    onClose={() => setShowManualEntry(false)}
                    onSaved={() => {
                        setShowManualEntry(false);
                        reload();
                    }}
                />
            )}
        </div>
    );
}

// Details Modal Component
function EntryDetailsModal({
    entry,
    details,
    loading,
    onClose
}: {
    entry: JournalEntry;
    details: JournalEntryDetail[];
    loading: boolean;
    onClose: () => void;
}) {
    const totalDebit = details.reduce((sum, d) => sum + d.debit_amount, 0);
    const totalCredit = details.reduce((sum, d) => sum + d.credit_amount, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                Asiento Contable {entry.entry_number}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {new Date(entry.entry_date).toLocaleDateString()} • {entry.description}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${entry.status === 'DRAFT' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                entry.status === 'POSTED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                {entry.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Details Table */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Cuenta</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Descripción</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Débito</th>
                                            <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Crédito</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {details.map((detail) => (
                                            <tr key={detail.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {detail.line_number}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                        {detail.account_code}
                                                    </div>
                                                    <div className="text-xs text-slate-600 dark:text-slate-400">
                                                        {detail.account?.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-slate-900 dark:text-white">
                                                        {detail.description || '-'}
                                                    </div>
                                                    {detail.provider && (
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            Proveedor: {detail.provider.name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {detail.debit_amount > 0 && (
                                                        <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                            ${detail.debit_amount.toLocaleString()}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {detail.credit_amount > 0 && (
                                                        <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                                                            ${detail.credit_amount.toLocaleString()}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-slate-900 dark:text-white">
                                                TOTALES:
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                    ${totalDebit.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                                                    ${totalCredit.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Balance Check */}
                            <div className={`p-4 rounded-lg border-2 ${isBalanced
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}>
                                <div className="flex items-center gap-2">
                                    {isBalanced ? (
                                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    )}
                                    <span className={`font-bold ${isBalanced
                                        ? 'text-green-700 dark:text-green-400'
                                        : 'text-red-700 dark:text-red-400'
                                        }`}>
                                        {isBalanced ? 'Asiento Balanceado ✓' : 'Asiento Desbalanceado ✗'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
