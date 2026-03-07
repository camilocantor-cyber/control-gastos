// @ts-ignore
import PizZip from 'pizzip';
// @ts-ignore
import Docxtemplater from 'docxtemplater';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';
import type { WorkflowTemplate, WorkflowDetail } from '../types';

/**
 * Normalizes a string to a snake_case identifier safe for docxtemplater tags.
 * "Contratos Adicionales" → "contratos_adicionales"
 */
function toSnakeCase(str: string): string {
    return str
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

// ---------- XML helpers for OOXML generation ----------

const esc = (s: string) =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

function xmlCell(
    text: string,
    opts: { width?: number; fill?: string; bold?: boolean; color?: string; fontColor?: string; mono?: boolean; align?: string } = {}
) {
    const { width = 2000, fill, bold, fontColor, mono, align } = opts;
    const cellShd = fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : '';
    const rBold = bold ? '<w:b/>' : '';
    const rColor = fontColor ? `<w:color w:val="${fontColor}"/>` : '';
    const rFont = mono ? `<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>` : '';
    const jc = align ? `<w:jc w:val="${align}"/>` : '';
    return `<w:tc>
      <w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${cellShd}</w:tcPr>
      <w:p><w:pPr><w:spacing w:after="60"/>${jc}</w:pPr>
        <w:r><w:rPr>${rBold}${rColor}${rFont}<w:sz w:val="18"/></w:rPr>
          <w:t xml:space="preserve">${esc(text)}</w:t>
        </w:r>
      </w:p>
    </w:tc>`;
}

function xmlParagraph(text: string, opts: { bold?: boolean; color?: string; size?: number; italic?: boolean; spaceBefore?: number; spaceAfter?: number; align?: string } = {}) {
    const { bold, color, size = 20, italic, spaceBefore, spaceAfter = 100, align } = opts;
    const spacing = `<w:spacing w:before="${spaceBefore || 0}" w:after="${spaceAfter}"/>`;
    const jc = align ? `<w:jc w:val="${align}"/>` : '';
    return `<w:p>
      <w:pPr>${spacing}${jc}</w:pPr>
      <w:r>
        <w:rPr>
          ${bold ? '<w:b/>' : ''}
          ${italic ? '<w:i/>' : ''}
          ${color ? `<w:color w:val="${color}"/>` : ''}
          <w:sz w:val="${size}"/>
        </w:rPr>
        <w:t xml:space="preserve">${esc(text)}</w:t>
      </w:r>
    </w:p>`;
}

/**
 * Generates a pre-designed Word (.docx) template for a WorkflowDetail (carpeta).
 *
 * The generated document contains:
 *  1. Title and description
 *  2. A "variables reference" table — all available {{tags}} with their descriptions
 *  3. A ready-to-use loop table with:
 *     - Header row (field labels)
 *     - Data row with {{#carpeta}}...{{/carpeta}} loop markers already filled in
 *     - Totals row showing {{carpeta_total}}
 *
 * The user can download this file, customise it in Word, then upload it to the
 * workflow template manager and use it in a document_generation action.
 */
export function generateDetailWordTemplate(detail: WorkflowDetail): File {
    const folderKey = toSnakeCase(detail.name || 'detalle');
    const fields = (detail.fields || []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

    // Column widths for the main table
    const totalW = 8500;
    const numCols = fields.length + 1; // +1 for the # column
    const colW = Math.floor(totalW / numCols);

    // ---- Reference table rows ----
    const refTagRows = [
        { tag: `{{_fila}}`, desc: 'Número de fila (automático, 1, 2, 3…)' },
        ...fields.map(f => ({ tag: `{{${f.name}}}`, desc: `${f.label || f.name}  [tipo: ${f.type}]` })),
        { tag: `{{${folderKey}_total}}`, desc: `Total de registros en la carpeta "${detail.name}"` },
    ];

    const refRows = refTagRows.map(({ tag, desc }, i) => {
        const bg = i % 2 === 0 ? 'F8FAFC' : 'FFFFFF';
        return `<w:tr>
          ${xmlCell(tag, { width: 2800, fill: bg, mono: true, fontColor: '2563EB' })}
          ${xmlCell(desc, { width: 5200, fill: bg })}
        </w:tr>`;
    }).join('\n');

    // ---- Main data table header row ----
    const headerCells = [
        xmlCell('#', { width: colW, fill: '1E3A5F', bold: true, fontColor: 'FFFFFF', align: 'center' }),
        ...fields.map(f => xmlCell(f.label || f.name, { width: colW, fill: '1E3A5F', bold: true, fontColor: 'FFFFFF' })),
    ].join('\n');

    // ---- Main data table loop row ----
    // docxtemplater rule: {{#array}} opens in first cell, {{/array}} closes IN THE LAST cell (same row).
    // Both markers can co-exist with content in the same text run.
    const buildLoopRow = () => {
        if (fields.length === 0) {
            return `<w:tr>
              <w:tc>
                <w:tcPr><w:tcW w:w="${totalW}" w:type="dxa"/></w:tcPr>
                <w:p><w:r><w:t xml:space="preserve">{{#${folderKey}}} (sin campos definidos) {{/${folderKey}}}</w:t></w:r></w:p>
              </w:tc>
            </w:tr>`;
        }

        const loopOpen = `{{#${folderKey}}}`;
        const loopClose = `{{/${folderKey}}}`;

        const firstCell = `<w:tc>
          <w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:after="60"/><w:jc w:val="center"/></w:pPr>
            <w:r><w:rPr><w:color w:val="64748B"/><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">${esc(loopOpen)}{{_fila}}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;

        // Middle cells (all fields except the last one)
        const middleCells = fields.slice(0, fields.length - 1).map(f => `<w:tc>
          <w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
            <w:r><w:rPr><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">{{${esc(f.name)}}}</w:t>
            </w:r>
          </w:p>
        </w:tc>`).join('\n');

        // Last cell closes the loop, combined in same text node
        const lastF = fields[fields.length - 1];
        const lastCell = `<w:tc>
          <w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>
          <w:p><w:pPr><w:spacing w:after="60"/></w:pPr>
            <w:r><w:rPr><w:sz w:val="18"/></w:rPr>
              <w:t xml:space="preserve">{{${esc(lastF.name)}}}${esc(loopClose)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`;

        return `<w:tr>${firstCell}${fields.length > 1 ? middleCells : ''}${lastCell}</w:tr>`;
    };

    // ---- Totals row (spans all columns) ----
    const totalsRow = `<w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${totalW}" w:type="dxa"/>
          <w:gridSpan w:val="${numCols}"/>
          <w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/>
        </w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="right"/><w:spacing w:after="60"/></w:pPr>
          <w:r>
            <w:rPr><w:b/><w:color w:val="1E3A5F"/><w:sz w:val="18"/></w:rPr>
            <w:t xml:space="preserve">TOTAL REGISTROS:  {{${esc(folderKey + '_total')}}}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    </w:tr>`;

    // ---- Grid columns for main table ----
    const gridCols = Array(numCols).fill(`<w:gridCol w:w="${colW}"/>`).join('');

    // ---- Full document XML ----
    const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
<w:body>

  ${xmlParagraph(`Plantilla: ${detail.name || 'Carpeta'}`, { bold: true, color: '1E3A5F', size: 36, align: 'center', spaceAfter: 80 })}
  ${xmlParagraph(detail.description || 'Plantilla generada automáticamente por BPM Manager', { italic: true, color: '64748B', size: 18, align: 'center', spaceAfter: 200 })}

  ${xmlParagraph('Variables del Proceso (campos planos)', { bold: true, color: '1E3A5F', size: 22, spaceBefore: 100, spaceAfter: 60 })}
  ${xmlParagraph('Los campos del formulario principal se insertan directamente: {{nombre_campo}}, {{fecha_inicio}}, {{nombre_tramite}}, etc.', { color: '64748B', size: 18, spaceAfter: 200 })}

  ${xmlParagraph(`Variables disponibles — Carpeta: ${detail.name || ''}`, { bold: true, color: '1E3A5F', size: 22, spaceBefore: 100, spaceAfter: 60 })}
  ${xmlParagraph(`Clave del array: {{#${folderKey}}} ... {{/${folderKey}}}`, { color: '0F172A', size: 18, spaceAfter: 120 })}

  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="8000" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="2800"/><w:gridCol w:w="5200"/></w:tblGrid>
    <w:tr>
      ${xmlCell('Tag (Etiqueta)', { width: 2800, fill: '1E3A5F', bold: true, fontColor: 'FFFFFF' })}
      ${xmlCell('Descripción', { width: 5200, fill: '1E3A5F', bold: true, fontColor: 'FFFFFF' })}
    </w:tr>
    ${refRows}
  </w:tbl>

  ${xmlParagraph('Tabla Principal — Lista de Registros', { bold: true, color: '1E3A5F', size: 22, spaceBefore: 300, spaceAfter: 60 })}
  ${xmlParagraph('Esta tabla se repite automáticamente por cada fila ingresada en la carpeta. No elimines los marcadores {{#...}} y {{/...}}.', { italic: true, color: '64748B', size: 18, spaceAfter: 120 })}

  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="${totalW}" w:type="dxa"/>
      <w:tblBorders>
        <w:top    w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:left   w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:right  w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top    w:w="80" w:type="dxa"/>
        <w:left   w:w="108" w:type="dxa"/>
        <w:bottom w:w="80" w:type="dxa"/>
        <w:right  w:w="108" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid>${gridCols}</w:tblGrid>
    <w:tr><w:trPr><w:tblHeader/></w:trPr>${headerCells}</w:tr>
    ${buildLoopRow()}
    ${totalsRow}
  </w:tbl>

  <w:p><w:pPr><w:spacing w:before="400" w:after="0"/></w:pPr></w:p>
  <w:p>
    <w:pPr>
      <w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="CBD5E1"/></w:pBdr>
      <w:spacing w:before="100" w:after="60"/>
    </w:pPr>
    <w:r>
      <w:rPr><w:i/><w:color w:val="94A3B8"/><w:sz w:val="16"/></w:rPr>
      <w:t xml:space="preserve">Plantilla generada por BPM Manager · Carpeta: ${esc(detail.name || '')} · ${esc(today)}</w:t>
    </w:r>
  </w:p>

  <w:sectPr>
    <w:pgSz w:w="12240" w:h="15840"/>
    <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/>
  </w:sectPr>
</w:body>
</w:document>`;

    // ---- Assemble the .docx zip ----
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

    const pkgRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    const zip = new PizZip();
    zip.file('[Content_Types].xml', contentTypesXml);
    zip.file('_rels/.rels', pkgRels);
    zip.file('word/document.xml', docXml);
    zip.file('word/_rels/document.xml.rels', wordRels);

    const blob = zip.generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE',
    });

    const safeName = (detail.name || 'Carpeta').replace(/[^a-zA-Z0-9_\- ]/g, '').trim();
    return new File([blob], `Plantilla_${safeName}.docx`, {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
}


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
 * Supports FLAT fields and ARRAY fields for table loops.
 * Arrays (e.g. detail rows from a folder/carpeta) are passed directly so that
 * docxtemplater can iterate over them using the loop syntax in the Word template:
 *
 *   {{#nombre_carpeta}}  ← row iterator start (use in a table row)
 *   {{campo1}}  {{campo2}}  {{campo3}}
 *   {{/nombre_carpeta}} ← row iterator end
 *
 * The variable name must match the normalized (snake_case) folder name added to the
 * data object by actionRunner before calling this function.
 *
 * @param templateId  The ID of the template in workflow_templates
 * @param data        The JSON data to inject (flat fields + arrays for carpeta loops)
 * @param outputFilename  Desired filename for the generated document (without extension)
 * @returns A File object containing the generated .docx document
 */
export async function generateDocument(
    templateId: string,
    data: Record<string, any>,
    outputFilename: string
): Promise<File> {
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

        // 6. Build render data:
        //    - Arrays are kept as-is so docxtemplater can loop over them (carpeta/detalle tables)
        //    - Plain objects (non-array) are JSON-stringified
        //    - null / undefined become empty string
        //    - Primitives are passed directly
        const renderData: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                renderData[key] = '';
            } else if (Array.isArray(value)) {
                // Keep arrays for loop rendering — each element must be a plain object
                // whose keys map to {{field}} tags inside the loop block.
                renderData[key] = value.map((item: any) => {
                    if (typeof item !== 'object' || item === null) return { value: String(item) };
                    // Flatten nested values to strings so every tag resolves cleanly
                    const flat: Record<string, string> = {};
                    for (const [k, v] of Object.entries(item)) {
                        flat[k] = (v === null || v === undefined) ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
                    }
                    return flat;
                });
            } else if (typeof value === 'object') {
                // Non-array object: stringify to avoid MultiError
                renderData[key] = JSON.stringify(value);
            } else {
                renderData[key] = value;
            }
        }

        doc.render(renderData);

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
