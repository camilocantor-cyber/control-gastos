import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { crmService } from '../../services/crmService';
import type { MktLead, MktCliente, MktCampana } from '../../types/crm';
import { toast } from 'sonner';

interface LeadFormModalProps {
    lead?: MktLead | null;
    onClose: () => void;
    onSave: (lead: MktLead) => void;
}

export function LeadFormModal({ lead, onClose, onSave }: LeadFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    
    const [clientes, setClientes] = useState<MktCliente[]>([]);
    const [campanas, setCampanas] = useState<MktCampana[]>([]);

    const [formData, setFormData] = useState<Partial<MktLead>>({
        id_cliente: 0,
        id_campaña: 0,
        fecha_lead: '',
        origen: '',
        estado: 'nuevo'
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (lead && !fetchingData) {
            setFormData({
                id_cliente: lead.id_cliente || 0,
                id_campaña: lead.id_campaña || 0,
                fecha_lead: lead.fecha_lead || '',
                origen: lead.origen || '',
                estado: lead.estado || 'nuevo'
            });
        }
    }, [lead, fetchingData]);

    const loadData = async () => {
        try {
            setFetchingData(true);
            const [clientsData, campaignsData] = await Promise.all([
                crmService.getClients(),
                crmService.getCampaigns()
            ]);
            setClientes(clientsData);
            setCampanas(campaignsData);
        } catch (error: any) {
            toast.error('Error al cargar clientes y campañas');
            console.error(error);
        } finally {
            setFetchingData(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: Partial<MktLead>) => ({ 
            ...prev, 
            [name]: (name === 'id_cliente' || name === 'id_campaña') ? Number(value) : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.id_cliente || !formData.id_campaña) {
            toast.error('El cliente y la campaña son obligatorios');
            return;
        }

        try {
            setLoading(true);
            const leadPayload = { ...formData };
            if (!lead?.id_lead && !leadPayload.fecha_lead) {
                leadPayload.fecha_lead = new Date().toISOString().split('T')[0];
            }

            let savedLead: MktLead;

            if (lead?.id_lead) {
                savedLead = await crmService.updateLead(lead.id_lead, leadPayload);
                toast.success('Lead actualizado exitosamente');
            } else {
                savedLead = await crmService.createLead(leadPayload);
                toast.success('Lead registrado exitosamente');
            }

            onSave(savedLead);
        } catch (error: any) {
            console.error('Error saving lead:', error);
            toast.error(error.message || 'Error al guardar el lead');
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
                            {lead ? 'Editar Lead' : 'Registrar Lead'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {lead ? 'Modifica el estado o relación de este lead' : 'Vincula un cliente existente con una campaña para generar un lead'}
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
                        <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Cliente / Empresa <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="id_cliente"
                                    value={formData.id_cliente}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    required
                                >
                                    <option value={0} disabled>Seleccione un cliente...</option>
                                    {clientes.map(c => (
                                        <option key={c.id_cliente} value={c.id_cliente}>
                                            {c.nombre} {c.apellido || ''} {c.institucion ? `(${c.institucion})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Campaña Promocional <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="id_campaña"
                                    value={formData.id_campaña}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    required
                                >
                                    <option value={0} disabled>Seleccione una campaña...</option>
                                    {campanas.map(c => (
                                        <option key={c.id_campaña} value={c.id_campaña}>
                                            {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Fecha del Lead
                                    </label>
                                    <input
                                        type="date"
                                        name="fecha_lead"
                                        value={formData.fecha_lead?.split('T')[0] || ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Estado en la Campaña
                                    </label>
                                    <select
                                        name="estado"
                                        value={formData.estado}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    >
                                        <option value="nuevo">Nuevo</option>
                                        <option value="contactado">Contactado</option>
                                        <option value="calificado">Calificado</option>
                                        <option value="convertido">Convertido</option>
                                        <option value="perdido">Perdido</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Origen o Medio de Adquisición
                                </label>
                                <input
                                    type="text"
                                    name="origen"
                                    value={formData.origen}
                                    onChange={handleChange}
                                    placeholder="Facebook Ads, Referido de Cliente, Búsqueda..."
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
                        form="lead-form"
                        type="submit"
                        disabled={loading || fetchingData}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {lead ? 'Guardar Cambios' : 'Registrar Lead'}
                    </button>
                </div>
            </div>
        </div>
    );
}
