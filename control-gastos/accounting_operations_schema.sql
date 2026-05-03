-- =====================================================
-- CONTABILIDAD AVANZADA - OPERACIONES CONTABLES
-- Soporte para formularios dinámicos y plantillas formuladas
-- =====================================================

-- 1. DEFINICIÓN DE OPERACIONES (Equivalente a Actividades/Procesos)
CREATE TABLE IF NOT EXISTS accounting_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    concept_id UUID, -- Concepto contable base
    user_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_ao_concept FOREIGN KEY (concept_id) 
        REFERENCES accounting_concepts(id) ON DELETE SET NULL,
    CONSTRAINT fk_ao_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. PARÁMETROS DE LA OPERACIÓN (Campos del formulario)
-- Ej: valor, tercero, descripcion, etc.
CREATE TABLE IF NOT EXISTS operation_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL, -- Nombre interno (ej: valor)
    label VARCHAR(255) NOT NULL, -- Etiqueta UI (ej: Valor de la transacción)
    data_type VARCHAR(50) NOT NULL DEFAULT 'NUMBER', -- NUMBER, TEXT, DATE, PROVIDER
    required BOOLEAN DEFAULT true,
    default_value TEXT,
    position INTEGER NOT NULL,
    
    CONSTRAINT fk_op_operation FOREIGN KEY (operation_id) 
        REFERENCES accounting_operations(id) ON DELETE CASCADE,
    CONSTRAINT uq_op_name UNIQUE (operation_id, name)
);

-- 3. PLANTILLA DE GENERACIÓN (Grilla estilo XLS)
-- Aquí se definen las cuentas afectación y fórmulas
CREATE TABLE IF NOT EXISTS operation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    account_code VARCHAR(10) NOT NULL,
    movement_type VARCHAR(10) NOT NULL, -- 'DEBITO' o 'CREDITO'
    
    -- Los siguientes campos pueden contener fórmulas o variables {{variable}}
    third_party_formula TEXT, -- Ej: {{tercero}}
    description_formula TEXT, -- Ej: {{descripcion}}
    value_formula TEXT, -- Ej: {{valor}} o cta{{11050501}} + cta{{11050502}}
    
    base_formula TEXT,
    cost_center TEXT,
    municipality TEXT,
    active_asset TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_ot_operation FOREIGN KEY (operation_id) 
        REFERENCES accounting_operations(id) ON DELETE CASCADE,
    CONSTRAINT fk_ot_account FOREIGN KEY (account_code) 
        REFERENCES chart_of_accounts(code) ON DELETE RESTRICT,
    CONSTRAINT chk_ot_movement CHECK (movement_type IN ('DEBITO', 'CREDITO'))
);

-- RLS
ALTER TABLE accounting_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own operations" ON accounting_operations
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own parameters" ON operation_parameters
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM accounting_operations WHERE id = operation_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage their own templates" ON operation_templates
    FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM accounting_operations WHERE id = operation_id AND user_id = auth.uid()));
