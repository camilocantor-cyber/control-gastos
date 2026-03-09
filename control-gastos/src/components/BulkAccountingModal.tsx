import { useState } from 'react';
import { useAccountingConcepts } from '../hooks/useAccountingConcepts';
import { useJournalEntries } from '../hooks/useJournalEntries';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { X, Check, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import type { Transaction } from '../types';

interface BulkAccountingModalProps {
    onClose: () => void;
    transactions: Transaction[];
    onComplete: () => void;
}

export function BulkAccountingModal({ onClose, transactions, onComplete }: BulkAccountingModalProps) {
    const { user } = useAuth();
    const { concepts } = useAccountingConcepts();
    const { createEntryFromTransaction } = useJournalEntries(user?.id);

    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedConceptId, setSelectedConceptId] = useState('');
    const [includeAccounted, setIncludeAccounted] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const categories = Array.from(new Set(transactions.map(t => t.category))).sort();

    const transactionsToProcess = transactions.filter(t =>
        t.category === selectedCategory && (includeAccounted || !t.has_journal_entry)
    );

    const handleProcess = async () => {
        if (!selectedCategory || !selectedConceptId || !user?.id) return;

        setIsProcessing(true);
        const toProcess = [...transactionsToProcess];
        setProgress({ current: 0, total: toProcess.length });

        for (let i = 0; i < toProcess.length; i++) {
            const tx = toProcess[i];

            // Si tiene asiento y estamos re-contabilizando, borrar el anterior
            if (tx.has_journal_entry) {
                await supabase
                    .from('journal_entries')
                    .delete()
                    .eq('transaction_id', tx.id);
            }

            await createEntryFromTransaction(
                tx.id,
                tx.amount,
                selectedConceptId,
                tx.description || `Contabilización Masiva - ${tx.category}`,
                tx.date,
                undefined
            );
            setProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setIsProcessing(false);
        onComplete();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-300 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        Contabilización Masiva
                    </h3>
                    <button onClick={onClose} disabled={isProcessing} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {!isProcessing ? (
                        <>
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
                                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
                                <p className="text-xs text-blue-700">
                                    Esta herramienta permite asignar un concepto contable a los movimientos de una categoría.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">1. Selecciona la Categoría</label>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                >
                                    <option value="">Seleccionar categoría...</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedCategory && (
                                <div className="space-y-3">
                                    <div className="text-sm font-medium text-slate-600 px-1">
                                        Movimientos encontrados: <span className="text-blue-600 font-bold">{transactionsToProcess.length}</span>
                                    </div>

                                    <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={includeAccounted}
                                            onChange={(e) => setIncludeAccounted(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs font-medium text-slate-700">
                                            Re-contabilizar movimientos que ya tienen asiento
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">2. Selecciona el Concepto NIIF</label>
                                <select
                                    value={selectedConceptId}
                                    onChange={(e) => setSelectedConceptId(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                >
                                    <option value="">Seleccionar concepto...</option>
                                    {concepts.map(concept => (
                                        <option key={concept.id} value={concept.id}>
                                            [{concept.code}] {concept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleProcess}
                                disabled={!selectedCategory || !selectedConceptId || transactionsToProcess.length === 0}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Check className="w-5 h-5" />
                                Iniciar Proceso Masivo
                            </button>
                        </>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                            <div className="text-center">
                                <p className="font-bold text-slate-800">Procesando movimientos...</p>
                                <p className="text-sm text-slate-500">{progress.current} de {progress.total}</p>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
