// =====================================================
// TIPOS TYPESCRIPT PARA SISTEMA CONTABLE (PUC y Operaciones)
// =====================================================

export interface ChartOfAccount {
    id: string;
    code: string;
    name: string;
    account_type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTOS' | 'ORDEN';
    level: number; // 1-5
    parent_code: string | null;
    nature: 'DEBITO' | 'CREDITO';
    accepts_movement: boolean;
    description: string | null;
    is_active: boolean;
    organization_id?: string;
    created_at: string;
    updated_at: string;
}

export interface AccountFormData {
    code: string;
    name: string;
    account_type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTOS' | 'ORDEN';
    level: number;
    parent_code: string | null;
    nature: 'DEBITO' | 'CREDITO';
    accepts_movement: boolean;
    description: string;
}

// --- Operaciones Contables Avanzadas ---

export interface AccountingOperation {
    id: string;
    code: string;
    name: string;
    description: string | null;
    concept_id: string | null;
    user_id: string;
    is_active: boolean;
    organization_id?: string;
    created_at: string;
    updated_at: string;
    // Relaciones
    parameters?: OperationParameter[];
    templates?: OperationTemplate[];
}

export interface OperationParameter {
    id: string;
    operation_id: string;
    name: string;
    label: string;
    data_type: 'NUMBER' | 'TEXT' | 'DATE' | 'PROVIDER';
    required: boolean;
    default_value: string | null;
    position: number;
}

export interface OperationTemplate {
    id: string;
    operation_id: string;
    line_number: number;
    account_code: string;
    movement_type: 'DEBITO' | 'CREDITO';
    third_party_formula: string | null;
    description_formula: string | null;
    value_formula: string | null;
    base_formula: string | null;
    cost_center: string | null;
    municipality: string | null;
    active_asset: string | null;
}

// --- Comprobantes y Asientos (Ledger) ---

export interface JournalEntry {
    id: string;
    entry_number: string;
    entry_date: string;
    concept_id: string | null;
    operation_id: string | null;
    description: string;
    reference: string | null;
    user_id: string;
    organization_id: string;
    status: 'DRAFT' | 'POSTED' | 'VOID';
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
    created_at: string;
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
}

export type JournalEntryFormData = Omit<JournalEntry, 'id' | 'entry_number' | 'status' | 'total_debit' | 'total_credit' | 'is_balanced' | 'created_at' | 'details'> & {
    details: JournalEntryDetailFormData[];
};
export type JournalEntryDetailFormData = Omit<JournalEntryDetail, 'id' | 'journal_entry_id'>;

