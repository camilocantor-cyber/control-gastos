import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { crmService } from '../../services/crmService';
import type { MktCampana } from '../../types/crm';
import { toast } from 'sonner';

interface CampaignFormModalProps {
    campaign?: MktCampana | null;
    onClose: () => void;
    onSave: (campaign: MktCampana) => void;
}

export function CampaignFormModal({ campaign, onClose, onSave }: CampaignFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<MktCampana>>({
        nombre: '',
        objetivo: '',
        plataforma: '',
        fecha_inicio: '',
        fecha_fin: '',
        presupuesto: 0
    });

    useEffect(() => {
        if (campaign) {
            setFormData({
                nombre: campaign.nombre,
                objetivo: campaign.objetivo || '',
                plataforma: campaign.plataforma || '',
                fecha_inicio: campaign.fecha_inicio || '',
                fecha_fin: campaign.fecha_fin || '',
                presupuesto: campaign.presupuesto || 0
            });
        }
    }, [campaign]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev: Partial<MktCampana>) => ({ 
            ...prev, 
            [name]: type === 'number' ? Number(value) : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.nombre) {
            toast.error('El nombre de la campaña es obligatorio');
            return;
        }

        try {
            setLoading(true);
            const campaignPayload = { ...formData };

            // Avoid sending empty strings for dates if they are not set
            if (!campaignPayload.fecha_inicio) delete campaignPayload.fecha_inicio;
            if (!campaignPayload.fecha_fin) delete campaignPayload.fecha_fin;

            let savedCampaign: MktCampana;

            if (campaign?.id_campaña) {
                savedCampaign = await crmService.updateCampaign(campaign.id_campaña, campaignPayload);
                toast.success('Campaña actualizada exitosamente');
            } else {
                savedCampaign = await crmService.createCampaign(campaignPayload);
                toast.success('Campaña creada exitosamente');
            }

            onSave(savedCampaign);
        } catch (error: any) {
            console.error('Error saving campaign:', error);
            toast.error(error.message || 'Error al guardar la campaña');
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
                            {campaign ? 'Editar Campaña' : 'Nueva Campaña'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {campaign ? 'Modifica los detalles de la campaña publicitaria' : 'Crea una nueva campaña de marketing'}
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
                    <form id="campaign-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Nombre de la Campaña <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    placeholder="Ej. Black Friday 2026"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    required
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Plataforma / Medio
                                </label>
                                <input
                                    type="text"
                                    name="plataforma"
                                    value={formData.plataforma}
                                    onChange={handleChange}
                                    placeholder="Ej. Meta, Google, LinkedIn"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Fecha de Inicio
                                </label>
                                <input
                                    type="date"
                                    name="fecha_inicio"
                                    value={formData.fecha_inicio?.split('T')[0] || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Fecha de Fin
                                </label>
                                <input
                                    type="date"
                                    name="fecha_fin"
                                    value={formData.fecha_fin?.split('T')[0] || ''}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Presupuesto Aprobado ($)
                            </label>
                            <input
                                type="number"
                                name="presupuesto"
                                value={formData.presupuesto}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Objetivo de la Campaña
                            </label>
                            <textarea
                                name="objetivo"
                                value={formData.objetivo}
                                onChange={handleChange}
                                placeholder="Generar reconocimiento, Atraer leads de curso..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white resize-none"
                            />
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
                        form="campaign-form"
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {campaign ? 'Guardar Cambios' : 'Crear Campaña'}
                    </button>
                </div>
            </div>
        </div>
    );
}
