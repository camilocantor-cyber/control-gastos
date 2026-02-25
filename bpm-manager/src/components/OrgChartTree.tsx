import React, { useState } from 'react';
import { Building2, Users, MoreVertical, BarChart2, AlertTriangle, Zap, DollarSign, Clock, PlusCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import type { DepartmentWithChildren } from '../types';
import { useOrgChartAnalytics } from '../hooks/useOrgChartAnalytics';
import type { DepartmentHealth } from '../hooks/useOrgChartAnalytics';
import { StartProcessModal } from './StartProcessModal';

interface TreeNodeProps {
    dept: DepartmentWithChildren;
    onSelect: (id: string) => void;
    selectedId: string | null;
    healthMap: Record<string, DepartmentHealth>;
    onStartProcess: (deptId: string) => void;
    onAddChild: (parentId: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ dept, onSelect, selectedId, healthMap, onStartProcess, onAddChild }) => {
    const isSelected = selectedId === dept.id;
    const hasChildren = dept.children && dept.children.length > 0;
    const [showActions, setShowActions] = useState(false);
    const health = healthMap[dept.id];

    return (
        <div className="flex flex-col items-center">
            {/* The Box - Compact and Interactive */}
            <div
                onClick={() => onSelect(dept.id)}
                className={cn(
                    "relative z-10 p-2.5 rounded-xl border-2 transition-all cursor-pointer min-w-[130px] max-w-[170px] shadow-sm select-none group",
                    isSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 dark:shadow-none scale-105"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-900"
                )}
            >
                {/* Health Indicators - floating */}
                {(health && (health.activeTasks > 0 || health.overdueTasks > 0)) && (
                    <div className="absolute -top-2 -right-2 flex gap-1 z-20">
                        {health.overdueTasks > 0 && (
                            <div className="w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg animate-pulse" title={`${health.overdueTasks} tareas vencidas`}>
                                <AlertTriangle className="w-3 h-3" />
                            </div>
                        )}
                        {health.activeTasks > 0 && (
                            <div className="bg-blue-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-white" title={`${health.activeTasks} tareas activas`}>
                                {health.activeTasks}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                        isSelected ? "bg-white/20" : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    )}>
                        <Building2 className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <span className="font-black text-[10px] block truncate leading-tight uppercase tracking-tight">{dept.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-md",
                                isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                            )}>
                                {dept.positions?.length || 0} Cargos
                            </span>
                            {health?.activeTasks > 0 && (
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-md flex items-center gap-0.5",
                                    isSelected ? "bg-blue-400 text-white" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                )}>
                                    <Clock className="w-2 h-2" />
                                    {health.activeTasks} Carga
                                </span>
                            )}
                            {dept.allocation_percentage ? (
                                <span className={cn(
                                    "text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded-md flex items-center gap-0.5",
                                    isSelected ? "bg-emerald-400 text-white" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                )}>
                                    <DollarSign className="w-2 h-2" />
                                    {dept.allocation_percentage}%
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {/* Quick Actions Trigger */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
                        className={cn(
                            "p-1 rounded-lg transition-all opacity-0 group-hover:opacity-100 text-slate-400",
                            isSelected ? "hover:bg-white/20 !text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                    >
                        <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Quick Actions Dropdown */}
                {showActions && (
                    <div className="absolute top-full right-0 mt-2 w-42 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                        <button
                            onClick={(e) => { e.stopPropagation(); onStartProcess(dept.id); setShowActions(false); }}
                            className="w-full px-3 py-2.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/40 flex items-center gap-2.5 transition-colors border-b border-slate-100 dark:border-slate-800"
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            INICIAR TRÁMITE
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onAddChild(dept.id); setShowActions(false); }}
                            className="w-full px-3 py-2.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 flex items-center gap-2.5 transition-colors border-b border-slate-100 dark:border-slate-800"
                        >
                            <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                            AÑADIR SUB-ÁREA
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
                            className="w-full px-3 py-2.5 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                        >
                            <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
                            VER REPORTE
                        </button>
                    </div>
                )}
            </div>

            {hasChildren && (
                <div className="flex flex-col items-center w-full">
                    {/* Vertical Trunk */}
                    <div className="w-0.5 h-6 bg-slate-400 dark:bg-slate-600" />

                    {/* The Rail and Branches */}
                    <div className="flex items-start">
                        {dept.children!.map((child, index) => {
                            const isFirst = index === 0;
                            const isLast = index === dept.children!.length - 1;
                            const isOnly = dept.children!.length === 1;

                            return (
                                <div key={child.id} className="flex flex-col items-center relative">
                                    {/* Horizontal Rail Segment */}
                                    {!isOnly && (
                                        <div className={cn(
                                            "absolute top-0 h-0.5 bg-slate-400 dark:bg-slate-600",
                                            isFirst ? "left-1/2 right-0" : isLast ? "left-0 right-1/2" : "left-0 right-0"
                                        )} />
                                    )}

                                    <div className="w-0.5 h-6 bg-slate-400 dark:bg-slate-600" />

                                    <div className="px-6">
                                        <TreeNode
                                            dept={child}
                                            onSelect={onSelect}
                                            onStartProcess={onStartProcess}
                                            onAddChild={onAddChild}
                                            selectedId={selectedId}
                                            healthMap={healthMap}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
export const GraphicalTreeView: React.FC<{
    tree: DepartmentWithChildren[];
    onSelect: (id: string) => void;
    selectedId: string | null;
    onAddChild: (parentId: string) => void;
    zoom: number;
    setZoom: React.Dispatch<React.SetStateAction<number>>;
    offset: { x: number; y: number };
    setOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}> = ({ tree, onSelect, selectedId, onAddChild, zoom, setZoom, offset, setOffset }) => {

    const [isPanning, setIsPanning] = React.useState(false);
    const [lastMousePos, setLastMousePos] = React.useState({ x: 0, y: 0 });
    const { healthMap } = useOrgChartAnalytics();
    const [startingProcessDept, setStartingProcessDept] = React.useState<string | null>(null);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY;
            const scaleFactor = 1.1;
            const newZoom = delta > 0 ? zoom * scaleFactor : zoom / scaleFactor;
            setZoom(Math.min(Math.max(newZoom, 0.4), 2));
        } else {
            setOffset(prev => ({
                x: prev.x - e.deltaX,
                y: prev.y - e.deltaY
            }));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 0 || e.button === 1) { // Left or middle click
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    return (
        <div
            className={cn(
                "w-full h-full relative overflow-hidden bg-slate-50/50 dark:bg-black/20 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 select-none",
                isPanning ? "cursor-grabbing" : "cursor-grab"
            )}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
        >
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#1e293b_0.5px,transparent_0.5px)] opacity-40 pointer-events-none"
                style={{
                    backgroundPosition: `${offset.x}px ${offset.y}px`,
                    backgroundSize: `${20 * zoom}px ${20 * zoom}px`
                }}
            />

            {/* Tree Content */}
            <div
                className="absolute transition-transform duration-75 ease-out origin-center flex justify-center items-start pt-10"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    left: '50%',
                    marginLeft: '-5000px', // Large width to allow centering
                    width: '10000px'
                }}
            >
                <div className="flex flex-col items-center">
                    {tree.map(root => (
                        <TreeNode
                            key={root.id}
                            dept={root}
                            onSelect={onSelect}
                            selectedId={selectedId}
                            healthMap={healthMap}
                            onStartProcess={(id) => setStartingProcessDept(id)}
                            onAddChild={onAddChild}
                        />
                    ))}
                    {tree.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-20 text-center opacity-50">
                            <Users className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay departamentos</p>
                        </div>
                    )}
                </div>
            </div>



            {/* Start Process Modal */}
            {startingProcessDept && (
                <StartProcessModal
                    onClose={() => setStartingProcessDept(null)}
                    onStarted={() => {
                        setStartingProcessDept(null);
                    }}
                />
            )}
        </div>
    );
};
