import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface DepartmentHealth {
    activeTasks: number;
    overdueTasks: number;
    nearDueTasks: number;
}

export function useOrgChartAnalytics() {
    const { user } = useAuth();
    const [healthMap, setHealthMap] = useState<Record<string, DepartmentHealth>>({});
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const orgId = user?.organization_id;
            if (!orgId) return;

            // 1. Fetch all activities with their assigned areas
            const { data: activities } = await supabase
                .from('activities')
                .select('id, assigned_department_id, due_date_hours')
                .eq('organization_id', orgId);

            if (!activities) return;

            // 2. Fetch active process instances with all assignment details
            const { data: activeInstances } = await supabase
                .from('process_instances')
                .select('id, current_activity_id, created_at, assigned_user_id, assigned_position_id, assigned_department_id')
                .eq('organization_id', orgId)
                .eq('status', 'active');

            if (!activeInstances) {
                setHealthMap({});
                return;
            }

            // 3. Need helper data for rollups if instance only has user/position
            const { data: posRes } = await supabase.from('positions').select('id, department_id').eq('organization_id', orgId);
            const { data: empPosRes } = await supabase.from('employee_positions').select('user_id, position_id');

            const posToDept: Record<string, string> = {};
            posRes?.forEach(p => { if (p.department_id) posToDept[p.id] = p.department_id; });

            const userToDepts: Record<string, Set<string>> = {};
            empPosRes?.forEach(ep => {
                const deptId = posToDept[ep.position_id];
                if (deptId) {
                    if (!userToDepts[ep.user_id]) userToDepts[ep.user_id] = new Set();
                    userToDepts[ep.user_id].add(deptId);
                }
            });

            const newHealthMap: Record<string, DepartmentHealth> = {};

            const ensureDept = (id: string) => {
                if (!newHealthMap[id]) newHealthMap[id] = { activeTasks: 0, overdueTasks: 0, nearDueTasks: 0 };
                return newHealthMap[id];
            };

            activeInstances.forEach(instance => {
                const activity = activities.find(a => a.id === instance.current_activity_id);
                const targetDepts = new Set<string>();

                if (instance.assigned_department_id) {
                    targetDepts.add(instance.assigned_department_id);
                } else if (instance.assigned_position_id) {
                    const dId = posToDept[instance.assigned_position_id];
                    if (dId) targetDepts.add(dId);
                } else if (instance.assigned_user_id) {
                    userToDepts[instance.assigned_user_id]?.forEach(dId => targetDepts.add(dId));
                }

                targetDepts.forEach(deptId => {
                    const health = ensureDept(deptId);
                    health.activeTasks++;

                    // Calculate overdue
                    const dueHours = activity?.due_date_hours || 24;
                    const createdAt = new Date(instance.created_at);
                    const now = new Date();
                    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

                    if (hoursElapsed > dueHours) {
                        health.overdueTasks++;
                    } else if ((dueHours - hoursElapsed) <= 4) {
                        health.nearDueTasks++;
                    }
                });
            });

            setHealthMap(newHealthMap);
        } catch (error) {
            console.error('Error fetching org chart analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.organization_id) {
            fetchAnalytics();

            // Re-fetch when instances change
            const channel = supabase.channel('org_health_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'process_instances' }, fetchAnalytics)
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user?.organization_id]);

    return { healthMap, loading, refresh: fetchAnalytics };
}
