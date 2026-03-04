import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { WorkflowTemplate } from '../types';

export function useTemplateUpload() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const uploadTemplate = async (file: File, workflowId: string): Promise<WorkflowTemplate | null> => {
        try {
            setUploading(true);
            setError(null);

            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('El archivo no puede superar 10MB');
            }

            // Validate file type
            const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
            const allowedExtensions = ['docx'];
            if (!allowedExtensions.includes(fileExt)) {
                throw new Error('Tipo de archivo no permitido. Solo se permiten plantillas Word (.docx)');
            }

            // Generate unique file path
            const fileName = `${workflowId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('workflow-templates')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Create database record
            const { data: templateData, error: dbError } = await supabase
                .from('workflow_templates')
                .insert({
                    workflow_id: workflowId,
                    organization_id: user?.organization_id,
                    name: file.name,
                    file_path: uploadData.path,
                    file_size: file.size,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (dbError) {
                // Rollback storage if db insert fails
                await supabase.storage.from('workflow-templates').remove([uploadData.path]);
                throw dbError;
            }

            return templateData as WorkflowTemplate;
        } catch (err: any) {
            console.error('Template upload error:', err);
            setError(err.message);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const deleteTemplate = async (templateId: string, filePath: string): Promise<boolean> => {
        try {
            setError(null);

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('workflow-templates')
                .remove([filePath]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await supabase
                .from('workflow_templates')
                .delete()
                .eq('id', templateId);

            if (dbError) throw dbError;

            return true;
        } catch (err: any) {
            console.error('Template delete error:', err);
            setError(err.message);
            return false;
        }
    };

    const loadTemplates = useCallback(async (workflowId: string): Promise<WorkflowTemplate[]> => {
        try {
            setError(null);
            const { data, error } = await supabase
                .from('workflow_templates')
                .select('*')
                .eq('workflow_id', workflowId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as WorkflowTemplate[];
        } catch (err: any) {
            console.error('Template load error:', err);
            setError(err.message);
            return [];
        }
    }, []);

    const downloadTemplate = async (filePath: string, fileName: string) => {
        try {
            setError(null);

            // Get signed URL
            const { data, error } = await supabase.storage
                .from('workflow-templates')
                .createSignedUrl(filePath, 60);

            if (error) throw error;

            // Download file
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            console.error('Template download error:', err);
            setError(err.message);
        }
    };

    return {
        uploadTemplate,
        deleteTemplate,
        loadTemplates,
        downloadTemplate,
        uploading,
        error
    };
}
