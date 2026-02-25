-- 1. Ampliar el soporte de tipos de acciones para incluir Contabilidad (ERP)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_action_type_check;
ALTER TABLE activities ADD CONSTRAINT activities_action_type_check 
    CHECK (action_type IN ('none', 'webhook', 'soap', 'finance'));

-- 2. Crear el proceso de ejemplo: "Solicitud de Reembolso"
DO $$
DECLARE
    v_org_id UUID;
    v_wf_id UUID;
    v_start_id UUID;
    v_approve_id UUID;
    v_finance_id UUID;
    v_end_id UUID;
BEGIN
    -- Obtener la organización por defecto
    SELECT id INTO v_org_id FROM organizations LIMIT 1;
    
    -- A. El Workflow
    INSERT INTO workflows (name, description, organization_id, status)
    VALUES ('Reembolso de Gastos con Contabilidad', 'Proceso que aprueba un gasto y lo envía automáticamente al módulo financiero.', v_org_id, 'active')
    RETURNING id INTO v_wf_id;

    -- B. Actividades
    -- 1. Inicio
    INSERT INTO activities (workflow_id, name, type, x_pos, y_pos)
    VALUES (v_wf_id, 'Registrar Solicitud', 'start', 100, 100)
    RETURNING id INTO v_start_id;

    -- 2. Aprobación
    INSERT INTO activities (workflow_id, name, type, x_pos, y_pos, assignment_type)
    VALUES (v_wf_id, 'Aprobación Administrativa', 'task', 100, 250, 'creator')
    RETURNING id INTO v_approve_id;

    -- 3. Integración Financiera (El Microservicio)
    INSERT INTO activities (workflow_id, name, type, x_pos, y_pos, action_type, action_config)
    VALUES (v_wf_id, 'Contabilizar en ERP', 'task', 100, 400, 'finance', jsonb_build_object(
        'type', 'finance',
        'finance_url', 'https://ziidevzgdoiwzfmxskvc.supabase.co', 
        'api_key', 'sk_control_gastos_test_123',           -- La que creamos en el paso anterior
        'amount', '{{monto}}',
        'description', 'Reembolso: {{descripcion}} (Ref: {{process_id}})',
        'movement_type', 'expense',
        'category', '{{categoria}}',
        'provider', '{{proveedor}}'
    ))
    RETURNING id INTO v_finance_id;

    -- 4. Fin
    INSERT INTO activities (workflow_id, name, type, x_pos, y_pos)
    VALUES (v_wf_id, 'Gasto Pagado y Contabilizado', 'end', 100, 550)
    RETURNING id INTO v_end_id;

    -- C. Campos para el formulario inicial
    INSERT INTO activity_field_definitions (activity_id, name, label, type, required, order_index) VALUES
    (v_start_id, 'monto', 'Valor del Gasto', 'currency', true, 1),
    (v_start_id, 'descripcion', 'Motivo del Gasto', 'text', true, 2),
    (v_start_id, 'categoria', 'Categoría Contable', 'text', true, 3),
    (v_start_id, 'proveedor', 'Nombre del Proveedor', 'provider', false, 4);

    -- D. Transiciones
    INSERT INTO transitions (workflow_id, source_id, target_id) VALUES
    (v_wf_id, v_start_id, v_approve_id),
    (v_wf_id, v_approve_id, v_finance_id),
    (v_wf_id, v_finance_id, v_end_id);

END $$;
