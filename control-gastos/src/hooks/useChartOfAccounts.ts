import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ChartOfAccount, AccountFormData } from '../types/accounting';

export function useChartOfAccounts() {
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    async function loadAccounts() {
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('chart_of_accounts')
                .select('*')
                .eq('is_active', true)
                .order('code', { ascending: true });

            if (fetchError) throw fetchError;
            setAccounts(data || []);
        } catch (err) {
            console.error('Error loading chart of accounts:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }

    async function addAccount(accountData: AccountFormData): Promise<boolean> {
        try {
            setError(null);

            const { error: insertError } = await supabase
                .from('chart_of_accounts')
                .insert([{
                    ...accountData,
                    is_active: true
                }]);

            if (insertError) throw insertError;

            await loadAccounts();
            return true;
        } catch (err) {
            console.error('Error adding account:', err);
            setError(err instanceof Error ? err.message : 'Error al crear cuenta');
            return false;
        }
    }

    async function updateAccount(id: string, accountData: Partial<AccountFormData>): Promise<boolean> {
        try {
            setError(null);

            const { error: updateError } = await supabase
                .from('chart_of_accounts')
                .update({
                    ...accountData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            await loadAccounts();
            return true;
        } catch (err) {
            console.error('Error updating account:', err);
            setError(err instanceof Error ? err.message : 'Error al actualizar cuenta');
            return false;
        }
    }

    async function deleteAccount(id: string): Promise<boolean> {
        try {
            setError(null);

            // Soft delete
            const { error: deleteError } = await supabase
                .from('chart_of_accounts')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (deleteError) throw deleteError;

            await loadAccounts();
            return true;
        } catch (err) {
            console.error('Error deleting account:', err);
            setError(err instanceof Error ? err.message : 'Error al eliminar cuenta');
            return false;
        }
    }

    function getAccountsByType(accountType: string): ChartOfAccount[] {
        return accounts.filter(acc => acc.account_type === accountType);
    }

    function getAccountsByLevel(level: number): ChartOfAccount[] {
        return accounts.filter(acc => acc.level === level);
    }

    function getMovementAccounts(): ChartOfAccount[] {
        return accounts.filter(acc => acc.accepts_movement);
    }

    function getAccountByCode(code: string): ChartOfAccount | undefined {
        return accounts.find(acc => acc.code === code);
    }

    function getChildAccounts(parentCode: string): ChartOfAccount[] {
        return accounts.filter(acc => acc.parent_code === parentCode);
    }

    function buildAccountTree(): ChartOfAccount[] {
        const rootAccounts = accounts.filter(acc => acc.level === 1);

        function attachChildren(account: ChartOfAccount): any {
            const children = getChildAccounts(account.code);
            return {
                ...account,
                children: children.map(child => attachChildren(child))
            };
        }

        return rootAccounts.map(root => attachChildren(root));
    }

    return {
        accounts,
        loading,
        error,
        addAccount,
        updateAccount,
        deleteAccount,
        getAccountsByType,
        getAccountsByLevel,
        getMovementAccounts,
        getAccountByCode,
        getChildAccounts,
        buildAccountTree,
        reload: loadAccounts
    };
}
