import * as XLSX from 'xlsx';

/**
 * Exporta un array de objetos a un archivo Excel (.xlsx)
 * @param data Array de objetos con los datos
 * @param fileName Nombre del archivo (sin extensión)
 * @param sheetName Nombre de la hoja
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Datos') {
    try {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
        return true;
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        return false;
    }
}
