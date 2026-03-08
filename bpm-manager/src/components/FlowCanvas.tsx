import React, { useState, useRef } from 'react';
import { Play, Square, GitBranch, Clock, CheckCircle2, Zap, Code, X, GitMerge, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import type { Activity, Transition } from '../types';

interface FlowCanvasProps {
    activities: Activity[];
    transitions: Transition[];
    zoom: number;
    setZoom: (zoom: number) => void;
    offset: { x: number, y: number };
    setOffset: (offset: { x: number, y: number }) => void;
    onNodeClick?: (id: string, isDoubleClick: boolean) => void;
    onNodeDrag?: (id: string, x: number, y: number) => void;
    onNodeDragEnd?: (id: string, x: number, y: number) => void;
    onCanvasClick?: () => void;
    onAddTransition?: (sourceId: string, targetId: string) => void;
    onDrop?: (type: string, x: number, y: number) => void;
    onDelete?: (id: string) => void;
    isReadOnly?: boolean;
    executionState?: {
        executedActivityIds: Set<string>;
        currentActivityId: string | null;
        status: 'active' | 'completed';
    };
    connectionSourceId?: string | null;
    selectedActivityId?: string | null;
    selectedTransitionId?: string | null;
    gridSize?: number;
}

const GRID_SIZE = 20;

export function FlowCanvas({
    activities: activitiesRaw,
    transitions: transitionsRaw,
    zoom,
    setZoom,
    offset,
    setOffset,
    onNodeClick,
    onNodeDrag,
    onNodeDragEnd,
    onCanvasClick,
    onAddTransition,
    onDrop,
    onDelete,
    isReadOnly = false,
    executionState,
    connectionSourceId,
    selectedActivityId,
    selectedTransitionId,
    gridSize = GRID_SIZE
}: FlowCanvasProps) {
    // Safety guards: ensure we always have arrays, never undefined/null
    const activities = Array.isArray(activitiesRaw) ? activitiesRaw : [];
    const transitions = Array.isArray(transitionsRaw) ? transitionsRaw : [];
    const [isPanning, setIsPanning] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    // Node Dragging State (Internal for smooth dragging)
    const [internalDraggingNodeId, setInternalDraggingNodeId] = useState<string | null>(null);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY;
            const scaleFactor = 1.1;
            const newZoom = delta > 0 ? zoom * scaleFactor : zoom / scaleFactor;
            const limitedZoom = Math.min(Math.max(newZoom, 0.2), 3);
            setZoom(limitedZoom);
        } else {
            setOffset({
                x: offset.x - e.deltaX,
                y: offset.y - e.deltaY
            });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const isBackground = e.target === e.currentTarget || (typeof target.className === 'string' && target.className.includes('bg-[radial-gradient'));

        if (e.button === 1 || e.button === 2 || (e.button === 0 && isBackground)) {
            setIsPanning(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
            if (onCanvasClick) onCanvasClick();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (internalDraggingNodeId && !isReadOnly) {
            const dx = (e.clientX - dragStartPos.x) / zoom;
            const dy = (e.clientY - dragStartPos.y) / zoom;

            const activity = activities.find(a => a.id === internalDraggingNodeId);
            if (activity) {
                const snappedX = Math.round((activity.x_pos + dx) / gridSize) * gridSize;
                const snappedY = Math.round((activity.y_pos + dy) / gridSize) * gridSize;

                if (onNodeDrag) {
                    onNodeDrag(internalDraggingNodeId, snappedX, snappedY);
                }
                setDragStartPos({ x: e.clientX, y: e.clientY });
            }
        } else if (isPanning) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setOffset({ x: offset.x + dx, y: offset.y + dy });
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    const handleMouseUp = () => {
        if (internalDraggingNodeId && onNodeDragEnd) {
            const activity = activities.find(a => a.id === internalDraggingNodeId);
            if (activity) {
                onNodeDragEnd(internalDraggingNodeId, activity.x_pos, activity.y_pos);
            }
        }
        setIsPanning(false);
        setInternalDraggingNodeId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isReadOnly) e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        if (isReadOnly || !onDrop) return;
        e.preventDefault();
        const type = e.dataTransfer.getData('activityType');
        if (!type) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const x = (e.clientX - rect.left - offset.x) / zoom;
            const y = (e.clientY - rect.top - offset.y) / zoom;
            const snappedX = Math.round(x / gridSize) * gridSize;
            const snappedY = Math.round(y / gridSize) * gridSize;
            onDrop(type, snappedX, snappedY);
        }
    };

    return (
        <div
            ref={canvasRef}
            className={cn(
                "flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors",
                isPanning ? "cursor-grabbing" : internalDraggingNodeId ? "cursor-grabbing" : "cursor-grab"
            )}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Grid Background */}
            <div
                className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40 pointer-events-none transition-all duration-300"
                style={{
                    backgroundPosition: `${offset.x}px ${offset.y}px`,
                    backgroundSize: `${gridSize * 2 * zoom}px ${gridSize * 2 * zoom}px`
                }}
            />

            {/* Content Container */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: '0 0'
                }}
            >
                {/* Transitions (Connections) */}
                <svg className="absolute inset-0 w-[5000px] h-[5000px] overflow-visible">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                        </marker>
                        <marker id="arrowhead-executed" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                    </defs>
                    {transitions.map((transition) => {
                        const source = activities.find(a => a.id === transition.source_id);
                        const target = activities.find(a => a.id === transition.target_id);
                        if (!source || !target) return null;

                        const isExecuted = executionState?.executedActivityIds.has(source.id) &&
                            (executionState?.executedActivityIds.has(target.id) || executionState?.currentActivityId === target.id);

                        return (
                            <TransitionArrow
                                key={transition.id}
                                transition={transition}
                                source={source}
                                target={target}
                                isExecuted={isExecuted}
                                isSelected={selectedTransitionId === transition.id}
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    if (onCanvasClick) onCanvasClick(); // Clear other selections if needed
                                    // Normally parent handles this via onNodeClick but transitions are separate?
                                    // I'll add onTransitionClick to props if needed.
                                }}
                            />
                        );
                    })}
                </svg>

                {/* Activities (Nodes) */}
                {activities.map((activity) => {
                    let status: 'executed' | 'current' | 'pending' = 'pending';
                    if (executionState) {
                        const isExecuted = executionState.executedActivityIds.has(activity.id);
                        const isCurrent = executionState.currentActivityId === activity.id;
                        status = isCurrent ? 'current' : (isExecuted ? 'executed' : 'pending');
                    }

                    const outgoing = transitions.filter(t => t.source_id === activity.id).length;

                    return (
                        <FlowNode
                            key={activity.id}
                            activity={activity}
                            status={status}
                            isReadOnly={isReadOnly}
                            isSelected={selectedActivityId === activity.id}
                            isConnectionSource={connectionSourceId === activity.id}
                            isDragging={internalDraggingNodeId === activity.id}
                            onMouseDown={(e: React.MouseEvent) => {
                                if (isReadOnly) return;
                                e.stopPropagation();
                                if (e.button === 0 && !connectionSourceId) {
                                    setInternalDraggingNodeId(activity.id);
                                    setDragStartPos({ x: e.clientX, y: e.clientY });
                                }
                            }}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (connectionSourceId && onAddTransition) {
                                    onAddTransition(connectionSourceId, activity.id);
                                } else if (onNodeClick) {
                                    onNodeClick(activity.id, false);
                                }
                            }}
                            onDoubleClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (onNodeClick) onNodeClick(activity.id, true);
                            }}
                            zoom={zoom}
                            outgoingTransitions={outgoing}
                            onDelete={!isReadOnly ? onDelete : undefined}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function FlowNode({ activity, status, isSelected, isConnectionSource, isDragging, onMouseDown, onClick, onDoubleClick, zoom, outgoingTransitions, onDelete }: any) {
    const icons = {
        start: Play,
        task: Square,
        decision: AlertCircle,
        subprocess: GitBranch,
        wait: Clock,
        sync: GitMerge,
        end: Square,
    };
    const Icon = (icons as any)[activity.type] || Square;

    const colors = {
        start: isSelected ? 'bg-emerald-600' : 'bg-emerald-500',
        task: isSelected ? 'bg-blue-600' : 'bg-blue-500',
        decision: isSelected ? 'bg-orange-800' : 'bg-orange-700',
        subprocess: isSelected ? 'bg-purple-800' : 'bg-purple-700',
        wait: isSelected ? 'bg-amber-800' : 'bg-amber-700',
        sync: isSelected ? 'bg-violet-800' : 'bg-violet-700',
        end: isSelected ? 'bg-rose-600' : 'bg-rose-500',
    };

    return (
        <div
            onMouseDown={onMouseDown}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            style={{
                left: activity.x_pos,
                top: activity.y_pos,
            }}
            className={cn(
                "absolute pointer-events-auto select-none group/node",
                isDragging ? "opacity-40 grayscale scale-105 z-50 cursor-grabbing" : "transition-all duration-300 z-30 hover:scale-105 cursor-grab",
                isSelected && "z-40"
            )}
        >
            {/* Delete Button — visible only when selected and not read-only */}
            {isSelected && onDelete && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(activity.id); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="absolute -top-2.5 -right-2.5 z-50 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 transition-all active:scale-90"
                    title="Eliminar actividad (o presiona Supr)"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
            <div className={cn(
                "w-52 p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border-2 shadow-xl transition-all duration-500 relative ring-4",
                isSelected
                    ? "border-blue-600 shadow-blue-500/20 ring-blue-500/10 translate-y-[-2px]"
                    : "border-slate-100 dark:border-slate-800 shadow-slate-900/5 ring-transparent hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-blue-500/5",
                status === 'current' && "border-emerald-500 shadow-emerald-500/20 ring-emerald-500/10",
                isConnectionSource && "border-blue-600 ring-blue-500/20 animate-pulse"
            )}>
                {/* Information Tooltip */}
                <div
                    style={{
                        transform: `translateX(-50%) scale(${1 / zoom})`,
                        transformOrigin: 'bottom center'
                    }}
                    className="absolute bottom-[calc(100%+10px)] left-1/2 w-48 bg-slate-900/98 dark:bg-slate-950/98 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-2xl opacity-0 group-hover/node:opacity-100 group-hover/node:translate-y-[-4px] pointer-events-none transition-all duration-300 z-50"
                >
                    <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                        <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-white",
                            (colors as any)[activity.type]
                        )}>
                            <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h5 className="text-[9px] font-black text-white uppercase tracking-tight truncate">{activity.name || 'Sin nombre'}</h5>
                            <p className="text-[7px] font-bold text-blue-400 uppercase opacity-70">{activity.type}</p>
                        </div>
                    </div>
                    {activity.description && (
                        <p className="text-[8px] text-slate-400 leading-tight mb-2 line-clamp-2 italic">"{activity.description}"</p>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-1 text-blue-400">
                            <Code className="w-2.5 h-2.5" />
                            <span className="text-[8px] font-bold">{(activity.fields || []).length}</span>
                        </div>
                        <div className="flex items-center gap-1 text-orange-400">
                            <Clock className="w-2.5 h-2.5" />
                            <span className="text-[8px] font-bold">{activity.due_date_hours || 24}h</span>
                        </div>
                        <div className="flex items-center gap-1 text-emerald-400">
                            <GitBranch className="w-2.5 h-2.5" />
                            <span className="text-[8px] font-bold">{outgoingTransitions}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-transform duration-500 group-hover:scale-110",
                        (colors as any)[activity.type] || 'bg-slate-500',
                        status === 'executed' && 'bg-slate-500'
                    )}>
                        <Icon className="w-4 h-4 fill-current" />
                    </div>
                    <div className="flex-1 min-w-0 font-black">
                        <h4 className="text-xs text-slate-800 dark:text-white truncate tracking-tight uppercase leading-none">{activity.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                            {status === 'current' ? (
                                <span className="text-[7px] text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    Activo
                                </span>
                            ) : status === 'executed' ? (
                                <span className="text-[7px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle2 className="w-2 h-2" />
                                    Completado
                                </span>
                            ) : (
                                <span className="text-[7px] text-slate-300 dark:text-slate-600 uppercase tracking-widest">Pendiente</span>
                            )}
                        </div>
                    </div>
                </div>

                {activity.action_type === 'finance' && !isDragging && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-1 rounded-lg shadow-lg border-2 border-white dark:border-slate-900 animate-bounce cursor-help">
                        <Zap className="w-2.5 h-2.5" />
                    </div>
                )}
            </div>
        </div>
    );
}

function TransitionArrow({ transition, source, target, isExecuted, isSelected, onClick }: any) {
    // Better calculation for connection points
    const sourceX = source.x_pos + 104;
    const sourceY = source.y_pos + 36;
    const targetX = target.x_pos + 104;
    const targetY = target.y_pos + 36;

    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let startX = sourceX, startY = sourceY, endX = targetX, endY = targetY;

    // Exit points based on direction
    if (absDx > absDy) {
        startX = sourceX + (dx > 0 ? 104 : -104);
        endX = targetX - (dx > 0 ? 110 : -110);
    } else {
        startY = sourceY + (dy > 0 ? 36 : -36);
        endY = targetY - (dy > 0 ? 42 : -42);
    }

    const midX = startX + (endX - startX) / 2;
    const pathData = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;

    const color = isSelected ? "#3b82f6" : (isExecuted ? "#475569" : (document.documentElement.classList.contains('dark') ? "#334155" : "#cbd5e1"));

    return (
        <g onClick={onClick} className="cursor-pointer">
            <path
                d={pathData}
                stroke={color}
                strokeWidth={isSelected ? "4" : (isExecuted ? "3" : "2")}
                fill="none"
                markerEnd={isSelected ? "url(#arrowhead-active)" : (isExecuted ? "url(#arrowhead-executed)" : "url(#arrowhead)")}
                className="transition-all duration-300 pointer-events-auto"
            />
            {transition.condition && (
                <g transform={`translate(${midX}, ${(startY + endY) / 2})`}>
                    <rect x="-35" y="-9" width="70" height="18" rx="9" fill="white" className="dark:fill-slate-900" stroke={color} strokeWidth="1" />
                    <text textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="900" fill={color} className="uppercase tracking-tighter">
                        {transition.condition}
                    </text>
                </g>
            )}
        </g>
    );
}
