import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { evaluateCondition } from '../utils/conditions';
import { GeoSelector } from './GeoSelector';

export function DynamicForm({ fields, data, onChange }: { fields: any[], data: any, onChange: (k: string, v: any) => void }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {fields.map((field) => (
                <div
                    key={field.name}
                    className={clsx(
                        "space-y-1.5 min-h-[4rem]",
                        field.type === 'textarea' ? "col-span-full" : "",
                        !evaluateCondition(field.visibility_condition || '', data) ? "hidden" : "block"
                    )}
                >
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">
                        {field.label || field.name}
                        {field.required && <span className="text-rose-500 ml-1 text-xs">*</span>}
                    </label>

                    <div className={clsx("relative", field.type === 'textarea' ? "h-auto" : "h-11")}>
                        {field.type === 'textarea' ? (
                            <textarea
                                value={data[field.name] || ''}
                                onChange={(e) => onChange(field.name, e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[13px] text-slate-700 dark:text-slate-200 outline-none min-h-[120px] transition-all resize-none focus:border-blue-500/50"
                                placeholder={field.placeholder || `Ingrese ${field.label || field.name}...`}
                                required={field.required}
                            />
                        ) : field.type === 'select' ? (
                            <div className="relative group w-full h-full">
                                <select
                                    value={data[field.name] || ''}
                                    onChange={(e) => onChange(field.name, e.target.value)}
                                    className="w-full h-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer font-bold"
                                    required={field.required}
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
                                onClick={() => onChange(field.name, data[field.name] === 'true' ? 'false' : 'true')}
                                className={clsx(
                                    "flex items-center gap-3 w-full h-full px-5 rounded-xl border-2 transition-all cursor-pointer",
                                    data[field.name] === 'true'
                                        ? "bg-blue-50/50 border-blue-200 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400"
                                        : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
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
                                    className="w-full h-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all font-bold"
                                    placeholder="0"
                                    required={field.required}
                                />
                            </div>
                        ) : field.type === 'location' ? (
                            <div className="h-auto">
                                <GeoSelector
                                    value={data[field.name]}
                                    onChange={(val) => onChange(field.name, val)}
                                />
                            </div>
                        ) : field.type === 'consecutivo' ? (
                            <input
                                type="text"
                                readOnly
                                value="Se autogenerará al enviar"
                                className="w-full h-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 text-[12px] text-slate-500 font-bold border-dashed shadow-inner cursor-not-allowed selection:bg-transparent"
                            />
                        ) : (
                            <input
                                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
                                value={data[field.name] || ''}
                                onChange={(e) => onChange(field.name, e.target.value)}
                                className="w-full h-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl px-4 text-[13px] text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500/50 transition-all font-bold"
                                placeholder={field.placeholder || `Completar...`}
                                required={field.required}
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
