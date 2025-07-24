import React, { useState, useMemo } from 'react';
import { Book, BookCategory, BookStatus } from '@/types';
import Card from '@/components/ui/Card';
import DataGrid from '@/components/ui/data/DataGrid';
import type { DataGridColumn } from '@/components/ui/data/DataGrid';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type BookFormData = Omit<Partial<Book>, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'category_name' | 'status'> & {
    status: BookStatus; // Ensure status is always provided in the form
};

const BooksPage: React.FC = () => {
  const { 
    books, 
    bookCategories, 
    loading, 
    addBook, 
    updateBook, 
    deleteBook: mockDeleteBook 
} = useAppData(); // Updated
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const initialFormData: BookFormData = { 
    title: '', 
    accession_no: '',
    status: BookStatus.AVAILABLE, 
  };
  const [formData, setFormData] = useState<BookFormData>(initialFormData);

  const openModal = (book?: Book) => {
    setEditingBook(book || null);
    setFormData(book ? 
      { 
        title: book.title, 
        author: book.author,
        publisher: book.publisher,
        isbn: book.isbn,
        accession_no: book.accession_no,
        purchase_cost: book.purchase_cost,
        status: book.status,
        category_id: book.category_id
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | undefined = value;
    if (name === 'category_id') {
        processedValue = value ? parseInt(value) : undefined;
    } else if (name === 'purchase_cost') {
        processedValue = parseFloat(value) || 0;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.accession_no || !formData.status) {
      alert("Title, Accession Number, and Status are required.");
      return;
    }
    const payload: Omit<Book, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'category_name'> = {
      title: formData.title!,
      author: formData.author || undefined,
      publisher: formData.publisher || undefined,
      isbn: formData.isbn || undefined,
      accession_no: formData.accession_no!,
      purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : undefined,
      status: formData.status,
      category_id: formData.category_id ? Number(formData.category_id) : undefined,
    };

    if (editingBook) {
      await updateBook({ ...editingBook, ...payload });
    } else {
      await addBook(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this book? This may affect existing loans and fines.')) {
      await mockDeleteBook(id);
    }
  };

  const columns: DataGridColumn<Book>[] = [
    {
      key: 'accession_no',
      header: 'Accession No',
      sortable: true,
      filterable: true,
      sticky: true,
      width: 140
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      filterable: true
    },
    {
      key: 'author',
      header: 'Author',
      sortable: true,
      filterable: true
    },
    {
      key: 'category_name',
      header: 'Category',
      sortable: true,
      filterable: true
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 120,
      render: (value, row) => (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === BookStatus.AVAILABLE ? 'bg-green-100 text-green-800' :
          value === BookStatus.ON_LOAN ? 'bg-yellow-100 text-yellow-800' :
          value === BookStatus.LOST ? 'bg-red-100 text-red-800' :
          value === BookStatus.DAMAGED ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800' // Reserved, Archived
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (_, row) => (
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openModal(row)} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDelete(row.id)} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if ((loading.books || loading.bookCategories) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Books...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Library Book Catalog Management" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Book
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Manage all books in the library catalog.
        </p>
        <DataGrid
          columns={columns}
          data={books || []}
          loading={loading.books && isModalOpen}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-12">
              <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No books found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first book to the library catalog.
              </p>
              <div className="mt-6">
                <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-4 h-4" />}>
                  Add Book
                </Button>
              </div>
            </div>
          }
          className="mt-4"
        />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingBook ? 'Edit Book' : 'Add New Book'} size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.books}>
              {loading.books ? <Spinner size="sm"/> : (editingBook ? 'Save Changes' : 'Add Book')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="title" label="Book Title" value={formData.title || ''} onChange={handleInputChange} required containerClassName="md:col-span-2"/>
            <Input name="accession_no" label="Accession Number" value={formData.accession_no || ''} onChange={handleInputChange} required />
            <Input name="author" label="Author(s)" value={formData.author || ''} onChange={handleInputChange} />
            <Input name="publisher" label="Publisher" value={formData.publisher || ''} onChange={handleInputChange} />
            <Input name="isbn" label="ISBN" value={formData.isbn || ''} onChange={handleInputChange} />
            <Select name="category_id" label="Category" value={formData.category_id || ''} onChange={handleInputChange}>
                <option value="">Select Category</option>
                {(bookCategories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
            <Input name="purchase_cost" label="Purchase Cost (KES)" type="number" step="0.01" value={formData.purchase_cost ?? ''} onChange={handleInputChange} />
            <Select name="status" label="Status" value={formData.status} onChange={handleInputChange} required>
                {Object.values(BookStatus).map(status => <option key={status} value={status}>{status}</option>)}
            </Select>
        </div>
      </Modal>
    </div>
  );
};

export default BooksPage;
