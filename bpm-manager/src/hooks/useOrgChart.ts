import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Department, Position, DepartmentWithChildren, EmployeePosition } from '../types';

export function useOrgChart(organizationId: string) {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [employeePositions, setEmployeePositions] = useState<EmployeePosition[]>([]);
    const [availableCollaborators, setAvailableCollaborators] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!organizationId) return;

        loadChart(true);

        // Subscribe to changes in process_instances to update workload in real-time
        const channel = supabase.channel(`org_workload_${organizationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'process_instances'
            }, (payload: any) => {
                // If the instance belongs to our org, refresh without showing full loader
                if (payload.new?.organization_id === organizationId || payload.old?.organization_id === organizationId) {
                    loadChart(false);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [organizationId]);

    async function loadChart(showLoading = false) {
        try {
            if (showLoading) setLoading(true);
            // Fetch workload data for the organization
            const [deptRes, posRes, empPosRes, workloadRes] = await Promise.all([
                supabase.from('departments').select('*').eq('organization_id', organizationId).order('name'),
                supabase.from('positions').select('*').eq('organization_id', organizationId).order('level'),
                supabase.from('employee_positions')
                    .select('*, user:profiles(id, full_name, email)'),
                supabase.from('process_instances')
                    .select('assigned_user_id, assigned_position_id, assigned_department_id')
                    .eq('organization_id', organizationId)
                    .eq('status', 'active')
            ]);

            const userWorkload: Record<string, number> = {};
            const posWorkload: Record<string, number> = {};
            const deptWorkload: Record<string, number> = {};

            // Helper maps for rollups
            const posToDept: Record<string, string> = {};
            posRes.data?.forEach(p => { if (p.department_id) posToDept[p.id] = p.department_id; });

            const userToPositions: Record<string, string[]> = {};
            empPosRes.data?.forEach(ep => {
                if (!userToPositions[ep.user_id]) userToPositions[ep.user_id] = [];
                userToPositions[ep.user_id].push(ep.position_id);
            });

            workloadRes.data?.forEach(w => {
                // 1. Direct counts
                if (w.assigned_user_id) {
                    userWorkload[w.assigned_user_id] = (userWorkload[w.assigned_user_id] || 0) + 1;
                    // Roll up to user's positions and their departments
                    userToPositions[w.assigned_user_id]?.forEach(posId => {
                        posWorkload[posId] = (posWorkload[posId] || 0) + 1;
                        if (posToDept[posId]) deptWorkload[posToDept[posId]] = (deptWorkload[posToDept[posId]] || 0) + 1;
                    });
                } else if (w.assigned_position_id) {
                    posWorkload[w.assigned_position_id] = (posWorkload[w.assigned_position_id] || 0) + 1;
                    // Roll up to position's department
                    if (posToDept[w.assigned_position_id]) {
                        deptWorkload[posToDept[w.assigned_position_id]] = (deptWorkload[posToDept[w.assigned_position_id]] || 0) + 1;
                    }
                } else if (w.assigned_department_id) {
                    deptWorkload[w.assigned_department_id] = (deptWorkload[w.assigned_department_id] || 0) + 1;
                }
            });

            console.log('Workload data calculated');

            if (deptRes.error) throw deptRes.error;
            if (posRes.error) throw posRes.error;
            if (empPosRes.error) throw empPosRes.error;

            // Cargar colaboradores de la organización para el dropdown de asignación
            const { data: collaborators } = await supabase
                .from('organization_members')
                .select('user_id, profile:profiles(id, full_name, email)')
                .eq('organization_id', organizationId);

            const collaboratorsList = (collaborators || []).map(c => ({
                id: (c.profile as any)?.id || c.user_id,
                full_name: (c.profile as any)?.full_name || 'Sin nombre',
                email: (c.profile as any)?.email || ''
            }));
            setAvailableCollaborators(collaboratorsList);

            // 4. Enriquecer departamentos con carga
            const enrichedDepts = (deptRes.data || []).map(d => ({
                ...d,
                workload_count: deptWorkload[d.id] || 0
            }));
            setDepartments(enrichedDepts);

            // 5. Enriquecer posiciones con empleados y carga
            const enrichedPositions = (posRes.data || []).map(p => ({
                ...p,
                workload_count: posWorkload[p.id] || 0,
                employees: (empPosRes.data || [])
                    .filter(ep => ep.position_id === p.id)
                    .map(ep => ({
                        user_id: ep.user_id,
                        user_name: (ep as any).user?.full_name || 'Sin nombre',
                        user_email: (ep as any).user?.email || '',
                        is_primary: ep.is_primary,
                        workload_count: userWorkload[ep.user_id] || 0
                    }))
            }));

            setPositions(enrichedPositions);
            setEmployeePositions(empPosRes.data || []);

            // Log for debugging (visible to developer in browser)
            console.log('Workload calculated:', {
                totalPending: workloadRes.data?.length,
                userCounts: userWorkload,
                deptCounts: deptWorkload
            });
        } catch (error: any) {
            console.error('Error loading org chart:', error.message);
        } finally {
            setLoading(false);
        }
    }

    const buildTree = (depts: Department[], parentId: string | null = null): DepartmentWithChildren[] => {
        return depts
            .filter(d => d.parent_department_id === parentId)
            .map(d => ({
                ...d,
                children: buildTree(depts, d.id),
                positions: positions
                    .filter(p => p.department_id === d.id)
                    .map(p => ({
                        ...p,
                        employees: employeePositions
                            .filter(ep => ep.position_id === p.id)
                            .map(ep => ({
                                user_id: ep.user_id,
                                user_name: (ep as any).user?.full_name || 'Sin nombre',
                                user_email: (ep as any).user?.email || '',
                                is_primary: ep.is_primary
                            }))
                    })) as any
            }));
    };

    const saveDepartment = async (dept: Partial<Department>) => {
        const { data, error } = await supabase
            .from('departments')
            .upsert({ ...dept, organization_id: organizationId })
            .select()
            .single();

        if (error) throw error;
        await loadChart();
        return data;
    };

    const deleteDepartment = async (id: string) => {
        const { error } = await supabase
            .from('departments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await loadChart();
    };

    const savePosition = async (pos: Partial<Position>) => {
        const { data, error } = await supabase
            .from('positions')
            .upsert({ ...pos, organization_id: organizationId })
            .select()
            .single();

        if (error) throw error;
        await loadChart();
        return data;
    };

    const deletePosition = async (id: string) => {
        const { error } = await supabase
            .from('positions')
            .delete()
            .eq('id', id);

        if (error) throw error;
        await loadChart();
    };

    const assignEmployee = async (userId: string, positionId: string) => {
        console.log('Asignando empleado:', { userId, positionId });
        try {
            // Verificar si ya existe la asignación para evitar duplicados
            const { data: existing } = await supabase
                .from('employee_positions')
                .select('id')
                .eq('user_id', userId)
                .eq('position_id', positionId)
                .maybeSingle();

            if (existing) {
                console.log('El empleado ya está asignado a este cargo.');
                return;
            }

            const { error } = await supabase
                .from('employee_positions')
                .insert({
                    user_id: userId,
                    position_id: positionId,
                    is_primary: true,
                    start_date: new Date().toISOString().split('T')[0]
                });

            if (error) {
                console.error('Error de Supabase al insertar:', error);
                throw error;
            }

            console.log('Asignación exitosa, recargando datos...');
            await loadChart();
        } catch (error: any) {
            console.error('Error en assignEmployee:', error);
            alert('Error al asignar el colaborador: ' + (error.message || 'Error desconocido'));
        }
    };

    const removeEmployee = async (userId: string, positionId: string) => {
        const { error } = await supabase
            .from('employee_positions')
            .delete()
            .eq('user_id', userId)
            .eq('position_id', positionId);

        if (error) throw error;
        await loadChart();
    };

    return {
        departments,
        positions,
        employeePositions,
        tree: buildTree(departments),
        availableCollaborators,
        loading,
        saveDepartment,
        deleteDepartment,
        savePosition,
        deletePosition,
        assignEmployee,
        removeEmployee,
        reload: loadChart
    };
}
