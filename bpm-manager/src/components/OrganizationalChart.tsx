import { useState } from 'react';
import { useOrgChart } from '../hooks/useOrgChart';
import {
    Users,
    ChevronRight,
    ChevronDown,
    Plus,
    Trash2,
    DollarSign,
    Settings,
    Network,
    Briefcase,
    PlusCircle,
    Building2,
    Shield,
    UserCircle,
    UserPlus,
    Clock,
    X as CloseIcon,
    LayoutDashboard,
    RefreshCw,
    ZoomIn,
    ZoomOut,
    Maximize
} from 'lucide-react';
import { cn } from '../utils/cn';
import { GraphicalTreeView } from './OrgChartTree';
import type { DepartmentWithChildren } from '../types';

interface OrganizationalChartProps {
    organizationId: string;
}

export function OrganizationalChart({ organizationId }: OrganizationalChartProps) {
    const {
        tree,
        departments,
        positions,
        availableCollaborators,
        loading,
        saveDepartment,
        deleteDepartment,
        savePosition,
        deletePosition,
        assignEmployee,
        removeEmployee,
        reload
    } = useOrgChart(organizationId);

    const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
    const [isAddingDept, setIsAddingDept] = useState<{ parentId: string | null }>({ parentId: null });
    const [newDeptName, setNewDeptName] = useState('');
    const [assigningToPosition, setAssigningToPosition] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'graphical'>('graphical');
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const selectedDept = departments.find(d => d.id === selectedDeptId);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-110px)] gap-4 animate-in fade-in duration-500">
            {/* Tree View / Graphical View */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 overflow-hidden flex flex-col shadow-sm relative">


                <div className="flex-1 overflow-auto custom-scrollbar pr-2 h-full">
                    {viewMode === 'list' ? (
                        <div className="space-y-4 pt-4">
                            {tree.map(dept => (
                                <DeptNode
                                    key={dept.id}
                                    dept={dept}
                                    onSelect={setSelectedDeptId}
                                    selectedId={selectedDeptId}
                                    onAddChild={(parentId: string) => setIsAddingDept({ parentId })}
                                />
                            ))}
                        </div>
                    ) : (
                        <GraphicalTreeView
                            tree={tree}
                            onSelect={setSelectedDeptId}
                            selectedId={selectedDeptId}
                            onAddChild={(parentId: string) => setIsAddingDept({ parentId })}
                            zoom={zoom}
                            setZoom={setZoom}
                            offset={offset}
                            setOffset={setOffset}
                        />
                    )}
                </div>

                {/* Floating Unified Action Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50">
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('graphical')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                                viewMode === 'graphical' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <Network className="w-3.5 h-3.5" />
                            Árbol
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                                viewMode === 'list' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            Lista
                        </button>
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />

                    <button
                        onClick={() => (reload as any)(true)}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-xl transition-all"
                        title="Refrescar Carga"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>

                    {departments.length === 0 && (
                        <>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                            <button
                                onClick={() => saveDepartment({ name: 'Dirección General' })}
                                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                                title="Crear Nodo Raíz"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}

                    {viewMode === 'graphical' && (
                        <>
                            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                            <div className="flex items-center gap-1">
                                <button onClick={() => setZoom(z => Math.min(z * 1.2, 2))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><ZoomIn className="w-3.5 h-3.5" /></button>
                                <span className="text-[9px] font-black w-8 text-center text-slate-400">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.4))} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><ZoomOut className="w-3.5 h-3.5" /></button>
                                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
                                <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 rounded-lg transition-all" title="Centrar"><Maximize className="w-3.5 h-3.5" /></button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Rules and Details Panel */}
            <div className="w-[320px] bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto shadow-sm custom-scrollbar">
                {selectedDept ? (
                    <>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
                                    <Building2 className="w-4 h-4 text-white" />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-black text-slate-400 dark:text-slate-500 leading-tight uppercase text-[9px] tracking-widest truncate">Área Seleccionada</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-base font-bold text-blue-600 dark:text-blue-400 truncate max-w-[150px]">{selectedDept.name}</p>
                                        {positions.filter(p => p.department_id === selectedDept.id).reduce((acc, p) => acc + ((p as any).workload_count || 0), 0) > 0 && (
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-black rounded-lg">
                                                {positions.filter(p => p.department_id === selectedDept.id).reduce((acc, p) => acc + ((p as any).workload_count || 0), 0)} PENDIENTES
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm('¿Seguro que quieres eliminar esta área y todas sus subáreas?')) {
                                        deleteDepartment(selectedDept.id);
                                        setSelectedDeptId(null);
                                    }
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Cargos y Equipo */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Briefcase className="w-3 h-3" />
                                    Cargos y Equipo
                                </h4>
                                <button
                                    onClick={() => {
                                        const title = prompt('Nombre del cargo:');
                                        if (title) savePosition({ title, department_id: selectedDept.id });
                                    }}
                                    className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-all shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                {positions.filter(p => p.department_id === selectedDept.id).map(pos => (
                                    <div key={pos.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 group transition-all space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                                                    <Shield className="w-4 h-4 text-blue-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{pos.title}</span>
                                                    {(pos as any).workload_count > 0 && (
                                                        <span className="text-[8px] font-black text-blue-500 uppercase">{(pos as any).workload_count} trámites</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(pos as any).workload_count > 0 && (
                                                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[9px] font-black rounded-md border border-blue-200 dark:border-blue-800">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {(pos as any).workload_count}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => setAssigningToPosition(pos.id)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-all"
                                                >
                                                    <UserPlus className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm('¿Eliminar cargo?')) deletePosition(pos.id) }}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {assigningToPosition === pos.id && (
                                            <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-blue-800 animate-in zoom-in-95">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Asignar Colaborador</span>
                                                    <button onClick={() => setAssigningToPosition(null)}><CloseIcon className="w-3 h-3" /></button>
                                                </div>
                                                <select
                                                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold outline-none"
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            assignEmployee(e.target.value, pos.id);
                                                            setAssigningToPosition(null);
                                                        }
                                                    }}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Selecciona...</option>
                                                    {availableCollaborators.map(c => (
                                                        <option key={c.id} value={c.id}>{c.full_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="space-y-1.5">
                                            {(pos as any).employees?.length > 0 ? (
                                                (pos as any).employees.map((emp: any) => (
                                                    <div key={emp.user_id} className="flex items-center group/emp gap-2 bg-white dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                                        <UserCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">{emp.user_name}</p>
                                                        </div>
                                                        {emp.workload_count > 0 && (
                                                            <div className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-full shadow-sm">
                                                                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300">{emp.workload_count}</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => removeEmployee(emp.user_id, pos.id)}
                                                            className="opacity-0 group-hover/emp:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-all"
                                                        >
                                                            <Trash2 className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-[8px] text-slate-400 italic pl-1">Sin personal asignado</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reglas de Reparto */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <DollarSign className="w-3 h-3" />
                                Reglas de Reparto
                            </h4>

                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Porcentaje (%)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={selectedDept.allocation_percentage || 0}
                                            onChange={(e) => saveDepartment({ ...selectedDept, allocation_percentage: parseFloat(e.target.value) })}
                                            className="w-full pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                        JSON Personalizado
                                        <span className="text-[7px] text-blue-500 lowercase font-medium text-slate-900 dark:text-white">Opcional</span>
                                    </label>
                                    <textarea
                                        value={selectedDept.allocation_rules || ''}
                                        onChange={(e) => saveDepartment({ ...selectedDept, allocation_rules: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-[10px] h-20 resize-none"
                                        placeholder='{ "meta": 500 }'
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-3xl flex items-center justify-center mb-4 text-slate-900 dark:text-white">
                            <Settings className="w-8 h-8 text-blue-300 dark:text-blue-800 animate-pulse" />
                        </div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Detalles del Área</h4>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">Selecciona un nodo del organigrama para configurar sus reglas de monetización y gestionar sus cargos.</p>
                    </div>
                )}
            </div>

            {/* Modal para añadir área */}
            {isAddingDept.parentId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-96 shadow-2xl scale-in-center animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Nueva Sub-área</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 font-bold">Nombre del Departamento</label>
                                <input
                                    autoFocus
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newDeptName) {
                                            saveDepartment({ name: newDeptName, parent_department_id: isAddingDept.parentId || undefined });
                                            setIsAddingDept({ parentId: null });
                                            setNewDeptName('');
                                        }
                                        if (e.key === 'Escape') {
                                            setIsAddingDept({ parentId: null });
                                            setNewDeptName('');
                                        }
                                    }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 dark:text-white"
                                    placeholder="Ej: Marketing, Ventas..."
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => {
                                    setIsAddingDept({ parentId: null });
                                    setNewDeptName('');
                                }}
                                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    if (newDeptName) {
                                        saveDepartment({ name: newDeptName, parent_department_id: isAddingDept.parentId || undefined });
                                        setIsAddingDept({ parentId: null });
                                        setNewDeptName('');
                                    }
                                }}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none"
                            >
                                Crear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DeptNode({ dept, onSelect, selectedId, onAddChild, level = 0 }: {
    dept: DepartmentWithChildren,
    onSelect: (id: string) => void,
    selectedId: string | null,
    onAddChild: (id: string) => void,
    level?: number
}) {
    const isSelected = selectedId === dept.id;
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="relative">
            <div className="flex items-center group relative py-1">
                {level > 0 && (
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-[2px] bg-slate-200 dark:bg-slate-700" />
                )}
                <div className="flex items-center gap-1 z-10">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className={cn(
                            "p-1 rounded-md transition-all text-slate-900 dark:text-white bg-white dark:bg-slate-900",
                            dept.children && dept.children.length > 0 ? "visible" : "invisible"
                        )}
                    >
                        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    <div
                        onClick={() => onSelect(dept.id)}
                        className={cn(
                            "w-[285px] flex items-center justify-between px-3 py-2 rounded-xl border transition-all cursor-pointer",
                            isSelected
                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                                : "bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-900"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                isSelected ? "bg-white/20" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            )}>
                                <Users className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="font-bold text-[11px] block truncate">{dept.name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={cn(
                                        "text-[8px] font-black uppercase tracking-tight px-1.5 py-0 rounded-md whitespace-nowrap",
                                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                                    )}>
                                        {dept.positions?.length || 0} Cargos
                                    </span>
                                    {(dept.allocation_percentage !== undefined && dept.allocation_percentage !== null && dept.allocation_percentage > 0) ? (
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-tight px-1.5 py-0 rounded-md flex items-center gap-0.5 whitespace-nowrap",
                                            isSelected ? "bg-emerald-400 text-white" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                        )}>
                                            <DollarSign className="w-2 h-2" />
                                            {dept.allocation_percentage}% Reparto
                                        </span>
                                    ) : null}
                                    {((dept as any).workload_count > 0) && (
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-tight px-1.5 py-0 rounded-md flex items-center gap-0.5 whitespace-nowrap",
                                            isSelected ? "bg-blue-400 text-white" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                        )}>
                                            <Clock className="w-2 h-2" />
                                            {(dept as any).workload_count} Carga
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddChild(dept.id);
                            }}
                            className={cn(
                                "p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                                isSelected ? "bg-white/20 hover:bg-white/30" : "bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600"
                            )}
                        >
                            <PlusCircle className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && dept.children && dept.children.length > 0 && (
                <div className="ml-[1.25rem] border-l-2 border-slate-200 dark:border-slate-800 pl-6 space-y-2 py-1 mt-1">
                    {dept.children.map(child => (
                        <DeptNode
                            key={child.id}
                            dept={child}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            onAddChild={onAddChild}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
