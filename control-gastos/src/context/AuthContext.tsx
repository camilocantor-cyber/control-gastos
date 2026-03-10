import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string) => Promise<{ error: string | null }>;
    signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error: string | null }>;
    verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Safety timeout to prevent indefinite loading
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('Auth initialization timed out, forcing loading to false');
                setLoading(false);
            }
        }, 8000);

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                if (session.user.email) {
                    fetchProfile(session.user.id, session.user.email);
                }
            } else {
                setLoading(false);
            }
        }).catch(err => {
            console.error('Error in getSession:', err);
            setLoading(false);
        });

        // Listen for auth changes
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

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
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

            let activeOrgId = profile?.organization_id || availableOrgs[0]?.id;
            const activeRole = (availableOrgs.find(o => o.id === activeOrgId)?.role || 'viewer').toLowerCase() as UserRole;

            // 3. Get Role Capabilities
            const { data: capabilities } = await supabase
                .from('role_capabilities')
                .select('capability')
                .eq('role_name', activeRole);

            const perms = capabilities?.map(c => c.capability) || [];

            setUser({
                id: userId,
                email,
                name: profile?.full_name,
                role: activeRole,
                organization_id: activeOrgId,
                available_organizations: availableOrgs,
                permissions: perms,
            });

        } catch (err) {
            console.error('Auth Profile Fetch Error:', err);
        } finally {
            setLoading(false);
        }
    }

    const signIn = async (email: string) => {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin,
            }
        });
        return { error: error?.message || null };
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { error: error?.message || null };
    };

    const signInWithPassword = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error: error?.message || null };
    };

    const verifyOtp = async (email: string, token: string) => {
        const { error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });
        return { error: error?.message || null };
    }

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signInWithPassword, signOut, resetPassword, verifyOtp }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
