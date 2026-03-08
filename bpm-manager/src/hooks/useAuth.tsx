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
                .select('role, organization:organizations(id, name, logo_url)')
                .eq('user_id', userId);

            if (membersError) console.error('Error fetching orgs:', membersError);

            const availableOrgs = members?.map((m: any) => ({
                id: m.organization.id,
                name: m.organization.name,
                role: m.role as UserRole,
                logo_url: m.organization.logo_url
            })) || [];

            // Determine active Org
            // Prefer the last one set in profile, or the first available one
            let activeOrgId = profile?.organization_id;

            // If profile has no org or it's not in the available list (edge case), pick first
            if (!activeOrgId || !availableOrgs.find(o => o.id === activeOrgId)) {
                activeOrgId = availableOrgs[0]?.id;

                // If we found an org for them, update their profile so they aren't "without company"
                if (activeOrgId) {
                    supabase.from('profiles').update({ organization_id: activeOrgId }).eq('id', userId).then(({ error }) => {
                        if (error) console.error('Error auto-assigning organization:', error);
                    });
                }
            }

            // Get role for active org (Normalize to lowercase for consistent comparison)
            const activeRole = (availableOrgs.find(o => o.id === activeOrgId)?.role || 'viewer').toLowerCase() as UserRole;

            // 3. Get Role Capabilities & Dashboard Config
            const { data: capabilities } = await supabase
                .from('role_capabilities')
                .select('capability')
                .eq('role_name', activeRole);

            const { data: widgets } = await supabase
                .from('role_dashboard_config')
                .select('widget_id')
                .eq('role_name', activeRole)
                .order('order_index');

            // Default Perms Fallback (if table empty or migrating)
            let perms = capabilities?.map(c => c.capability) || [];
            if (perms.length === 0) {
                if (activeRole === 'admin') {
                    perms = ['manage_users', 'edit_workflows', 'view_reports', 'view_all_reports', 'access_settings'];
                } else if (activeRole === 'editor') {
                    perms = ['edit_workflows', 'view_reports'];
                } else if (activeRole === 'turista') {
                    perms = ['view_reports']; // Tourists can only view
                } else {
                    // Default for viewer
                    perms = ['view_reports'];
                }
            }

            // Default Widgets Fallback
            let widgetIds = widgets?.map(w => w.widget_id) || [];
            if (widgetIds.length === 0) {
                if (activeRole === 'turista') {
                    widgetIds = ['stats', 'inbox']; // Very compact dashboard for tourists
                } else {
                    widgetIds = ['stats', 'inbox', 'efficiency'];
                    if (activeRole !== 'viewer') widgetIds.push('workload');
                    widgetIds.push('ai');
                }
            }

            setUser({
                id: userId,
                email,
                name: profile?.full_name,
                role: activeRole,
                organization_id: activeOrgId,
                available_organizations: availableOrgs,
                permissions: perms,
                dashboard_widgets: widgetIds
            });

        } catch (err) {
            console.error('Auth Profile Fetch Error:', err);
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


