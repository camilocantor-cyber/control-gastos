export type TransactionType = 'income' | 'expense';

export type UserRole = 'admin' | 'editor' | 'viewer' | 'turista';

export interface User {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    organization_id?: string;
    available_organizations?: { id: string, name: string, role: UserRole, logo_url?: string }[];
    permissions?: string[];
    dashboard_widgets?: string[];
}

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: string;
    date: string; // ISO date string
    description?: string;
    provider?: string;
    createdAt: number;
}

export interface SummaryStats {
    totalIncome: number;
    totalExpense: number;
    balance: number;
}

export type Period = 'week' | 'month' | 'year';

export const CATEGORIES = {
    income: ['Salario', 'Negocio', 'Inversiones', 'Regalos', 'Otros'],
    expense: ['Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Otros']
};
