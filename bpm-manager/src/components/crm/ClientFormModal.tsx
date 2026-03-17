import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { crmService } from '../../services/crmService';
import type { MktCliente } from '../../types/crm';
import { toast } from 'sonner';

interface ClientFormModalProps {
    client?: MktCliente | null;
    onClose: () => void;
    onSave: (client: MktCliente) => void;
}

export function ClientFormModal({ client, onClose, onSave }: ClientFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<MktCliente>>({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        ciudad: '',
        pais: '',
        especialidad: '',
        institucion: '',
        fuente_lead: '',
        estado_lead: 'nuevo'
    });

    useEffect(() => {
        if (client) {
            setFormData({
                nombre: client.nombre,
                apellido: client.apellido || '',
                email: client.email || '',
                telefono: client.telefono || '',
                ciudad: client.ciudad || '',
                pais: client.pais || '',
                especialidad: client.especialidad || '',
                institucion: client.institucion || '',
                fuente_lead: client.fuente_lead || '',
                estado_lead: client.estado_lead || 'nuevo'
            });
        }
    }, [client]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: Partial<MktCliente>) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.nombre) {
            toast.error('El nombre del cliente es obligatorio');
            return;
        }

        try {
            setLoading(true);
            const clientPayload = { ...formData };
            if (!client?.id_cliente) {
                clientPayload.fecha_registro = new Date().toISOString().split('T')[0];
            }

            let savedClient: MktCliente;

            if (client?.id_cliente) {
                savedClient = await crmService.updateClient(client.id_cliente, clientPayload);
                toast.success('Cliente actualizado exitosamente');
            } else {
                savedClient = await crmService.createClient(clientPayload);
                toast.success('Cliente creado exitosamente');
            }

            onSave(savedClient);
        } catch (error: any) {
            console.error('Error saving client:', error);
            toast.error(error.message || 'Error al guardar el cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d111d] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                            {client ? 'Editar Cliente / Lead' : 'Nuevo Cliente / Lead'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {client ? 'Modifica los datos del registro' : 'Registra una nueva persona o institución en el CRM'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Nombres (o Empresa) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Apellidos
                                </label>
                                <input
                                    type="text"
                                    name="apellido"
                                    value={formData.apellido}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Correo Electrónico
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Teléfono
                                </label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Institución
                                </label>
                                <input
                                    type="text"
                                    name="institucion"
                                    value={formData.institucion}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Especialidad
                                </label>
                                <input
                                    type="text"
                                    name="especialidad"
                                    value={formData.especialidad}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Ciudad
                                </label>
                                <input
                                    type="text"
                                    name="ciudad"
                                    value={formData.ciudad}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    País
                                </label>
                                <input
                                    type="text"
                                    name="pais"
                                    value={formData.pais}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Estado del Lead
                                </label>
                                <select
                                    name="estado_lead"
                                    value={formData.estado_lead}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 bg-white dark:bg-[#0d111d] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="nuevo">Nuevo</option>
                                    <option value="contactado">Contactado</option>
                                    <option value="calificado">Calificado</option>
                                    <option value="convertido">Convertido</option>
                                    <option value="perdido">Perdido</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Fuente (Origen)
                                </label>
                                <input
                                    type="text"
                                    name="fuente_lead"
                                    value={formData.fuente_lead}
                                    onChange={handleChange}
                                    placeholder="Ej. Facebook, Referido"
                                    className="w-full px-4 py-2 bg-white dark:bg-[#0d111d] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#080a14] flex justify-end gap-3 rounded-b-3xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="client-form"
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {client ? 'Guardar Cambios' : 'Registrar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
