// @ts-ignore
import PizZip from 'pizzip';
// @ts-ignore
import Docxtemplater from 'docxtemplater';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';
import type { WorkflowTemplate } from '../types';

/**
 * Generates an Excel file from process data.
 */
export async function generateExcel(data: Record<string, any>, outputFilename: string): Promise<File> {
    const flattenedData = [data]; // Simple 1-row sheet for now
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const finalFilename = outputFilename.endsWith('.xlsx') ? outputFilename : `${outputFilename}.xlsx`;

    return new File([excelBuffer], finalFilename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
}

/**
 * Generates a simple PDF report from process data.
 */
export async function generatePdf(data: Record<string, any>, outputFilename: string, logoUrl?: string): Promise<File> {
    const doc = new jsPDF();

    // Background Header
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, 0, 210, 42, 'F');

    // 1. Logo (if provided/requested)
    if (logoUrl) {
        try {
            // Add image to PDF (Position 20, 10, Size 25x25)
            doc.addImage(logoUrl, 'PNG', 20, 8, 26, 26);
        } catch (e) {
            console.warn("Could not add logo to PDF:", e);
        }
    }

    // Header
    const headerX = logoUrl ? 55 : 20;

    // Org Name (optional fallback)
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE OFICIAL DEL PROCESO', headerX, 16);

    // Title
    doc.setFontSize(24);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Comprobante de Trámite', headerX, 26);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleString();
    doc.text(`Expedido el: ${today}`, headerX, 33);

    // separator
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(0, 42, 210, 42);

    // Content Start
    let y = 55;

    // Sections Divider
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES CAPTURADOS', 20, y - 5);

    doc.setFontSize(11);
    doc.setTextColor(0);

    Object.entries(data).forEach(([key, value]) => {
        // Skip metadata internal keys
        if (['id', 'process_id', 'workflows', 'activities', 'organization_id'].includes(key)) return;

        if (y > 270) {
            doc.addPage();
            y = 30;
        }

        const label = key.toUpperCase().replace(/_/g, ' ');
        const valStr = (value === null || value === undefined) ? '-' : (typeof value === 'object' ? JSON.stringify(value) : String(value));

        // Field Container Background
        doc.setFillColor(249, 250, 251);
        doc.roundedRect(18, y - 5, 174, 12, 2, 2, 'F');

        // Field Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(label, 22, y + 2);

        // Field Value
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59); // slate-800
        const lines = doc.splitTextToSize(valStr, 110);
        doc.text(lines, 75, y + 2);

        y += Math.max(12, (lines.length * 5) + 6);
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    }

    const pdfBuffer = doc.output('blob');
    const finalFilename = outputFilename.endsWith('.pdf') ? outputFilename : `${outputFilename}.pdf`;

    return new File([pdfBuffer], finalFilename, { type: 'application/pdf' });
}

/**
 * Downloads a template from Supabase Storage and generates a new document
 * with the provided data using docxtemplater.
 * 
 * @param templateId The ID of the template in workflow_templates
 * @param data The JSON data to replace in the template placeholders (e.g. {{name}})
 * @param outputFilename The desired filename for the generated document (without extension)
 * @returns A File object containing the generated .docx document
 */
export async function generateDocument(templateId: string, data: Record<string, any>, outputFilename: string): Promise<File> {
    try {
        // 1. Fetch template metadata to get file_path
        const { data: template, error: dbError } = await supabase
            .from('workflow_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (dbError || !template) {
            throw new Error(`Error fetching template data: ${dbError?.message || 'Template not found'}`);
        }

        const templateData = template as WorkflowTemplate;

        // 2. Download the template file from Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('workflow-templates')
            .download(templateData.file_path);

        if (downloadError || !fileData) {
            throw new Error(`Error downloading template file: ${downloadError?.message || 'File is empty'}`);
        }

        // 3. Read the array buffer from the Blob
        const arrayBuffer = await fileData.arrayBuffer();

        // 4. Load the zip containing the Word document
        const zip = new PizZip(arrayBuffer);

        // 5. Initialize Docxtemplater
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' }
        });

        // 6. Provide the data to replace the tags
        // Handle undefined/null values smoothly
        // Handle undefined/null values smoothly, and stringify objects/arrays to avoid MultiError
        const safeData: Record<string, string | number> = {};
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                safeData[key] = '';
            } else if (typeof value === 'object') {
                safeData[key] = JSON.stringify(value);
            } else {
                safeData[key] = value;
            }
        }

        doc.render(safeData);

        // 7. Get the generated document as a Blob
        const generatedDocBuffer = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            compression: 'DEFLATE',
        });

        // 8. Convert Blob to File object
        const finalFilename = outputFilename.endsWith('.docx') ? outputFilename : `${outputFilename}.docx`;
        const generatedFile = new File([generatedDocBuffer], finalFilename, {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });

        return generatedFile;

    } catch (error: any) {
        // Detailed Docxtemplater error parsing
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors.map((e: any) => {
                return e.properties?.explanation || e.message || 'Error desconocido';
            }).join(', ');
            console.error('Docxtemplater MultiError:', errorMessages);
            throw new Error(`Error en la plantilla: ${errorMessages}`);
        }

        console.error('Document generation failed:', error);
        throw error;
    }
}
