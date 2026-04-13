/**
 * useFrappeFileUpload Hook
 * 
 * Upload files to Frappe with progress tracking.
 */

import { useState, useCallback } from 'react';
import { useFrappeProvider } from './useFrappeProvider';

export interface UseFrappeFileUploadOptions {
  isPrivate?: boolean;
  folder?: string;
  doctype?: string;
  docname?: string;
  fieldname?: string;
}

export interface UseFrappeFileUploadResult {
  upload: (file: File, options?: UseFrappeFileUploadOptions) => Promise<any>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  reset: () => void;
}

/**
 * Hook to upload files to Frappe
 */
export function useFrappeFileUpload(): UseFrappeFileUploadResult {
  const { client, isActive } = useFrappeProvider();
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const upload = useCallback(async (file: File, options: UseFrappeFileUploadOptions = {}) => {
    if (!client || !isActive) {
      throw new Error('Frappe provider not active');
    }
    
    setIsUploading(true);
    setProgress(0);
    setError(null);
    
    try {
      // Simulate progress (Frappe SDK doesn't provide progress events)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);
      
      const result = await client.file.uploadFile(file, {
        isPrivate: options.isPrivate ?? false,
        folder: options.folder ?? 'Home',
        file_name: file.name,
        doctype: options.doctype,
        docname: options.docname,
        fieldname: options.fieldname,
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [client, isActive]);
  
  const reset = useCallback(() => {
    setProgress(0);
    setError(null);
    setIsUploading(false);
  }, []);
  
  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  };
}
