// ABOUTME: Page to manage digital resources linked to books, including list and upload functionality
// ABOUTME: Utilizes existing Card/DataGrid/Modal components for consistent UI design

import React, { useState, useEffect } from 'react';
import { LibBookType } from '../data/types';
import { useBookData } from '../data/useBookData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button'; 
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { UploadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

const DigitalResourcesPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: books, isLoading: booksLoading, update: updateBook } = useBookData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibBookType | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [format, setFormat] = useState('');

  useEffect(() => {
    if (editingBook) {
      setFileUrl(editingBook.digital_access_url || '');
      setFormat(editingBook.digital_format || '');
    }
  }, [editingBook]);

  const openModal = (book: LibBookType) => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
    setFileUrl('');
    setFormat('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const url = URL.createObjectURL(files[0]);
      setFileUrl(url);
    }
  };

  const handleSave = async () => {
    if (!editingBook) return;

    await updateBook(editingBook.id, {
      digital_access_url: fileUrl,
      digital_format: format,
    });

    closeModal();
  };

  const columns: DataGridColumn<LibBookType>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      filterable: true
    },
    {
      key: 'digital_access_url',
      header: 'Digital Access',
      render: (book) =>
        book.digital_access_url ? (
          <a href={book.digital_access_url} target="_blank" rel="noopener noreferrer">
            Access File
          </a>
        ) : (
          'N/A'
        )
    },
    {
      key: 'digital_format',
      header: 'Format',
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 150,
      render: (_, book) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" onClick={() => openModal(book)}>
            Update
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Card title="Digital Resources Management">
        {booksLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" /> <span className="ml-2">Loading Books...</span>
          </div>
        ) : (
          <DataGrid<LibBookType>
            columns={columns}
            data={books.filter(book => book.is_digital)}
            sortable={true}
            filterable={true}
            emptyState={
              <div className="text-center py-12">
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No digital resources found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload digital files to create and update digital resources linked to books.
                </p>
              </div>
            }
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={t('Update Digital Resource')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Digital Access URL"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
          />
          <Input
            label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          />
          <input type="file" accept=".pdf,.epub,.mobi,.docx,.txt" onChange={handleFileUpload} />
        </div>
      </Modal>
    </div>
  );
};

export default DigitalResourcesPage;
