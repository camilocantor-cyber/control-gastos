import React, { useState } from 'react';
import { useProviders, type Provider } from '../hooks/useProviders';
import { useAuth } from '../context/AuthContext';
import { Plus, Pencil, Trash2, X, Save, Search, Building2 } from 'lucide-react';

export function ProviderManager() {
    const { user } = useAuth();
    const { providers, loading, addProvider, updateProvider, deleteProvider } = useProviders(user?.id);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [newProviderName, setNewProviderName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const filteredProviders = providers.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProviderName.trim()) return;

        const { error } = await addProvider(newProviderName.trim());
        if (error) {
            alert('Error al agregar: ' + error);
        } else {
            setNewProviderName('');
            setIsAdding(false);
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;

        const { error } = await updateProvider(id, editName.trim());
        if (error) {
            alert('Error al actualizar: ' + error);
        } else {
            setEditingId(null);
            setEditName('');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este proveedor?')) {
            const { error } = await deleteProvider(id);
            if (error) {
                alert('Error al eliminar: ' + error);
            }
        }
    };

    const startEditing = (provider: Provider) => {
        setEditingId(provider.id);
        setEditName(provider.name);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Gestión de Proveedores</h2>
                    <p className="text-slate-500">Administra tus proveedores frecuentes</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    <span>Nuevo Proveedor</span>
                </button>
            </div>

            {/* Add Form */}
            {isAdding && (
                <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm animate-in slide-in-from-top-2">
                    <form onSubmit={handleAdd} className="flex gap-2">
                        <input
                            type="text"
                            value={newProviderName}
                            onChange={(e) => setNewProviderName(e.target.value)}
                            placeholder="Nombre del proveedor..."
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            autoFocus
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                        >
                            <Save className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar proveedor..."
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white shadow-sm"
                />
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Cargando...</div>
                ) : filteredProviders.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                        <Building2 className="w-8 h-8 text-slate-300" />
                        <p>No se encontraron proveedores</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredProviders.map((provider) => (
                            <div key={provider.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                {editingId === provider.id ? (
                                    <div className="flex-1 flex gap-2 mr-4">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 px-3 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                            autoFocus
                                        />
                                        <button onClick={() => handleUpdate(provider.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded">
                                            <Save className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <span className="font-medium text-slate-700">{provider.name}</span>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEditing(provider)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(provider.id)}
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
