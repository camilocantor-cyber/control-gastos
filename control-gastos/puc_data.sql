-- =====================================================
-- PLAN ÚNICO DE CUENTAS (PUC) COLOMBIA - NIIF
-- Carga inicial de cuentas principales
-- =====================================================

-- CLASE 1: ACTIVO
INSERT INTO chart_of_accounts (code, name, account_type, level, parent_code, nature, accepts_movement, description) VALUES
('1', 'ACTIVO', 'ACTIVO', 1, NULL, 'DEBITO', false, 'Recursos controlados por la entidad'),

-- GRUPO 11: EFECTIVO Y EQUIVALENTES AL EFECTIVO
('11', 'EFECTIVO Y EQUIVALENTES AL EFECTIVO', 'ACTIVO', 2, '1', 'DEBITO', false, 'Dinero en caja y bancos'),
('1105', 'CAJA', 'ACTIVO', 3, '11', 'DEBITO', false, 'Dinero en efectivo'),
('110505', 'CAJA GENERAL', 'ACTIVO', 4, '1105', 'DEBITO', true, 'Caja general de la empresa'),
('110510', 'CAJA MENOR', 'ACTIVO', 4, '1105', 'DEBITO', true, 'Fondo fijo de caja menor'),

('1110', 'BANCOS', 'ACTIVO', 3, '11', 'DEBITO', false, 'Cuentas corrientes y de ahorro'),
('111005', 'CUENTA CORRIENTE', 'ACTIVO', 4, '1110', 'DEBITO', true, 'Cuenta corriente bancaria'),
('111010', 'CUENTA DE AHORROS', 'ACTIVO', 4, '1110', 'DEBITO', true, 'Cuenta de ahorros bancaria'),

-- GRUPO 13: CUENTAS POR COBRAR
('13', 'CUENTAS POR COBRAR', 'ACTIVO', 2, '1', 'DEBITO', false, 'Derechos de cobro'),
('1305', 'CLIENTES', 'ACTIVO', 3, '13', 'DEBITO', false, 'Cuentas por cobrar a clientes'),
('130505', 'CLIENTES NACIONALES', 'ACTIVO', 4, '1305', 'DEBITO', true, 'Clientes del territorio nacional'),

('1355', 'ANTICIPOS Y AVANCES', 'ACTIVO', 3, '13', 'DEBITO', false, 'Anticipos otorgados'),
('135505', 'A PROVEEDORES', 'ACTIVO', 4, '1355', 'DEBITO', true, 'Anticipos a proveedores'),
('135515', 'A EMPLEADOS', 'ACTIVO', 4, '1355', 'DEBITO', true, 'Anticipos a empleados'),

-- GRUPO 15: INVENTARIOS
('15', 'INVENTARIOS', 'ACTIVO', 2, '1', 'DEBITO', false, 'Mercancías y productos'),
('1435', 'MERCANCÍAS NO FABRICADAS POR LA EMPRESA', 'ACTIVO', 3, '15', 'DEBITO', true, 'Inventario de mercancías'),

-- GRUPO 16: PROPIEDADES, PLANTA Y EQUIPO
('16', 'PROPIEDADES, PLANTA Y EQUIPO', 'ACTIVO', 2, '1', 'DEBITO', false, 'Activos fijos'),
('1524', 'EQUIPO DE OFICINA', 'ACTIVO', 3, '16', 'DEBITO', true, 'Muebles y enseres de oficina'),
('1528', 'EQUIPO DE COMPUTACIÓN Y COMUNICACIÓN', 'ACTIVO', 3, '16', 'DEBITO', true, 'Equipos informáticos'),

-- CLASE 2: PASIVO
('2', 'PASIVO', 'PASIVO', 1, NULL, 'CREDITO', false, 'Obligaciones presentes de la entidad'),

-- GRUPO 21: OBLIGACIONES FINANCIERAS
('21', 'OBLIGACIONES FINANCIERAS', 'PASIVO', 2, '2', 'CREDITO', false, 'Préstamos y créditos'),
('2105', 'BANCOS NACIONALES', 'PASIVO', 3, '21', 'CREDITO', true, 'Préstamos bancarios'),

-- GRUPO 22: PROVEEDORES
('22', 'PROVEEDORES', 'PASIVO', 2, '2', 'CREDITO', false, 'Cuentas por pagar a proveedores'),
('2205', 'PROVEEDORES NACIONALES', 'PASIVO', 3, '22', 'CREDITO', true, 'Proveedores del territorio nacional'),

-- GRUPO 23: CUENTAS POR PAGAR
('23', 'CUENTAS POR PAGAR', 'PASIVO', 2, '2', 'CREDITO', false, 'Otras obligaciones'),
('2335', 'COSTOS Y GASTOS POR PAGAR', 'PASIVO', 3, '23', 'CREDITO', false, 'Gastos causados no pagados'),
('233505', 'SERVICIOS PÚBLICOS', 'PASIVO', 4, '2335', 'CREDITO', true, 'Servicios públicos por pagar'),
('233510', 'ARRENDAMIENTOS', 'PASIVO', 4, '2335', 'CREDITO', true, 'Arrendamientos por pagar'),
('233515', 'HONORARIOS', 'PASIVO', 4, '2335', 'CREDITO', true, 'Honorarios por pagar'),

('2365', 'RETENCIÓN EN LA FUENTE', 'PASIVO', 3, '23', 'CREDITO', false, 'Retenciones fiscales'),
('236505', 'RETENCIÓN EN LA FUENTE POR PAGAR', 'PASIVO', 4, '2365', 'CREDITO', true, 'Retenciones a pagar'),

('2367', 'IMPUESTO A LAS VENTAS RETENIDO', 'PASIVO', 3, '23', 'CREDITO', true, 'IVA retenido'),

-- GRUPO 24: IMPUESTOS, GRAVÁMENES Y TASAS
('24', 'IMPUESTOS, GRAVÁMENES Y TASAS', 'PASIVO', 2, '2', 'CREDITO', false, 'Obligaciones tributarias'),
('2408', 'IMPUESTO SOBRE LAS VENTAS POR PAGAR', 'PASIVO', 3, '24', 'CREDITO', true, 'IVA por pagar'),
('2412', 'IMPUESTO DE INDUSTRIA Y COMERCIO', 'PASIVO', 3, '24', 'CREDITO', true, 'ICA por pagar'),

-- GRUPO 25: OBLIGACIONES LABORALES
('25', 'OBLIGACIONES LABORALES', 'PASIVO', 2, '2', 'CREDITO', false, 'Obligaciones con empleados'),
('2505', 'SALARIOS POR PAGAR', 'PASIVO', 3, '25', 'CREDITO', true, 'Nómina por pagar'),
('2510', 'CESANTÍAS CONSOLIDADAS', 'PASIVO', 3, '25', 'CREDITO', true, 'Cesantías por pagar'),

-- CLASE 3: PATRIMONIO
('3', 'PATRIMONIO', 'PATRIMONIO', 1, NULL, 'CREDITO', false, 'Participación residual en los activos'),

-- GRUPO 31: CAPITAL SOCIAL
('31', 'CAPITAL SOCIAL', 'PATRIMONIO', 2, '3', 'CREDITO', false, 'Aportes de los socios'),
('3105', 'CAPITAL SUSCRITO Y PAGADO', 'PATRIMONIO', 3, '31', 'CREDITO', true, 'Capital inicial'),

-- GRUPO 36: RESULTADOS DEL EJERCICIO
('36', 'RESULTADOS DEL EJERCICIO', 'PATRIMONIO', 2, '3', 'CREDITO', false, 'Utilidad o pérdida del período'),
('3605', 'UTILIDAD DEL EJERCICIO', 'PATRIMONIO', 3, '36', 'CREDITO', true, 'Utilidad neta del período'),
('3610', 'PÉRDIDA DEL EJERCICIO', 'PATRIMONIO', 3, '36', 'DEBITO', true, 'Pérdida neta del período'),

-- GRUPO 37: RESULTADOS DE EJERCICIOS ANTERIORES
('37', 'RESULTADOS DE EJERCICIOS ANTERIORES', 'PATRIMONIO', 2, '3', 'CREDITO', false, 'Utilidades o pérdidas acumuladas'),
('3705', 'UTILIDADES ACUMULADAS', 'PATRIMONIO', 3, '37', 'CREDITO', true, 'Utilidades de años anteriores'),

-- CLASE 4: INGRESOS
('4', 'INGRESOS', 'INGRESO', 1, NULL, 'CREDITO', false, 'Incrementos en los beneficios económicos'),

-- GRUPO 41: INGRESOS OPERACIONALES
('41', 'INGRESOS OPERACIONALES', 'INGRESO', 2, '4', 'CREDITO', false, 'Ingresos de la actividad principal'),
('4135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'INGRESO', 3, '41', 'CREDITO', true, 'Ventas de mercancías'),
('4140', 'SERVICIOS', 'INGRESO', 3, '41', 'CREDITO', false, 'Prestación de servicios'),
('414005', 'SERVICIOS PROFESIONALES', 'INGRESO', 4, '4140', 'CREDITO', true, 'Honorarios por servicios'),
('414010', 'SERVICIOS DE CONSULTORÍA', 'INGRESO', 4, '4140', 'CREDITO', true, 'Consultoría'),

-- GRUPO 42: INGRESOS NO OPERACIONALES
('42', 'INGRESOS NO OPERACIONALES', 'INGRESO', 2, '4', 'CREDITO', false, 'Otros ingresos'),
('4210', 'FINANCIEROS', 'INGRESO', 3, '42', 'CREDITO', false, 'Ingresos financieros'),
('421005', 'INTERESES', 'INGRESO', 4, '4210', 'CREDITO', true, 'Intereses ganados'),
('4295', 'DIVERSOS', 'INGRESO', 3, '42', 'CREDITO', true, 'Otros ingresos varios'),

-- CLASE 5: GASTOS
('5', 'GASTOS', 'GASTO', 1, NULL, 'DEBITO', false, 'Decrementos en los beneficios económicos'),

-- GRUPO 51: GASTOS OPERACIONALES DE ADMINISTRACIÓN
('51', 'GASTOS OPERACIONALES DE ADMINISTRACIÓN', 'GASTO', 2, '5', 'DEBITO', false, 'Gastos administrativos'),
('5105', 'GASTOS DE PERSONAL', 'GASTO', 3, '51', 'DEBITO', false, 'Gastos de nómina'),
('510506', 'SUELDOS', 'GASTO', 4, '5105', 'DEBITO', true, 'Salarios del personal'),
('510527', 'AUXILIO DE TRANSPORTE', 'GASTO', 4, '5105', 'DEBITO', true, 'Subsidio de transporte'),
('510530', 'CESANTÍAS', 'GASTO', 4, '5105', 'DEBITO', true, 'Cesantías'),

('5110', 'HONORARIOS', 'GASTO', 3, '51', 'DEBITO', true, 'Honorarios profesionales'),
('5115', 'IMPUESTOS', 'GASTO', 3, '51', 'DEBITO', true, 'Impuestos deducibles'),
('5120', 'ARRENDAMIENTOS', 'GASTO', 3, '51', 'DEBITO', true, 'Arrendamientos'),
('5135', 'SERVICIOS', 'GASTO', 3, '51', 'DEBITO', false, 'Servicios contratados'),
('513505', 'ASEO Y VIGILANCIA', 'GASTO', 4, '5135', 'DEBITO', true, 'Servicios de aseo'),
('513510', 'TEMPORALES', 'GASTO', 4, '5135', 'DEBITO', true, 'Personal temporal'),
('513515', 'ASISTENCIA TÉCNICA', 'GASTO', 4, '5135', 'DEBITO', true, 'Soporte técnico'),

('5140', 'GASTOS LEGALES', 'GASTO', 3, '51', 'DEBITO', true, 'Gastos notariales y registros'),
('5145', 'MANTENIMIENTO Y REPARACIONES', 'GASTO', 3, '51', 'DEBITO', true, 'Mantenimiento'),
('5150', 'ADECUACIÓN E INSTALACIÓN', 'GASTO', 3, '51', 'DEBITO', true, 'Adecuaciones'),
('5155', 'GASTOS DE VIAJE', 'GASTO', 3, '51', 'DEBITO', true, 'Viáticos y transporte'),
('5160', 'DEPRECIACIONES', 'GASTO', 3, '51', 'DEBITO', true, 'Depreciación de activos'),
('5195', 'DIVERSOS', 'GASTO', 3, '51', 'DEBITO', true, 'Otros gastos administrativos'),

-- GRUPO 52: GASTOS OPERACIONALES DE VENTAS
('52', 'GASTOS OPERACIONALES DE VENTAS', 'GASTO', 2, '5', 'DEBITO', false, 'Gastos de ventas'),
('5205', 'GASTOS DE PERSONAL', 'GASTO', 3, '52', 'DEBITO', false, 'Nómina de ventas'),
('520506', 'SUELDOS', 'GASTO', 4, '5205', 'DEBITO', true, 'Salarios vendedores'),
('5210', 'HONORARIOS', 'GASTO', 3, '52', 'DEBITO', true, 'Comisiones de ventas'),
('5215', 'IMPUESTOS', 'GASTO', 3, '52', 'DEBITO', true, 'Impuestos de ventas'),
('5220', 'ARRENDAMIENTOS', 'GASTO', 3, '52', 'DEBITO', true, 'Arriendo local comercial'),
('5235', 'SERVICIOS', 'GASTO', 3, '52', 'DEBITO', true, 'Servicios de ventas'),

-- GRUPO 53: GASTOS NO OPERACIONALES
('53', 'GASTOS NO OPERACIONALES', 'GASTO', 2, '5', 'DEBITO', false, 'Otros gastos'),
('5305', 'FINANCIEROS', 'GASTO', 3, '53', 'DEBITO', false, 'Gastos financieros'),
('530505', 'GASTOS BANCARIOS', 'GASTO', 4, '5305', 'DEBITO', true, 'Comisiones bancarias'),
('530510', 'INTERESES', 'GASTO', 4, '5305', 'DEBITO', true, 'Intereses pagados'),
('5395', 'GASTOS DIVERSOS', 'GASTO', 3, '53', 'DEBITO', true, 'Otros gastos varios'),

-- GRUPO 54: IMPUESTO DE RENTA Y COMPLEMENTARIOS
('54', 'IMPUESTO DE RENTA Y COMPLEMENTARIOS', 'GASTO', 2, '5', 'DEBITO', false, 'Impuesto de renta'),
('5405', 'IMPUESTO DE RENTA', 'GASTO', 3, '54', 'DEBITO', true, 'Provisión impuesto de renta'),

-- CLASE 6: COSTOS DE VENTAS
('6', 'COSTOS DE VENTAS', 'COSTOS', 1, NULL, 'DEBITO', false, 'Costo de la mercancía vendida'),
('61', 'COSTO DE VENTAS', 'COSTOS', 2, '6', 'DEBITO', false, 'Costo de ventas'),
('6135', 'COMERCIO AL POR MAYOR Y AL POR MENOR', 'COSTOS', 3, '61', 'DEBITO', true, 'Costo de mercancías vendidas');

-- Actualizar timestamps
UPDATE chart_of_accounts SET updated_at = NOW();
