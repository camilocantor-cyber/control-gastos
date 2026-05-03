-- Migración para el Plan Único de Cuentas (PUC) y Operaciones Contables

-- 1. Tabla de Cuentas (PUC)
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO', 'COSTOS', 'ORDEN')),
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    parent_code VARCHAR(20),
    nature VARCHAR(10) NOT NULL CHECK (nature IN ('DEBITO', 'CREDITO')),
    accepts_movement BOOLEAN DEFAULT false,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(code, organization_id)
);

-- 2. Tabla de Operaciones Contables
CREATE TABLE IF NOT EXISTS public.accounting_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    concept_id UUID,
    user_id UUID,
    is_active BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(code, organization_id)
);

-- 3. Parámetros de Operaciones
CREATE TABLE IF NOT EXISTS public.operation_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES public.accounting_operations(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('NUMBER', 'TEXT', 'DATE', 'PROVIDER')),
    required BOOLEAN DEFAULT true,
    default_value TEXT,
    position INTEGER NOT NULL,
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Plantillas de Operaciones
CREATE TABLE IF NOT EXISTS public.operation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_id UUID REFERENCES public.accounting_operations(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('DEBITO', 'CREDITO')),
    third_party_formula TEXT,
    description_formula TEXT,
    value_formula TEXT,
    base_formula TEXT,
    cost_center TEXT,
    municipality TEXT,
    active_asset TEXT,
    organization_id UUID REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies

-- chart_of_accounts
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view accounts in their organization" ON public.chart_of_accounts
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage accounts" ON public.chart_of_accounts
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- accounting_operations
ALTER TABLE public.accounting_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view operations in their organization" ON public.accounting_operations
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage operations" ON public.accounting_operations
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- operation_parameters
ALTER TABLE public.operation_parameters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view parameters in their organization" ON public.operation_parameters
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage parameters" ON public.operation_parameters
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- operation_templates
ALTER TABLE public.operation_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view templates in their organization" ON public.operation_templates
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage templates" ON public.operation_templates
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));
