import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { crmService } from '../../services/crmService';
import type { MktInteraccion, MktCliente } from '../../types/crm';
import { toast } from 'sonner';

interface InteractionFormModalProps {
    interaction?: MktInteraccion | null;
    onClose: () => void;
    onSave: (interaction: MktInteraccion) => void;
}

export function InteractionFormModal({ interaction, onClose, onSave }: InteractionFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [clientes, setClientes] = useState<MktCliente[]>([]);

    const [formData, setFormData] = useState<Partial<MktInteraccion>>({
        id_cliente: 0,
        tipo: 'Llamada',
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        resultado: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (interaction && !fetchingData) {
            setFormData({
                id_cliente: interaction.id_cliente || 0,
                tipo: interaction.tipo || 'Llamada',
                fecha: interaction.fecha || '',
                descripcion: interaction.descripcion || '',
                resultado: interaction.resultado || ''
            });
        }
    }, [interaction, fetchingData]);

    const loadData = async () => {
        try {
            setFetchingData(true);
            const clientsData = await crmService.getClients();
            setClientes(clientsData);
        } catch (error: any) {
            toast.error('Error al cargar clientes');
            console.error(error);
        } finally {
            setFetchingData(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: Partial<MktInteraccion>) => ({ 
            ...prev, 
            [name]: (name === 'id_cliente') ? Number(value) : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.id_cliente) {
            toast.error('Debe seleccionar el cliente');
            return;
        }

        try {
            setLoading(true);
            const interactionPayload = { ...formData };
            if (!interactionPayload.fecha) interactionPayload.fecha = new Date().toISOString().split('T')[0];

            let savedInteraction: MktInteraccion;

            if (interaction?.id_interaccion) {
                savedInteraction = await crmService.updateInteraction(interaction.id_interaccion, interactionPayload);
                toast.success('Interacción actualizada exitosamente');
            } else {
                savedInteraction = await crmService.createInteraction(interactionPayload);
                toast.success('Interacción registrada exitosamente');
            }

            onSave(savedInteraction);
        } catch (error: any) {
            console.error('Error saving interaction:', error);
            toast.error(error.message || 'Error al guardar la interacción');
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
                            {interaction ? 'Editar Interacción' : 'Registrar Interacción'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {interaction ? 'Actualiza los detalles del contacto' : 'Registra una llamada, correo o reunión con un cliente'}
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
                    {fetchingData ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <form id="interaction-form" onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Cliente Contactado <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="id_cliente"
                                    value={formData.id_cliente}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    required
                                >
                                    <option value={0} disabled>Seleccione el cliente...</option>
                                    {clientes.map(c => (
                                        <option key={c.id_cliente} value={c.id_cliente}>
                                            {c.nombre} {c.apellido || ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Tipo de Contacto
                                    </label>
                                    <select
                                        name="tipo"
                                        value={formData.tipo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    >
                                        <option value="Llamada">Llamada</option>
                                        <option value="Correo">Correo Electrónico</option>
                                        <option value="Reunión Presencial">Reunión Presencial</option>
                                        <option value="Reunión Virtual">Reunión Virtual</option>
                                        <option value="WhatsApp">Mensaje de WhatsApp</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Fecha de la Interacción
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha"
                                        value={formData.fecha?.split('T')[0] || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Descripción / Notas
                                </label>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleChange}
                                    placeholder="¿De qué se habló? ¿Hubo dudas particulares?"
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Resultado / Conclusión
                                </label>
                                <input
                                    type="text"
                                    name="resultado"
                                    value={formData.resultado}
                                    onChange={handleChange}
                                    placeholder="Ej. Prometió enviar documentos, No le interesa..."
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>

                        </form>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#080a14] flex justify-end gap-3 rounded-b-3xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading || fetchingData}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="interaction-form"
                        type="submit"
                        disabled={loading || fetchingData}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {interaction ? 'Guardar Cambios' : 'Registrar Contacto'}
                    </button>
                </div>
            </div>
        </div>
    );
}
