import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, X, Check } from 'lucide-react';
import { cn } from '../utils/cn';
import type { FieldDefinition } from '../types';
import { supabase } from '../lib/supabase';

interface InteractiveLookupProps {
    field: FieldDefinition;
    value: any;
    onChange: (value: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    formData: Record<string, any>;
    setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    error?: string;
    disabled?: boolean;
}

export function InteractiveLookup({ field, value, onChange, setFormData, error, disabled }: InteractiveLookupProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const config = field.lookup_config;

    console.log(`[InteractiveLookup] Component mounted for field ${field.name}. Config:`, config);

    // Cargar registro seleccionado inicial si hay value
    useEffect(() => {
        if (value && !selectedRecord && (config?.url || config?.type === 'database')) {
            // En un entorno real, aquí podríamos hacer un GET por ID para popular selectedRecord
            // Por ahora, solo mostraremos el ID
            setSearchTerm(String(value));
        }
    }, [value, config, selectedRecord]);

    // Debounce de búsqueda
    useEffect(() => {
        if (!isOpen || !config) return;
        if (config.type === 'rest' && !config.url) return;
        if (config.type === 'database' && !config.table_name) return;

        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length < 2 && (!config.search_param && !config.search_column)) return;

            setIsLoading(true);
            setFetchError(null);

            try {
                if (config.type === 'database') {
                    // --- Database Catalog Search using RPC ---
                    if (!config.table_name || !config.search_column) {
                        throw new Error("Configuración de base de datos incompleta");
                    }

                    // Ensure value_field is included in return columns even if not displayed
                    const returnColumns = new Set(config.display_fields || []);
                    if (config.value_field) returnColumns.add(config.value_field);
                    if (config.mapping) {
                        Object.keys(config.mapping).forEach(k => returnColumns.add(k));
                    }

                    const rpcParams = {
                        p_table_name: config.table_name,
                        p_search_column: config.search_column,
                        p_search_term: searchTerm,
                        p_return_columns: Array.from(returnColumns)
                    };
                    console.log("[InteractiveLookup] Executing search_dynamic_table with params:", rpcParams);

                    const { data, error } = await supabase.rpc('search_dynamic_table', rpcParams);

                    if (error) throw error;

                    // The RPC returns { result_row: jsonb }
                    setResults(data ? data.map((d: any) => d.result_row) : []);

                } else {
                    // --- Legacy REST API Search ---
                    if (!config.url) throw new Error("URL de API no configurada");

                    const targetUrl = new URL(config.url);
                    if (config.method === 'GET' && config.search_param && searchTerm) {
                        targetUrl.searchParams.append(config.search_param, searchTerm);
                    }

                    const options: RequestInit = {
                        method: config.method || 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(config.headers || {})
                        }
                    };

                    if (config.method === 'POST' && config.search_param) {
                        options.body = JSON.stringify({ [config.search_param]: searchTerm });
                    }

                    const response = await fetch(targetUrl.toString(), options);

                    if (!response.ok) {
                        throw new Error(`Error HTTP: ${response.status}`);
                    }

                    const data = await response.json();

                    // Navegar result_path si existe
                    let finalData = data;
                    if (config.result_path) {
                        const paths = config.result_path.split('.');
                        for (const p of paths) {
                            if (finalData && typeof finalData === 'object' && p in finalData) {
                                finalData = finalData[p];
                            } else {
                                finalData = []; // Path no encontrado
                                break;
                            }
                        }
                    }

                    if (Array.isArray(finalData)) {
                        setResults(finalData);
                    } else {
                        setResults([finalData]); // Intentar envolver en array si no lo es
                    }
                }

            } catch (err: any) {
                console.error("Lookup error:", err);
                setFetchError(err.message || 'Error consultando datos');
                setResults([]);
            } finally {
                setIsLoading(false);
            }

        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, isOpen, config]);

    // Cerrar popover al clickear afuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (row: any) => {
        if (!config || !config.value_field) return;

        const selectedValue = row[config.value_field];
        setSelectedRecord(row);

        // Formatear término de búsqueda para mostrar algo lindo (ej: concatenar display_fields)
        const displayData = config.display_fields?.map(df => row[df]).filter(Boolean).join(' - ');
        setSearchTerm(displayData || String(selectedValue));

        onChange(selectedValue);
        setIsOpen(false);

        // Aplicar mapeos extra
        if (config.mapping) {
            const mappedUpdates: Record<string, any> = {};
            for (const [resKey, formKey] of Object.entries(config.mapping)) {
                if (row[resKey] !== undefined) {
                    mappedUpdates[formKey] = row[resKey];
                }
            }
            if (Object.keys(mappedUpdates).length > 0) {
                setFormData(prev => ({ ...prev, ...mappedUpdates }));
            }
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSearchTerm('');
        setSelectedRecord(null);
        onChange('');
        setResults([]);

        // Limpiar mapeos si es necesario - Podría ser destructivo, depende del req negocio.
        // Por ahora solo limpiamos el campo principal.
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {/* Form Input Trigger */}
            <div
                className={cn(
                    "flex items-center gap-2 w-full p-2.5 rounded-2xl border-2 bg-white dark:bg-slate-900 transition-all cursor-pointer",
                    error ? "border-rose-400" : "border-slate-200 dark:border-slate-800 hover:border-indigo-400",
                    disabled && "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50"
                )}
                onClick={() => !disabled && setIsOpen(true)}
            >
                <div className={cn("flex-shrink-0 text-indigo-500", disabled && "grayscale")}>
                    <Search className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 text-sm font-bold text-slate-700 dark:text-slate-200 text-left truncate select-none">
                    {value ? (searchTerm || value) : <span className="text-slate-400 font-medium">{field.placeholder || `Seleccionar ${config?.table_name || 'registro'}...`}</span>}
                </div>

                {value && !disabled && (
                    <button
                        onClick={handleClear}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Emergent Modal Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)} // clicking outside closes it
                >
                    <div
                        className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300 relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header & Search Bar */}
                        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                        <Search className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                                            Búsqueda: {config?.table_name || 'Catálogo'}
                                        </h3>
                                        <p className="text-[10px] font-medium text-slate-400">
                                            Escribe al menos 2 letras para buscar.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    autoFocus
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por nombre, código, etc..."
                                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-950 border-2 border-indigo-100 dark:border-indigo-900/30 rounded-xl text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                />
                                {isLoading && (
                                    <div className="absolute inset-y-0 right-3 flex items-center">
                                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search Results Area */}
                        {isLoading && results.length === 0 && (
                            <div className="p-8 flex flex-col items-center justify-center text-slate-400 gap-3 flex-1">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-500/70">Buscando información...</span>
                            </div>
                        )}

                        {fetchError && (
                            <div className="p-12 text-center flex-1">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 mb-4 ring-8 ring-rose-50 dark:ring-rose-900/10">
                                    <X className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{fetchError}</p>
                            </div>
                        )}

                        {!isLoading && !fetchError && results.length === 0 && searchTerm.length >= 2 && (
                            <div className="p-8 text-center flex flex-col items-center gap-2 flex-1">
                                <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                <span className="text-sm font-medium text-slate-500">No se encontraron resultados</span>
                                <span className="text-[10px] text-slate-400">Intenta con otros términos de búsqueda.</span>
                            </div>
                        )}

                        {!isLoading && !fetchError && results.length === 0 && searchTerm.length < 2 && (
                            <div className="p-8 text-center flex flex-col items-center gap-2 flex-1 opacity-50">
                                <Search className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                <span className="text-xs font-medium text-slate-500">Comienza a escribir</span>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="overflow-y-auto w-full flex-1 bg-white dark:bg-slate-950 custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            {config?.display_fields?.map((df, i) => (
                                                <th key={i} className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                                    {df}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {results.map((row, i) => {
                                            const isSelected = value === row[config?.value_field || ''];
                                            return (
                                                <tr
                                                    key={i}
                                                    onClick={() => handleSelect(row)}
                                                    className={cn(
                                                        "cursor-pointer transition-colors",
                                                        isSelected
                                                            ? "bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-inset ring-indigo-500/20"
                                                            : i % 2 === 0
                                                                ? "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/80"
                                                                : "bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/80"
                                                    )}
                                                >
                                                    {config?.display_fields?.map((df, j) => (
                                                        <td key={j} className="px-4 py-2.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                                            <div className="flex items-center gap-2">
                                                                {j === 0 && (
                                                                    <div className="w-4 flex justify-center flex-shrink-0">
                                                                        {isSelected ? (
                                                                            <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                                                        ) : (
                                                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <span className={cn(
                                                                    "truncate text-xs",
                                                                    isSelected ? "text-indigo-900 dark:text-indigo-200 font-semibold" : "text-slate-600 dark:text-slate-300 font-medium"
                                                                )}>
                                                                    {String(row[df])}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
