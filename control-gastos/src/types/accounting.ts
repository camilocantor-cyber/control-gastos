// =====================================================
// TIPOS TYPESCRIPT PARA SISTEMA CONTABLE
// =====================================================

export interface ChartOfAccount {
    id: string;
    code: string;
    name: string;
    account_type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTOS';
    level: number; // 1-5
    parent_code: string | null;
    nature: 'DEBITO' | 'CREDITO';
    accepts_movement: boolean;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AccountingConcept {
    id: string;
    code: string;
    name: string;
    concept_type: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA' | 'AJUSTE';
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ConceptAccountMapping {
    id: string;
    concept_id: string;
    account_code: string;
    movement_type: 'DEBITO' | 'CREDITO';
    position: number;
    is_main: boolean;
    description: string | null;
    created_at: string;
    // Datos relacionados
    account?: ChartOfAccount;
}

export interface JournalEntry {
    id: string;
    entry_number: string;
    entry_date: string;
    concept_id: string | null;
    transaction_id: string | null;
    description: string;
    reference: string | null;
    user_id: string;
    status: 'DRAFT' | 'POSTED' | 'VOID';
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
    posted_at: string | null;
    voided_at: string | null;
    created_at: string;
    updated_at: string;
    // Datos relacionados
    concept?: AccountingConcept;
    details?: JournalEntryDetail[];
}

export interface JournalEntryDetail {
    id: string;
    journal_entry_id: string;
    line_number: number;
    account_code: string;
    description: string | null;
    debit_amount: number;
    credit_amount: number;
    provider_id: string | null;
    created_at: string;
    // Datos relacionados
    account?: ChartOfAccount;
    provider?: Provider;
}

export interface Provider {
    id: string;
    name: string;
    nit: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    is_active: boolean;
    user_id: string;
    created_at: string;
    updated_at: string;
}

export interface AccountBalance {
    account_code: string;
    account_name: string;
    account_type: string;
    nature: 'DEBITO' | 'CREDITO';
    total_debit: number;
    total_credit: number;
    balance: number;
}

// Tipos para formularios
export interface JournalEntryFormData {
    entry_date: string;
    concept_id: string | null;
    description: string;
    reference: string | null;
    details: JournalEntryDetailFormData[];
}

export interface JournalEntryDetailFormData {
    line_number: number;
    account_code: string;
    description: string;
    debit_amount: number;
    credit_amount: number;
    provider_id: string | null;
}

export interface ConceptFormData {
    code: string;
    name: string;
    concept_type: 'INGRESO' | 'GASTO' | 'TRANSFERENCIA' | 'AJUSTE';
    description: string;
    mappings: ConceptMappingFormData[];
}

export interface ConceptMappingFormData {
    account_code: string;
    movement_type: 'DEBITO' | 'CREDITO';
    position: number;
    is_main: boolean;
    description: string;
}

export interface AccountFormData {
    code: string;
    name: string;
    account_type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTOS';
    level: number;
    parent_code: string | null;
    nature: 'DEBITO' | 'CREDITO';
    accepts_movement: boolean;
    description: string;
}

// Tipos para reportes
export interface TrialBalance {
    accounts: TrialBalanceAccount[];
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
}

export interface TrialBalanceAccount {
    code: string;
    name: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface IncomeStatement {
    period_start: string;
    period_end: string;
    operating_income: number;
    non_operating_income: number;
    total_income: number;
    operating_expenses: number;
    non_operating_expenses: number;
    total_expenses: number;
    net_income: number;
    details: IncomeStatementDetail[];
}

export interface IncomeStatementDetail {
    account_code: string;
    account_name: string;
    account_type: string;
    amount: number;
}

export interface BalanceSheet {
    date: string;
    assets: BalanceSheetSection;
    liabilities: BalanceSheetSection;
    equity: BalanceSheetSection;
    total_assets: number;
    total_liabilities_equity: number;
    is_balanced: boolean;
}

export interface BalanceSheetSection {
    accounts: BalanceSheetAccount[];
    total: number;
}

export interface BalanceSheetAccount {
    code: string;
    name: string;
    amount: number;
    level: number;
}
