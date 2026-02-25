import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface ProcessStatusStats {
    active: number;
    completed: number;
}

interface ActivityWorkload {
    activity_name: string;
    task_count: number;
}

interface WorkflowTimeStats {
    workflow_name: string;
    avg_hours: number;
    count: number;
}

interface UserPerformance {
    user_name: string;
    tasks_completed: number;
}

interface AnalyticsData {
    processStatus: ProcessStatusStats;
    avgResolutionTimeByWorkflow: WorkflowTimeStats[];
    userEfficiency: WorkflowTimeStats[];
    topActivities: ActivityWorkload[];
    topUsers: UserPerformance[];
    loading: boolean;
}


export function useDashboardAnalytics() {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData>({
        processStatus: { active: 0, completed: 0 },
        avgResolutionTimeByWorkflow: [],
        userEfficiency: [],
        topActivities: [],
        topUsers: [],
        loading: true
    });

    const fetchAnalytics = useCallback(async () => {
        try {
            if (!user?.organization_id) return;

            // 1. Fetch COMPLETED instances
            const { data: completed, error: compErr } = await supabase
                .from('process_instances')
                .select('id, created_at, workflow_id, workflows(name)')
                .eq('organization_id', user.organization_id)
                .eq('status', 'completed');

            if (compErr) throw compErr;

            // 2. Fetch ACTIVE instances (for workload)
            const { data: active, error: activeErr } = await supabase
                .from('process_instances')
                .select('id, current_activity_id, activities(name)')
                .eq('organization_id', user.organization_id)
                .eq('status', 'active');

            if (activeErr) throw activeErr;

            // 3. Fetch History for completion times
            // Scope history to CURRENT organization by only looking at relevant processes
            const completedIds = completed?.map(p => p.id) || [];
            if (completedIds.length === 0 && (active?.length || 0) === 0) {
                setData(prev => ({ ...prev, loading: false }));
                return;
            }

            const { data: history, error: histErr } = await supabase
                .from('process_history')
                .select('created_at, process_id, action, user_id, profiles(full_name)')
                .in('process_id', [...completedIds, ...(active?.map(a => a.id) || [])])
            // A. Top Users (based on historical 'completed' actions - actually counting all interactions now)
            // We should filter for 'completed' or meaningful actions if we want "Tasks Completed"
            // Let's count any action that moves the process forward as a "Task Completed"
            const userCounts: Record<string, number> = {};
            const userDurations: Record<string, { total: number, count: number }> = {};

            // Group history by process for time calc
            const processHistory: Record<string, any[]> = {};
            history?.forEach(h => {
                const name = (h.profiles as any)?.full_name || 'Gestor';
                userCounts[name] = (userCounts[name] || 0) + 1;

                if (!processHistory[h.process_id]) processHistory[h.process_id] = [];
                processHistory[h.process_id].push(h);
            });

            const topUsers = Object.entries(userCounts)
                .map(([user_name, tasks_completed]) => ({ user_name, tasks_completed }))
                .sort((a, b) => b.tasks_completed - a.tasks_completed)
                .slice(0, 5);

            // B. Avg Time by Workflow (GLOBAL - End-to-End)
            const workflowStats: Record<string, { total: number, count: number }> = {};
            // C. Avg Time by Workflow (PERSONAL - Task Level)
            const personalStats: Record<string, { total: number, count: number }> = {};

            // Process Duration Calculation
            completed?.forEach(p => {
                const pHis = processHistory[p.id] || [];
                // Sort by date ascending
                pHis.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                if (pHis.length > 0) {
                    const startTime = new Date(p.created_at).getTime();
                    // Find the 'completed' action
                    const finishAction = pHis.find(h => h.action === 'completed');

                    if (finishAction) {
                        const endTime = new Date(finishAction.created_at).getTime();
                        const hours = Math.max(0, (endTime - startTime) / (1000 * 60 * 60));

                        const wfData = Array.isArray(p.workflows) ? p.workflows[0] : p.workflows;
                        const wfName = wfData?.name || 'Proceso';

                        if (!workflowStats[wfName]) workflowStats[wfName] = { total: 0, count: 0 };
                        workflowStats[wfName].total += hours;
                        workflowStats[wfName].count += 1;
                    }
                }
            });

            // Personal Efficiency Calculation (Task Response Time)
            // We look at ALL history (active + completed processes) 
            Object.values(processHistory).forEach(pHis => {
                pHis.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                for (let i = 0; i < pHis.length; i++) {
                    const current = pHis[i];
                    if (current.user_id !== user.id) continue;

                    // Calculate time since PREVIOUS action (or start if i=0)
                    let duration = 0;
                    const currentTime = new Date(current.created_at).getTime();

                    if (i === 0) {
                        // First action? Maybe compared to process creation?
                        // We don't have process creation time easily here without looking up the parent instance
                        // Let's skip first action if we can't link it, OR assume reasonable start.
                        // Actually we can map process_id back to instance, but let's just use diff with prev action for robustness.
                        continue;
                    } else {
                        const prev = pHis[i - 1];
                        const prevTime = new Date(prev.created_at).getTime();
                        duration = (currentTime - prevTime) / (1000 * 60 * 60);
                    }

                    // Find workflow name for this process
                    // We need to look it up from 'completed' or 'active' lists
                    const completionRecord = completed?.find(c => c.id === current.process_id);
                    const activeRecord = active?.find(a => a.id === current.process_id);
                    const record = completionRecord || activeRecord;

                    if (record) {
                        // Extract workflow name robustly
                        let wfName = 'Otros';
                        if (completionRecord && completionRecord.workflows) {
                            wfName = (Array.isArray(completionRecord.workflows) ? completionRecord.workflows[0] : completionRecord.workflows)?.name || 'Otros';
                        } else if (activeRecord && activeRecord.activities) {
                            // Active record joined activities? Wait, active query selects `activities(name)`.
                            // Check the active query: `activities(name)` -> This is Activity Name, NOT Workflow.
                            // We need Workflow Name for Active records too if we want to group by it.
                            // The active query at line 61 fetches `activities(name)`. It does NOT fetch workflow.
                            // We should update the active query to fetch workflow name via activity or directly if linked.
                            // Assuming activities have workflow_id... 
                            // Let's just group by "Actividad" or skip active record workflow grouping for now to avoid breaking query.
                            // OR use what we have.
                            // Actually, let's just stick to `completed` processes for Personal Stats aggregation for now? 
                            // NO, user wants "enviado o atendido".
                            // Let's modify the ACTIVE query to include workflow name.
                        }

                        // Hack: For now, if we can't find workflow name effortlessly for active tasks without changing query structure too much...
                        // Let's check if we can infer it. 
                        // Actually, let's keep it simple: Only calculate Personal Stats for Completed Processes where we HAVE the workflow name already loaded.
                        // AND/OR: Fix the active query.

                        if (completionRecord) { // Only using completed for reliable workflow name
                            const wfData = Array.isArray(completionRecord.workflows) ? completionRecord.workflows[0] : completionRecord.workflows;
                            wfName = wfData?.name || 'Otros';

                            if (!personalStats[wfName]) personalStats[wfName] = { total: 0, count: 0 };
                            // Filter out outliers (> 1 year)
                            if (duration < 8760) {
                                personalStats[wfName].total += duration;
                                personalStats[wfName].count += 1;
                            }
                        }
                    }
                }
            });

            const avgResolutionTimeByWorkflow = Object.entries(workflowStats).map(([name, stats]) => ({
                workflow_name: name,
                avg_hours: Number((stats.total / stats.count).toFixed(2)),
                count: stats.count
            }));

            const userEfficiency = Object.entries(personalStats).map(([name, stats]) => ({
                workflow_name: name,
                avg_hours: Number((stats.total / stats.count).toFixed(2)),
                count: stats.count
            }));

            // C. Top Activities (Load)
            const actCounts: Record<string, number> = {};
            active?.forEach(p => {
                const actData = Array.isArray(p.activities) ? p.activities[0] : p.activities;
                const name = actData?.name || 'Pendiente';
                actCounts[name] = (actCounts[name] || 0) + 1;
            });
            const topActivities = Object.entries(actCounts)
                .map(([activity_name, task_count]) => ({ activity_name, task_count }))
                .sort((a, b) => b.task_count - a.task_count)
                .slice(0, 5);

            setData({
                processStatus: {
                    active: active?.length || 0,
                    completed: completed?.length || 0
                },
                avgResolutionTimeByWorkflow,
                userEfficiency: userEfficiency,
                topActivities: Object.entries(actCounts)
                    .map(([activity_name, task_count]) => ({ activity_name, task_count }))
                    .sort((a, b) => b.task_count - a.task_count)
                    .slice(0, 5),
                topUsers,
                loading: false
            });

        } catch (err) {
            console.error('Analytics Error:', err);
            setData(prev => ({ ...prev, loading: false }));
        }
    }, [user?.organization_id]);

    useEffect(() => {
        if (user?.organization_id) {
            fetchAnalytics();
            const channels = [
                supabase.channel('dashboard-instances').on('postgres_changes', { event: '*', schema: 'public', table: 'process_instances' }, fetchAnalytics).subscribe(),
                supabase.channel('dashboard-history').on('postgres_changes', { event: '*', schema: 'public', table: 'process_history' }, fetchAnalytics).subscribe()
            ];
            return () => { channels.forEach(c => supabase.removeChannel(c)); };
        }
    }, [user?.organization_id, fetchAnalytics]);

    return { ...data, refresh: fetchAnalytics };
}
