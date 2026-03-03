import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DynamicForm } from './DynamicForm';
import { ActivityIcon, CheckCircle2 } from 'lucide-react';

export function PublicForm({ workflowId, activityId, processId }: { workflowId?: string, activityId?: string, processId?: string }) {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [workflow, setWorkflow] = useState<any>(null);
    const [activity, setActivity] = useState<any>(null);
    const [fields, setFields] = useState<any[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                if (workflowId) {
                    const { data, error } = await supabase.rpc('get_public_workflow', { p_workflow_id: workflowId });

                    if (error) throw error;
                    if (!data || data.error) throw new Error(data?.error || 'Trámite no encontrado o inactivo');

                    setWorkflow(data.workflow);
                    setFields(data.start_fields || []);
                } else if (activityId && processId) {
                    const { data, error } = await supabase.rpc('get_public_activity', {
                        p_process_id: processId,
                        p_activity_id: activityId
                    });

                    if (error) throw error;
                    if (!data || data.error) throw new Error(data?.error || 'Actividad no encontrada o expirada');

                    setWorkflow(data.workflow);
                    setActivity(data.activity);
                    setFields(data.fields || []);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [workflowId, activityId, processId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            if (workflowId) {
                const { data, error } = await supabase.rpc('submit_public_process', {
                    p_workflow_id: workflowId,
                    p_data: formData
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
            } else if (activityId && processId) {
                const { data, error } = await supabase.rpc('submit_public_activity', {
                    p_process_id: processId,
                    p_activity_id: activityId,
                    p_data: formData
                });
                if (error) throw error;
                if (data?.error) throw new Error(data.error);
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    if (error && !workflow) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ActivityIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace Inválido</h2>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">¡Solicitud Enviada!</h2>
                    <p className="text-slate-500 mb-8">Hemos recibido tu información exitosamente. Nuestro equipo se pondrá en contacto pronto.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white rounded-[2rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
                    <h1 className="text-3xl font-black mb-2 relative z-10">{activity ? activity.name : workflow.name}</h1>
                    <p className="text-slate-300 relative z-10">{activity ? activity.description : workflow.description}</p>
                    {activity && (
                        <div className="mt-4 inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white shadow-sm border border-white/10 uppercase tracking-widest relative z-10">
                            {workflow.name}
                        </div>
                    )}
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <DynamicForm
                            fields={fields}
                            data={formData}
                            onChange={(key: string, val: any) => setFormData(prev => ({ ...prev, [key]: val }))}
                        />

                        <div className="pt-6">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Enviando Datos...' : 'Enviar Solicitud'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
