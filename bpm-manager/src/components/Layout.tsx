import React, { type ReactNode, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, GitBranch, Users, LogOut, ChevronRight, PlusCircle, Search, BarChart3, Building2, Package, Moon, Sun, Calendar, ChevronDown, Network, Menu, Fingerprint, Zap } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick, isCollapsed }: SidebarItemProps & { isCollapsed?: boolean }) => (
    <button
        onClick={onClick}
        title={isCollapsed ? label : undefined}
        className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
            isCollapsed && "justify-center px-0",
            active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        )}
    >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!isCollapsed && <span className="font-semibold text-sm truncate">{label}</span>}
        {active && !isCollapsed && <ChevronRight className="w-4 h-4 ml-auto flex-shrink-0" />}
    </button>
);

const CollapsibleSection = ({
    label,
    isOpen,
    onToggle,
    children,
    isActive,
    isCollapsed
}: {
    label: string,
    isOpen: boolean,
    onToggle: () => void,
    children: React.ReactNode,
    isActive?: boolean,
    isCollapsed?: boolean
}) => (
    <div className="space-y-1">
        {!isCollapsed ? (
            <>
                <button
                    onClick={onToggle}
                    className={cn(
                        "w-full flex items-center justify-between px-4 py-2 rounded-xl transition-all duration-200 group",
                        isActive
                            ? "bg-slate-50 dark:bg-slate-800/50"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                >
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                        isActive || isOpen
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400"
                    )}>
                        {label}
                    </span>
                    <ChevronDown className={cn(
                        "w-3 h-3 transition-transform duration-300",
                        isOpen ? "rotate-180 text-blue-500" : "text-slate-300 dark:text-slate-700"
                    )} />
                </button>
                <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isOpen ? "max-h-96 opacity-100 mt-1" : "max-h-0 opacity-0"
                )}>
                    <div className="pl-2 space-y-1 border-l-2 border-slate-50 dark:border-slate-800 ml-4 py-1">
                        {children}
                    </div>
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-8 h-px bg-slate-100 dark:bg-slate-800 my-1" />
                {children}
            </div>
        )}
    </div>
);

interface SidebarProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
    onNewProcess?: () => void;
    isCollapsed?: boolean;
}

export function Sidebar({ activeSection, onSectionChange, onNewProcess, isCollapsed }: SidebarProps) {
    const { user, signOut, switchOrganization } = useAuth();
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['operaciones', 'herramientas']));

    const toggleSection = (section: string) => {
        const newOpen = new Set(openSections);
        if (newOpen.has(section)) {
            newOpen.delete(section);
        } else {
            newOpen.add(section);
        }
        setOpenSections(newOpen);
    };

    const isOperacionesActive = ['new-process', 'search'].includes(activeSection);
    const isHerramientasActive = ['calendar', 'reports', 'providers', 'orgchart'].includes(activeSection);
    const isConfigActive = ['workflows', 'users', 'organization', 'accounts'].includes(activeSection);

    return (
        <aside className={cn(
            "bg-white dark:bg-[#080a14] border-r border-slate-100 dark:border-slate-800 flex flex-col sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className={cn("p-5 h-full flex flex-col", isCollapsed && "p-4")}>
                <div className={cn("mb-6 relative group", isCollapsed && "mb-5")}>
                    <button className={cn(
                        "w-full flex items-center gap-3 p-2 -ml-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left",
                        isCollapsed && "ml-0 justify-center p-0"
                    )}>
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100 flex-shrink-0">
                            <GitBranch className="text-white w-5 h-5" />
                        </div>
                        {!isCollapsed && (
                            <>
                                <div className="flex-1 overflow-hidden">
                                    <h1 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                                        {user?.available_organizations?.find(o => o.id === user.organization_id)?.name || 'BPM FLOW'}
                                    </h1>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                        {user?.available_organizations?.find(o => o.id === user.organization_id)?.role || 'Viewer'}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:rotate-90 transition-transform" />
                            </>
                        )}
                    </button>

                    {/* Dropdown - only show if not collapsed or handle differently */}
                    {!isCollapsed && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#0d111d] border border-slate-100 dark:border-slate-800 rounded-[1.5rem] shadow-xl dark:shadow-2xl dark:shadow-slate-950 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 backdrop-blur-xl">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] px-3 py-3">Mis Organizaciones</p>
                            <div className="space-y-1">
                                {user?.available_organizations?.map(org => (
                                    <button
                                        key={org.id}
                                        onClick={() => switchOrganization(org.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95",
                                            org.id === user?.organization_id
                                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
                                                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            org.id === user?.organization_id ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"
                                        )} />
                                        {org.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <nav className="space-y-4 flex-1">
                    <SidebarItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        active={activeSection === 'dashboard'}
                        onClick={() => onSectionChange('dashboard')}
                        isCollapsed={isCollapsed}
                    />

                    <div className="space-y-3">
                        <CollapsibleSection
                            label="Operaciones"
                            isOpen={openSections.has('operaciones')}
                            onToggle={() => toggleSection('operaciones')}
                            isActive={isOperacionesActive}
                            isCollapsed={isCollapsed}
                        >
                            <SidebarItem
                                icon={PlusCircle}
                                label="Nuevo Trámite"
                                onClick={onNewProcess}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Search}
                                label="Buscar Trámites"
                                active={activeSection === 'search'}
                                onClick={() => onSectionChange('search')}
                                isCollapsed={isCollapsed}
                            />
                        </CollapsibleSection>

                        <CollapsibleSection
                            label="Herramientas"
                            isOpen={openSections.has('herramientas')}
                            onToggle={() => toggleSection('herramientas')}
                            isActive={isHerramientasActive}
                            isCollapsed={isCollapsed}
                        >
                            <SidebarItem
                                icon={Calendar}
                                label="Calendario"
                                active={activeSection === 'calendar'}
                                onClick={() => onSectionChange('calendar')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={BarChart3}
                                label="Reportes"
                                active={activeSection === 'reports'}
                                onClick={() => onSectionChange('reports')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Package}
                                label="Proveedores"
                                active={activeSection === 'providers'}
                                onClick={() => onSectionChange('providers')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Network}
                                label="Organigrama"
                                active={activeSection === 'orgchart'}
                                onClick={() => onSectionChange('orgchart')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Zap}
                                label="Monitor de API"
                                active={activeSection === 'monitor'}
                                onClick={() => onSectionChange('monitor')}
                                isCollapsed={isCollapsed}
                            />
                        </CollapsibleSection>

                        <CollapsibleSection
                            label="Configuración"
                            isOpen={openSections.has('configuracion')}
                            onToggle={() => toggleSection('configuracion')}
                            isActive={isConfigActive}
                            isCollapsed={isCollapsed}
                        >
                            <SidebarItem
                                icon={GitBranch}
                                label="Mis Flujos"
                                active={activeSection === 'workflows'}
                                onClick={() => onSectionChange('workflows')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Users}
                                label="Usuarios"
                                active={activeSection === 'users'}
                                onClick={() => onSectionChange('users')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Building2}
                                label="Mi Empresa"
                                active={activeSection === 'organization'}
                                onClick={() => onSectionChange('organization')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Fingerprint}
                                label="Cuentas"
                                active={activeSection === 'accounts'}
                                onClick={() => onSectionChange('accounts')}
                                isCollapsed={isCollapsed}
                            />
                        </CollapsibleSection>
                    </div>
                </nav>

                <div className={cn("pt-4 border-t border-slate-50 dark:border-slate-800", isCollapsed && "mt-auto pt-2")}>
                    <button
                        onClick={signOut}
                        title={isCollapsed ? "Cerrar Sesión" : undefined}
                        className={cn(
                            "w-full flex items-center gap-3 p-4 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all group",
                            isCollapsed && "p-2 justify-center"
                        )}
                    >
                        <LogOut className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
                        {!isCollapsed && <span className="font-bold text-[13px]">Cerrar Sesión</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
}

interface MainLayoutProps {
    children: ReactNode;
    activeSection: string;
    onSectionChange: (section: string) => void;
    onNewProcess?: () => void;
}

export function MainLayout({ children, activeSection, onSectionChange, onNewProcess }: MainLayoutProps) {
    const { user } = useAuth();
    const { profile, loading: profileLoading } = useProfile(user?.id);
    const { theme, toggleTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-200/40 dark:bg-[#02040a]">
            <Sidebar
                activeSection={activeSection}
                onSectionChange={onSectionChange}
                onNewProcess={onNewProcess}
                isCollapsed={isCollapsed}
            />
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <header className="h-16 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-[#080a14]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40 transition-all">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                            title={isCollapsed ? "Expandir Menú" : "Contraer Menú"}
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            {(() => {
                                const icons: Record<string, any> = {
                                    dashboard: LayoutDashboard,
                                    workflows: GitBranch,
                                    users: Users,
                                    search: Search,
                                    reports: BarChart3,
                                    calendar: Calendar,
                                    providers: Package,
                                    orgchart: Network,
                                    accounts: Fingerprint,
                                    monitor: Zap,
                                    organization: Building2,
                                    settings: ChevronRight
                                };
                                const Icon = icons[activeSection] || ChevronRight;
                                return (
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                );
                            })()}
                            <div>
                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-0.5 leading-none">Módulo Principal</p>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize leading-none">
                                    {activeSection === 'orgchart' ? 'Organigrama' :
                                        activeSection === 'workflows' ? 'Flujos de Trabajo' :
                                            activeSection === 'search' ? 'Mis Trámites' :
                                                activeSection === 'calendar' ? 'Calendario' :
                                                    activeSection === 'users' ? 'Colaboradores' :
                                                        activeSection === 'accounts' ? 'Cuentas de Sistema' :
                                                            activeSection === 'monitor' ? 'Monitor de API' :
                                                                activeSection}
                                </h2>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
                        >
                            {theme === 'light' ? (
                                <Moon className="w-5 h-5 text-slate-600" />
                            ) : (
                                <Sun className="w-5 h-5 text-slate-400" />
                            )}
                        </button>

                        <div className="text-right mr-2">
                            {profileLoading ? (
                                <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-full" />
                            ) : (
                                <>
                                    <p className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{profile?.full_name || 'Usuario'}</p>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{profile?.role || 'Viewer'}</p>
                                </>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 dark:shadow-blue-900/20 border-2 border-white dark:border-slate-800 relative group/avatar">
                            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
                        </div>
                    </div>
                </header>
                <div className="p-5">
                    {children}
                </div>
            </main>
        </div>
    );
}
