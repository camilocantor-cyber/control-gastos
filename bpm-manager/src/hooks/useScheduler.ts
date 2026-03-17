import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useExecution } from './useExecution';
import type { ScheduledProcess, RecurrencePattern } from '../types';
import { toast } from 'sonner';

export function useScheduler(organizationId?: string) {
    const { startProcess } = useExecution();
    const isProcessing = useRef(false);

    useEffect(() => {
        if (!organizationId) return;

        // Run every 60 seconds
        const interval = setInterval(() => {
            checkScheduledProcesses();
        }, 60000);

        // Run once on mount
        checkScheduledProcesses();

        return () => clearInterval(interval);
    }, [organizationId]);

    function getNextScheduledDate(currentDate: string, pattern: RecurrencePattern, interval: number = 1): string {
        const date = new Date(currentDate);
        if (pattern === 'daily') {
            date.setDate(date.getDate() + interval);
        } else if (pattern === 'weekly') {
            date.setDate(date.getDate() + (7 * interval));
        } else if (pattern === 'custom_days') {
            date.setDate(date.getDate() + interval);
        }
        return date.toISOString();
    }

    async function checkScheduledProcesses() {
        if (isProcessing.current || !organizationId) return;

        try {
            isProcessing.current = true;
            const now = new Date().toISOString();

            // Fetch pending processes that should have started by now
            const { data: pending, error } = await supabase
                .from('scheduled_processes')
                .select('*')
                .eq('organization_id', organizationId)
                .eq('status', 'pending')
                .lte('scheduled_at', now);

            if (error) throw error;
            if (!pending || pending.length === 0) return;

            console.log(`[SCHEDULER] Found ${pending.length} tasks to execute.`);

            for (const sp of pending as ScheduledProcess[]) {
                try {
                    // 1. ATOMIC CLAIM: Try to update the process to 'busy' or update its date immediately
                    // This prevents other tabs from picking up the same task.
                    const nextDate = sp.is_recurring && sp.recurrence_pattern !== 'none'
                        ? getNextScheduledDate(sp.scheduled_at, sp.recurrence_pattern, sp.recurrence_interval)
                        : sp.scheduled_at;

                    // Ensure nextDate is in the future (catch-up logic)
                    let futureNextDate = nextDate;
                    if (sp.is_recurring) {
                        while (new Date(futureNextDate) <= new Date()) {
                            futureNextDate = getNextScheduledDate(futureNextDate, sp.recurrence_pattern, sp.recurrence_interval);
                        }
                    }

                    const { data: claim, error: claimError } = await supabase
                        .from('scheduled_processes')
                        .update({
                            scheduled_at: futureNextDate,
                            last_run_at: now,
                            status: sp.is_recurring ? 'pending' : 'active'
                        })
                        .eq('id', sp.id)
                        .eq('status', 'pending') // Only if still pending
                        .lte('scheduled_at', now) // Only if still due
                        .select();

                    if (claimError || !claim || claim.length === 0) {
                        // Someone else claimed it or condition changed
                        continue;
                    }

                    // 2. Start the process (only if we won the claim)
                    console.log(`[SCHEDULER] Executing task: ${sp.name}`);
                    const result = await startProcess(sp.workflow_id, sp.name, sp.organization_id);

                    if (result.success) {
                        toast.success(`Tarea programada iniciada: ${sp.name}`, {
                            description: `Iniciado automáticamente por el programador. Next: ${new Date(futureNextDate).toLocaleString()}`
                        });
                    } else {
                        console.error(`[SCHEDULER] Failed to start process ${sp.id}:`, result.error);
                        // Optional: Rollback or mark as failed? For now, we've already moved the date.
                    }
                } catch (taskErr) {
                    console.error(`[SCHEDULER] Error processing task ${sp.id}:`, taskErr);
                }
            }
        } catch (err) {
            console.error('[SCHEDULER] Error in scheduler loop:', err);
        } finally {
            isProcessing.current = false;
        }
    }
}
