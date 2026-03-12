import React, { type ReactNode, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../contexts/ThemeContext';
import { LayoutDashboard, GitBranch, Users, LogOut, ChevronRight, Search, BarChart3, Building2, Package, Moon, Sun, Calendar, ChevronDown, Network, Menu, Fingerprint, Zap, Settings, Plus, HelpCircle, BookOpen, Shield, Columns, Activity, FileSpreadsheet } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePermissions } from '../hooks/usePermissions';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function HeaderNavButton({ active, onClick, icon: Icon, label, color }: { active?: boolean, onClick: () => void, icon: any, label: string, color: 'blue' | 'emerald' | 'indigo' | 'vibrant' }) {
    const colors = {
        blue: active ? "text-blue-600 bg-blue-50 dark:bg-blue-400/20 dark:text-blue-300" : "text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 dark:text-slate-400 dark:hover:text-blue-300",
        emerald: active ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-400/20 dark:text-emerald-300" : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50/50 dark:text-slate-400 dark:hover:text-emerald-300",
        indigo: active ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-400/20 dark:text-indigo-300" : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:text-slate-400 dark:hover:text-indigo-300",
        vibrant: active ? "text-white bg-emerald-600 shadow-emerald-200/50" : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 border-emerald-100 dark:border-emerald-500/20",
    };

    return (
        <button
            onClick={onClick}
            className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 border border-transparent shadow-sm",
                colors[color],
                active && "border-slate-100 dark:border-white/10"
            )}
        >
            <Icon className={clsx("w-3.5 h-3.5", active && "fill-current/10")} />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </button>
    );
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
    onOpenHelp?: (articleId: string) => void;
    onNewProcess?: () => void;
    isCollapsed?: boolean;
}

export function Sidebar({ activeSection, onSectionChange, onOpenHelp, isCollapsed }: SidebarProps) {
    const { user, signOut, switchOrganization } = useAuth();
    const { hasPermission, hasAnyPermission, isKommandant } = usePermissions();
    const [openSections, setOpenSections] = useState<Set<string>>(new Set(['configuracion']));

    const currentOrg = user?.available_organizations?.find(o => o.id === user.organization_id);

    const toggleSection = (section: string) => {
        const newOpen = new Set(openSections);
        if (newOpen.has(section)) {
            newOpen.delete(section);
        } else {
            newOpen.add(section);
        }
        setOpenSections(newOpen);
    };

    const isHerramientasActive = ['calendar', 'search'].includes(activeSection);
    const isReportesActive = ['reports', 'monitor', 'kanban', 'workload', 'advanced-reports'].includes(activeSection);
    const isConfigActive = ['workflows', 'users', 'organization', 'accounts', 'parameters', 'providers', 'orgchart'].includes(activeSection);

    React.useEffect(() => {
        if (isHerramientasActive) {
            setOpenSections(prev => new Set(prev).add('herramientas'));
        }
        if (isReportesActive) {
            setOpenSections(prev => new Set(prev).add('reportes'));
        }
        if (isConfigActive) {
            setOpenSections(prev => new Set(prev).add('configuracion'));
        }
    }, [activeSection, isHerramientasActive, isReportesActive, isConfigActive]);

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
                        <div className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl shadow-lg border flex-shrink-0 overflow-hidden",
                            isKommandant 
                                ? "bg-indigo-600 border-indigo-500 shadow-indigo-500/20" 
                                : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                        )}>
                            {isKommandant ? (
                                <Zap className="text-white w-5 h-5 fill-white" />
                            ) : currentOrg?.logo_url ? (
                                <img src={currentOrg.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                                    <GitBranch className="text-white w-5 h-5" />
                                </div>
                            )}
                        </div>
                        {!isCollapsed && (
                            <>
                                <div className="flex-1 overflow-hidden">
                                    <h1 className={cn(
                                        "text-sm font-black leading-tight truncate",
                                        isKommandant ? "text-indigo-600 dark:text-indigo-400 italic" : "text-slate-900 dark:text-slate-100"
                                    )}>
                                        {isKommandant ? 'Her Kommandant' : (currentOrg?.name || 'BPM FLOW')}
                                    </h1>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:rotate-90 transition-transform" />
                            </>
                        )}
                    </button>

                    {/* Dropdown - only show if not collapsed or handle differently */}
                    {!isCollapsed && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-[#0d111d] border border-slate-100 dark:border-slate-800 rounded-[1.5rem] shadow-xl dark:shadow-2xl dark:shadow-slate-950 p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 backdrop-blur-xl">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] px-3 py-3">Mis Sucursales</p>
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

                    {hasAnyPermission(['edit_workflows', 'manage_users', 'access_settings']) && (
                        <CollapsibleSection
                            label="Configuración"
                            isOpen={openSections.has('configuracion')}
                            onToggle={() => toggleSection('configuracion')}
                            isActive={isConfigActive}
                            isCollapsed={isCollapsed}
                        >
                            {hasPermission('edit_workflows') && (
                                <SidebarItem
                                    icon={GitBranch}
                                    label="Mis Flujos"
                                    active={activeSection === 'workflows'}
                                    onClick={() => onSectionChange('workflows')}
                                    isCollapsed={isCollapsed}
                                />
                            )}
                            {hasPermission('manage_users') && (
                                <SidebarItem
                                    icon={Users}
                                    label="Usuarios"
                                    active={activeSection === 'users'}
                                    onClick={() => onSectionChange('users')}
                                    isCollapsed={isCollapsed}
                                />
                            )}
                            {hasPermission('access_settings') && (
                                <SidebarItem
                                    icon={Building2}
                                    label="Mi Empresa"
                                    active={activeSection === 'organization'}
                                    onClick={() => onSectionChange('organization')}
                                    isCollapsed={isCollapsed}
                                />
                            )}
                            {hasPermission('manage_users') && (
                                <SidebarItem
                                    icon={Shield}
                                    label="Roles y Permisos"
                                    active={activeSection === 'roles'}
                                    onClick={() => onSectionChange('roles')}
                                    isCollapsed={isCollapsed}
                                />
                            )}
                            {hasPermission('access_settings') && (
                                <SidebarItem
                                    icon={Settings}
                                    label="Parámetros"
                                    active={activeSection === 'parameters'}
                                    onClick={() => onSectionChange('parameters')}
                                    isCollapsed={isCollapsed}
                                />
                            )}
                            {hasPermission('access_settings') && (
                                <SidebarItem
                                    icon={Package}
                                    label="Proveedores"
                                    active={activeSection === 'providers'}
                                    onClick={() => onSectionChange('providers')}
                                    isCollapsed={isCollapsed}
                                />
                            )}
                            <SidebarItem
                                icon={Network}
                                label="Organigrama"
                                active={activeSection === 'orgchart'}
                                onClick={() => onSectionChange('orgchart')}
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
                    )}

                    <div className="space-y-3">
                        <CollapsibleSection
                            label="Reportes"
                            isOpen={openSections.has('reportes')}
                            onToggle={() => toggleSection('reportes')}
                            isActive={isReportesActive}
                            isCollapsed={isCollapsed}
                        >
                            <SidebarItem
                                icon={Columns}
                                label="Tablero Kanban"
                                active={activeSection === 'kanban'}
                                onClick={() => onSectionChange('kanban')}
                                isCollapsed={isCollapsed}
                            />
                            <SidebarItem
                                icon={Activity}
                                label="Mapa de Carga"
                                active={activeSection === 'workload'}
                                onClick={() => onSectionChange('workload')}
                                isCollapsed={isCollapsed}
                            />
                            {hasPermission('view_reports') && (
                                <>
                                    <SidebarItem
                                        icon={BarChart3}
                                        label="Reportes"
                                        active={activeSection === 'reports'}
                                        onClick={() => onSectionChange('reports')}
                                        isCollapsed={isCollapsed}
                                    />
                                    <SidebarItem
                                        icon={FileSpreadsheet}
                                        label="Reportes Avanzados"
                                        active={activeSection === 'advanced-reports'}
                                        onClick={() => onSectionChange('advanced-reports')}
                                        isCollapsed={isCollapsed}
                                    />
                                </>
                            )}
                            {hasPermission('access_settings') && (
                                <SidebarItem
                                    icon={Zap}
                                    label="Monitor de API"
                                    active={activeSection === 'monitor'}
                                    onClick={() => onSectionChange('monitor')}
                                    isCollapsed={isCollapsed}
                                />
                            )}
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
                        </CollapsibleSection>
                    </div>
                </nav>

                <div className={cn("pt-4 border-t border-slate-50 dark:border-slate-800 space-y-1", isCollapsed && "mt-auto pt-2")}>
                    <button
                        onClick={() => onOpenHelp ? onOpenHelp('') : onSectionChange('help')}
                        title={isCollapsed ? "Centro de Ayuda" : undefined}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group",
                            isCollapsed && "justify-center px-0",
                            activeSection === 'help'
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20"
                                : "text-slate-400 dark:text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                        )}
                    >
                        <HelpCircle className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="font-semibold text-sm truncate">Centro de Ayuda</span>}
                    </button>
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
    onOpenHelp: (articleId: string) => void;
    onNewProcess?: () => void;
}

export function MainLayout({ children, activeSection, onSectionChange, onOpenHelp, onNewProcess }: MainLayoutProps) {
    const { user, signOut } = useAuth();
    const { hasPermission } = usePermissions();
    const { profile } = useProfile(user?.id);
    const { theme, toggleTheme } = useTheme();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const currentOrg = user?.available_organizations?.find((o: any) => o.id === user.organization_id);
    const activeRole = (currentOrg?.role || profile?.role || user?.role || 'viewer').toLowerCase();
    const isTurista = activeRole === 'turista';

    return (
        <div className="flex h-screen overflow-hidden bg-slate-200/40 dark:bg-[#02040a]">
            {!isTurista && (
                <Sidebar
                    activeSection={activeSection}
                    onSectionChange={onSectionChange}
                    onOpenHelp={onOpenHelp}
                    isCollapsed={isCollapsed}
                />
            )}
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white/80 dark:bg-[#080a14]/80 backdrop-blur-md px-4 md:px-8 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        {!isTurista && (
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 hidden lg:block"
                                title={isCollapsed ? "Expandir Menú" : "Contraer Menú"}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        )}
                        <div className="flex items-center gap-3">
                            <div>
                                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5 leading-none">
                                    {isTurista ? currentOrg?.name : 'Módulo Principal'}
                                </p>
                                <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize leading-none">
                                    {isTurista ? profile?.full_name : (
                                        activeSection === 'orgchart' ? 'Organigrama' :
                                            activeSection === 'workflows' ? 'Flujos de Trabajo' :
                                                activeSection === 'search' ? 'Mis Trámites' :
                                                    activeSection === 'kanban' ? 'Tablero Kanban' :
                                                        activeSection === 'workload' ? 'Mapa de Carga' :
                                                            activeSection === 'advanced-reports' ? 'Reportes Avanzados' :
                                                                activeSection === 'calendar' ? 'Calendario' :
                                                                    activeSection === 'users' ? 'Colaboradores' :
                                                                        activeSection === 'accounts' ? 'Cuentas de Sistema' :
                                                                            activeSection === 'monitor' ? 'Monitor de API' :
                                                                                activeSection === 'help' ? 'Centro de Ayuda' : // Added help display name
                                                                                    activeSection
                                    )}
                                </h2>
                            </div>
                        </div>

                        {/* Tourist Top Navigation */}
                        {isTurista && (
                            <nav className="flex items-center gap-2 ml-4">
                                <HeaderNavButton
                                    active={activeSection === 'dashboard'}
                                    onClick={() => onSectionChange('dashboard')}
                                    icon={LayoutDashboard}
                                    label="DashBoard"
                                    color="blue"
                                />
                                <HeaderNavButton
                                    active={activeSection === 'search'}
                                    onClick={() => onSectionChange('search')}
                                    icon={Search}
                                    label="Buscar"
                                    color="emerald"
                                />
                                <HeaderNavButton
                                    active={activeSection === 'calendar'}
                                    onClick={() => onSectionChange('calendar')}
                                    icon={Calendar}
                                    label="Calendario"
                                    color="indigo"
                                />
                                <HeaderNavButton
                                    active={activeSection === 'reports'}
                                    onClick={() => onSectionChange('reports')}
                                    icon={BarChart3}
                                    label="Reportes"
                                    color="emerald"
                                />
                                <HeaderNavButton
                                    active={activeSection === 'help'}
                                    onClick={() => onSectionChange('help')}
                                    icon={BookOpen}
                                    label="Ayuda"
                                    color="blue"
                                />
                            </nav>
                        )}

                        {/* Navigation Actions */}
                        {!isTurista && (
                            <div className="hidden md:flex items-center gap-2 ml-4 px-4 border-l border-slate-100 dark:border-slate-800">
                                {hasPermission('edit_workflows') && (
                                    <HeaderNavButton
                                        onClick={onNewProcess || (() => { })}
                                        icon={Plus}
                                        label="Nuevo"
                                        color="vibrant"
                                    />
                                )}
                                <HeaderNavButton
                                    active={activeSection === 'search'}
                                    onClick={() => onSectionChange('search')}
                                    icon={Search}
                                    label="Buscar"
                                    color="emerald"
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Help Quick Access */}
                        <button
                            onClick={() => onOpenHelp('')}
                            className="hidden md:flex p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95"
                            title="Centro de Ayuda"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>

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

                        <div className="relative">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-black shadow-lg shadow-blue-200 dark:shadow-blue-900/20 border-2 border-white dark:border-slate-800 relative group/avatar transition-transform active:scale-95"
                            >
                                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full" />
                            </button>

                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-[#0d111d] border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-2xl p-6 z-50 animate-in fade-in zoom-in duration-200">
                                        <div className="flex flex-col items-center text-center mb-6">
                                            <div className="w-16 h-16 rounded-[2rem] bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-2xl mb-4 border border-blue-100 dark:border-blue-800/50 overflow-hidden shadow-inner">
                                                {currentOrg?.logo_url ? (
                                                    <img src={currentOrg.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                                                ) : (
                                                    profile?.full_name?.[0]?.toUpperCase() || 'U'
                                                )}
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none mb-1">{profile?.full_name}</h3>
                                            <p className="text-xs text-slate-400 font-medium mb-4">{user?.email}</p>

                                            <div className="w-full flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest truncate w-full text-center">{currentOrg?.name}</span>
                                                </div>
                                                <div className="flex items-center justify-center">
                                                    <div className="h-px bg-slate-200 dark:bg-slate-700 w-12" />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest w-full text-center">{profile?.role || 'Viewer'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <button
                                                onClick={() => {
                                                    onSectionChange('accounts');
                                                    setShowProfileMenu(false);
                                                }}
                                                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all group/item border border-transparent hover:border-blue-100 dark:hover:border-blue-800/50 active:scale-95 shadow-sm hover:shadow-blue-200/10"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Fingerprint className="w-4 h-4 group-hover/item:rotate-12 transition-transform" />
                                                    Mi Perfil
                                                </div>
                                                <ChevronRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 translate-x-2 group-hover/item:translate-x-0 transition-all" />
                                            </button>
                                            <button
                                                onClick={signOut}
                                                className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all group/item border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 active:scale-95"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <LogOut className="w-4 h-4 group-hover/item:-translate-x-1 transition-transform" />
                                                    Cerrar Sesión
                                                </div>
                                                <ChevronRight className="w-3 h-3 opacity-0 group-hover/item:opacity-100 translate-x-2 group-hover/item:translate-x-0 transition-all" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>
                <div className={cn("p-5 transition-all duration-500", (profile?.role === 'viewer' || user?.role === 'viewer' || isTurista) && "p-2")}>
                    {children}
                </div>
            </main>
        </div>
    );
}
