
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { evaluateCondition } from '../utils/conditions';
import { GeoSelector } from './GeoSelector';
import { InteractiveLookup } from './InteractiveLookup';

export function DynamicForm({ fields, data, onChange }: { fields: any[], data: any, onChange: (k: string, v: any) => void }) {
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

    const toggleAccordion = (id: string) => {
        setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const sortedFields = [...fields].sort((a, b) => (Number(a.order_index ?? 9999) - Number(b.order_index ?? 9999)));

    const renderField = (field: any) => {
        if (!evaluateCondition(field.visibility_condition || '', data)) return null;

        return (
            <div
                key={field.id || field.name}
                className={clsx(
                    "space-y-1.5 min-h-[4rem]",
                    (field.type === 'textarea' || field.type === 'grid' || field.type === 'label' || field.type === 'accordion') ? "col-span-full" : "",
                    "block"
                )}
            >
                {field.type !== 'label' && field.type !== 'accordion' && (
                    <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none mb-1">
                        {field.label || field.name}
                        {field.required && <span className="text-rose-500 ml-1 text-xs">*</span>}
                    </label>
                )}

                <div className={clsx("relative", (field.type === 'textarea' || field.type === 'label' || field.type === 'accordion') ? "h-auto" : "h-11")}>
                    {field.type === 'textarea' ? (
                        <textarea
                            value={data[field.name] || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const finalVal = (field.max_length && val.length > field.max_length) ? val.slice(0, field.max_length) : val;
                                onChange(field.name, finalVal);
                            }}
                            style={{ minHeight: field.rows ? `${field.rows * 24}px` : '120px' }}
                            className={clsx(
                                "w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[13px] text-slate-700 dark:text-slate-200 outline-none transition-all resize-none focus:border-blue-500/50",
                                field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 select-none grayscale-[0.3]"
                            )}
                            placeholder={field.placeholder || `Ingrese ${field.label || field.name}...`}
                            required={field.required}
                            readOnly={field.is_readonly}
                            maxLength={field.max_length}
                        />
                    ) : field.type === 'select' ? (
                        <div className="relative group w-full h-full">
                            <select
                                value={data[field.name] || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const finalVal = (field.max_length && val.length > field.max_length) ? val.slice(0, field.max_length) : val;
                                    onChange(field.name, finalVal);
                                }}
                                className={clsx(
                                    "w-full h-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer font-bold",
                                    field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 select-none"
                                )}
                                required={field.required}
                                disabled={field.is_readonly}
                            >
                                <option value="">Seleccione...</option>
                                {field.options?.map((opt: string) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                        </div>
                    ) : field.type === 'boolean' ? (
                        <button
                            type="button"
                            onClick={() => !field.is_readonly && onChange(field.name, data[field.name] === 'true' ? 'false' : 'true')}
                            disabled={field.is_readonly}
                            className={clsx(
                                "flex items-center gap-3 w-full h-full px-5 rounded-xl border-2 transition-all cursor-pointer",
                                data[field.name] === 'true'
                                    ? "bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400"
                                    : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800",
                                field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 select-none grayscale"
                            )}
                        >
                            <div className={clsx(
                                "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors px-0",
                                data[field.name] === 'true' ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                            )}>
                                {data[field.name] === 'true' && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest">{data[field.name] === 'true' ? 'Sí' : 'No'}</span>
                        </button>
                    ) : field.type === 'currency' ? (
                        <div className="relative w-full h-full">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-bold">$</span>
                            </div>
                            <input
                                type="text"
                                value={data[field.name] ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(Number(data[field.name])) : ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    onChange(field.name, val);
                                }}
                                className={clsx(
                                    "w-full h-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all font-bold",
                                    field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 select-none"
                                )}
                                placeholder="0"
                                required={field.required}
                                readOnly={field.is_readonly}
                            />
                        </div>
                    ) : field.type === 'location' ? (
                        <div className="h-auto">
                            <GeoSelector
                                value={data[field.name]}
                                onChange={(val) => onChange(field.name, val)}
                                mode={field.location_mode}
                            />
                        </div>
                    ) : field.type === 'lookup' ? (
                        <div className="h-auto">
                            <InteractiveLookup
                                field={field}
                                value={data[field.name]}
                                onChange={(val) => onChange(field.name, val)}
                                formData={data}
                                setFormData={() => { }}
                                disabled={field.is_readonly}
                            />
                        </div>
                    ) : field.type === 'consecutivo' ? (
                        <input
                            type="text"
                            readOnly
                            value="Se autogenerará al enviar"
                            className="w-full h-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[12px] text-slate-500 font-bold border-dashed shadow-inner cursor-not-allowed selection:bg-transparent"
                        />
                    ) : field.type === 'label' ? (
                        <div className="col-span-full py-4 px-6 bg-blue-50/50 dark:bg-blue-500/5 border-l-4 border-blue-500 rounded-lg shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex-1">
                                    <p className="text-[11px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest leading-none mb-1.5">{field.label || field.name}</p>
                                    <p className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">
                                        {field.placeholder || field.description || 'Sin información disponible.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : field.type === 'accordion' ? (
                        <div className="col-span-full border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all">
                            <button
                                type="button"
                                onClick={() => toggleAccordion(field.id)}
                                className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <ChevronRight className={clsx("w-4 h-4 text-blue-600 transition-transform", openAccordions[field.id] ? "rotate-90" : "")} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-[13px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">{field.label || field.name}</h3>
                                        {field.description && <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{field.description}</p>}
                                    </div>
                                </div>
                            </button>
                            <div className={clsx("transition-all duration-300", openAccordions[field.id] ? "max-h-[2000px] opacity-100 p-6" : "max-h-0 opacity-0 overflow-hidden p-0")}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                    {sortedFields.filter(f => f.parent_accordion_id === field.id).map(child => renderField(child))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                            value={data[field.name] || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const finalVal = (field.max_length && val.length > field.max_length) ? val.slice(0, field.max_length) : val;
                                onChange(field.name, finalVal);
                            }}
                            className={clsx(
                                "w-full h-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all font-bold",
                                field.is_readonly && "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 select-none"
                            )}
                            placeholder={field.placeholder || `Completar...`}
                            required={field.required}
                            readOnly={field.is_readonly}
                            maxLength={field.max_length}
                        />
                    )}
                </div>
            </div>
        );
    };

    const rootFields = sortedFields.filter(f => !f.parent_accordion_id);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {rootFields.map(field => renderField(field))}
        </div>
    );
}
