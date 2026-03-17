import { useState, useEffect } from 'react';
import { crmService } from '../../services/crmService';
import type { MktCliente } from '../../types/crm';
import { Plus, Search, Mail, Phone, Users, MoreVertical, Building } from 'lucide-react';
import { ClientFormModal } from './ClientFormModal';

export function ClientsList() {
    const [clients, setClients] = useState<MktCliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<MktCliente | null>(null);

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            setLoading(true);
            const data = await crmService.getClients();
            setClients(data);
        } catch (error) {
            console.error('Error loading clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (client?: MktCliente) => {
        setEditingClient(client || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
    };

    const handleSaveClient = (savedClient: MktCliente) => {
        setClients(prev => {
            const index = prev.findIndex(c => c.id_cliente === savedClient.id_cliente);
            if (index >= 0) {
                const newClients = [...prev];
                newClients[index] = savedClient;
                return newClients;
            }
            return [savedClient, ...prev];
        });
        handleCloseModal();
    };

    const filteredClients = clients.filter(c => 
        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.institucion && c.institucion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, info o institución..."
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
                    Nuevo Cliente
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay clientes</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Comienza agregando tu primer cliente al CRM.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map(client => (
                        <div key={client.id_cliente} className="bg-white dark:bg-[#0d111d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {client.nombre} {client.apellido}
                                    </h4>
                                    {client.institucion && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                                            <Building className="w-3 h-3" /> {client.institucion}
                                        </p>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleOpenModal(client)}
                                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-400">
                                {client.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <span className="truncate flex-1 font-medium">{client.email}</span>
                                    </div>
                                )}
                                {client.telefono && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">{client.telefono}</span>
                                    </div>
                                )}
                                {client.ciudad && (
                                    <div className="text-xs pt-2 font-medium text-slate-400">
                                        Ubicación: {client.ciudad}{client.pais ? `, ${client.pais}` : ''}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <ClientFormModal 
                    client={editingClient} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveClient} 
                />
            )}
        </div>
    );
}
