import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { crmService } from '../../services/crmService';
import type { MktCurso } from '../../types/crm';
import { toast } from 'sonner';

interface CourseFormModalProps {
    course?: MktCurso | null;
    onClose: () => void;
    onSave: (course: MktCurso) => void;
}

export function CourseFormModal({ course, onClose, onSave }: CourseFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<MktCurso>>({
        nombre_curso: '',
        categoria: '',
        descripcion: '',
        modalidad: '',
        precio: 0,
        fecha_inicio: '',
        duracion_horas: 0
    });

    useEffect(() => {
        if (course) {
            setFormData({
                nombre_curso: course.nombre_curso,
                categoria: course.categoria || '',
                descripcion: course.descripcion || '',
                modalidad: course.modalidad || '',
                precio: course.precio || 0,
                fecha_inicio: course.fecha_inicio || '',
                duracion_horas: course.duracion_horas || 0
            });
        }
    }, [course]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev: Partial<MktCurso>) => ({ 
            ...prev, 
            [name]: (type === 'number') ? Number(value) : value 
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.nombre_curso) {
            toast.error('El nombre del curso es obligatorio');
            return;
        }

        try {
            setLoading(true);
            const coursePayload = { ...formData };
            if (!coursePayload.fecha_inicio) delete coursePayload.fecha_inicio;

            let savedCourse: MktCurso;

            if (course?.id_curso) {
                savedCourse = await crmService.updateCourse(course.id_curso, coursePayload);
                toast.success('Curso actualizado exitosamente');
            } else {
                savedCourse = await crmService.createCourse(coursePayload);
                toast.success('Curso creado exitosamente');
            }

            onSave(savedCourse);
        } catch (error: any) {
            console.error('Error saving course:', error);
            toast.error(error.message || 'Error al guardar el curso');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d111d] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">
                            {course ? 'Editar Curso' : 'Nuevo Curso'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {course ? 'Modifica la información general de este curso' : 'Agrega un nuevo programa de formación profesional'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <form id="course-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Nombre del Curso <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="nombre_curso"
                                value={formData.nombre_curso}
                                onChange={handleChange}
                                placeholder="Ej. Actualización en Cuidados Intensivos"
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Categoría
                                </label>
                                <input
                                    type="text"
                                    name="categoria"
                                    value={formData.categoria}
                                    onChange={handleChange}
                                    placeholder="Ej. Diplomado, Curso, Taller"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Modalidad
                                </label>
                                <select
                                    name="modalidad"
                                    value={formData.modalidad}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                >
                                    <option value="">Seleccione una modalidad</option>
                                    <option value="Virtual">Virtual</option>
                                    <option value="Presencial">Presencial</option>
                                    <option value="Híbrido">Híbrido</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Precio ($)
                                </label>
                                <input
                                    type="number"
                                    name="precio"
                                    value={formData.precio}
                                    onChange={handleChange}
                                    placeholder="0"
                                    step="0.01"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Duración estimada (Horas)
                                </label>
                                <input
                                    type="number"
                                    name="duracion_horas"
                                    value={formData.duracion_horas}
                                    onChange={handleChange}
                                    placeholder="0"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Fecha de Inicio
                            </label>
                            <input
                                type="date"
                                name="fecha_inicio"
                                value={formData.fecha_inicio?.split('T')[0] || ''}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                Descripción Detallada
                            </label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                placeholder="Temario, objetivos, a quién va dirigido, etc..."
                                rows={3}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#080a14] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white resize-none"
                            />
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#080a14] flex justify-end gap-3 rounded-b-3xl">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        form="course-form"
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200 dark:shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {course ? 'Guardar Cambios' : 'Crear Curso'}
                    </button>
                </div>
            </div>
        </div>
    );
}
