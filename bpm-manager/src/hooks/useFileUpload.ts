import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface FileUploadResult {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
}

export function useFileUpload() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const uploadFile = async (file: File, processInstanceId: string): Promise<FileUploadResult | null> => {
        try {
            setUploading(true);
            setError(null);

            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error('El archivo no puede superar 10MB');
            }

            // Validate file type
            const allowedTypes = [
                'application/pdf',
                'image/png',
                'image/jpeg',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ];
            if (!allowedTypes.includes(file.type)) {
                throw new Error('Tipo de archivo no permitido. Solo PDF, imágenes, DOCX y XLSX');
            }

            // Generate unique file path
            const fileExt = file.name.split('.').pop();
            const fileName = `${processInstanceId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('process-files')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // Create database record
            const { data: attachmentData, error: dbError } = await supabase
                .from('process_attachments')
                .insert({
                    process_instance_id: processInstanceId,
                    file_name: file.name,
                    file_path: uploadData.path,
                    file_size: file.size,
                    file_type: file.type,
                    uploaded_by: user?.id,
                    organization_id: user?.organization_id
                })
                .select()
                .single();

            if (dbError) throw dbError;

            return attachmentData;
        } catch (err: any) {
            setError(err.message);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const deleteFile = async (attachmentId: string, filePath: string): Promise<boolean> => {
        try {
            setError(null);

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('process-files')
                .remove([filePath]);

            if (storageError) throw storageError;

            // Delete from database
            const { error: dbError } = await supabase
                .from('process_attachments')
                .delete()
                .eq('id', attachmentId);

            if (dbError) throw dbError;

            return true;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    };

    const downloadFile = async (filePath: string, fileName: string) => {
        try {
            setError(null);

            // Get signed URL
            const { data, error } = await supabase.storage
                .from('process-files')
                .createSignedUrl(filePath, 60); // Valid for 60 seconds

            if (error) throw error;

            // Download file
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return {
        uploadFile,
        deleteFile,
        downloadFile,
        uploading,
        error
    };
}
