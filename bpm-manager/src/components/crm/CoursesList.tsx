import { useState, useEffect } from 'react';
import { crmService } from '../../services/crmService';
import type { MktCurso } from '../../types/crm';
import { Plus, Search, BookOpen, MoreVertical, Calendar as CalendarIcon, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CourseFormModal } from './CourseFormModal';

export function CoursesList() {
    const [courses, setCourses] = useState<MktCurso[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<MktCurso | null>(null);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const data = await crmService.getCourses();
            setCourses(data);
        } catch (error) {
            console.error('Error loading courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (course?: MktCurso) => {
        setEditingCourse(course || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
    };

    const handleSaveCourse = (savedCourse: MktCurso) => {
        setCourses(prev => {
            const index = prev.findIndex(c => c.id_curso === savedCourse.id_curso);
            if (index >= 0) {
                const newCourses = [...prev];
                newCourses[index] = savedCourse;
                return newCourses;
            }
            return [savedCourse, ...prev];
        });
        handleCloseModal();
    };

    const filteredCourses = courses.filter(c => 
        c.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (c.descripcion && c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.categoria && c.categoria.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cursos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#0d111d] border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Curso
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">No hay cursos</h3>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Comienza agregando los programas académicos de tu institución.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map(course => (
                        <div key={course.id_curso} className="bg-white dark:bg-[#0d111d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 pr-4">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-lg leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                        {course.nombre_curso}
                                    </h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {course.categoria && (
                                            <span className="inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                                                {course.categoria}
                                            </span>
                                        )}
                                        {course.modalidad && (
                                            <span className="inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                                {course.modalidad}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleOpenModal(course)}
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                                {course.descripcion || 'Sin descripción'}
                            </p>
                            
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50 text-sm text-slate-600 dark:text-slate-400">
                                {course.fecha_inicio && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <CalendarIcon className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">
                                            {format(new Date(course.fecha_inicio), "dd MMM yyyy", { locale: es })}
                                        </span>
                                    </div>
                                )}
                                {course.duracion_horas && course.duracion_horas > 0 && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium">{course.duracion_horas} horas totales</span>
                                    </div>
                                )}
                                {course.precio !== undefined && course.precio !== null && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                            <DollarSign className="w-4 h-4" />
                                        </div>
                                        <span className="font-bold text-slate-900 dark:text-white">
                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(course.precio)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <CourseFormModal 
                    course={editingCourse} 
                    onClose={handleCloseModal} 
                    onSave={handleSaveCourse} 
                />
            )}
        </div>
    );
}
