import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useDashboardStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        workflows: 0,
        activities: 0,
        transitions: 0,
        users: 0,
        instancesActive: 0,
        instancesCompleted: 0,
        historyCount: 0,
        loading: true
    });

    const fetchStats = useCallback(async () => {
        try {
            const orgId = user?.organization_id;
            const userId = user?.id;
            if (!orgId || !userId) return;

            // Build base queries - Personalized for the user
            const qWorkflows = supabase.from('workflows').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
            const qActivities = supabase.from('activities').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);
            const qTransitions = supabase.from('transitions').select('*', { count: 'exact', head: true });
            const qUsers = supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId);

            // Filter instances by current user
            const qActive = supabase.from('process_instances')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active')
                .eq('organization_id', orgId)
                .eq('created_by', userId);

            const qCompleted = supabase.from('process_instances')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'completed')
                .eq('organization_id', orgId)
                .eq('created_by', userId);

            const qHistory = supabase.from('process_history')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            const [workflows, activities, transitions, users, instancesActive, instancesCompleted, history] = await Promise.all([
                qWorkflows,
                qActivities,
                qTransitions,
                qUsers,
                qActive,
                qCompleted,
                qHistory
            ]);

            setStats({
                workflows: workflows.count || 0,
                activities: activities.count || 0,
                transitions: transitions.count || 0,
                users: users.count || 0,
                instancesActive: instancesActive.count || 0,
                instancesCompleted: instancesCompleted.count || 0,
                historyCount: history.count || 0,
                loading: false
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    }, [user?.organization_id, user?.id]);

    useEffect(() => {
        if (user?.organization_id) {
            fetchStats();

            // Set up real-time subscriptions
            const channels = [
                supabase.channel('public:workflows').on('postgres_changes', { event: '*', schema: 'public', table: 'workflows' }, fetchStats).subscribe(),
                supabase.channel('public:activities').on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, fetchStats).subscribe(),
                supabase.channel('public:transitions').on('postgres_changes', { event: '*', schema: 'public', table: 'transitions' }, fetchStats).subscribe(),
                supabase.channel('public:profiles').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, fetchStats).subscribe(),
                supabase.channel('public:process_instances').on('postgres_changes', { event: '*', schema: 'public', table: 'process_instances' }, fetchStats).subscribe(),
                supabase.channel('public:process_history').on('postgres_changes', { event: '*', schema: 'public', table: 'process_history' }, fetchStats).subscribe()
            ];

            return () => {
                channels.forEach(channel => supabase.removeChannel(channel));
            };
        }
    }, [user?.organization_id, fetchStats]);

    return { ...stats, refresh: fetchStats };
}
