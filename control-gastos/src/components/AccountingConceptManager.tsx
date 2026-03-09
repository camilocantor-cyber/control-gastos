import { useState, useEffect } from 'react';
import { useAccountingConcepts } from '../hooks/useAccountingConcepts';
import { useChartOfAccounts } from '../hooks/useChartOfAccounts';
import { Plus, Edit2, Trash2, Search, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import type { AccountingConcept, ConceptFormData, ConceptMappingFormData } from '../types/accounting';

export function AccountingConceptManager() {
    const { concepts, loading, error, addConcept, updateConcept, deleteConcept, getConceptMappings } = useAccountingConcepts();
    const { accounts, getMovementAccounts } = useChartOfAccounts();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingConcept, setEditingConcept] = useState<AccountingConcept | null>(null);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());
    const [conceptMappings, setConceptMappings] = useState<Record<string, any[]>>({});

    const filteredConcepts = concepts.filter(concept => {
        const matchesSearch =
            concept.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            concept.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'ALL' || concept.concept_type === filterType;

        return matchesSearch && matchesType;
    });

    const toggleConcept = async (conceptId: string) => {
        const newExpanded = new Set(expandedConcepts);
        if (newExpanded.has(conceptId)) {
            newExpanded.delete(conceptId);
        } else {
            newExpanded.add(conceptId);
            // Cargar mappings si no están cargados
            if (!conceptMappings[conceptId]) {
                const mappings = await getConceptMappings(conceptId);
                setConceptMappings(prev => ({ ...prev, [conceptId]: mappings }));
            }
        }
        setExpandedConcepts(newExpanded);
    };

    const handleEdit = async (concept: AccountingConcept) => {
        const mappings = await getConceptMappings(concept.id);
        setEditingConcept(concept);
        setConceptMappings(prev => ({ ...prev, [concept.id]: mappings }));
        setIsModalOpen(true);
    };

    const handleDelete = async (concept: AccountingConcept) => {
        if (confirm(`¿Eliminar el concepto "${concept.code} - ${concept.name}"?`)) {
            await deleteConcept(concept.id);
        }
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
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                        <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                            Conceptos Contables
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {concepts.length} conceptos configurados
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setEditingConcept(null);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Concepto
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
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>

                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                    <option value="ALL">Todos los tipos</option>
                    <option value="INGRESO">Ingresos</option>
                    <option value="GASTO">Gastos</option>
                    <option value="TRANSFERENCIA">Transferencias</option>
                    <option value="AJUSTE">Ajustes</option>
                </select>
            </div>

            {/* Concepts List */}
            <div className="space-y-3">
                {filteredConcepts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        No se encontraron conceptos
                    </div>
                ) : (
                    filteredConcepts.map(concept => {
                        const isExpanded = expandedConcepts.has(concept.id);
                        const mappings = conceptMappings[concept.id] || [];

                        return (
                            <div key={concept.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                {/* Concept Header */}
                                <div className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                    <button
                                        onClick={() => toggleConcept(concept.id)}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                        )}
                                    </button>

                                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                        <div className="col-span-2">
                                            <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">
                                                {concept.code}
                                            </span>
                                        </div>

                                        <div className="col-span-5">
                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                {concept.name}
                                            </span>
                                            {concept.description && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {concept.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="col-span-2">
                                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${concept.concept_type === 'INGRESO' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                    concept.concept_type === 'GASTO' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        concept.concept_type === 'TRANSFERENCIA' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                {concept.concept_type}
                                            </span>
                                        </div>

                                        <div className="col-span-2 text-sm text-slate-600 dark:text-slate-400">
                                            {mappings.length} cuenta{mappings.length !== 1 ? 's' : ''}
                                        </div>

                                        <div className="col-span-1 flex gap-1 justify-end">
                                            <button
                                                onClick={() => handleEdit(concept)}
                                                className="p-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(concept)}
                                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Mappings Details */}
                                {isExpanded && mappings.length > 0 && (
                                    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4">
                                        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                                            Configuración de Asiento Contable
                                        </h4>
                                        <div className="space-y-2">
                                            {mappings.map((mapping: any, index: number) => (
                                                <div key={mapping.id} className="flex items-center gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                                                        {index + 1}
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                                {mapping.account_code}
                                                            </span>
                                                            <span className="text-sm text-slate-900 dark:text-white">
                                                                {mapping.account?.name}
                                                            </span>
                                                        </div>
                                                        {mapping.description && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                {mapping.description}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className={`px-3 py-1 rounded-lg font-bold text-xs ${mapping.movement_type === 'DEBITO'
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                        }`}>
                                                        {mapping.movement_type}
                                                    </div>

                                                    {mapping.is_main && (
                                                        <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded font-bold">
                                                            PRINCIPAL
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ConceptFormModal
                    concept={editingConcept}
                    initialMappings={editingConcept ? conceptMappings[editingConcept.id] : []}
                    accounts={accounts}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingConcept(null);
                    }}
                    onSave={async (data) => {
                        const success = editingConcept
                            ? await updateConcept(editingConcept.id, data)
                            : await addConcept(data);

                        if (success) {
                            setIsModalOpen(false);
                            setEditingConcept(null);
                        }
                    }}
                />
            )}
        </div>
    );
}

// Modal Component
function ConceptFormModal({
    concept,
    initialMappings,
    accounts,
    onClose,
    onSave
}: {
    concept: AccountingConcept | null;
    initialMappings: any[];
    accounts: any[];
    onClose: () => void;
    onSave: (data: ConceptFormData) => Promise<void>;
}) {
    const [formData, setFormData] = useState<ConceptFormData>({
        code: concept?.code || '',
        name: concept?.name || '',
        concept_type: concept?.concept_type || 'INGRESO',
        description: concept?.description || '',
        mappings: initialMappings.map(m => ({
            account_code: m.account_code,
            movement_type: m.movement_type,
            position: m.position,
            is_main: m.is_main,
            description: m.description || ''
        }))
    });

    const movementAccounts = accounts.filter(acc => acc.accepts_movement);

    const addMapping = () => {
        setFormData({
            ...formData,
            mappings: [
                ...formData.mappings,
                {
                    account_code: '',
                    movement_type: 'DEBITO',
                    position: formData.mappings.length + 1,
                    is_main: formData.mappings.length === 0,
                    description: ''
                }
            ]
        });
    };

    const removeMapping = (index: number) => {
        const newMappings = formData.mappings.filter((_, i) => i !== index);
        // Reordenar posiciones
        newMappings.forEach((m, i) => m.position = i + 1);
        setFormData({ ...formData, mappings: newMappings });
    };

    const updateMapping = (index: number, field: keyof ConceptMappingFormData, value: any) => {
        const newMappings = [...formData.mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setFormData({ ...formData, mappings: newMappings });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar que haya al menos 2 mappings (débito y crédito)
        if (formData.mappings.length < 2) {
            alert('Debe configurar al menos 2 cuentas (una de débito y una de crédito)');
            return;
        }

        // Validar que haya al menos un débito y un crédito
        const hasDebit = formData.mappings.some(m => m.movement_type === 'DEBITO');
        const hasCredit = formData.mappings.some(m => m.movement_type === 'CREDITO');

        if (!hasDebit || !hasCredit) {
            alert('Debe configurar al menos una cuenta de débito y una de crédito');
            return;
        }

        await onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        {concept ? 'Editar Concepto' : 'Nuevo Concepto'}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Configure las cuentas que se afectarán automáticamente
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {/* Información básica */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Información Básica
                        </h4>

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
                                    placeholder="Ej: ING-001"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Tipo *
                                </label>
                                <select
                                    required
                                    value={formData.concept_type}
                                    onChange={(e) => setFormData({ ...formData, concept_type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="INGRESO">Ingreso</option>
                                    <option value="GASTO">Gasto</option>
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                    <option value="AJUSTE">Ajuste</option>
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
                                placeholder="Nombre descriptivo del concepto"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Descripción
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                rows={2}
                                placeholder="Descripción opcional"
                            />
                        </div>
                    </div>

                    {/* Mapeo de cuentas */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Configuración de Asiento
                            </h4>
                            <button
                                type="button"
                                onClick={addMapping}
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg font-bold text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar Cuenta
                            </button>
                        </div>

                        <div className="space-y-3">
                            {formData.mappings.map((mapping, index) => (
                                <div key={index} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">
                                            {index + 1}
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Cuenta Contable *
                                                    </label>
                                                    <select
                                                        required
                                                        value={mapping.account_code}
                                                        onChange={(e) => updateMapping(index, 'account_code', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    >
                                                        <option value="">Seleccione una cuenta</option>
                                                        {movementAccounts.map(acc => (
                                                            <option key={acc.id} value={acc.code}>
                                                                {acc.code} - {acc.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Movimiento *
                                                    </label>
                                                    <select
                                                        required
                                                        value={mapping.movement_type}
                                                        onChange={(e) => updateMapping(index, 'movement_type', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    >
                                                        <option value="DEBITO">Débito</option>
                                                        <option value="CREDITO">Crédito</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                    Descripción
                                                </label>
                                                <input
                                                    type="text"
                                                    value={mapping.description}
                                                    onChange={(e) => updateMapping(index, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                    placeholder="Descripción de esta línea"
                                                />
                                            </div>

                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={mapping.is_main}
                                                    onChange={(e) => updateMapping(index, 'is_main', e.target.checked)}
                                                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    Cuenta principal (se usará para filtros y reportes)
                                                </span>
                                            </label>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeMapping(index)}
                                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors flex-shrink-0"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {formData.mappings.length === 0 && (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                    No hay cuentas configuradas. Haga clic en "Agregar Cuenta" para comenzar.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                        >
                            {concept ? 'Actualizar' : 'Crear'} Concepto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
