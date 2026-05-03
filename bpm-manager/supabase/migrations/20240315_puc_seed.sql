-- Seed para el Plan Único de Cuentas (PUC) Comercial - Colombia
-- Solo inserta las Clases y algunos Grupos principales para demostración.

DO $$
DECLARE
    org_id UUID;
BEGIN
    -- Seleccionar la primera organización disponible para el seed (o una específica si se prefiere)
    SELECT id INTO org_id FROM organizations LIMIT 1;

    IF org_id IS NOT NULL THEN
        -- CLASES (Nivel 1)
        INSERT INTO chart_of_accounts (code, name, account_type, level, nature, organization_id) VALUES
        ('1', 'ACTIVO', 'ACTIVO', 1, 'DEBITO', org_id),
        ('2', 'PASIVO', 'PASIVO', 1, 'CREDITO', org_id),
        ('3', 'PATRIMONIO', 'PATRIMONIO', 1, 'CREDITO', org_id),
        ('4', 'INGRESOS', 'INGRESO', 1, 'CREDITO', org_id),
        ('5', 'GASTOS', 'GASTO', 1, 'DEBITO', org_id),
        ('6', 'COSTOS DE VENTAS', 'COSTOS', 1, 'DEBITO', org_id),
        ('7', 'COSTOS DE PRODUCCION O DE OPERACION', 'COSTOS', 1, 'DEBITO', org_id),
        ('8', 'CUENTAS DE ORDEN DEUDORAS', 'ORDEN', 1, 'DEBITO', org_id),
        ('9', 'CUENTAS DE ORDEN ACREEDORAS', 'ORDEN', 1, 'CREDITO', org_id)
        ON CONFLICT (code, organization_id) DO NOTHING;

        -- GRUPOS PRINCIPALES (Nivel 2)
        INSERT INTO chart_of_accounts (code, name, account_type, level, nature, parent_code, organization_id) VALUES
        -- Activos
        ('11', 'DISPONIBLE', 'ACTIVO', 2, 'DEBITO', '1', org_id),
        ('12', 'INVERSIONES', 'ACTIVO', 2, 'DEBITO', '1', org_id),
        ('13', 'DEUDORES', 'ACTIVO', 2, 'DEBITO', '1', org_id),
        ('14', 'INVENTARIOS', 'ACTIVO', 2, 'DEBITO', '1', org_id),
        ('15', 'PROPIEDADES, PLANTA Y EQUIPO', 'ACTIVO', 2, 'DEBITO', '1', org_id),
        -- Pasivos
        ('21', 'OBLIGACIONES FINANCIERAS', 'PASIVO', 2, 'CREDITO', '2', org_id),
        ('22', 'PROVEEDORES', 'PASIVO', 2, 'CREDITO', '2', org_id),
        ('23', 'CUENTAS POR PAGAR', 'PASIVO', 2, 'CREDITO', '2', org_id),
        ('24', 'IMPUESTOS, GRAVAMENES Y TASAS', 'PASIVO', 2, 'CREDITO', '2', org_id),
        ('25', 'OBLIGACIONES LABORALES', 'PASIVO', 2, 'CREDITO', '2', org_id),
        -- Patrimonio
        ('31', 'CAPITAL SOCIAL', 'PATRIMONIO', 2, 'CREDITO', '3', org_id),
        ('32', 'SUPERAVIT DE CAPITAL', 'PATRIMONIO', 2, 'CREDITO', '3', org_id),
        ('33', 'RESERVAS', 'PATRIMONIO', 2, 'CREDITO', '3', org_id),
        -- Ingresos
        ('41', 'OPERACIONALES', 'INGRESO', 2, 'CREDITO', '4', org_id),
        ('42', 'NO OPERACIONALES', 'INGRESO', 2, 'CREDITO', '4', org_id),
        -- Gastos
        ('51', 'OPERACIONALES DE ADMINISTRACION', 'GASTO', 2, 'DEBITO', '5', org_id),
        ('52', 'OPERACIONALES DE VENTAS', 'GASTO', 2, 'DEBITO', '5', org_id),
        ('53', 'NO OPERACIONALES', 'GASTO', 2, 'DEBITO', '5', org_id)
        ON CONFLICT (code, organization_id) DO NOTHING;

        -- ALGUNAS CUENTAS (Nivel 3)
        INSERT INTO chart_of_accounts (code, name, account_type, level, nature, parent_code, organization_id, accepts_movement) VALUES
        ('1105', 'CAJA', 'ACTIVO', 3, 'DEBITO', '11', org_id, true),
        ('1110', 'BANCOS', 'ACTIVO', 3, 'DEBITO', '11', org_id, true),
        ('1305', 'CLIENTES', 'ACTIVO', 3, 'DEBITO', '13', org_id, true),
        ('2205', 'NACIONALES (PROVEEDORES)', 'PASIVO', 3, 'CREDITO', '22', org_id, true),
        ('4135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'INGRESO', 3, 'CREDITO', '41', org_id, true),
        ('5105', 'GASTOS DE PERSONAL', 'GASTO', 3, 'DEBITO', '51', org_id, true),
        ('5135', 'SERVICIOS', 'GASTO', 3, 'DEBITO', '51', org_id, true)
        ON CONFLICT (code, organization_id) DO NOTHING;

    END IF;
END $$;
