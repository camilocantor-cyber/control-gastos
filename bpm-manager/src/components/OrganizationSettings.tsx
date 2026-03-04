import { Building2, Shield, CreditCard, Users, CheckCircle2, Plus, Settings, Trash2, Package, Search, Play, Image as ImageIcon, Upload, X, Eraser } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import type { Organization } from '../types';

export function OrganizationSettings({ onlyParameters }: { onlyParameters?: boolean }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newOrgName, setNewOrgName] = useState('');
    const [creating, setCreating] = useState(false);
    const { user, loading: authLoading } = useAuth();
    const [org, setOrg] = useState<Organization | null>(null);
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSucursal, setEditingSucursal] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sucursalSearch, setSucursalSearch] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);

    async function processImage(file: File, removeWhite: boolean): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) return reject(new Error('No se pudo obtener el contexto del canvas'));

                // Redimensionar si es muy grande (máximo 400px de ancho o alto)
                let width = img.width;
                let height = img.height;
                const maxSize = 400;
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height *= maxSize / width;
                        width = maxSize;
                    } else {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                if (removeWhite) {
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        // Si es muy blanco (threshold ajustable), hacerlo transparente
                        if (r > 240 && g > 240 && b > 240) {
                            data[i + 3] = 0;
                        }
                    }
                    ctx.putImageData(imageData, 0, 0);
                }

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Error al convertir canvas a blob'));
                }, 'image/png');
            };
            img.onerror = () => reject(new Error('Error al cargar la imagen'));
        });
    }

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>, removeWhite: boolean = true) {
        const file = e.target.files?.[0];
        if (!file || !org) return;

        setUploadingLogo(true);
        try {
            const processedBlob = await processImage(file, removeWhite);
            const fileName = `${org.id}/logo_${Date.now()}.png`;

            const { error: uploadError } = await supabase.storage
                .from('logos')
                .upload(fileName, processedBlob, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);

            const { error: updateError } = await supabase
                .from('organizations')
                .update({ logo_url: publicUrl })
                .eq('id', org.id);

            if (updateError) throw updateError;

            setOrg({ ...org, logo_url: publicUrl });
            toast.success('Logo actualizado correctamente');
        } catch (err: any) {
            console.error('Error uploading logo:', err);
            toast.error('Error al subir el logo: ' + err.message);
        } finally {
            setUploadingLogo(false);
        }
    }

    useEffect(() => {
        if (authLoading) return;
        if (user?.organization_id) {
            fetchOrg(user.organization_id);
            fetchSucursales();
        } else {
            setLoading(false);
        }
    }, [user, authLoading]);

    async function fetchSucursales() {
        if (!user?.available_organizations) return;

        try {
            const orgIds = user.available_organizations.map(o => o.id);

            // Fetch all orgs with their counts
            const { data: orgs, error } = await supabase
                .from('organizations')
                .select('*')
                .in('id', orgIds);

            if (error) throw error;

            // Fetch counts for each org
            const enrichedSucursales = await Promise.all((orgs || []).map(async (s) => {
                const [wfCount, procCount] = await Promise.all([
                    supabase.from('workflows').select('id', { count: 'exact', head: true }).eq('organization_id', s.id),
                    supabase.from('process_instances').select('id', { count: 'exact', head: true }).eq('organization_id', s.id)
                ]);
                return {
                    ...s,
                    workflowCount: wfCount.count || 0,
                    processCount: procCount.count || 0
                };
            }));

            setSucursales(enrichedSucursales);
        } catch (err) {
            console.error('Error fetching sucursales:', err);
        }
    }

    async function fetchOrg(orgId: string) {
        try {
            const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
            if (!error && data) {
                setOrg(data);
                // Self-initialize default parameters if missing
                ensureDefaultSettings(data);
            }
        } catch (err) {
            console.error('Error fetching org:', err);
        } finally {
            setLoading(false);
        }
    }

    async function ensureDefaultSettings(currentOrg: any) {
        const settings = currentOrg.settings || {};
        const defaults: Record<string, string> = {
            AI_OPENAI_KEY: localStorage.getItem('bpm_openai_key') || '',
            AI_GEMINI_KEY: localStorage.getItem('bpm_gemini_key') || '',
            AI_DEFAULT_PROVIDER: 'gemini',
            SMTP_HOST: '',
            SMTP_PORT: '587',
            SMTP_USER: '',
            SMTP_PASS: '',
            SMTP_SECURE: 'true'
        };

        let hasChanges = false;
        const newSettings = { ...settings };

        Object.entries(defaults).forEach(([key, defaultValue]) => {
            // Only set if missing or if it's an AI key and current is empty while default has localStorage value
            if (settings[key] === undefined || (key.startsWith('AI_') && !settings[key] && defaultValue)) {
                newSettings[key] = settings[key] || defaultValue;
                hasChanges = true;
            }
        });

        if (hasChanges) {
            const { error } = await supabase.from('organizations').update({ settings: newSettings }).eq('id', currentOrg.id);
            if (!error) setOrg({ ...currentOrg, settings: newSettings });
        }
    }

    async function handleCreateOrg(e: React.FormEvent) {
        e.preventDefault();
        if (!newOrgName.trim()) return;
        setCreating(true);
        try {
            const newOrgId = crypto.randomUUID();
            const { error: orgError } = await supabase.from('organizations').insert({
                id: newOrgId,
                name: newOrgName,
                plan: 'free',
                created_at: new Date().toISOString(),
                settings: {
                    AI_OPENAI_KEY: localStorage.getItem('bpm_openai_key') || '',
                    AI_GEMINI_KEY: localStorage.getItem('bpm_gemini_key') || '',
                    AI_DEFAULT_PROVIDER: 'gemini',
                    SMTP_HOST: '',
                    SMTP_PORT: '587',
                    SMTP_USER: '',
                    SMTP_PASS: '',
                    SMTP_SECURE: 'true'
                }
            });
            if (orgError) throw orgError;

            const { error: memberError } = await supabase.from('organization_members').insert({
                organization_id: newOrgId,
                user_id: user?.id,
                role: 'admin'
            });
            if (memberError) throw memberError;

            toast.success("Empresa creada correctamente");
            setShowCreateModal(false);
            setNewOrgName('');
            fetchSucursales();
        } catch (err: any) {
            toast.error("Error: " + err.message);
        } finally {
            setCreating(false);
        }
    }

    async function handleUpdateSucursal(id: string, name: string) {
        try {
            const { error } = await supabase.from('organizations').update({ name }).eq('id', id);
            if (error) throw error;
            toast.success('Sucursal actualizada');
            fetchSucursales();
            if (id === org?.id) setOrg(prev => prev ? ({ ...prev, name }) : null);
            setIsEditModalOpen(false);
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    }

    async function handleDeleteSucursal(s: any) {
        if (s.workflowCount > 0 || s.processCount > 0) {
            alert(`No se puede eliminar la sucursal "${s.name}" porque tiene flujos (${s.workflowCount}) o trámites (${s.processCount}) activos.`);
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar la sucursal "${s.name}"? Esta acción no se puede deshacer.`)) return;

        try {
            // First remove members
            await supabase.from('organization_members').delete().eq('organization_id', s.id);
            // Then remove organization
            const { error } = await supabase.from('organizations').delete().eq('id', s.id);
            if (error) throw error;

            toast.success('Sucursal eliminada');
            fetchSucursales();
            if (s.id === org?.id) window.location.reload();
        } catch (err: any) {
            toast.error('Error: ' + err.message);
        }
    }

    async function updateParameter(oldKey: string, newKey: string, newValue: string) {
        if (!org) return;
        const newSettings = { ...org.settings };
        if (oldKey !== newKey) {
            delete newSettings[oldKey];
        }
        newSettings[newKey] = newValue;
        const { error } = await supabase.from('organizations').update({ settings: newSettings }).eq('id', org.id);
        if (!error) setOrg({ ...org, settings: newSettings });
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sincronizando...</p>
        </div>
    );

    if (!org) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 space-y-6">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-3xl flex items-center justify-center">
                <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Sin Organización</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">Crea una organización para comenzar.</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                Configurar Empresa
            </button>
        </div>
    );

    const parametersHeader = (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Matriz de Parámetros</h3>
                </div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest pl-1">Variables de entorno globales para automatización.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar parámetro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                    />
                </div>
                <button
                    onClick={async () => {
                        const key = prompt("Asigne un nombre (ID) al parámetro:");
                        if (key) {
                            const cleanKey = key.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
                            await updateParameter(cleanKey, cleanKey, 'Sin valor');
                        }
                    }}
                    className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3 w-full md:w-auto"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Entrada
                </button>
            </div>
        </div>
    );

    const filteredParameters = Object.entries(org.settings || {}).filter(([key, value]) =>
        key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const parametersGrid = (
        <div className="overflow-hidden bg-white dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-950/50">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador (Key)</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor de Configuración</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-20">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredParameters.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-8 py-20 text-center">
                                <Package className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {searchTerm ? "No se encontraron coincidencias" : "No hay datos registrados"}
                                </p>
                            </td>
                        </tr>
                    ) : (
                        filteredParameters.map(([key, value]) => (
                            <tr key={key} className="group/row hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors">
                                <td className="px-8 py-4">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            defaultValue={key}
                                            onBlur={(e) => {
                                                const newKey = e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
                                                if (newKey && newKey !== key) updateParameter(key, newKey, value);
                                            }}
                                            className="bg-slate-50/50 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full transition-all"
                                        />
                                    </div>
                                </td>
                                <td className="px-8 py-4">
                                    <input
                                        type="text"
                                        defaultValue={value}
                                        onBlur={(e) => updateParameter(key, key, e.target.value)}
                                        className="bg-slate-50/50 dark:bg-slate-800/20 hover:bg-white dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-full transition-all"
                                        placeholder="Ingrese valor..."
                                    />
                                </td>
                                <td className="px-8 py-4 text-right">
                                    <button
                                        onClick={async () => {
                                            if (confirm(`¿Eliminar ${key}?`)) {
                                                const updatedSettings = { ...org.settings };
                                                delete updatedSettings[key];
                                                const { error } = await supabase.from('organizations').update({ settings: updatedSettings }).eq('id', org.id);
                                                if (!error) setOrg({ ...org, settings: updatedSettings });
                                            }
                                        }}
                                        className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-row:opacity-100 group-hover/row:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    if (onlyParameters) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-10 group/params">
                    {parametersHeader}
                    {parametersGrid}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            {/* Banner Superior Premium */}
            <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 dark:from-blue-600 dark:via-blue-700 dark:to-indigo-800 p-10 rounded-[2.5rem] text-white shadow-2xl shadow-blue-500/10 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                            <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-200">
                                    Sucursal Activa
                                </span>
                                {org?.plan === 'enterprise' && (
                                    <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/30 rounded-full text-[9px] font-black uppercase tracking-widest text-amber-200">
                                        Enterprise
                                    </span>
                                )}
                            </div>
                            <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{org?.name}</h2>
                            <p className="text-blue-100/60 font-medium text-xs mt-2 max-w-md">
                                Panel central de administración de sucursales, parámetros globales y servicios de automatización.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black hover:bg-white/20 transition-all active:scale-95 uppercase tracking-widest flex items-center gap-3"
                        >
                            <Plus className="w-4 h-4" />
                            Nueva Sucursal
                        </button>
                    </div>
                </div>
            </div>

            {/* Nueva Sección: Identidad Visual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
                            <ImageIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Identidad Visual</h3>
                            <p className="text-sm text-slate-400 font-medium">Personaliza el logo de tu empresa.</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                            <div className="w-40 h-40 bg-slate-50 dark:bg-slate-950 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-400">
                                {org.logo_url ? (
                                    <img src={org.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-4" />
                                ) : (
                                    <div className="text-center p-4">
                                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Sin Logo</p>
                                    </div>
                                )}

                                {uploadingLogo && (
                                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>

                            {org.logo_url && (
                                <button
                                    onClick={async () => {
                                        if (confirm('¿Eliminar logo?')) {
                                            const { error } = await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id);
                                            if (!error) setOrg({ ...org, logo_url: undefined });
                                        }
                                    }}
                                    className="absolute -top-2 -right-2 p-2 bg-rose-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        <div className="flex-1 space-y-4 w-full">
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                    Sube tu logo y aplicaremos un tratamiento para que se vea estético:
                                </p>
                                <ul className="mt-2 space-y-1">
                                    <li className="flex items-center gap-2 text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">
                                        <CheckCircle2 className="w-3 h-3" /> Redimensionado automático
                                    </li>
                                    <li className="flex items-center gap-2 text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">
                                        <Eraser className="w-3 h-3" /> Fondo blanco a transparente
                                    </li>
                                </ul>
                            </div>

                            <label className="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-xl">
                                <Upload className="w-4 h-4" />
                                {org.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, true)} />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex flex-col justify-center">
                    <div className="text-center space-y-4">
                        <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl text-emerald-600 mb-2">
                            <Shield className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Marca Corporativa</h4>
                        <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                            Al subir tu logo, este se verá reflejado en toda la plataforma, correos y documentos generados.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sucursales Management Section */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gestión de Sucursales</h3>
                        <p className="text-sm text-slate-400 font-medium">Administra los nombres y estados de tus sedes.</p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar sucursal..."
                            value={sucursalSearch}
                            onChange={(e) => setSucursalSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre de la Sucursal</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Flujos</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trámites</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sucursales.filter(s => s.name.toLowerCase().includes(sucursalSearch.toLowerCase())).map(s => (
                                <tr key={s.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-black text-slate-400">{s.workflowCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-xs font-black text-slate-400">{s.processCount}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    // Iniciar trámite flow: reload with selected organization
                                                    localStorage.setItem('bpm_preferred_org_id', s.id);
                                                    window.location.href = '/?action=new-process';
                                                }}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                                                title="Iniciar Trámite"
                                            >
                                                <Play className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingSucursal(s);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                                title="Editar nombre"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSucursal(s)}
                                                className={`p-2 rounded-lg transition-all ${(s.workflowCount > 0 || s.processCount > 0)
                                                    ? "text-slate-200 dark:text-slate-800 cursor-not-allowed"
                                                    : "text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                                                    }`}
                                                title={(s.workflowCount > 0 || s.processCount > 0) ? "No se puede eliminar (tiene datos)" : "Eliminar sucursal"}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-10 border border-slate-100 dark:border-slate-800 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8">Editar Sucursal</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nuevo Nombre</label>
                                <input
                                    type="text"
                                    defaultValue={editingSucursal?.name}
                                    id="edit-sucursal-name"
                                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest rounded-2xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        const name = (document.getElementById('edit-sucursal-name') as HTMLInputElement).value;
                                        if (name) handleUpdateSucursal(editingSucursal.id, name);
                                    }}
                                    className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-blue-500/20"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Info & Sidebar (Summary for Active Org) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
                        <div className="flex items-start justify-between mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de Seguridad</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sucursal Activa: {org.name}</h3>
                                <p className="text-sm text-slate-400 font-medium">Parámetros globales de configuración.</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                                <Building2 className="w-6 h-6 text-slate-400" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(org.settings || {}).length === 0 ? (
                                <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center">
                                    <Settings className="w-10 h-10 text-slate-200 dark:text-slate-800 mb-4" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-loose">No hay parámetros personalizados</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(org.settings || {}).map(([key, value]) => (
                                        <div key={key} className="flex flex-col p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 group/item relative hover:border-blue-200 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{key}</span>
                                            </div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 dark:bg-blue-600 text-white rounded-[2rem] shadow-xl shadow-slate-200 dark:shadow-none p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2 text-blue-300">
                                <CreditCard className="w-5 h-5" />
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Plan de Servicio</span>
                            </div>
                            <h3 className="text-4xl font-black mb-8 capitalize">{org.plan}</h3>
                            <div className="space-y-4 mb-10">
                                <FeatureItem text="Usuarios Ilimitados" active={true} />
                                <FeatureItem text="Flujos Ilimitados" active={true} />
                                <FeatureItem text="Soporte Prioritario" active={org.plan === 'enterprise'} />
                            </div>
                            <button className="w-full py-4 bg-white text-slate-900 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-50 transition-all active:scale-95 shadow-lg">
                                Gestionar Suscripción
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Equipo</h3>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Estás operando como <strong className="text-slate-900 dark:text-slate-200 underline decoration-blue-500/30 font-black uppercase tracking-widest">{user?.role === 'admin' ? 'Administrador' : 'Miembro'}</strong>.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal de Creación (Sucursal/Empresa) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-10 border border-slate-100 dark:border-slate-800 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-8">Nueva Sucursal</h3>
                        <form onSubmit={handleCreateOrg} className="space-y-6">
                            <input
                                type="text"
                                required
                                value={newOrgName}
                                onChange={e => setNewOrgName(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-blue-500 transition-all font-bold text-slate-900 dark:text-white"
                                placeholder="Nombre de la sucursal"
                            />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest rounded-2xl">Volver</button>
                                <button type="submit" disabled={creating} className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-blue-500/20">
                                    {creating ? 'Creando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function FeatureItem({ text, active }: { text: string, active: boolean }) {
    return (
        <div className={`flex items-center gap-3 ${active ? 'text-white' : 'text-slate-500 opacity-50'}`}>
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">{text}</span>
        </div>
    );
}
