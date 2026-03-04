// @ts-ignore
import PizZip from 'pizzip';
// @ts-ignore
import Docxtemplater from 'docxtemplater';
import { supabase } from '../lib/supabase';
import type { WorkflowTemplate } from '../types';

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
