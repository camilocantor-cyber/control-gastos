import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Provider {
    id: string;
    name: string;
    user_id: string;
    created_at: string;
}

export function useProviders(userId?: string) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setProviders([]);
            setLoading(false);
            return;
        }

        const fetchProviders = async () => {
            const { data, error } = await supabase
                .from('providers')
                .select('*')
                .eq('user_id', userId)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching providers:', error);
            } else {
                setProviders(data as Provider[]);
            }
            setLoading(false);
        };

        fetchProviders();

        const subscription = supabase
            .channel('providers_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'providers', filter: `user_id=eq.${userId}` }, () => {
                fetchProviders();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [userId]);

    const addProvider = async (name: string) => {
        if (!userId) return { error: 'No user' };

        const { data, error } = await supabase
            .from('providers')
            .insert({ user_id: userId, name })
            .select()
            .single();

        return { data, error: error?.message };
    };

    const updateProvider = async (id: string, name: string) => {
        if (!userId) return { error: 'No user' };

        const { data, error } = await supabase
            .from('providers')
            .update({ name })
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        return { data, error: error?.message };
    };

    const deleteProvider = async (id: string) => {
        if (!userId) return { error: 'No user' };

        const { error } = await supabase
            .from('providers')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        return { error: error?.message };
    };

    return {
        providers,
        loading,
        addProvider,
        updateProvider,
        deleteProvider
    };
}
