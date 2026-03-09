import type { Transaction } from '../types';

export function exportToCSV(transactions: Transaction[], filename: string = 'movimientos.csv') {
    if (transactions.length === 0) return;

    const headers = ['Fecha', 'Tipo', 'Categoría', 'Proveedor', 'Descripción', 'Monto'];
    const rows = transactions.map(t => [
        t.date,
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        t.category,
        t.provider || '',
        t.description || '',
        t.amount
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
