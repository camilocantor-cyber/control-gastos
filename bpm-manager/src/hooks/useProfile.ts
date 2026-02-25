import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../types';

export function useProfile(userId: string | undefined) {
    const [profile, setProfile] = useState<{ full_name: string | null; role: UserRole } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchProfile();
        }
    }, [userId]);

    async function fetchProfile() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data as any);
        } catch (error: any) {
            console.error('Error fetching profile:', error.message);
        } finally {
            setLoading(false);
        }
    }

    return { profile, loading, reload: fetchProfile };
}
