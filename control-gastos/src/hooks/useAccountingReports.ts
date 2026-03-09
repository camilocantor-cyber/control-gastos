import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AccountBalance } from '../types/accounting';

export interface ReportItem {
    code: string;
    name: string;
    balance: number;
    level: number;
    account_type: string;
    children: ReportItem[];
}

export function useAccountingReports(userId?: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function getFullReport(types: string[], startDate: string | null, endDate: string) {
        if (!userId) return [];

        try {
            setLoading(true);
            setError(null);

            // 1. Fetch ALL account balances (including Income/Expenses to calculate Net Income)
            const { data: allBalances, error: rpcError } = await supabase.rpc('get_account_balances', {
                p_user_id: userId,
                p_start_date: null, // Always from beginning for Balance sheet
                p_end_date: endDate
            });

            if (rpcError) throw rpcError;

            // 2. Calculate Net Income (Income - Expenses - Costs)
            const netIncome = (allBalances as AccountBalance[] || []).reduce((acc, curr) => {
                if (curr.account_type === 'INGRESO') return acc + curr.balance;
                if (curr.account_type === 'GASTO' || curr.account_type === 'COSTOS') return acc - curr.balance;
                return acc;
            }, 0);

            // 3. Fetch account definitions
            const { data: accounts, error: accountsError } = await supabase
                .from('chart_of_accounts')
                .select('code, name, account_type, level')
                .in('account_type', types);

            if (accountsError) throw accountsError;

            const totals = new Map<string, number>();

            // Aggregate balances
            (allBalances as AccountBalance[] || [])
                .filter(b => types.includes(b.account_type))
                .forEach(b => {
                    const code = b.account_code;
                    const amount = b.balance;

                    for (let i = 1; i <= code.length; i++) {
                        const prefix = code.substring(0, i);
                        if ([1, 2, 4, 6, 8, 10].includes(prefix.length)) {
                            totals.set(prefix, (totals.get(prefix) || 0) + amount);
                        }
                    }
                });

            // 4. Inject Net Income into Patrimonio if we are doing a Balance Sheet
            if (types.includes('PATRIMONIO')) {
                const targetCode = netIncome >= 0 ? '3605' : '3610'; // 3605: Utilidad, 3610: Pérdida
                const prefixes = ['3', '36', targetCode];

                prefixes.forEach(prefix => {
                    const current = totals.get(prefix) || 0;
                    totals.set(prefix, current + Math.abs(netIncome));
                });
            }

            if (!accounts) return [];

            const report = accounts
                .filter(acc => totals.has(acc.code))
                .map(acc => ({
                    code: acc.code,
                    name: acc.name,
                    balance: totals.get(acc.code) || 0,
                    level: acc.level,
                    account_type: acc.account_type,
                    children: []
                }))
                .sort((a, b) => a.code.localeCompare(b.code));

            return report;
        } catch (err) {
            console.error('Error fetching full report:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar reporte');
            return [];
        } finally {
            setLoading(false);
        }
    }

    return {
        loading,
        error,
        getFullReport
    };
}
