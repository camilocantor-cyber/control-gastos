import React, { useState } from 'react';
import { useWorkflowCategories } from '../hooks/useWorkflowCategories';
import { X, Plus, Trash2, Edit2, Check, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowCategoryManagerProps {
    onClose: () => void;
}

export function WorkflowCategoryManager({ onClose }: WorkflowCategoryManagerProps) {
    const { categories, loading, addCategory, updateCategory, deleteCategory } = useWorkflowCategories();
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#3b82f6');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        const { error } = await addCategory(newName, newColor);
        if (error) {
            toast.error('Error al añadir categoría: ' + error);
        } else {
            toast.success('Categoría añadida');
            setNewName('');
            setNewColor('#3b82f6');
        }
    };

    const startEditing = (cat: any) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setEditColor(cat.color || '#3b82f6');
    };

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return;
        const { error } = await updateCategory(id, editName, editColor);
        if (error) {
            toast.error('Error al actualizar: ' + error);
        } else {
            toast.success('Categoría actualizada');
            setEditingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta categoría? (Los flujos que la usan quedarán sin categoría)')) {
            const { error } = await deleteCategory(id);
            if (error) {
                toast.error('Error al eliminar: ' + error);
            } else {
                toast.success('Categoría eliminada');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl scale-in-center animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Tag className="w-5 h-5 text-blue-500" />
                        Administrar Categorías
                    </h2>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="flex items-end gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex-1">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nueva Categoría</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ej: Clínica, Administrativo..."
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Color</label>
                            <input
                                type="color"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className="w-10 h-[34px] rounded-xl cursor-pointer bg-white border border-slate-200 dark:border-slate-700 p-0.5"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newName.trim()}
                            className="h-[34px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center justify-center gap-2 font-bold text-xs disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            Añadir
                        </button>
                    </form>

                    {/* List */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest pl-1">Categorías Existentes</h3>
                        {loading && <div className="text-center py-4 text-slate-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mx-auto"></div></div>}
                        {!loading && categories.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm italic">
                                No has creado ninguna categoría aún.
                            </div>
                        )}
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                                {editingId === cat.id ? (
                                    <div className="flex flex-1 items-center gap-2">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="flex-1 px-2 py-1 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700"
                                        />
                                        <input
                                            type="color"
                                            value={editColor}
                                            onChange={(e) => setEditColor(e.target.value)}
                                            className="w-8 h-8 rounded-lg cursor-pointer p-0"
                                        />
                                        <button onClick={() => handleUpdate(cat.id)} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-500 bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color || '#3b82f6' }}></div>
                                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{cat.name}</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => startEditing(cat)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
