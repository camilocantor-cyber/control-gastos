import type { Transaction, SummaryStats } from '../types';

export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export const calculateStats = (transactions: Transaction[]): SummaryStats => {
    const totalIncome = transactions
        .filter((t) => t.type === 'income')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((acc, curr) => acc + curr.amount, 0);

    return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
    };
};

export const formatDate = (dateString: string): string => {
    // Fix for 'Invalid Date' if parsing manual format or ensure it works broadly
    // Just use standard Date for now assuming ISO string
    const date = new Date(dateString);
    // Add timezone offset correction if needed, or use UTC.
    // Actually, split('T')[0] gives YYYY-MM-DD. New Date('YYYY-MM-DD') is UTC.
    // To show correctly in local time, we might need adjustment.
    // But for now, standard display:
    return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC' // because we store date only part which usually implies UTC midnight when parsed
    });
};
