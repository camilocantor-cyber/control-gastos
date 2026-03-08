import { useAuth } from './useAuth';

export function usePermissions() {
    const { user } = useAuth();

    const hasPermission = (capability: string) => {
        if (!user) return false;
        // Admin has all permissions implicitly if we want, or we can follow the DB strictly.
        // For robustness during migration, let's say admin has all.
        if (user.role === 'admin') return true;

        return user.permissions?.includes(capability) || false;
    };

    const hasAnyPermission = (capabilities: string[]) => {
        return capabilities.some(c => hasPermission(c));
    };

    const hasAllPermissions = (capabilities: string[]) => {
        return capabilities.every(c => hasPermission(c));
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        permissions: user?.permissions || [],
        isAdmin: user?.role === 'admin',
        isEditor: user?.role === 'editor',
        isViewer: user?.role === 'viewer'
    };
}
