import { useState, useEffect } from 'react';
import type { Transaction } from '../types';
import { supabase } from '../lib/supabase';

export function useTransactions(userId?: string) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!userId) {
            setTransactions([]);
            return;
        }

        const fetchTransactions = async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching transactions:', error);
            } else {
                // Map DB fields to app types if necessary, though simpler if matches
                setTransactions(data as Transaction[]);
            }
        };

        fetchTransactions();

        // Optional: Realtime subscription
        const subscription = supabase
            .channel('transactions_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` }, () => {
                // Simply refetch or handle individual events
                fetchTransactions();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        }
    }, [userId]);


    const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
        if (!userId) {
            alert('Error: No hay usuario identificado. Intenta recargar la página.');
            return;
        }

        // 1. Insert into DB
        const { error } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                type: t.type,
                amount: t.amount,
                category: t.category,
                description: t.description,
                provider: t.provider,
                date: t.date,
            });

        if (error) {
            console.error('Error adding transaction:', error);
            alert('Error al guardar: ' + error.message);
            return;
        }

        // 2. Refresh list immediately (don't wait for realtime)
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (data) {
            setTransactions(data as Transaction[]);
        }
    };

    const deleteTransaction = async (id: string) => {
        if (!userId) return;

        // Optimistic update
        setTransactions(prev => prev.filter(t => t.id !== id));

        const { error } = await supabase
            .from('transactions')
            .delete()
            .match({ id, user_id: userId });

        if (error) {
            console.error('Error deleting transaction:', error);
            alert('Error al eliminar: ' + error.message);
            // Rollback if needed (would require fetching again)
            const { data } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false });
            if (data) setTransactions(data as Transaction[]);
        }
    };

    const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
        if (!userId) return;

        const { error } = await supabase
            .from('transactions')
            .update({
                type: updates.type,
                amount: updates.amount,
                category: updates.category,
                description: updates.description,
                provider: updates.provider,
                date: updates.date,
            })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating transaction:', error);
            alert('Error al actualizar: ' + error.message);
            return;
        }

        // Refresh list
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .order('date', { ascending: false });

        if (data) {
            setTransactions(data as Transaction[]);
        }
    };

    return { transactions, addTransaction, deleteTransaction, updateTransaction };
}
