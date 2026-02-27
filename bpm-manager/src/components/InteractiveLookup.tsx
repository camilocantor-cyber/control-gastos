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
}

export function InteractiveLookup({ field, value, onChange, formData, setFormData, error }: InteractiveLookupProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const config = field.lookup_config;

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
        if (!isOpen || !config?.url) return;

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

                    const { data, error } = await supabase.rpc('search_dynamic_table', {
                        p_table_name: config.table_name,
                        p_search_column: config.search_column,
                        p_search_term: searchTerm,
                        p_return_columns: Array.from(returnColumns)
                    });

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
        if (!config) return;

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
            <div
                className={cn(
                    "flex items-center gap-2 w-full p-2.5 rounded-2xl border-2 bg-white dark:bg-slate-900 transition-all cursor-text",
                    isOpen
                        ? "border-indigo-500 shadow-lg shadow-indigo-500/20"
                        : error ? "border-rose-400" : "border-slate-200 dark:border-slate-800 focus-within:border-indigo-500"
                )}
                onClick={() => setIsOpen(true)}
            >
                <div className="flex-shrink-0 text-indigo-500">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </div>

                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={field.placeholder || "Buscar..."}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400"
                />

                {(searchTerm || value) && (
                    <button
                        onClick={handleClear}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 rounded-2xl border flex flex-col border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[300px]">
                    {isLoading && results.length === 0 && (
                        <div className="p-4 text-center text-sm font-medium text-slate-500">
                            Buscando...
                        </div>
                    )}

                    {fetchError && (
                        <div className="p-4 text-center text-sm font-medium text-rose-500">
                            {fetchError}
                        </div>
                    )}

                    {!isLoading && !fetchError && results.length === 0 && searchTerm.length >= 2 && (
                        <div className="p-4 text-center text-sm font-medium text-slate-500">
                            No se encontraron resultados
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="overflow-y-auto w-full">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        {config?.display_fields?.map((df, i) => (
                                            <th key={i} className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                {df}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {results.map((row, i) => {
                                        const isSelected = value === row[config?.value_field || ''];
                                        return (
                                            <tr
                                                key={i}
                                                onClick={() => handleSelect(row)}
                                                className={cn(
                                                    "cursor-pointer transition-colors",
                                                    isSelected
                                                        ? "bg-indigo-50 dark:bg-indigo-900/30"
                                                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                                )}
                                            >
                                                {config?.display_fields?.map((df, j) => (
                                                    <td key={j} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                                                        <div className="flex items-center gap-2">
                                                            {j === 0 && isSelected && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                                                            <span className={cn(j === 0 && isSelected && "font-bold text-indigo-700 dark:text-indigo-300")}>
                                                                {row[df]}
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
            )}
        </div>
    );
}
