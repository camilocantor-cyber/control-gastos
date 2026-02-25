import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { UserRole } from '../types';

export interface Member {
    id: string;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    position?: string;
    department?: string;
}

export function useOrganizationMembers() {
    const { user, loading: authLoading } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (user?.organization_id) {
            fetchMembers();
        } else {
            setLoading(false);
        }
    }, [user?.organization_id, authLoading]);

    async function fetchMembers() {
        try {
            setLoading(true);
            if (!user?.organization_id) return;

            const { data, error } = await supabase
                .from('organization_members')
                .select(`
                    user_id, 
                    role, 
                    profile:profiles(id, full_name, email),
                    employee_positions:employee_positions(
                        position:positions(title, department:departments(name))
                    )
                `)
                .eq('organization_id', user.organization_id);

            if (error) throw error;

            const mappedMembers = data.map((item: any) => {
                const empPos = item.employee_positions?.[0];
                return {
                    id: item.profile.id,
                    full_name: item.profile.full_name,
                    email: item.profile.email,
                    role: item.role,
                    position: empPos?.position?.title,
                    department: empPos?.position?.department?.name
                };
            });

            setMembers(mappedMembers);
        } catch (error) {
            console.error('Error fetching organization members:', error);
        } finally {
            setLoading(false);
        }
    }

    return { members, loading, refresh: fetchMembers };
}
