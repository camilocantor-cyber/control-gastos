import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], fileName: string, sheetName: string = 'Detalle') => {
    // Transform data for export if needed
    const exportData = data.map(item => {
        // Handle both process_instances and process_history records
        const proc = item.process_instances || item;
        const user = item.users || item.profiles || {};
        const cost = item.step_cost || item.individual_cost || 0;

        // Duration calculation for history
        let duration = item.time_spent_hours || 0;
        let entryDate = 'N/A';
        let exitDate = new Date(item.created_at).toLocaleString();

        if (item.time_spent_hours) {
            const exit = new Date(item.created_at);
            const entry = new Date(exit.getTime() - (duration * 3600000));
            entryDate = entry.toLocaleString();
        }

        return {
            'Nro Trámite': proc.process_number ? proc.process_number.toString().padStart(8, '0') : (proc.id?.substring(0, 8).toUpperCase() || ''),
            'Proceso': proc.workflows?.name || proc.name || 'N/A',
            'Actividad': item.activities?.name || proc.activities?.name || 'N/A',
            'Sujeto/Executor': user.full_name || 'N/A',
            'Entrada': entryDate,
            'Salida': exitDate,
            'Duración (hrs)': duration.toFixed(1),
            'Inversión/Costo': cost,
            'Estado Actual': proc.status === 'active' ? 'Activo' : 'Completado'
        };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Column widths
    const wscols = [
        { wch: 15 }, // ID
        { wch: 25 }, // Nombre
        { wch: 25 }, // Flujo
        { wch: 25 }, // Actividad
        { wch: 20 }, // Usuario
        { wch: 15 }, // Estado
        { wch: 20 }, // Costo
        { wch: 15 }, // Fecha
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `${fileName}.xlsx`);
};
