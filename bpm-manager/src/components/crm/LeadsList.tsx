import { useState, useEffect } from 'react';
import { crmService } from '../../services/crmService';
import type { MktLead } from '../../types/crm';
import { Plus, Search, Target, MoreVertical, Calendar as CalendarIcon, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LeadFormModal } from './LeadFormModal';

export function LeadsList() {
    const [leads, setLeads] = useState<MktLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<MktLead | null>(null);

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            setLoading(true);
            const data = await crmService.getLeads();
            setLeads(data);
        } catch (error) {
            console.error('Error loading leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (lead?: MktLead) => {
        setEditingLead(lead || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingLead(null);
    };

    const handleSaveLead = (savedLead: MktLead) => {
        setLeads(prev => {
            const index = prev.findIndex(l => l.id_lead === savedLead.id_lead);
            if (index >= 0) {
                const newLeads = [...prev];
                // preserve virtual populated fields if returning from save without them
                if (!savedLead.cliente && prev[index].cliente && savedLead.id_cliente === prev[index].id_cliente) {
                    savedLead.cliente = prev[index].cliente;
                }
                if (!savedLead.campana && prev[index].campana && savedLead.id_campaña === prev[index].id_campaña) {
                    savedLead.campana = prev[index].campana;
                }
                newLeads[index] = savedLead;
                return newLeads;
            }
            // we will need to refetch to get the join data if it's a new lead
            loadLeads();
            return prev;
        });
        handleCloseModal();
    };

    const filteredLeads = leads.filter(l => {
        const clientName = `${l.cliente?.nombre || ''} ${l.cliente?.apellido || ''}`.toLowerCase();
        const campaignName = (l.campana?.nombre || '').toLowerCase();
        const term = searchTerm.toLowerCase();

        return clientName.includes(term) || campaignName.includes(term) || (l.origen && l.origen.toLowerCase().includes(term));
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o campaña..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#0d111d] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Registrar Lead
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Target className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay leads registrados</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Vincula un cliente con una campaña para crear leads.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLeads.map(lead => (
                        <div key={lead.id_lead} className="bg-white dark:bg-[#0d111d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 pr-4">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                                        {lead.cliente?.nombre} {lead.cliente?.apellido}
                                    </h4>
                                    <span className={`inline-block mt-2 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                                        lead.estado === 'nuevo' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                        lead.estado === 'contactado' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                                        lead.estado === 'calificado' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' :
                                        lead.estado === 'convertido' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                                        lead.estado === 'perdido' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                                        'bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400'
                                    }`}>
                                        {lead.estado || 'Sin estado'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => handleOpenModal(lead)}
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-400 flex-1">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                                        <LinkIcon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                                            {lead.campana?.nombre || 'Sin campaña vinculada'}
                                        </p>
                                        <p className="text-xs mt-0.5">Campaña de origen</p>
                                    </div>
                                </div>
                                {lead.fecha_lead && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            <CalendarIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">
                                            {format(new Date(lead.fecha_lead), "dd MMM yyyy", { locale: es })}
                                        </span>
                                    </div>
                                )}
                                {lead.origen && (
                                    <div className="text-xs pt-2 font-medium text-slate-400">
                                        Medio de Origen: {lead.origen}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <LeadFormModal 
                    lead={editingLead} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveLead} 
                />
            )}
        </div>
    );
}
