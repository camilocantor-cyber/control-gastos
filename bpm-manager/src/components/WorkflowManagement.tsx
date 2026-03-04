import { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type { Workflow } from '../types';
import { useWorkflows } from '../hooks/useWorkflows';
import { useAuth } from '../hooks/useAuth';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { GitBranch, Plus, Search, Trash2, Play, GitMerge, Users, Activity, X, MoreVertical, LayoutGrid, List, Globe, Tag, Filter, Building2, TrendingUp } from 'lucide-react';
import { WorkflowCategoryManager } from './WorkflowCategoryManager';
import { useWorkflowCategories } from '../hooks/useWorkflowCategories';
import clsx from 'clsx';

export function WorkflowList({ onSelectWorkflow, openForm, onFormClose }: {
    onSelectWorkflow: (workflow: Workflow) => void,
    openForm?: boolean,
    onFormClose?: () => void
}) {
    const { user } = useAuth();
    const { workflows, loading: workflowsLoading, createWorkflow, updateWorkflow, deleteWorkflow, duplicateWorkflow, moveWorkflow } = useWorkflows();
    const { workflows: countWorkflows, activities, transitions, users, loading: statsLoading } = useDashboardStats();

    const currentRole = user?.available_organizations?.find(o => o.id === user.organization_id)?.role || user?.role || 'viewer';
    const isViewer = currentRole === 'viewer';
    const [isFormOpen, setIsFormOpen] = useState(openForm || false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [prevOpenForm, setPrevOpenForm] = useState(openForm);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const { categories } = useWorkflowCategories();

    // Update internal state when prop changes without effects to avoid cascading renders
    if (openForm !== prevOpenForm) {
        setPrevOpenForm(openForm);
        if (openForm) setIsFormOpen(true);
    }

    const handleClose = () => {
        setIsFormOpen(false);
        setEditingWorkflow(undefined);
        onFormClose?.();
    };

    const filteredWorkflows = workflows.filter(w => {
        const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (w.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || w.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSave = async (data: Partial<Workflow>) => {
        try {
            // Sanitize data: category_id should be null if empty string
            const sanitizedData = {
                ...data,
                category_id: data.category_id === '' ? null : data.category_id
            };

            if (editingWorkflow) {
                const { error } = await updateWorkflow(editingWorkflow.id, sanitizedData);
                if (error) {
                    console.error('Error in handleSave (update):', error);
                    toast.error('Error al actualizar: ' + error);
                } else {
                    toast.success('Flujo actualizado correctamente');
                }
            } else {
                if (!user || !user.organization_id) {
                    console.error('No authenticated user or organization found!');
                    toast.error('Error: Sesión incompleta. Refresca la página.');
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
                    toast.error('Error al crear: ' + error);
                } else {
                    toast.success('Flujo creado correctamente');
                }
            }
            handleClose();
        } catch (err: any) {
            console.error('Unexpected error in handleSave:', err);
            toast.error('Error inesperado: ' + (err.message || err));
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este flujo?')) {
            const { error } = await deleteWorkflow(id);
            if (error) {
                if (error.includes('foreign key constraint') || error.includes('violates foreign key') || error.includes('violates foreign key constraint') || error.includes('reference') || error.includes('update or delete on table')) {
                    toast.error('No se puede eliminar este flujo porque ya tiene procesos (trámites) en ejecución o ya finalizados asociados al mismo.');
                } else {
                    toast.error('Error al eliminar: ' + error);
                }
            } else {
                toast.success('Flujo eliminado correctamente');
            }
        }
    };

    const handleDuplicate = async (id: string) => {
        if (confirm('¿Deseas crear una nueva versión de este flujo? Se copiarán todas las actividades y configuraciones.')) {
            const { error } = await duplicateWorkflow(id);
            if (error) {
                toast.error('Error al versionar: ' + error);
            } else {
                toast.success('Flujo versionado correctamente');
            }
        }
    };

    const handleMove = async (id: string) => {
        if (!user?.organization_id) return;
        if (confirm('¿Deseas recuperar este flujo y moverlo formalmente a tu empresa actual?')) {
            const { error } = await moveWorkflow(id, user.organization_id);
            if (error) {
                toast.error('Error al recuperar: ' + error);
            } else {
                toast.success('Flujo recuperado exitosamente');
            }
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
                    <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm">
                        <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none appearance-none pr-4"
                        >
                            <option value="all">Todas las Categorías</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
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

                    {!isViewer && (
                        <>
                            <button
                                onClick={() => setIsCategoryManagerOpen(true)}
                                className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-[11px] font-black rounded-xl transition-colors uppercase tracking-wider border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
                            >
                                <Tag className="w-3.5 h-3.5" />
                                Categorías
                            </button>

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
                        </>
                    )}
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
                            onMove={() => handleMove(workflow.id)}
                            onSelect={() => onSelectWorkflow(workflow)}
                            isReadOnly={isViewer || (user?.email !== 'ccantor@gmail.com' && workflow.organization_id !== user?.organization_id)}
                            currentUserOrgId={user?.organization_id}
                            userEmail={user?.email}
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
                                    <th className="px-5 py-3 text-left text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest w-40">Categoría</th>
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
                                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest" title="Sucursal / Organización">
                                                    <Building2 className="w-2.5 h-2.5" />
                                                    {workflow.organizations?.name || 'Sistema'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-2 text-left">
                                            {workflow.category ? (
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm"
                                                    style={{ backgroundColor: workflow.category.color }}
                                                >
                                                    <Tag className="w-2.5 h-2.5" />
                                                    {workflow.category.name}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">General</span>
                                            )}
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
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{workflow.version || 'v1.0'}</span>
                                                {workflow.parent_id && (
                                                    <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase tracking-tighter" title="Versión referenciada (basada en un flujo original)">
                                                        <GitBranch className="w-2 h-2" />
                                                        Ref
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-2 text-right">
                                            <div className="flex justify-end gap-1.5 Items-center">
                                                {workflow.is_public && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const url = `${window.location.origin}?public_process=${workflow.id}`;
                                                            navigator.clipboard.writeText(url);
                                                            toast.success('Enlace público copiado al portapapeles');
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-all border border-blue-100 dark:border-blue-800"
                                                        title="Copiar Enlace Público"
                                                    >
                                                        <Globe className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {!isViewer && workflow.organization_id === user?.organization_id && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingWorkflow(workflow);
                                                                setIsFormOpen(true);
                                                            }}
                                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all border border-slate-100 dark:border-slate-800"
                                                            title="Editar Configuración"
                                                        >
                                                            <MoreVertical className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(workflow.id); }}
                                                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all border border-slate-100 dark:border-slate-800"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                                {user?.email === 'ccantor@gmail.com' && workflow.organization_id !== user?.organization_id && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleMove(workflow.id); }}
                                                        className="w-7 h-7 flex items-center justify-center text-blue-500 hover:text-white bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-600 rounded-lg transition-all border border-blue-100 dark:border-blue-800"
                                                        title="Recuperar (Mover a mi sucursal actual)"
                                                    >
                                                        <TrendingUp className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {!isViewer && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicate(workflow.id); }}
                                                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-emerald-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-all border border-slate-100 dark:border-slate-800"
                                                        title="Clonar (Copiar a mi empresa)"
                                                    >
                                                        <GitBranch className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
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

            <AnimatePresence>
                {isFormOpen && (
                    <WorkflowForm
                        workflow={editingWorkflow}
                        onSave={handleSave}
                        onClose={handleClose}
                    />
                )}
            </AnimatePresence>

            {isCategoryManagerOpen && (
                <WorkflowCategoryManager onClose={() => setIsCategoryManagerOpen(false)} />
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
        name_template: workflow?.name_template || '',
        is_public: workflow?.is_public || false,
        category_id: workflow?.category_id || ''
    });

    const { categories } = useWorkflowCategories();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {workflow ? 'Configurar Flujo' : 'Crear Nuevo Flujo'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600 shadow-sm border border-transparent hover:border-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Nombre del Proceso</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                                placeholder="Ej: Aprobación de Vacaciones"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Descripción del Proceso</label>
                            <textarea
                                rows={2}
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                                placeholder="Propósito de este flujo..."
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Categoría</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm appearance-none"
                            >
                                <option value="">Sin Categoría</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-widest">Plantilla de Nombre</label>
                            <input
                                type="text"
                                value={formData.name_template}
                                onChange={(e) => setFormData(prev => ({ ...prev, name_template: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 text-xs shadow-sm"
                                placeholder="Sol. {{empleado}}"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Estado Inicial</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-300 text-xs shadow-sm appearance-none cursor-pointer"
                            >
                                <option value="draft">Borrador</option>
                                <option value="active">Activo</option>
                                <option value="archived">Archivado</option>
                            </select>
                        </div>
                    </div>

                    <label className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${formData.is_public ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-0.5">Visibilidad Pública</p>
                                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Iniciar mediante enlace externo</p>
                            </div>
                        </div>
                        <div className={`w-10 h-6 flex items-center bg-slate-200 dark:bg-slate-700 rounded-full p-1 transition-colors ${formData.is_public ? 'bg-blue-600 dark:bg-blue-600' : ''}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${formData.is_public ? 'translate-x-4' : ''}`}></div>
                        </div>
                        {/* Hidden input to handle the state */}
                        <input
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                            className="hidden"
                        />
                    </label>

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
            </motion.div>
        </motion.div>
    );
}

function WorkflowCard({ workflow, onEdit, onDelete, onDuplicate, onMove, onSelect, isReadOnly, currentUserOrgId, userEmail }: {
    workflow: Workflow,
    onEdit: () => void,
    onDelete: () => void,
    onDuplicate: () => void,
    onMove: () => void,
    onSelect: () => void,
    isReadOnly: boolean,
    currentUserOrgId?: string,
    userEmail?: string
}) {
    const statusColors = {
        active: "bg-emerald-50 text-emerald-600 border-emerald-100",
        draft: "bg-orange-50 text-orange-600 border-orange-100",
        archived: "bg-slate-100 text-slate-600 border-slate-200",
    };

    return (
        <div onClick={onSelect} className="group bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/5 p-6 shadow-sm dark:shadow-xl dark:shadow-black/20 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:bg-slate-800/60 transition-all duration-300 flex flex-col h-full cursor-pointer overflow-hidden relative">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className={clsx("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm", statusColors[workflow.status])}>
                        {workflow.status}
                    </div>
                    {workflow.version && (
                        <div className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100 dark:border-white/5">
                            {workflow.version}
                        </div>
                    )}
                </div>
                {!isReadOnly && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className="flex-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 flex items-center gap-2 tracking-tight">
                    {workflow.name}
                    {workflow.parent_id && <GitBranch className="w-4 h-4 text-blue-500" />}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3" title="Sucursal / Organización">
                    <Building2 className="w-3 h-3" />
                    {workflow.organizations?.name || 'Sistema'}
                </div>

                {workflow.category && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm" style={{ backgroundColor: workflow.category.color }}>
                        <Tag className="w-2.5 h-2.5" />
                        {workflow.category.name}
                    </div>
                )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">8 Etapas</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Diseñadas</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {!isReadOnly && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 bg-slate-50 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                title="Versionar"
                            >
                                <GitBranch className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-50 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    {userEmail === 'ccantor@gmail.com' && workflow.organization_id !== currentUserOrgId && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onMove(); }}
                            className="w-8 h-8 flex items-center justify-center text-blue-500 hover:text-white bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-600 rounded-xl transition-all border border-blue-100 dark:border-blue-800"
                            title="Recuperar (Mover a mi empresa)"
                        >
                            <Building2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onSelect(); }}
                        className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
                    >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: any, label: string, value: number, color: 'blue' | 'emerald' | 'orange' | 'purple' }) {
    const bars = {
        blue: "bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.3)]",
        emerald: "bg-emerald-600 shadow-[0_0_12px_rgba(5,150,105,0.3)]",
        orange: "bg-orange-600 shadow-[0_0_12px_rgba(217,119,6,0.3)]",
        purple: "bg-purple-600 shadow-[0_0_12px_rgba(147,51,234,0.3)]",
    }[color];

    const iconColors = {
        blue: "text-blue-500",
        emerald: "text-emerald-500",
        orange: "text-orange-500",
        purple: "text-purple-500",
    }[color];

    return (
        <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xl p-3 px-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm dark:shadow-xl dark:shadow-black/20 flex flex-col justify-center transition-all group">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    {label}
                    <span className="text-sm text-slate-900 dark:text-white">{value.toLocaleString()}</span>
                </p>
                <Icon className={clsx("w-3.5 h-3.5", iconColors)} />
            </div>
            <div className="w-full h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div className={clsx("h-full rounded-full transition-all duration-1000", bars)} style={{ width: '65%' }} />
            </div>
        </div>
    );
}
