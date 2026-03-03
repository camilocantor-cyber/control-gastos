-- 20240302_public_forms.sql

-- 1. Añadimos is_public a los flujos
ALTER TABLE workflows ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Limpieza
DROP FUNCTION IF EXISTS get_public_workflow(UUID);

-- 3. Leer configuracion basica del flujo para formulario publico (sin RLS)
CREATE OR REPLACE FUNCTION get_public_workflow(p_workflow_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workflow RECORD;
    v_activities JSONB;
    v_fields JSONB;
    v_result JSONB;
BEGIN
    SELECT id, name, description, status, organization_id, name_template
    INTO v_workflow
    FROM workflows
    WHERE id = p_workflow_id AND is_public = true AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'El proceso no existe, no está activo o no es público.');
    END IF;

    -- Obtener la actividad Start
    SELECT jsonb_agg(row_to_json(a))
    INTO v_activities
    FROM activities a
    WHERE a.workflow_id = p_workflow_id AND type = 'start';

    -- Obtener todos los campos dinámicos
    SELECT jsonb_agg(row_to_json(f))
    INTO v_fields
    FROM activity_field_definitions f
    JOIN activities act ON act.id = f.activity_id
    WHERE act.workflow_id = p_workflow_id AND act.type = 'start';

    SELECT jsonb_build_object(
        'workflow', row_to_json(v_workflow),
        'activities', v_activities,
        'start_fields', COALESCE(v_fields, '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- 4. Limpieza
DROP FUNCTION IF EXISTS submit_public_process(UUID, JSONB);

-- 5. Registrar el tramite desde el exterior
CREATE OR REPLACE FUNCTION submit_public_process(p_workflow_id UUID, p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workflow RECORD;
    v_start_activity RECORD;
    v_next_activity RECORD;
    v_instance_id UUID;
    k TEXT;
    v TEXT;
BEGIN
    SELECT * INTO v_workflow FROM workflows WHERE id = p_workflow_id AND is_public = true AND status = 'active';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Proceso no válido o inactivo.');
    END IF;

    SELECT id INTO v_start_activity FROM activities WHERE workflow_id = p_workflow_id AND type = 'start' LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'El flujo no tiene una actividad inicial.');
    END IF;

    -- Ubicamos el target despues de enviar para asignar (salto simple al primer nodo)
    SELECT a.id, a.assigned_department_id, a.assigned_position_id
    INTO v_next_activity
    FROM transitions t
    JOIN activities a ON t.target_id = a.id
    WHERE t.source_id = v_start_activity.id
    LIMIT 1;

    INSERT INTO process_instances (
        workflow_id,
        organization_id,
        status,
        current_activity_id,
        assigned_user_id,
        assigned_department_id,
        assigned_position_id
    ) VALUES (
        p_workflow_id,
        v_workflow.organization_id,
        'active',
        COALESCE(v_next_activity.id, v_start_activity.id),
        NULL, -- Siempre Pooling para trámites externos, o requiere backend job para algoritmos complejos
        v_next_activity.assigned_department_id,
        v_next_activity.assigned_position_id
    ) RETURNING id INTO v_instance_id;

    -- Auditoria
    INSERT INTO process_history (process_id, activity_id, action, comment)
    VALUES (v_instance_id, v_start_activity.id, 'started', 'Proceso iniciado vía formulario externo público.');
    
    INSERT INTO process_history (process_id, activity_id, action, comment)
    VALUES (v_instance_id, v_start_activity.id, 'completed', 'Formulario enviado por el cliente/proveedor.');

    -- Generar metadata
    FOR k, v IN SELECT * FROM jsonb_each_text(p_data)
    LOOP
        INSERT INTO process_data (process_id, activity_id, field_name, value)
        VALUES (v_instance_id, v_start_activity.id, k, v);
    END LOOP;

    RETURN jsonb_build_object('success', true, 'process_id', v_instance_id);
END;
$$;
