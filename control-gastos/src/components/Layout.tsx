import React from 'react';
import { LayoutDashboard, PlusCircle, List, PieChart, Wallet, LogOut, User, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'transactions' | 'reports' | 'categories' | 'providers';
    onNavigate: (view: 'dashboard' | 'transactions' | 'reports' | 'categories' | 'providers') => void;
    onOpenAddModal: () => void;
}

export function Layout({ children, currentView, onNavigate, onOpenAddModal }: LayoutProps) {
    const { user, signOut } = useAuth();

    const navItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Resumen' },
        { id: 'transactions', icon: List, label: 'Movimientos' },
        { id: 'reports', icon: PieChart, label: 'Reportes' },
        { id: 'categories', icon: List, label: 'Categorías' },
        { id: 'providers', icon: Building2, label: 'Proveedores' },
    ] as const;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shadow-sm z-10">
                <div className="p-6 flex items-center gap-2 text-blue-600">
                    <Wallet className="w-8 h-8" />
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Mi Cartera</h1>
                </div>

                <div className="px-6 pb-2">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{user?.email?.split('@')[0]}</p>
                            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-2">
                    <button
                        onClick={onOpenAddModal}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <PlusCircle className="w-5 h-5" />
                        <span>Nuevo Movimiento</span>
                    </button>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={clsx(
                                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                                currentView === item.id
                                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 space-y-4 border-t border-slate-100">
                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-2 text-blue-600">
                    <Wallet className="w-6 h-6" />
                    <h1 className="text-lg font-bold text-slate-900">Mi Cartera</h1>
                </div>
                <button onClick={signOut} className="text-slate-400 hover:text-rose-600">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
                <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-20 pb-safe">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={clsx(
                            'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
                            currentView === item.id ? 'text-blue-600' : 'text-slate-400'
                        )}
                    >
                        <item.icon className={clsx("w-6 h-6", currentView === item.id && "fill-current/10")} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                ))}
                <button
                    onClick={onOpenAddModal}
                    className="flex flex-col items-center gap-1 p-2 text-blue-600"
                >
                    <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-200 -mt-8 border-4 border-slate-50">
                        <PlusCircle className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Nuevo</span>
                </button>
            </nav>
        </div>
    );
}
