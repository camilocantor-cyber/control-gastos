-- 4. ASIENTOS CONTABLES (Encabezado)
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    concept_id UUID,
    operation_id UUID REFERENCES public.accounting_operations(id),
    description TEXT NOT NULL,
    reference VARCHAR(100),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'VOID')),
    total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
    posted_at TIMESTAMP WITH TIME ZONE,
    voided_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(entry_number, organization_id)
);

-- 5. DETALLES DE ASIENTOS CONTABLES (Líneas)
CREATE TABLE IF NOT EXISTS public.journal_entry_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    description TEXT,
    debit_amount DECIMAL(15,2) DEFAULT 0,
    credit_amount DECIMAL(15,2) DEFAULT 0,
    provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(journal_entry_id, line_number)
);

-- RLS Policies
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal entries in their organization" ON public.journal_entries
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage journal entries in their organization" ON public.journal_entries
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view journal entry details in their organization" ON public.journal_entry_details
    FOR SELECT USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage journal entry details in their organization" ON public.journal_entry_details
    FOR ALL USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Trigger to update totals
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE journal_entries
    SET 
        total_debit = (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entry_details WHERE journal_entry_id = NEW.journal_entry_id),
        total_credit = (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_entry_details WHERE journal_entry_id = NEW.journal_entry_id),
        updated_at = NOW()
    WHERE id = NEW.journal_entry_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_je_totals
AFTER INSERT OR UPDATE OR DELETE ON journal_entry_details
FOR EACH ROW EXECUTE FUNCTION update_journal_entry_totals();
