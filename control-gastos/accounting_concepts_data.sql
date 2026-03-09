-- =====================================================
-- CONCEPTOS CONTABLES PREDEFINIDOS
-- Configuración de asientos automáticos
-- =====================================================

-- CONCEPTOS DE INGRESOS
INSERT INTO accounting_concepts (code, name, concept_type, description) VALUES
('ING-001', 'Ingreso por Ventas de Contado', 'INGRESO', 'Venta de mercancías o servicios pagada en efectivo'),
('ING-002', 'Ingreso por Ventas con Tarjeta', 'INGRESO', 'Venta pagada con tarjeta débito/crédito'),
('ING-003', 'Ingreso por Servicios Profesionales', 'INGRESO', 'Honorarios por servicios prestados'),
('ING-004', 'Otros Ingresos', 'INGRESO', 'Ingresos diversos no operacionales');

-- CONCEPTOS DE GASTOS
INSERT INTO accounting_concepts (code, name, concept_type, description) VALUES
('GAS-001', 'Gasto de Arrendamiento', 'GASTO', 'Pago de arriendo de local u oficina'),
('GAS-002', 'Gasto de Servicios Públicos', 'GASTO', 'Pago de energía, agua, internet, etc.'),
('GAS-003', 'Gasto de Honorarios', 'GASTO', 'Pago de honorarios profesionales'),
('GAS-004', 'Gasto de Mantenimiento', 'GASTO', 'Mantenimiento y reparaciones'),
('GAS-005', 'Gasto de Viaje', 'GASTO', 'Viáticos y gastos de desplazamiento'),
('GAS-006', 'Gasto de Papelería', 'GASTO', 'Útiles y papelería de oficina'),
('GAS-007', 'Gasto Bancario', 'GASTO', 'Comisiones y cargos bancarios'),
('GAS-008', 'Gasto de Publicidad', 'GASTO', 'Publicidad y marketing'),
('GAS-009', 'Gasto de Nómina', 'GASTO', 'Pago de salarios y prestaciones'),
('GAS-010', 'Otros Gastos Administrativos', 'GASTO', 'Gastos administrativos diversos');

-- CONCEPTOS DE TRANSFERENCIAS
INSERT INTO accounting_concepts (code, name, concept_type, description) VALUES
('TRA-001', 'Transferencia entre Cuentas', 'TRANSFERENCIA', 'Traslado de dinero entre cuentas bancarias'),
('TRA-002', 'Consignación a Caja', 'TRANSFERENCIA', 'Depósito de efectivo de caja a banco');

-- =====================================================
-- MAPEO DE CUENTAS PARA CONCEPTOS DE INGRESOS
-- =====================================================

-- ING-001: Ingreso por Ventas de Contado
-- DÉBITO: Caja o Banco (11)
-- CRÉDITO: Ingresos (41)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'ING-001'), '110505', 'DEBITO', 1, true, 'Entrada de efectivo a caja'),
((SELECT id FROM accounting_concepts WHERE code = 'ING-001'), '4135', 'CREDITO', 2, false, 'Ingreso por venta');

-- ING-002: Ingreso por Ventas con Tarjeta
-- DÉBITO: Cuenta Corriente (11)
-- CRÉDITO: Ingresos (41)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'ING-002'), '111005', 'DEBITO', 1, true, 'Depósito en cuenta corriente'),
((SELECT id FROM accounting_concepts WHERE code = 'ING-002'), '4135', 'CREDITO', 2, false, 'Ingreso por venta');

-- ING-003: Ingreso por Servicios Profesionales
-- DÉBITO: Banco (11)
-- CRÉDITO: Servicios Profesionales (41)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'ING-003'), '111005', 'DEBITO', 1, true, 'Cobro de honorarios'),
((SELECT id FROM accounting_concepts WHERE code = 'ING-003'), '414005', 'CREDITO', 2, false, 'Ingreso por servicios');

-- ING-004: Otros Ingresos
-- DÉBITO: Banco (11)
-- CRÉDITO: Ingresos Diversos (42)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'ING-004'), '111005', 'DEBITO', 1, true, 'Ingreso a banco'),
((SELECT id FROM accounting_concepts WHERE code = 'ING-004'), '4295', 'CREDITO', 2, false, 'Otros ingresos');

-- =====================================================
-- MAPEO DE CUENTAS PARA CONCEPTOS DE GASTOS
-- =====================================================

-- GAS-001: Gasto de Arrendamiento
-- DÉBITO: Arrendamientos (51)
-- CRÉDITO: Banco o Caja (11) / Cuentas por Pagar (23)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-001'), '5120', 'DEBITO', 1, false, 'Gasto de arriendo'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-001'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-002: Gasto de Servicios Públicos
-- DÉBITO: Servicios (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-002'), '5195', 'DEBITO', 1, false, 'Gasto de servicios públicos'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-002'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-003: Gasto de Honorarios
-- DÉBITO: Honorarios (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-003'), '5110', 'DEBITO', 1, false, 'Gasto de honorarios'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-003'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-004: Gasto de Mantenimiento
-- DÉBITO: Mantenimiento (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-004'), '5145', 'DEBITO', 1, false, 'Gasto de mantenimiento'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-004'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-005: Gasto de Viaje
-- DÉBITO: Gastos de Viaje (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-005'), '5155', 'DEBITO', 1, false, 'Gasto de viaje'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-005'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-006: Gasto de Papelería
-- DÉBITO: Diversos (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-006'), '5195', 'DEBITO', 1, false, 'Gasto de papelería'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-006'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-007: Gasto Bancario
-- DÉBITO: Gastos Bancarios (53)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-007'), '530505', 'DEBITO', 1, false, 'Comisión bancaria'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-007'), '111005', 'CREDITO', 2, true, 'Cargo en banco');

-- GAS-008: Gasto de Publicidad
-- DÉBITO: Diversos (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-008'), '5195', 'DEBITO', 1, false, 'Gasto de publicidad'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-008'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-009: Gasto de Nómina
-- DÉBITO: Sueldos (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-009'), '510506', 'DEBITO', 1, false, 'Pago de nómina'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-009'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- GAS-010: Otros Gastos Administrativos
-- DÉBITO: Diversos (51)
-- CRÉDITO: Banco (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'GAS-010'), '5195', 'DEBITO', 1, false, 'Otros gastos'),
((SELECT id FROM accounting_concepts WHERE code = 'GAS-010'), '111005', 'CREDITO', 2, true, 'Pago desde banco');

-- =====================================================
-- MAPEO DE CUENTAS PARA TRANSFERENCIAS
-- =====================================================

-- TRA-001: Transferencia entre Cuentas
-- DÉBITO: Cuenta Destino (11)
-- CRÉDITO: Cuenta Origen (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'TRA-001'), '111010', 'DEBITO', 1, true, 'Cuenta destino'),
((SELECT id FROM accounting_concepts WHERE code = 'TRA-001'), '111005', 'CREDITO', 2, false, 'Cuenta origen');

-- TRA-002: Consignación a Caja
-- DÉBITO: Banco (11)
-- CRÉDITO: Caja (11)
INSERT INTO concept_account_mappings (concept_id, account_code, movement_type, position, is_main, description) VALUES
((SELECT id FROM accounting_concepts WHERE code = 'TRA-002'), '111005', 'DEBITO', 1, true, 'Depósito en banco'),
((SELECT id FROM accounting_concepts WHERE code = 'TRA-002'), '110505', 'CREDITO', 2, false, 'Salida de caja');

COMMENT ON TABLE accounting_concepts IS 'Conceptos contables predefinidos para automatizar la generación de asientos';
COMMENT ON TABLE concept_account_mappings IS 'Mapeo de cuentas contables asociadas a cada concepto para generar asientos automáticamente';
