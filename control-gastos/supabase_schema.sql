-- =====================================================
-- SISTEMA CONTABLE - ESQUEMA DE BASE DE DATOS
-- Plan Único de Cuentas (PUC) NIIF Colombia
-- =====================================================

-- 1. PLAN ÚNICO DE CUENTAS (PUC)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO', 'COSTOS'
    level INTEGER NOT NULL, -- 1: Clase, 2: Grupo, 3: Cuenta, 4: Subcuenta, 5: Auxiliar
    parent_code VARCHAR(10), -- Código de la cuenta padre
    nature VARCHAR(10) NOT NULL, -- 'DEBITO' o 'CREDITO'
    accepts_movement BOOLEAN DEFAULT false, -- Si acepta movimientos directos
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_parent_account FOREIGN KEY (parent_code) 
        REFERENCES chart_of_accounts(code) ON DELETE RESTRICT
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_coa_code ON chart_of_accounts(code);
CREATE INDEX idx_coa_parent ON chart_of_accounts(parent_code);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_level ON chart_of_accounts(level);

-- 2. CONCEPTOS CONTABLES
CREATE TABLE IF NOT EXISTS accounting_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    concept_type VARCHAR(50) NOT NULL, -- 'INGRESO', 'GASTO', 'TRANSFERENCIA', 'AJUSTE'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RELACIÓN CONCEPTOS - CUENTAS (Configuración de asientos)
CREATE TABLE IF NOT EXISTS concept_account_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    concept_id UUID NOT NULL,
    account_code VARCHAR(10) NOT NULL,
    movement_type VARCHAR(10) NOT NULL, -- 'DEBITO' o 'CREDITO'
    position INTEGER NOT NULL, -- Orden de la cuenta en el asiento
    is_main BOOLEAN DEFAULT false, -- Si es la cuenta principal del concepto
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_concept FOREIGN KEY (concept_id) 
        REFERENCES accounting_concepts(id) ON DELETE CASCADE,
    CONSTRAINT fk_account FOREIGN KEY (account_code) 
        REFERENCES chart_of_accounts(code) ON DELETE RESTRICT,
    CONSTRAINT chk_movement_type CHECK (movement_type IN ('DEBITO', 'CREDITO'))
);

-- Índices
CREATE INDEX idx_cam_concept ON concept_account_mappings(concept_id);
CREATE INDEX idx_cam_account ON concept_account_mappings(account_code);

-- 4. ASIENTOS CONTABLES (Encabezado)
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(50) NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    concept_id UUID,
    transaction_id UUID, -- Relación con transacciones existentes
    description TEXT NOT NULL,
    reference VARCHAR(100), -- Número de factura, recibo, etc.
    user_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'POSTED', 'VOID'
    total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
    posted_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_je_concept FOREIGN KEY (concept_id) 
        REFERENCES accounting_concepts(id) ON DELETE SET NULL,
    CONSTRAINT fk_je_user FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_status CHECK (status IN ('DRAFT', 'POSTED', 'VOID')),
    CONSTRAINT chk_balanced CHECK (status != 'POSTED' OR total_debit = total_credit)
);

-- Índices
CREATE INDEX idx_je_date ON journal_entries(entry_date);
CREATE INDEX idx_je_number ON journal_entries(entry_number);
CREATE INDEX idx_je_status ON journal_entries(status);
CREATE INDEX idx_je_user ON journal_entries(user_id);
CREATE INDEX idx_je_transaction ON journal_entries(transaction_id);

-- 5. DETALLES DE ASIENTOS CONTABLES (Líneas)
CREATE TABLE IF NOT EXISTS journal_entry_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL,
    line_number INTEGER NOT NULL,
    account_code VARCHAR(10) NOT NULL,
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    provider_id UUID, -- Relación con proveedores (para gastos)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_jed_entry FOREIGN KEY (journal_entry_id) 
        REFERENCES journal_entries(id) ON DELETE CASCADE,
    CONSTRAINT fk_jed_account FOREIGN KEY (account_code) 
        REFERENCES chart_of_accounts(code) ON DELETE RESTRICT,
    CONSTRAINT fk_jed_provider FOREIGN KEY (provider_id) 
        REFERENCES providers(id) ON DELETE SET NULL,
    CONSTRAINT chk_amounts CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR 
        (credit_amount > 0 AND debit_amount = 0)
    ),
    CONSTRAINT uq_line_number UNIQUE (journal_entry_id, line_number)
);

-- Índices
CREATE INDEX idx_jed_entry ON journal_entry_details(journal_entry_id);
CREATE INDEX idx_jed_account ON journal_entry_details(account_code);
CREATE INDEX idx_jed_provider ON journal_entry_details(provider_id);

-- 6. TRIGGERS PARA ACTUALIZAR TOTALES
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE journal_entries
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0)
            FROM journal_entry_details
            WHERE journal_entry_id = NEW.journal_entry_id
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0)
            FROM journal_entry_details
            WHERE journal_entry_id = NEW.journal_entry_id
        ),
        updated_at = NOW()
    WHERE id = NEW.journal_entry_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_je_totals
AFTER INSERT OR UPDATE OR DELETE ON journal_entry_details
FOR EACH ROW
EXECUTE FUNCTION update_journal_entry_totals();

-- 7. FUNCIÓN PARA GENERAR NÚMERO DE ASIENTO
CREATE OR REPLACE FUNCTION generate_entry_number()
RETURNS VARCHAR AS $$
DECLARE
    next_number INTEGER;
    year_prefix VARCHAR(4);
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 6) AS INTEGER)), 0) + 1
    INTO next_number
    FROM journal_entries
    WHERE entry_number LIKE year_prefix || '%';
    
    RETURN year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_account_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_details ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (todos los usuarios autenticados pueden leer)
CREATE POLICY "Usuarios pueden leer PUC" ON chart_of_accounts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden leer conceptos" ON accounting_concepts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios pueden leer mapeos" ON concept_account_mappings
    FOR SELECT TO authenticated USING (true);

-- Solo pueden ver sus propios asientos
CREATE POLICY "Usuarios pueden ver sus asientos" ON journal_entries
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden crear asientos" ON journal_entries
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus asientos en borrador" ON journal_entries
    FOR UPDATE TO authenticated 
    USING (auth.uid() = user_id AND status = 'DRAFT')
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden ver detalles de sus asientos" ON journal_entry_details
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE id = journal_entry_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Usuarios pueden crear detalles de asientos" ON journal_entry_details
    FOR INSERT TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE id = journal_entry_id AND user_id = auth.uid() AND status = 'DRAFT'
        )
    );

CREATE POLICY "Usuarios pueden eliminar sus asientos" ON journal_entries
    FOR DELETE TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar detalles de sus asientos" ON journal_entry_details
    FOR DELETE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM journal_entries 
            WHERE id = journal_entry_id AND user_id = auth.uid()
        )
    );

-- 9. VISTAS ÚTILES
CREATE OR REPLACE VIEW v_account_balances AS
SELECT 
    jed.account_code,
    coa.name as account_name,
    coa.account_type,
    coa.nature,
    SUM(jed.debit_amount) as total_debit,
    SUM(jed.credit_amount) as total_credit,
    CASE 
        WHEN coa.nature = 'DEBITO' THEN SUM(jed.debit_amount) - SUM(jed.credit_amount)
        ELSE SUM(jed.credit_amount) - SUM(jed.debit_amount)
    END as balance
FROM journal_entry_details jed
INNER JOIN chart_of_accounts coa ON jed.account_code = coa.code
INNER JOIN journal_entries je ON jed.journal_entry_id = je.id
WHERE je.status = 'POSTED'
GROUP BY jed.account_code, coa.name, coa.account_type, coa.nature;

-- Vista de asientos con detalles
CREATE OR REPLACE VIEW v_journal_entries_full AS
SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.reference,
    je.status,
    je.total_debit,
    je.total_credit,
    ac.name as concept_name,
    json_agg(
        json_build_object(
            'line_number', jed.line_number,
            'account_code', jed.account_code,
            'account_name', coa.name,
            'description', jed.description,
            'debit', jed.debit_amount,
            'credit', jed.credit_amount,
            'provider_name', p.name
        ) ORDER BY jed.line_number
    ) as details
FROM journal_entries je
LEFT JOIN accounting_concepts ac ON je.concept_id = ac.id
LEFT JOIN journal_entry_details jed ON je.id = jed.journal_entry_id
LEFT JOIN chart_of_accounts coa ON jed.account_code = coa.code
LEFT JOIN providers p ON jed.provider_id = p.id
GROUP BY je.id, je.entry_number, je.entry_date, je.description, 
         je.reference, je.status, je.total_debit, je.total_credit, ac.name;

COMMENT ON TABLE chart_of_accounts IS 'Plan Único de Cuentas (PUC) bajo NIIF Colombia';
COMMENT ON TABLE accounting_concepts IS 'Conceptos contables predefinidos para automatizar asientos';
COMMENT ON TABLE journal_entries IS 'Encabezados de asientos contables';
COMMENT ON TABLE journal_entry_details IS 'Detalles (líneas) de asientos contables';

-- 10. FUNCIONES DE REPORTES
CREATE OR REPLACE FUNCTION get_account_balances(p_user_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
    account_code TEXT,
    account_name TEXT,
    account_type TEXT,
    nature TEXT,
    total_debit DECIMAL,
    total_credit DECIMAL,
    balance DECIMAL
) AS \$\$
BEGIN
    RETURN QUERY
    SELECT 
        jed.account_code,
        coa.name as account_name,
        coa.account_type,
        coa.nature,
        SUM(jed.debit_amount) as total_debit,
        SUM(jed.credit_amount) as total_credit,
        CASE 
            WHEN coa.nature = 'DEBITO' THEN SUM(jed.debit_amount) - SUM(jed.credit_amount)
            ELSE SUM(jed.credit_amount) - SUM(jed.debit_amount)
        END as balance
    FROM journal_entry_details jed
    INNER JOIN chart_of_accounts coa ON jed.account_code = coa.code
    INNER JOIN journal_entries je ON jed.journal_entry_id = je.id
    WHERE je.user_id = p_user_id 
      AND je.status = 'POSTED'
      AND (p_start_date IS NULL OR je.entry_date >= p_start_date)
      AND (p_end_date IS NULL OR je.entry_date <= p_end_date)
    GROUP BY jed.account_code, coa.name, coa.account_type, coa.nature;
END;
\$\$ LANGUAGE plpgsql;
