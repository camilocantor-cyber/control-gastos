-- 1. Actualizar RLS para permitir ver cuentas globales (organization_id es NULL)
DROP POLICY IF EXISTS "Users can view accounts in their organization" ON public.chart_of_accounts;
CREATE POLICY "Users can view accounts in their organization" ON public.chart_of_accounts
    FOR SELECT USING (
        organization_id IS NULL OR 
        organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );

-- 2. Insertar el PUC Comercial como Global (Template para todos)
INSERT INTO public.chart_of_accounts (code, name, account_type, level, nature, organization_id) VALUES
('1', 'ACTIVO', 'ACTIVO', 1, 'DEBITO', NULL),
('2', 'PASIVO', 'PASIVO', 1, 'CREDITO', NULL),
('3', 'PATRIMONIO', 'PATRIMONIO', 1, 'CREDITO', NULL),
('4', 'INGRESOS', 'INGRESO', 1, 'CREDITO', NULL),
('5', 'GASTOS', 'GASTO', 1, 'DEBITO', NULL),
('6', 'COSTOS DE VENTAS', 'COSTOS', 1, 'DEBITO', NULL),
('7', 'COSTOS DE PRODUCCION O DE OPERACION', 'COSTOS', 1, 'DEBITO', NULL),
('8', 'CUENTAS DE ORDEN DEUDORAS', 'ORDEN', 1, 'DEBITO', NULL),
('9', 'CUENTAS DE ORDEN ACREEDORAS', 'ORDEN', 1, 'CREDITO', NULL)
ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO public.chart_of_accounts (code, name, account_type, level, nature, parent_code, organization_id) VALUES
('11', 'DISPONIBLE', 'ACTIVO', 2, 'DEBITO', '1', NULL),
('12', 'INVERSIONES', 'ACTIVO', 2, 'DEBITO', '1', NULL),
('13', 'DEUDORES', 'ACTIVO', 2, 'DEBITO', '1', NULL),
('14', 'INVENTARIOS', 'ACTIVO', 2, 'DEBITO', '1', NULL),
('15', 'PROPIEDADES, PLANTA Y EQUIPO', 'ACTIVO', 2, 'DEBITO', '1', NULL),
('21', 'OBLIGACIONES FINANCIERAS', 'PASIVO', 2, 'CREDITO', '2', NULL),
('22', 'PROVEEDORES', 'PASIVO', 2, 'CREDITO', '2', NULL),
('23', 'CUENTAS POR PAGAR', 'PASIVO', 2, 'CREDITO', '2', NULL),
('24', 'IMPUESTOS, GRAVAMENES Y TASAS', 'PASIVO', 2, 'CREDITO', '2', NULL),
('25', 'OBLIGACIONES LABORALES', 'PASIVO', 2, 'CREDITO', '2', NULL),
('31', 'CAPITAL SOCIAL', 'PATRIMONIO', 2, 'CREDITO', '3', NULL),
('32', 'SUPERAVIT DE CAPITAL', 'PATRIMONIO', 2, 'CREDITO', '3', NULL),
('33', 'RESERVAS', 'PATRIMONIO', 2, 'CREDITO', '3', NULL),
('41', 'OPERACIONALES', 'INGRESO', 2, 'CREDITO', '4', NULL),
('42', 'NO OPERACIONALES', 'INGRESO', 2, 'CREDITO', '4', NULL),
('51', 'OPERACIONALES DE ADMINISTRACION', 'GASTO', 2, 'DEBITO', '5', NULL),
('52', 'OPERACIONALES DE VENTAS', 'GASTO', 2, 'DEBITO', '5', NULL),
('53', 'NO OPERACIONALES', 'GASTO', 2, 'DEBITO', '5', NULL)
ON CONFLICT (code, organization_id) DO NOTHING;

INSERT INTO public.chart_of_accounts (code, name, account_type, level, nature, parent_code, organization_id, accepts_movement) VALUES
('1105', 'CAJA', 'ACTIVO', 3, 'DEBITO', '11', NULL, true),
('1110', 'BANCOS', 'ACTIVO', 3, 'DEBITO', '11', NULL, true),
('1305', 'CLIENTES', 'ACTIVO', 3, 'DEBITO', '13', NULL, true),
('2205', 'NACIONALES (PROVEEDORES)', 'PASIVO', 3, 'CREDITO', '22', NULL, true),
('4135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'INGRESO', 3, 'CREDITO', '41', NULL, true),
('5105', 'GASTOS DE PERSONAL', 'GASTO', 3, 'DEBITO', '51', NULL, true),
('5135', 'SERVICIOS', 'GASTO', 3, 'DEBITO', '51', NULL, true)
ON CONFLICT (code, organization_id) DO NOTHING;
