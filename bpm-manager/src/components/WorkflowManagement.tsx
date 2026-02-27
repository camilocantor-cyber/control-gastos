import { useState, useEffect } from 'react';
import type { Workflow } from '../types';
import { useWorkflows } from '../hooks/useWorkflows';
import { useAuth } from '../hooks/useAuth';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { GitBranch, Plus, Search, Trash2, Play, GitMerge, Users, Activity, X, MoreVertical, LayoutGrid, List } from 'lucide-react';

export function WorkflowList({ onSelectWorkflow, openForm, onFormClose }: {
    onSelectWorkflow: (workflow: Workflow) => void,
    openForm?: boolean,
    onFormClose?: () => void
}) {
    const { user } = useAuth();
    const { workflows, loading: workflowsLoading, createWorkflow, updateWorkflow, deleteWorkflow, duplicateWorkflow } = useWorkflows();
    const { workflows: countWorkflows, activities, transitions, users, loading: statsLoading } = useDashboardStats();
    const [isFormOpen, setIsFormOpen] = useState(openForm || false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    // Update internal state when prop changes
    useEffect(() => {
        if (openForm) setIsFormOpen(true);
    }, [openForm]);

    const handleClose = () => {
        setIsFormOpen(false);
        setEditingWorkflow(undefined);
        onFormClose?.();
    };

    const filteredWorkflows = workflows.filter(w =>
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSave = async (data: Partial<Workflow>) => {
        try {
            if (editingWorkflow) {
                const { error } = await updateWorkflow(editingWorkflow.id, data);
                if (error) {
                    console.error('Error in handleSave (update):', error);
                    alert('Error al actualizar: ' + error);
                }
            } else {
                if (!user || !user.organization_id) {
                    console.error('No authenticated user or organization found!');
                    alert('Error: Sesión incompleta. Refresca la página.');
                    return;
                }

                console.log('Creating workflow with user:', user.id, 'org:', user.organization_id);
                const { error } = await createWorkflow({
                    ...data,
                    created_by: user.id,
                    organization_id: user.organization_id
                });

                if (error) {
                    console.error('Error in handleSave (create):', error);
                    alert('Error al crear: ' + error);
                }
            }
            handleClose();
        } catch (err: any) {
            console.error('Unexpected error in handleSave:', err);
            alert('Error inesperado: ' + (err.message || err));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este flujo?')) {
            await deleteWorkflow(id);
        }
    };

    const handleDuplicate = async (id: string) => {
        if (confirm('¿Deseas crear una nueva versión de este flujo? Se copiarán todas las actividades y configuraciones.')) {
            const { error } = await duplicateWorkflow(id);
            if (error) alert('Error al versionar: ' + error);
        }
    };

    if ((workflowsLoading || statsLoading) && workflows.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Resumen Estructural */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MiniStat icon={GitBranch} label="Flujos Totales" value={countWorkflows} color="blue" />
                <MiniStat icon={Activity} label="Actividades" value={activities} color="emerald" />
                <MiniStat icon={GitMerge} label="Transiciones" value={transitions} color="orange" />
                <MiniStat icon={Users} label="Colaboradores" value={users} color="purple" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar flujos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white dark:bg-slate-900 shadow-sm text-xs font-medium"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Cuadrícula"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Vista Detalle"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setEditingWorkflow(undefined);
                            setIsFormOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Nuevo Flujo
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWorkflows.map((workflow) => (
                        <WorkflowCard
                            key={workflow.id}
                            workflow={workflow}
                            onEdit={() => {
                                setEditingWorkflow(workflow);
                                setIsFormOpen(true);
                            }}
                            onDelete={() => handleDelete(workflow.id)}
                            onDuplicate={() => handleDuplicate(workflow.id)}
                            onSelect={() => onSelectWorkflow(workflow)}
                        />
                    ))}
                    {filteredWorkflows.length === 0 && (
                        <div className="col-span-full py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 transition-colors">
                            <GitBranch className="w-12 h-12 mb-4 opacity-20" />
                            <p>No se encontraron flujos</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nombre del Proceso</th>
                                    <th className="px-5 py-3 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clave</th>
                                    <th className="px-5 py-3 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Estado</th>
                                    <th className="px-5 py-3 text-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Versión</th>
                                    <th className="px-5 py-3 text-right text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredWorkflows.map((workflow) => (
                                    <tr key={workflow.id} onClick={() => onSelectWorkflow(workflow)} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-50 dark:border-slate-800 cursor-pointer">
                                        <td className="px-5 py-2">
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors leading-tight mb-0.5">{workflow.name}</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-xs">{workflow.description || 'Sin descripción'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                                                    {workflow.id.split('-')[0]}
                                                </span>
                                                {workflow.parent_id && (
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-blue-500">
                                                        <GitBranch className="w-2.5 h-2.5" />
                                                        Versión
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${workflow.status === 'active'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : workflow.status === 'draft'
                                                    ? 'bg-orange-100 text-orange-700'
                                                    : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {workflow.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xs font-bold text-slate-400">{workflow.version || 'v1.0'}</span>
                                        </td>
                                        <td className="px-5 py-2 text-right">
                                            <div className="flex justify-end gap-1.5 Items-center">

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDuplicate(workflow.id); }}
                                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all border border-slate-100 dark:border-slate-800"
                                                    title="Versionar (Duplicar)"
                                                >
                                                    <GitBranch className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(workflow.id); }}
                                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all border border-slate-100 dark:border-slate-800"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSelectWorkflow(workflow); }}
                                                    className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all ml-1 shadow-sm shadow-blue-200 active:scale-95"
                                                    title="Abrir Editor"
                                                >
                                                    <Play className="w-3 h-3 fill-current" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isFormOpen && (
                <WorkflowForm
                    workflow={editingWorkflow}
                    onSave={handleSave}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}

interface WorkflowFormProps {
    workflow?: Workflow;
    onSave: (data: Partial<Workflow>) => void;
    onClose: () => void;
}

function WorkflowForm({ workflow, onSave, onClose }: WorkflowFormProps) {
    const [formData, setFormData] = useState({
        name: workflow?.name || '',
        description: workflow?.description || '',
        status: workflow?.status || 'draft',
        name_template: workflow?.name_template || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100 dark:border-slate-800">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {workflow ? 'Configurar Flujo' : 'Crear Nuevo Flujo'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre del Proceso</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                            placeholder="Ej: Aprobación de Vacaciones"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Descripción del Proceso</label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                            placeholder="Propósito de este flujo..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-widest">Plantilla de Nombre del Trámite</label>
                        <input
                            type="text"
                            value={formData.name_template}
                            onChange={(e) => setFormData(prev => ({ ...prev, name_template: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                            placeholder="Ej: Solicitud de {{empleado}}"
                        />
                        <p className="mt-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-relaxed">
                            Usa <span className="text-blue-500">{'{{nombre_campo}}'}</span> de la primera actividad para generar nombres dinámicos.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Estado Inicial</label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 text-xs shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="draft">Borrador (Draft)</option>
                            <option value="active">Activo (Active)</option>
                            <option value="archived">Archivado (Archived)</option>
                        </select>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-4 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3.5 px-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                        >
                            {workflow ? 'Guardar Cambios' : 'Crear Flujo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function WorkflowCard({ workflow, onDelete, onDuplicate, onSelect }: {
    workflow: Workflow,
    onDelete: () => void,
    onDuplicate: () => void,
    onSelect: () => void
}) {
    const statusColors = {
        active: "bg-emerald-50 text-emerald-600 border-emerald-100",
        draft: "bg-orange-50 text-orange-600 border-orange-100",
        archived: "bg-slate-100 text-slate-600 border-slate-200",
    };

    return (
        <div onClick={onSelect} className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col h-full cursor-pointer">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={statusColors[workflow.status] + " px-3 py-1 rounded-full text-xs font-bold border"}>
                        {workflow.status.toUpperCase()}
                    </div>
                    {workflow.version && (
                        <div className="bg-slate-50 text-slate-500 px-2 py-1 rounded-full text-[10px] font-bold border border-slate-100">
                            {workflow.version}
                        </div>
                    )}
                </div>
                <button className="text-slate-400 hover:text-slate-600 p-1">
                    <MoreVertical className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1">
                <div className="relative group/tooltip w-fit">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-2 cursor-help relative z-0 flex items-center gap-2">
                        {workflow.name}
                        {workflow.parent_id && <GitBranch className="w-4 h-4 text-blue-500" />}
                    </h3>
                    {workflow.description && (
                        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-xl shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-all duration-300 pointer-events-none z-50 w-64 text-left leading-relaxed translate-y-2 group-hover/tooltip:translate-y-0">
                            {workflow.description}
                            {/* Arrow */}
                            <div className="absolute top-full left-4 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                    <GitBranch className="w-4 h-4" />
                    <span className="text-xs font-medium">8 Actividades</span>
                </div>
                <div className="flex items-center gap-2">

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate();
                        }}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Versionar (Duplicar)"
                    >
                        <GitBranch className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all ml-2 shadow-lg shadow-blue-200"
                        title="Abrir Editor"
                    >
                        <Play className="w-4 h-4 fill-current" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: 'blue' | 'emerald' | 'orange' | 'purple' }) {
    const colors = {
        blue: "text-blue-600 bg-blue-50 border-blue-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100",
        orange: "text-orange-600 bg-orange-50 border-orange-100",
        purple: "text-purple-600 bg-purple-50 border-purple-100",
    }[color];

    return (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 transition-colors">
            <div className={`p-3 rounded-xl border ${colors}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}
