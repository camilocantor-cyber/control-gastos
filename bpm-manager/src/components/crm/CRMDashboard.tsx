import { useState } from 'react';
import { Target, Users, Megaphone, BookOpen, MessageSquare, PhoneCall } from 'lucide-react';
import { LeadsList } from './LeadsList';
import { ClientsList } from './ClientsList';
import { CampaignsList } from './CampaignsList';
import { CoursesList } from './CoursesList';
import { InteractionsList } from './InteractionsList';
export function CRMDashboard() {
    const [activeTab, setActiveTab] = useState('leads');

    const tabs = [
        { id: 'leads', label: 'Leads', icon: Target },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'campaigns', label: 'Campañas', icon: Megaphone },
        { id: 'courses', label: 'Cursos', icon: BookOpen },
        { id: 'interactions', label: 'Interacciones', icon: PhoneCall },
        { id: 'messages', label: 'Mensajes', icon: MessageSquare },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">CRM Dashboard</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gestión de Leads, Clientes, Campañas y Cursos</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar border-b border-slate-200 dark:border-slate-800">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="bg-white dark:bg-[#080a14] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 min-h-[500px]">
                {activeTab === 'leads' && (
                    <LeadsList />
                )}
                {activeTab === 'clients' && (
                    <ClientsList />
                )}
                {activeTab === 'campaigns' && (
                    <CampaignsList />
                )}
                {activeTab === 'courses' && (
                    <CoursesList />
                )}
                {activeTab === 'interactions' && (
                    <InteractionsList />
                )}
                {activeTab === 'messages' && (
                    <div className="flex items-center justify-center h-64 text-slate-500">
                        Módulo de Mensajes en desarrollo...
                    </div>
                )}
            </div>
        </div>
    );
}
