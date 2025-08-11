// src/modules/academics/components/BulkMarkEntry.tsx

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { uploadMarks, downloadMarksTemplate } from '../services/marksService';

const BulkMarkEntry: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleImport = async () => {
    setUploading(true);
    try {
      // Call the uploadMarks service (pseudo implementation)
      await uploadMarks();
      alert('Marks imported successfully!');
    } catch (error) {
      alert('Failed to import marks.');
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async () => {
    setDownloading(true);
    try {
      // Call the downloadMarksTemplate service
      await downloadMarksTemplate();
      alert('Template downloaded successfully!');
    } catch (error) {
      alert('Failed to download template.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Button onClick={handleImport} disabled={uploading}>
        {uploading ? 'Importing...' : 'Import Marks'}
      </Button>
      <Button onClick={handleExport} disabled={downloading}>
        {downloading ? 'Downloading...' : 'Download Template'}
      </Button>
    </div>
  );
};

export default BulkMarkEntry;
