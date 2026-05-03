-- Función para cargar el PUC Comercial y Operaciones de ejemplo en una organización
CREATE OR REPLACE FUNCTION public.seed_puc_comercial(p_organization_id UUID)
RETURNS void AS $$
DECLARE
    v_user_id UUID;
    v_op_id UUID;
BEGIN
    -- 1. Insertar CLASES (Nivel 1)
    INSERT INTO chart_of_accounts (code, name, account_type, level, nature, organization_id) VALUES
    ('1', 'ACTIVO', 'ACTIVO', 1, 'DEBITO', p_organization_id),
    ('2', 'PASIVO', 'PASIVO', 1, 'CREDITO', p_organization_id),
    ('3', 'PATRIMONIO', 'PATRIMONIO', 1, 'CREDITO', p_organization_id),
    ('4', 'INGRESOS', 'INGRESO', 1, 'CREDITO', p_organization_id),
    ('5', 'GASTOS', 'GASTO', 1, 'DEBITO', p_organization_id),
    ('6', 'COSTOS DE VENTAS', 'COSTOS', 1, 'DEBITO', p_organization_id),
    ('7', 'COSTOS DE PRODUCCION O DE OPERACION', 'COSTOS', 1, 'DEBITO', p_organization_id),
    ('8', 'CUENTAS DE ORDEN DEUDORAS', 'ORDEN', 1, 'DEBITO', p_organization_id),
    ('9', 'CUENTAS DE ORDEN ACREEDORAS', 'ORDEN', 1, 'CREDITO', p_organization_id)
    ON CONFLICT (code, organization_id) DO NOTHING;

    -- 2. Insertar GRUPOS (Nivel 2)
    INSERT INTO chart_of_accounts (code, name, account_type, level, nature, parent_code, organization_id) VALUES
    ('11', 'DISPONIBLE', 'ACTIVO', 2, 'DEBITO', '1', p_organization_id),
    ('12', 'INVERSIONES', 'ACTIVO', 2, 'DEBITO', '1', p_organization_id),
    ('13', 'DEUDORES', 'ACTIVO', 2, 'DEBITO', '1', p_organization_id),
    ('14', 'INVENTARIOS', 'ACTIVO', 2, 'DEBITO', '1', p_organization_id),
    ('15', 'PROPIEDADES, PLANTA Y EQUIPO', 'ACTIVO', 2, 'DEBITO', '1', p_organization_id),
    ('21', 'OBLIGACIONES FINANCIERAS', 'PASIVO', 2, 'CREDITO', '2', p_organization_id),
    ('22', 'PROVEEDORES', 'PASIVO', 2, 'CREDITO', '2', p_organization_id),
    ('23', 'CUENTAS POR PAGAR', 'PASIVO', 2, 'CREDITO', '2', p_organization_id),
    ('24', 'IMPUESTOS, GRAVAMENES Y TASAS', 'PASIVO', 2, 'CREDITO', '2', p_organization_id),
    ('25', 'OBLIGACIONES LABORALES', 'PASIVO', 2, 'CREDITO', '2', p_organization_id),
    ('31', 'CAPITAL SOCIAL', 'PATRIMONIO', 2, 'CREDITO', '3', p_organization_id),
    ('32', 'SUPERAVIT DE CAPITAL', 'PATRIMONIO', 2, 'CREDITO', '3', p_organization_id),
    ('33', 'RESERVAS', 'PATRIMONIO', 2, 'CREDITO', '3', p_organization_id),
    ('41', 'OPERACIONALES', 'INGRESO', 2, 'CREDITO', '4', p_organization_id),
    ('42', 'NO OPERACIONALES', 'INGRESO', 2, 'CREDITO', '4', p_organization_id),
    ('51', 'OPERACIONALES DE ADMINISTRACION', 'GASTO', 2, 'DEBITO', '5', p_organization_id),
    ('52', 'OPERACIONALES DE VENTAS', 'GASTO', 2, 'DEBITO', '5', p_organization_id),
    ('53', 'NO OPERACIONALES', 'GASTO', 2, 'DEBITO', '5', p_organization_id)
    ON CONFLICT (code, organization_id) DO NOTHING;

    -- 3. Insertar CUENTAS (Nivel 3)
    INSERT INTO chart_of_accounts (code, name, account_type, level, nature, parent_code, organization_id, accepts_movement) VALUES
    ('1105', 'CAJA', 'ACTIVO', 3, 'DEBITO', '11', p_organization_id, true),
    ('1110', 'BANCOS', 'ACTIVO', 3, 'DEBITO', '11', p_organization_id, true),
    ('1305', 'CLIENTES', 'ACTIVO', 3, 'DEBITO', '13', p_organization_id, true),
    ('2205', 'NACIONALES (PROVEEDORES)', 'PASIVO', 3, 'CREDITO', '22', p_organization_id, true),
    ('4135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'INGRESO', 3, 'CREDITO', '41', p_organization_id, true),
    ('5105', 'GASTOS DE PERSONAL', 'GASTO', 3, 'DEBITO', '51', p_organization_id, true),
    ('5135', 'SERVICIOS', 'GASTO', 3, 'DEBITO', '51', p_organization_id, true)
    ON CONFLICT (code, organization_id) DO NOTHING;

    -- 4. Crear Operación Contable de ejemplo (si no existe)
    SELECT id INTO v_user_id FROM profiles WHERE organization_id = p_organization_id LIMIT 1;

    INSERT INTO accounting_operations (code, name, description, organization_id, user_id)
    VALUES (
        'PAGO-PROV-01', 
        'Pago a Proveedor (Ejemplo)', 
        'Asiento contable para el pago de facturas a proveedores nacionales desde bancos.',
        p_organization_id,
        v_user_id
    )
    ON CONFLICT (code, organization_id) DO NOTHING
    RETURNING id INTO v_op_id;

    IF v_op_id IS NOT NULL THEN
        -- Parámetros
        INSERT INTO operation_parameters (operation_id, name, label, data_type, position, organization_id)
        VALUES 
        (v_op_id, 'valor', 'Valor a Pagar', 'NUMBER', 1, p_organization_id),
        (v_op_id, 'tercero', 'Nombre/NIT del Proveedor', 'TEXT', 2, p_organization_id),
        (v_op_id, 'detalle', 'Observaciones', 'TEXT', 3, p_organization_id)
        ON CONFLICT DO NOTHING;

        -- Plantilla
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
        (v_op_id, 1, '2205', 'DEBITO', '{{valor}}', '{{tercero}}', 'Pago factura: {{detalle}}', p_organization_id),
        (v_op_id, 2, '1110', 'CREDITO', '{{valor}}', '{{tercero}}', 'Giro por pago: {{detalle}}', p_organization_id)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
