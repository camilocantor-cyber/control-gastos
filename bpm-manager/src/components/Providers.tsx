import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Plus, Search, Edit2, Trash2, X, Building2, Phone, Mail, MapPin } from 'lucide-react';
import type { Provider } from '../types';

export function Providers() {
    const { user } = useAuth();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        tax_id: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        if (user?.organization_id) {
            fetchProviders();
        }
    }, [user?.organization_id]);

    async function fetchProviders() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('providers')
                .select('*')
                .eq('organization_id', user?.organization_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProviders(data || []);
        } catch (error) {
            console.error('Error fetching providers:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!user?.organization_id) return;

        setSaving(true);
        try {
            const payload = {
                organization_id: user.organization_id,
                ...formData
            };

            if (editingId) {
                const { error } = await supabase
                    .from('providers')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('providers')
                    .insert(payload);
                if (error) throw error;
            }

            setShowModal(false);
            resetForm();
            fetchProviders();
        } catch (error: any) {
            alert('Error al guardar: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

        try {
            const { error } = await supabase
                .from('providers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchProviders();
        } catch (error: any) {
            alert('Error al eliminar: ' + error.message);
        }
    }

    function resetForm() {
        setEditingId(null);
        setFormData({ name: '', tax_id: '', email: '', phone: '', address: '' });
    }

    function openEdit(provider: Provider) {
        setEditingId(provider.id);
        setFormData({
            name: provider.name,
            tax_id: provider.tax_id || '',
            email: provider.email || '',
            phone: provider.phone || '',
            address: provider.address || ''
        });
        setShowModal(true);
    }

    const filteredProviders = providers.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tax_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading && providers.length === 0) return <div className="p-8 text-center text-slate-400">Cargando proveedores...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Unified Action Bar */}
            <header className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300">
                <div className="flex-1 max-w-xl relative group ml-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o NIT..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border-transparent focus:bg-white dark:focus:bg-slate-800 border focus:border-blue-500/50 rounded-xl focus:outline-none transition-all text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:text-[9px] placeholder:tracking-widest"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Proveedor
                </button>
            </header>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-200/50 dark:bg-slate-800/50 transition-colors">
                                <th className="px-8 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Proveedor</th>
                                <th className="px-8 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Contacto</th>
                                <th className="px-8 py-5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredProviders.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-12 text-center text-slate-400 font-medium">
                                        No se encontraron proveedores.
                                    </td>
                                </tr>
                            ) : (
                                filteredProviders.map((provider) => (
                                    <tr key={provider.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold border border-orange-100 dark:border-orange-800">
                                                    {provider.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-slate-100">{provider.name}</p>
                                                    {provider.tax_id && (
                                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                                            <Building2 className="w-3 h-3" />
                                                            <span>{provider.tax_id}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="space-y-1">
                                                {provider.email && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                        <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                        {provider.email}
                                                    </div>
                                                )}
                                                {provider.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                        <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                        {provider.phone}
                                                    </div>
                                                )}
                                                {provider.address && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                                                        <MapPin className="w-3 h-3 text-slate-400" />
                                                        {provider.address}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(provider)}
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(provider.id)}
                                                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
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

            {/* Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 animate-in zoom-in-95 border border-white/20 dark:border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
                                {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest pl-1">
                                    Nombre / Razón Social <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-900 dark:text-slate-100"
                                    placeholder="Ej. Suministros Generales S.A.S"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest pl-1">NIT / ID Tributario</label>
                                    <input
                                        type="text"
                                        value={formData.tax_id}
                                        onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-900 dark:text-slate-100"
                                        placeholder="Ej. 900.123.456-7"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest pl-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-900 dark:text-slate-100"
                                        placeholder="+57 300 123 4567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest pl-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-900 dark:text-slate-100"
                                    placeholder="contacto@proveedor.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-widest pl-1">Dirección Física</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-900 dark:text-slate-100"
                                    placeholder="Calle 123 # 45-67, Bogotá"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !formData.name.trim()}
                                    className="flex-1 py-3 bg-blue-600 dark:bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-500 transition-all shadow-xl shadow-blue-200 dark:shadow-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
                                >
                                    {saving ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear Proveedor')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
