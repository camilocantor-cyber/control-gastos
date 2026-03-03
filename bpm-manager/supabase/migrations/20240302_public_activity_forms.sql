-- 20240302_public_activity_forms.sql

-- 1. Añadimos is_public a las actividades
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- 2. Limpieza
DROP FUNCTION IF EXISTS get_public_activity(UUID, UUID);

-- 3. Leer configuracion basica de una actividad publica especifica para un tramite existente
CREATE OR REPLACE FUNCTION get_public_activity(p_process_id UUID, p_activity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workflow RECORD;
    v_activity RECORD;
    v_process RECORD;
    v_fields JSONB;
    v_result JSONB;
    v_existing_data JSONB;
BEGIN
    -- Validar que la actividad exista y sea pública
    SELECT * INTO v_activity FROM activities WHERE id = p_activity_id AND is_public = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'La actividad no existe o no es pública.');
    END IF;

    -- Validar que el proceso exista, y esté activo en esa actividad
    SELECT * INTO v_process FROM process_instances WHERE id = p_process_id AND current_activity_id = p_activity_id AND status = 'active';
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'El proceso no existe, ya avanzó a otro paso o está inactivo.');
    END IF;

    -- Buscar metadata del flujo
    SELECT id, name, description, status, organization_id, name_template
    INTO v_workflow
    FROM workflows
    WHERE id = v_process.workflow_id;

    -- Obtener campos obligatorios para esa actividad
    SELECT jsonb_agg(row_to_json(f))
    INTO v_fields
    FROM activity_field_definitions f
    WHERE f.activity_id = p_activity_id;

    -- Construimos respuesta
    SELECT jsonb_build_object(
        'workflow', row_to_json(v_workflow),
        'activity', row_to_json(v_activity),
        'fields', COALESCE(v_fields, '[]'::jsonb),
        'process_id', p_process_id
    ) INTO v_result;

    RETURN v_result;
END;
$$;


-- 4. Limpieza
DROP FUNCTION IF EXISTS submit_public_activity(UUID, UUID, JSONB);

-- 5. Enviar formulario para actividad publica intermedia
CREATE OR REPLACE FUNCTION submit_public_activity(p_process_id UUID, p_activity_id UUID, p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activity RECORD;
    v_process RECORD;
    v_next_activity RECORD;
    k TEXT;
    v TEXT;
BEGIN
    -- Validar actividad y proceso igual que antes
    SELECT * INTO v_activity FROM activities WHERE id = p_activity_id AND is_public = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Actividad no válida o no pública.'); END IF;

    SELECT * INTO v_process FROM process_instances WHERE id = p_process_id AND current_activity_id = p_activity_id AND status = 'active';
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Proceso no válido o ya no está en este paso.'); END IF;

    -- Verificamos si hay una transición automática simple
    SELECT a.id, a.assigned_department_id, a.assigned_position_id
    INTO v_next_activity
    FROM transitions t
    JOIN activities a ON t.target_id = a.id
    WHERE t.source_id = p_activity_id
    LIMIT 1;

    IF FOUND THEN
        UPDATE process_instances 
        SET current_activity_id = v_next_activity.id,
            assigned_department_id = v_next_activity.assigned_department_id,
            assigned_position_id = v_next_activity.assigned_position_id,
            assigned_user_id = NULL
        WHERE id = p_process_id;
    END IF;

    -- Auditoria
    INSERT INTO process_history (process_id, activity_id, action, comment)
    VALUES (p_process_id, p_activity_id, 'completed', 'Formulario de actividad enviado por el cliente/externo.');

    -- Registrar la data
    FOR k, v IN SELECT * FROM jsonb_each_text(p_data)
    LOOP
        INSERT INTO process_data (process_id, activity_id, field_name, value)
        VALUES (p_process_id, p_activity_id, k, v);
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;
