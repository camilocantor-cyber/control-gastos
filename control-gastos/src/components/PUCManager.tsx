import { useState } from 'react';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import { Plus, Edit2, Trash2, Search, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import type { ChartOfAccount, AccountFormData } from '../types/accounting';

export function PUCManager() {
    const { accounts, loading, error, addAccount, updateAccount, deleteAccount } = useChartOfAccounts();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [filterType, setFilterType] = useState<string>('ALL');

    const filteredAccounts = accounts.filter(account => {
        const matchesSearch =
            account.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'ALL' || account.account_type === filterType;

        return matchesSearch && matchesType;
    });

    const toggleNode = (code: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(code)) {
            newExpanded.delete(code);
        } else {
            newExpanded.add(code);
        }
        setExpandedNodes(newExpanded);
    };

    const handleEdit = (account: ChartOfAccount) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleDelete = async (account: ChartOfAccount) => {
        if (confirm(`¿Eliminar la cuenta "${account.code} - ${account.name}"?`)) {
            await deleteAccount(account.id);
        }
    };

    const renderAccountTree = (parentCode: string | null = null, level: number = 0) => {
        const childAccounts = filteredAccounts.filter(acc => acc.parent_code === parentCode);

        return childAccounts.map(account => {
            const hasChildren = filteredAccounts.some(acc => acc.parent_code === account.code);
            const isExpanded = expandedNodes.has(account.code);

            return (
                <div key={account.id} style={{ marginLeft: `${level * 24}px` }}>
                    <div className="flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg group transition-colors border-b border-slate-100 dark:border-slate-800">
                        {hasChildren ? (
                            <button
                                onClick={() => toggleNode(account.code)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                )}
                            </button>
                        ) : (
                            <div className="w-6" />
                        )}

                        <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2">
                                <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                    {account.code}
                                </span>
                            </div>

                            <div className="col-span-4">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {account.name}
                                </span>
                            </div>

                            <div className="col-span-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${account.account_type === 'ACTIVO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        account.account_type === 'PASIVO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            account.account_type === 'PATRIMONIO' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                account.account_type === 'INGRESO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}>
                                    {account.account_type}
                                </span>
                            </div>

                            <div className="col-span-1 text-center">
                                <span className={`text-xs px-2 py-1 rounded font-bold ${account.nature === 'DEBITO'
                                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                    }`}>
                                    {account.nature}
                                </span>
                            </div>

                            <div className="col-span-1 text-center">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Nivel {account.level}
                                </span>
                            </div>

                            <div className="col-span-1 text-center">
                                {account.accepts_movement && (
                                    <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded font-bold">
                                        MOV
                                    </span>
                                )}
                            </div>

                            <div className="col-span-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                <button
                                    onClick={() => handleEdit(account)}
                                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(account)}
                                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {isExpanded && hasChildren && renderAccountTree(account.code, level + 1)}
                </div>
            );
        });
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
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Plan Único de Cuentas (PUC)
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {accounts.length} cuentas registradas
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setEditingAccount(null);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nueva Cuenta
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="ALL">Todos los tipos</option>
                    <option value="ACTIVO">Activo</option>
                    <option value="PASIVO">Pasivo</option>
                    <option value="PATRIMONIO">Patrimonio</option>
                    <option value="INGRESO">Ingreso</option>
                    <option value="GASTO">Gasto</option>
                    <option value="COSTOS">Costos</option>
                </select>
            </div>

            {/* Account Tree */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <div className="col-span-2 pl-10">Código</div>
                        <div className="col-span-4">Nombre</div>
                        <div className="col-span-2">Tipo</div>
                        <div className="col-span-1 text-center">Naturaleza</div>
                        <div className="col-span-1 text-center">Nivel</div>
                        <div className="col-span-1 text-center">Movimiento</div>
                        <div className="col-span-1 text-right">Acciones</div>
                    </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                    {filteredAccounts.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                            No se encontraron cuentas
                        </div>
                    ) : (
                        renderAccountTree()
                    )}
                </div>
            </div>

            {/* Modal para crear/editar cuenta */}
            {isModalOpen && (
                <AccountFormModal
                    account={editingAccount}
                    accounts={accounts}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingAccount(null);
                    }}
                    onSave={async (data) => {
                        const success = editingAccount
                            ? await updateAccount(editingAccount.id, data)
                            : await addAccount(data);

                        if (success) {
                            setIsModalOpen(false);
                            setEditingAccount(null);
                        }
                    }}
                />
            )}
        </div>
    );
}

// Modal Component
function AccountFormModal({
    account,
    accounts,
    onClose,
    onSave
}: {
    account: ChartOfAccount | null;
    accounts: ChartOfAccount[];
    onClose: () => void;
    onSave: (data: AccountFormData) => Promise<void>;
}) {
    const [formData, setFormData] = useState<AccountFormData>({
        code: account?.code || '',
        name: account?.name || '',
        account_type: account?.account_type || 'ACTIVO',
        level: account?.level || 1,
        parent_code: account?.parent_code || null,
        nature: account?.nature || 'DEBITO',
        accepts_movement: account?.accepts_movement || false,
        description: account?.description || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    const parentAccounts = accounts.filter(acc =>
        acc.level < formData.level &&
        acc.account_type === formData.account_type
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {account ? 'Editar Cuenta' : 'Nueva Cuenta'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Código *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                placeholder="Ej: 1105"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Nivel *
                            </label>
                            <select
                                required
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value={1}>1 - Clase</option>
                                <option value={2}>2 - Grupo</option>
                                <option value={3}>3 - Cuenta</option>
                                <option value={4}>4 - Subcuenta</option>
                                <option value={5}>5 - Auxiliar</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Nombre *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            placeholder="Nombre de la cuenta"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Tipo de Cuenta *
                            </label>
                            <select
                                required
                                value={formData.account_type}
                                onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value="ACTIVO">Activo</option>
                                <option value="PASIVO">Pasivo</option>
                                <option value="PATRIMONIO">Patrimonio</option>
                                <option value="INGRESO">Ingreso</option>
                                <option value="GASTO">Gasto</option>
                                <option value="COSTOS">Costos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Naturaleza *
                            </label>
                            <select
                                required
                                value={formData.nature}
                                onChange={(e) => setFormData({ ...formData, nature: e.target.value as any })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value="DEBITO">Débito</option>
                                <option value="CREDITO">Crédito</option>
                            </select>
                        </div>
                    </div>

                    {formData.level > 1 && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Cuenta Padre
                            </label>
                            <select
                                value={formData.parent_code || ''}
                                onChange={(e) => setFormData({ ...formData, parent_code: e.target.value || null })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value="">Sin padre</option>
                                {parentAccounts.map(acc => (
                                    <option key={acc.id} value={acc.code}>
                                        {acc.code} - {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.accepts_movement}
                                onChange={(e) => setFormData({ ...formData, accepts_movement: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Acepta movimientos contables
                            </span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            rows={3}
                            placeholder="Descripción opcional"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                        >
                            {account ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
