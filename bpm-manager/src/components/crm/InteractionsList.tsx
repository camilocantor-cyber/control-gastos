import { useState, useEffect } from 'react';
import { crmService } from '../../services/crmService';
import type { MktInteraccion } from '../../types/crm';
import { Plus, Search, MessageSquare, MoreVertical, Calendar as CalendarIcon, Phone, Mail, Video, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { InteractionFormModal } from './InteractionFormModal';

export function InteractionsList() {
    const [interactions, setInteractions] = useState<MktInteraccion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingInteraction, setEditingInteraction] = useState<MktInteraccion | null>(null);

    useEffect(() => {
        loadInteractions();
    }, []);

    const loadInteractions = async () => {
        try {
            setLoading(true);
            const data = await crmService.getInteractions();
            setInteractions(data);
        } catch (error) {
            console.error('Error loading interactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (interaction?: MktInteraccion) => {
        setEditingInteraction(interaction || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingInteraction(null);
    };

    const handleSaveInteraction = (savedInteraction: MktInteraccion) => {
        setInteractions(prev => {
            const index = prev.findIndex(i => i.id_interaccion === savedInteraction.id_interaccion);
            if (index >= 0) {
                const newInteractions = [...prev];
                // Preserve the client relation
                if (!savedInteraction.cliente && prev[index].cliente && savedInteraction.id_cliente === prev[index].id_cliente) {
                    savedInteraction.cliente = prev[index].cliente;
                }
                newInteractions[index] = savedInteraction;
                return newInteractions;
            }
            loadInteractions(); // Refetch if new
            return prev;
        });
        handleCloseModal();
    };

    const filteredInteractions = interactions.filter(i => {
        const clientName = `${i.cliente?.nombre || ''} ${i.cliente?.apellido || ''}`.toLowerCase();
        const term = searchTerm.toLowerCase();

        return clientName.includes(term) || 
               (i.descripcion && i.descripcion.toLowerCase().includes(term)) ||
               (i.resultado && i.resultado.toLowerCase().includes(term));
    });

    const getIconForType = (type?: string) => {
        switch (type?.toLowerCase()) {
            case 'llamada': return <Phone className="w-4 h-4" />;
            case 'correo': return <Mail className="w-4 h-4" />;
            case 'reunión virtual': return <Video className="w-4 h-4" />;
            case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
            default: return <User className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente, descripción o resultado..."
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
                    Registrar Contacto
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredInteractions.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay interacciones</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Registra tus llamadas, correos y reuniones con los clientes.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {filteredInteractions.map(interaction => (
                        <div key={interaction.id_interaccion} className="bg-white dark:bg-[#0d111d] px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group flex items-start gap-4">
                            
                            <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                interaction.tipo === 'Llamada' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                                interaction.tipo === 'Correo' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                                interaction.tipo === 'WhatsApp' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                                interaction.tipo === 'Reunión Virtual' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                                {getIconForType(interaction.tipo)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <div className="pr-4">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {interaction.cliente?.nombre} {interaction.cliente?.apellido}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                            <span className="font-medium text-slate-600 dark:text-slate-300">{interaction.tipo}</span> • 
                                            <span className="flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3" />
                                                {interaction.fecha ? format(new Date(interaction.fecha), "dd MMM yyyy", { locale: es }) : 'Sin fecha'}
                                            </span>
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleOpenModal(interaction)}
                                        className="p-1.5 -mr-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                {interaction.descripcion && (
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                                        "{interaction.descripcion}"
                                    </p>
                                )}
                                
                                {interaction.resultado && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        Resultado: {interaction.resultado}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <InteractionFormModal 
                    interaction={editingInteraction} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveInteraction} 
                />
            )}
        </div>
    );
}
