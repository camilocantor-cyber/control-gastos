import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ChartOfAccount, AccountFormData } from '../types/accounting';
import { useAuth } from './useAuth';

export function useChartOfAccounts() {
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user?.organization_id) {
            loadAccounts();
        }
    }, [user?.organization_id]);

    async function loadAccounts() {
        if (!user?.organization_id) return;
        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await supabase
                .from('chart_of_accounts')
                .select('*')
                .or(`organization_id.eq.${user.organization_id},organization_id.is.null`)
                .eq('is_active', true)
                .order('code', { ascending: true });

            if (fetchError) throw fetchError;

            // Deduplicar: Si existe una cuenta propia de la organización, ignoramos la global con el mismo código
            const orgAccounts = data?.filter(a => a.organization_id === user.organization_id) || [];
            const globalAccounts = data?.filter(a => !a.organization_id) || [];

            const finalAccounts = [...orgAccounts];
            globalAccounts.forEach(ga => {
                if (!orgAccounts.some(oa => oa.code === ga.code)) {
                    finalAccounts.push(ga);
                }
            });

            setAccounts(finalAccounts.sort((a, b) => a.code.localeCompare(b.code)));
        } catch (err) {
            console.error('Error loading chart of accounts:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }

    async function addAccount(accountData: AccountFormData): Promise<boolean> {
        if (!user?.organization_id) return false;
        try {
            setError(null);

            const { error: insertError } = await supabase
                .from('chart_of_accounts')
                .insert([{
                    ...accountData,
                    organization_id: user.organization_id,
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

    async function seedPUC(): Promise<boolean> {
        if (!user?.organization_id) return false;
        try {
            setLoading(true);
            setError(null);

            const { error: rpcError } = await supabase
                .rpc('seed_puc_comercial', { p_organization_id: user.organization_id });

            if (rpcError) throw rpcError;

            await loadAccounts();
            return true;
        } catch (err) {
            console.error('Error seeding PUC:', err);
            setError(err instanceof Error ? err.message : 'Error al inicializar el PUC');
            return false;
        } finally {
            setLoading(false);
        }
    }

    return {
        accounts,
        loading,
        error,
        addAccount,
        updateAccount,
        deleteAccount,
        seedPUC,
        getAccountsByType,
        getAccountsByLevel,
        getMovementAccounts,
        getAccountByCode,
        getChildAccounts,
        buildAccountTree,
        reload: loadAccounts
    };
}
