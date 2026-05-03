import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface AccountBalance {
    account_code: string;
    account_name: string;
    account_type: string;
    nature: string;
    total_debit: number;
    total_credit: number;
    balance: number;
}

export function useAccountingReports() {
    const { user } = useAuth();
    const [balances, setBalances] = useState<AccountBalance[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function loadBalanceReport(_dateFrom?: string, _dateTo?: string) {
        if (!user?.organization_id) return;
        try {
            setLoading(true);
            setError(null);

            // Fetch balances using a custom RPC if possible, or manual aggregation
            // Since I don't want to rely on the user having run the RPC yet, I'll do a manual aggregation
            const { data: details, error: fetchError } = await supabase
                .from('journal_entry_details')
                .select(`
                    account_code,
                    debit_amount,
                    credit_amount,
                    journal_entries!inner(entry_date, status, organization_id),
                    account:chart_of_accounts(name, account_type, nature)
                `)
                .eq('journal_entries.organization_id', user.organization_id)
                .eq('journal_entries.status', 'POSTED');

            if (fetchError) throw fetchError;

            // Manual aggregation
            const agg: Record<string, AccountBalance> = {};
            details.forEach((d: any) => {
                const code = d.account_code;
                if (!agg[code]) {
                    agg[code] = {
                        account_code: code,
                        account_name: d.account?.name || 'Unknown',
                        account_type: d.account?.account_type || 'Unknown',
                        nature: d.account?.nature || 'DEBITO',
                        total_debit: 0,
                        total_credit: 0,
                        balance: 0
                    };
                }
                agg[code].total_debit += parseFloat(d.debit_amount || 0);
                agg[code].total_credit += parseFloat(d.credit_amount || 0);
            });

            // Calculate final balance based on nature
            const result = Object.values(agg).map(item => {
                if (item.nature === 'DEBITO') {
                    item.balance = item.total_debit - item.total_credit;
                } else {
                    item.balance = item.total_credit - item.total_debit;
                }
                return item;
            }).sort((a, b) => a.account_code.localeCompare(b.account_code));

            setBalances(result);
        } catch (err) {
            console.error('Error loading balance report:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar reporte');
        } finally {
            setLoading(false);
        }
    }

    return {
        balances,
        loading,
        error,
        loadBalanceReport
    };
}
