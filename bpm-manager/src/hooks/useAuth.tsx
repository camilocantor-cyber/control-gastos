import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    switchOrganization: (orgId: string) => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signOut: async () => { },
    switchOrganization: async () => { },
    resetPassword: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                if (session.user.email) {
                    fetchProfile(session.user.id, session.user.email);
                }
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                if (session.user.email) {
                    fetchProfile(session.user.id, session.user.email);
                }
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    async function fetchProfile(userId: string, email: string) {
        try {
            // 1. Get Profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) console.error('Error fetching profile:', profileError);

            // 2. Get Organizations Member of
            const { data: members, error: membersError } = await supabase
                .from('organization_members')
                .select('role, organization:organizations(id, name)')
                .eq('user_id', userId);

            if (membersError) console.error('Error fetching orgs:', membersError);

            const availableOrgs = members?.map((m: any) => ({
                id: m.organization.id,
                name: m.organization.name,
                role: m.role as UserRole
            })) || [];

            // Determine active Org
            // Prefer the last one set in profile, or the first available one
            let activeOrgId = profile?.organization_id;
            // If profile has no org or it's not in the available list (edge case), pick first
            if (!activeOrgId || !availableOrgs.find(o => o.id === activeOrgId)) {
                activeOrgId = availableOrgs[0]?.id;
            }

            // Get role for active org
            const activeRole = availableOrgs.find(o => o.id === activeOrgId)?.role || 'viewer';

            setUser({
                id: userId,
                email,
                name: profile?.full_name,
                role: activeRole,
                organization_id: activeOrgId,
                available_organizations: availableOrgs
            });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function signIn(email: string) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        return { error: error?.message || null };
    }

    async function signOut() {
        await supabase.auth.signOut();
        setUser(null);
    }

    async function resetPassword(email: string) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { error: error?.message || null };
    }

    async function switchOrganization(orgId: string) {
        if (!user) return;

        // Optimistic update
        const targetedOrg = user.available_organizations?.find(o => o.id === orgId);
        if (!targetedOrg) return;

        setUser(prev => prev ? ({ ...prev, organization_id: orgId, role: targetedOrg.role }) : null);

        // Persist preference (Optional, but good UX)
        await supabase.from('profiles').update({ organization_id: orgId }).eq('id', user.id);

        // Reload to be sure
        window.location.reload(); // Hard reload to clear any stale state in components/hooks
    }

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut, switchOrganization, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);


