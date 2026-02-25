import { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Filter, Download, Share2, Plus, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { ProcessExecution } from './ProcessExecution';
import { ScheduleProcessModal } from './ScheduleProcessModal';
import { useScheduledProcesses } from '../hooks/useScheduledProcesses';
import { useAuth } from '../hooks/useAuth';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { es };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resource: {
        processId?: string;
        workflowName: string;
        activityName?: string;
        status: 'overdue' | 'nearDue' | 'onTime' | 'scheduled';
        isRecurring?: boolean;
        scheduledProcess?: any;
    };
}

export function Calendar() {
    const { user } = useAuth();
    const { getScheduledProcesses } = useScheduledProcesses(user?.organization_id);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([]);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedDateSlot, setSelectedDateSlot] = useState<Date | null>(null);
    const [editingScheduledProcess, setEditingScheduledProcess] = useState<any | null>(null);
    const [exportedIds, setExportedIds] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('bpm_exported_events') || '[]');
        } catch { return []; }
    });

    const newEventsCount = events.filter(e => !exportedIds.includes(e.id)).length;

    useEffect(() => {
        loadWorkflows();
        loadEvents();
    }, [selectedWorkflowId]);

    async function loadWorkflows() {
        const { data } = await supabase.from('workflows').select('id, name');
        if (data) setWorkflows(data);
    }

    async function loadEvents() {
        try {
            setLoading(true);

            let query = supabase
                .from('process_instances')
                .select(`
                    id,
                    name,
                    created_at,
                    workflow_id,
                    workflows (name),
                    activities (name, due_date_hours)
                `)
                .eq('status', 'active');

            if (selectedWorkflowId) {
                query = query.eq('workflow_id', selectedWorkflowId);
            }

            const { data: processes, error } = await query;
            if (error) throw error;

            const activeEvents: CalendarEvent[] = (processes || []).map((process: any) => {
                const dueHours = process.activities?.due_date_hours || 24;
                const createdAt = new Date(process.created_at);
                const dueDate = new Date(createdAt.getTime() + dueHours * 60 * 60 * 1000);

                const now = new Date();
                const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
                let status: 'overdue' | 'nearDue' | 'onTime' | 'scheduled';
                if (hoursUntilDue < 0) status = 'overdue';
                else if (hoursUntilDue <= 4) status = 'nearDue';
                else status = 'onTime';

                return {
                    id: process.id,
                    title: process.name || process.workflows?.name || 'Proceso',
                    start: dueDate,
                    end: dueDate,
                    resource: {
                        processId: process.id,
                        workflowName: process.workflows?.name || 'N/A',
                        activityName: process.activities?.name || 'N/A',
                        status,
                    },
                };
            });

            // Load scheduled processes
            const scheduledData = await getScheduledProcesses();
            const scheduledEvents: CalendarEvent[] = (scheduledData || []).map(sp => ({
                id: sp.id,
                title: `[PROG] ${sp.name}`,
                start: new Date(sp.scheduled_at),
                end: new Date(new Date(sp.scheduled_at).getTime() + 60 * 60000),
                resource: {
                    workflowName: sp.workflows?.name || 'Plantilla',
                    status: 'scheduled',
                    isRecurring: sp.is_recurring,
                    scheduledProcess: sp // Store full object for editing
                }
            }));

            setEvents([...activeEvents, ...scheduledEvents]);
        } catch (err) {
            console.error('Error loading calendar events:', err);
        } finally {
            setLoading(false);
        }
    }

    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3b82f6'; // Blue (onTime)
        if (event.resource.status === 'overdue') backgroundColor = '#ef4444'; // Red
        else if (event.resource.status === 'nearDue') backgroundColor = '#f59e0b'; // Amber
        else if (event.resource.status === 'scheduled') backgroundColor = '#6366f1'; // Indigo/Violet

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: 'none',
                display: 'block',
                fontSize: '0.65rem',
                fontWeight: 600,
            },
        };
    };

    const handleSelectEvent = (event: CalendarEvent) => {
        if (event.resource.processId) {
            setSelectedProcessId(event.resource.processId);
        } else if (event.resource.scheduledProcess) {
            setEditingScheduledProcess(event.resource.scheduledProcess);
            setShowScheduleModal(true);
        }
    };

    const handleSelectSlot = ({ start }: { start: Date }) => {
        setSelectedDateSlot(start);
        setShowScheduleModal(true);
    };

    const handleSyncNewEvents = () => {
        const eventsToExport = events.filter(e => !exportedIds.includes(e.id));

        if (eventsToExport.length === 0) {
            alert('No hay eventos nuevos para sincronizar.');
            return;
        }

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//BPM Manager//Event Calendar//ES',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        eventsToExport.forEach(event => {
            const start = event.start.toISOString().replace(/-|:|\.\d+/g, '');
            const endDate = new Date(event.start.getTime() + 60 * 60000);
            const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');

            icsContent.push(
                'BEGIN:VEVENT',
                `UID:${event.id}@bpm-manager`,
                `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d+/g, '')}`,
                `DTSTART:${start}`,
                `DTEND:${end}`,
                `SUMMARY:${event.title}`,
                `DESCRIPTION:Flujo: ${event.resource.workflowName}\\nEstado: ${event.resource.status}`,
                'END:VEVENT'
            );
        });

        icsContent.push('END:VCALENDAR');

        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `sync-google-${new Date().getTime()}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Update exported storage
        const newIds = [...exportedIds, ...eventsToExport.map(e => e.id)];
        setExportedIds(newIds);
        localStorage.setItem('bpm_exported_events', JSON.stringify(newIds));

        if (confirm(`Se han descargado ${eventsToExport.length} eventos nuevos. ¿Deseas abrir la página de importación de Google Calendar ahora?`)) {
            window.open('https://calendar.google.com/calendar/r/settings/export', '_blank');
        }
    };

    const exportToGoogleCalendar = () => {
        if (events.length === 0) {
            alert('No hay eventos para exportar');
            return;
        }

        // Export the first event or explain how to export individual ones if many
        if (events.length > 1) {
            const confirmAll = confirm(`Se han encontrado ${events.length} eventos. ¿Deseas exportar el primero a Google Calendar? (Para exportar todos, utiliza la opción iCal)`);
            if (!confirmAll) return;
        }

        const event = events[0];
        const start = event.start.toISOString().replace(/-|:|\.\d+/g, '');
        const endDate = new Date(event.start.getTime() + 60 * 60000);
        const end = endDate.toISOString().replace(/-|:|\.\d+/g, '');

        const details = `Flujo: ${event.resource.workflowName}\nActividad: ${event.resource.activityName}\nEstado: ${event.resource.status}`;

        const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&sf=true&output=xml`;

        window.open(url, '_blank');
    };

    const filteredEvents = selectedStatus
        ? events.filter(e => e.resource?.status === selectedStatus)
        : events;

    return (
        <div className="p-4 max-w-7xl mx-auto h-full flex flex-col">
            {/* Ultra-Compact Action Bar */}
            <div className="mb-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-tighter shrink-0 cursor-pointer">
                    <button
                        onClick={() => setSelectedStatus(selectedStatus === 'overdue' ? null : 'overdue')}
                        className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-md border transition-all active:scale-95",
                            selectedStatus === 'overdue' ? "border-rose-500 ring-2 ring-rose-500/20" : "border-rose-100 dark:border-rose-800/30",
                            selectedStatus && selectedStatus !== 'overdue' && "opacity-40 grayscale-[0.5]"
                        )}
                    >
                        <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></div>
                        <span>Vencidas</span>
                    </button>
                    <button
                        onClick={() => setSelectedStatus(selectedStatus === 'nearDue' ? null : 'nearDue')}
                        className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-md border transition-all active:scale-95",
                            selectedStatus === 'nearDue' ? "border-amber-500 ring-2 ring-amber-500/20" : "border-amber-100 dark:border-amber-800/30",
                            selectedStatus && selectedStatus !== 'nearDue' && "opacity-40 grayscale-[0.5]"
                        )}
                    >
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <span>Por Vencer</span>
                    </button>
                    <button
                        onClick={() => setSelectedStatus(selectedStatus === 'onTime' ? null : 'onTime')}
                        className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-md border transition-all active:scale-95",
                            selectedStatus === 'onTime' ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-100 dark:border-blue-800/30",
                            selectedStatus && selectedStatus !== 'onTime' && "opacity-40 grayscale-[0.5]"
                        )}
                    >
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span>A Tiempo</span>
                    </button>
                    <button
                        onClick={() => setSelectedStatus(selectedStatus === 'scheduled' ? null : 'scheduled')}
                        className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-md border transition-all active:scale-95",
                            selectedStatus === 'scheduled' ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-indigo-100 dark:border-indigo-800/30",
                            selectedStatus && selectedStatus !== 'scheduled' && "opacity-40 grayscale-[0.5]"
                        )}
                    >
                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                        <span>Programados</span>
                    </button>

                    {selectedStatus && (
                        <button
                            onClick={() => setSelectedStatus(null)}
                            className="ml-1 text-[7px] text-slate-400 hover:text-blue-500 font-black flex items-center gap-0.5 transition-colors"
                        >
                            <X className="w-2 h-2" /> LIMPIAR
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 group transition-all">
                        <Filter className="w-3 h-3 text-slate-400" />
                        <select
                            value={selectedWorkflowId || ''}
                            onChange={(e) => setSelectedWorkflowId(e.target.value || null)}
                            className="bg-transparent text-[9px] font-black text-slate-700 dark:text-slate-300 outline-none cursor-pointer uppercase"
                        >
                            <option value="">TODOS</option>
                            {workflows.map((wf) => (
                                <option key={wf.id} value={wf.id}>{wf.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedDateSlot(new Date());
                            setShowScheduleModal(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 uppercase"
                    >
                        <Plus className="w-3 h-3" />
                        Programar
                    </button>

                    <button
                        onClick={handleSyncNewEvents}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black transition-all shadow-sm uppercase ${newEventsCount > 0
                            ? 'bg-blue-600 text-white shadow-blue-200'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400'
                            }`}
                    >
                        <Download className="w-3 h-3" />
                        {newEventsCount > 0 ? `Sinc (${newEventsCount})` : 'Sinc'}
                    </button>

                    <button
                        onClick={() => exportToGoogleCalendar()}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black text-slate-500 hover:bg-slate-50 transition-all shadow-sm uppercase"
                    >
                        <Share2 className="w-3 h-3" />
                        Manual
                    </button>
                </div>
            </div>

            {/* Calendar */}
            <div className="bg-white dark:bg-slate-900 rounded-[1.2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-2 flex-1" style={{ height: '480px' }}>
                <style>{`
                    .rbc-calendar { font-size: 10px; font-family: inherit; }
                    .rbc-event { padding: 1.5px 3.5px !important; margin: 0.5px 0 !important; border-radius: 3px !important; }
                    .rbc-month-row { min-height: 65px !important; }
                    .rbc-header { padding: 4px !important; font-weight: 800 !important; font-size: 9px !important; text-transform: uppercase; }
                    .rbc-button-link { font-size: 9px !important; font-weight: 700 !important; }
                    .rbc-toolbar-label { font-size: 12px !important; font-weight: 900 !important; text-transform: capitalize; }
                    .rbc-btn-group button { font-size: 10px !important; font-weight: 700 !important; text-transform: uppercase; padding: 3px 6px !important; }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-slate-500">Cargando eventos...</p>
                        </div>
                    </div>
                ) : (
                    <BigCalendar
                        localizer={localizer}
                        events={filteredEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        eventPropGetter={eventStyleGetter}
                        onSelectEvent={handleSelectEvent}
                        onSelectSlot={handleSelectSlot}
                        selectable
                        culture="es"
                        messages={{
                            next: 'Siguiente',
                            previous: 'Anterior',
                            today: 'Hoy',
                            month: 'Mes',
                            week: 'Semana',
                            day: 'Día',
                            agenda: 'Agenda',
                            date: 'Fecha',
                            time: 'Hora',
                            event: 'Evento',
                            noEventsInRange: 'No hay actividades en este rango',
                        }}
                    />
                )}
            </div>

            {/* Process Execution Modal */}
            {selectedProcessId && (
                <ProcessExecution
                    processId={selectedProcessId}
                    onClose={() => setSelectedProcessId(null)}
                    onComplete={() => {
                        setSelectedProcessId(null);
                        loadEvents(); // Reload events after completion
                    }}
                />
            )}

            {/* Schedule Process Modal */}
            {showScheduleModal && (
                <ScheduleProcessModal
                    workflows={workflows}
                    onClose={() => {
                        setShowScheduleModal(false);
                        setSelectedDateSlot(null);
                        setEditingScheduledProcess(null);
                    }}
                    onScheduled={() => {
                        loadEvents();
                    }}
                    initialDate={selectedDateSlot || undefined}
                    editProcess={editingScheduledProcess}
                />
            )}
        </div>
    );
}
