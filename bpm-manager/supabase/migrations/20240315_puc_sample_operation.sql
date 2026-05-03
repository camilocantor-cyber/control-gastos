-- Seed para una Operación Contable de ejemplo: Pago a Proveedor

DO $$
DECLARE
    org_id UUID;
    op_id UUID;
BEGIN
    -- Seleccionar la primera organización disponible
    SELECT id INTO org_id FROM organizations LIMIT 1;

    IF org_id IS NOT NULL THEN
        -- 1. Crear la Operación
        INSERT INTO accounting_operations (code, name, description, organization_id, user_id)
        VALUES (
            'PAGO-PROV-01', 
            'Pago a Proveedor (Ejemplo)', 
            'Asiento contable para el pago de facturas a proveedores nacionales desde bancos.',
            org_id,
            (SELECT id FROM profiles WHERE organization_id = org_id LIMIT 1)
        )
        RETURNING id INTO op_id;

        -- 2. Definir Parámetros
        INSERT INTO operation_parameters (operation_id, name, label, data_type, position, organization_id)
        VALUES 
        (op_id, 'valor', 'Valor a Pagar', 'NUMBER', 1, org_id),
        (op_id, 'tercero', 'Nombre/NIT del Proveedor', 'TEXT', 2, org_id),
        (op_id, 'detalle', 'Observaciones', 'TEXT', 3, org_id);

        -- 3. Definir Plantilla (Partida Doble)
        INSERT INTO operation_templates (
            operation_id, 
            line_number, 
            account_code, 
            movement_type, 
            value_formula, 
            third_party_formula, 
            description_formula,
            organization_id
        )
        VALUES 
        -- Línea 1: Débito a la 2205 (Proveedores)
        (op_id, 1, '2205', 'DEBITO', '{{valor}}', '{{tercero}}', 'Pago factura: {{detalle}}', org_id),
        -- Línea 2: Crédito a la 1110 (Bancos)
        (op_id, 2, '1110', 'CREDITO', '{{valor}}', '{{tercero}}', 'Giro por pago: {{detalle}}', org_id);

    END IF;
END $$;
