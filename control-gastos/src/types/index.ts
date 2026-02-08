export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: string;
    date: string; // ISO date string
    description?: string;
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
