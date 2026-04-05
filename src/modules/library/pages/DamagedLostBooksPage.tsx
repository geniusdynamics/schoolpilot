// ABOUTME: Page to filter and manage books with damaged/lost flags and allow status updates
// ABOUTME: Reuses existing Card/DataGrid/Modal components for consistency with the rest of the library module

import React, { useState, useEffect } from 'react';
import { LibBookType, LibBookStatusEnum } from '../data/types';
import { useBookData } from '../data/useBookData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '../../../components/ui/forms/DialogForm';
import FormField from '../../../components/ui/forms/FormField';
import FormSection from '../../../components/ui/forms/FormSection';
import FormActions from '../../../components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { ExclamationTriangleIcon, EditIcon, CheckIcon, XMarkIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

interface StatusUpdateData {
  damaged_status: boolean;
  lost_status: boolean;
  status: LibBookStatusEnum;
  notes: string;
}

const DamagedLostBooksPage: React.FC = () => {
  const { t } = useTranslation();
  const { 
    data: books, 
    isLoading: booksLoading, 
    update: updateBook,
    getDamagedBooks,
    getLostBooks
  } = useBookData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<LibBookType | null>(null);
  const [filteredBooks, setFilteredBooks] = useState<LibBookType[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'damaged' | 'lost' | 'both'>('all');
  const [statusUpdateData, setStatusUpdateData] = useState<StatusUpdateData>({
    damaged_status: false,
    lost_status: false,
    status: LibBookStatusEnum.AVAILABLE,
    notes: ''
  });

  useEffect(() => {
    const applyFilters = async () => {
      let filtered: LibBookType[] = [];
      
      switch (filterType) {
        case 'damaged':
          filtered = await getDamagedBooks();
          break;
        case 'lost':
          filtered = await getLostBooks();
          break;
        case 'both':
          const damaged = await getDamagedBooks();
          const lost = await getLostBooks();
          filtered = [...damaged, ...lost].filter((book, index, arr) => 
            arr.findIndex(b => b.id === book.id) === index
          );
          break;
        default:
          filtered = books.filter(book => book.damaged_status || book.lost_status);
      }
      
      setFilteredBooks(filtered);
    };

    applyFilters();
  }, [filterType, books, getDamagedBooks, getLostBooks]);

  const openModal = (book: LibBookType) => {
    setEditingBook(book);
    setStatusUpdateData({
      damaged_status: book.damaged_status || false,
      lost_status: book.lost_status || false,
      status: book.status,
      notes: ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
    setStatusUpdateData({
      damaged_status: false,
      lost_status: false,
      status: LibBookStatusEnum.AVAILABLE,
      notes: ''
    });
  };

  const handleInputChange = (field: keyof StatusUpdateData, value: any) => {
    setStatusUpdateData(prev => ({ ...prev, [field]: value }));
  };

  const handleStatusUpdate = async () => {
    if (!editingBook) return;

    // Determine the appropriate status based on flags
    let newStatus = statusUpdateData.status;
    if (statusUpdateData.damaged_status && statusUpdateData.lost_status) {
      newStatus = LibBookStatusEnum.LOST; // Lost takes precedence
    } else if (statusUpdateData.lost_status) {
      newStatus = LibBookStatusEnum.LOST;
    } else if (statusUpdateData.damaged_status) {
      newStatus = LibBookStatusEnum.DAMAGED;
    } else if (!statusUpdateData.damaged_status && !statusUpdateData.lost_status) {
      newStatus = LibBookStatusEnum.AVAILABLE; // Reset to available if neither flag is set
    }

    await updateBook(editingBook.id, {
      damaged_status: statusUpdateData.damaged_status,
      lost_status: statusUpdateData.lost_status,
      status: newStatus
    });

    closeModal();
  };

  const markAsRepaired = async (bookId: string) => {
    await updateBook(bookId, {
      damaged_status: false,
      status: LibBookStatusEnum.AVAILABLE
    });
  };

  const markAsFound = async (bookId: string) => {
    await updateBook(bookId, {
      lost_status: false,
      status: LibBookStatusEnum.AVAILABLE
    });
  };

  const columns: DataGridColumn<LibBookType>[] = [
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
      key: 'status',
      header: 'Current Status',
      render: (book) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          book.status === LibBookStatusEnum.DAMAGED ? 'bg-orange-100 text-orange-800' :
          book.status === LibBookStatusEnum.LOST ? 'bg-red-100 text-red-800' :
          'bg-green-100 text-green-800'
        }`}>
          {book.status}
        </span>
      )
    },
    {
      key: 'damaged_status',
      header: 'Damaged',
      render: (book) => (
        <div className="flex items-center">
          {book.damaged_status ? (
            <CheckIcon className="w-4 h-4 text-orange-500" />
          ) : (
            <XMarkIcon className="w-4 h-4 text-gray-400" />
          )}
          <span className="ml-1">{book.damaged_status ? 'Yes' : 'No'}</span>
        </div>
      )
    },
    {
      key: 'lost_status',
      header: 'Lost',
      render: (book) => (
        <div className="flex items-center">
          {book.lost_status ? (
            <CheckIcon className="w-4 h-4 text-red-500" />
          ) : (
            <XMarkIcon className="w-4 h-4 text-gray-400" />
          )}
          <span className="ml-1">{book.lost_status ? 'Yes' : 'No'}</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 200,
      render: (_, book) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openModal(book)}
            leftIcon={<EditIcon className="w-3 h-3" />}
          >
            Update
          </Button>
          {book.damaged_status && !book.lost_status && (
            <Button 
              size="sm" 
              variant="success" 
              onClick={() => markAsRepaired(book.id)}
            >
              Mark Repaired
            </Button>
          )}
          {book.lost_status && (
            <Button 
              size="sm" 
              variant="success" 
              onClick={() => markAsFound(book.id)}
            >
              Mark Found
            </Button>
          )}
        </div>
      )
    }
  ];

  const filterOptions = [
    { label: 'All Issues', value: 'all' },
    { label: 'Damaged Only', value: 'damaged' },
    { label: 'Lost Only', value: 'lost' },
    { label: 'Both Damaged & Lost', value: 'both' }
  ];

  if (booksLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Books...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card 
        title="Damaged & Lost Books Management" 
        actions={
          <div className="flex items-center space-x-2">
            <Select
              value={filterType}
              onChange={(value) => setFilterType(value as typeof filterType)}
              options={filterOptions}
              className="min-w-40"
            />
          </div>
        }
      >
        <p className="text-sm text-gray-600 mb-4">
          Manage books with damaged or lost status. Filter by condition type and update book statuses.
        </p>
        
        <div className="mb-4 grid grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded">
            <div className="font-medium">Total Issues</div>
            <div className="text-lg">{filteredBooks.length}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <div className="font-medium text-orange-800">Damaged</div>
            <div className="text-lg text-orange-800">
              {filteredBooks.filter(book => book.damaged_status).length}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <div className="font-medium text-red-800">Lost</div>
            <div className="text-lg text-red-800">
              {filteredBooks.filter(book => book.lost_status).length}
            </div>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <div className="font-medium text-purple-800">Both</div>
            <div className="text-lg text-purple-800">
              {filteredBooks.filter(book => book.damaged_status && book.lost_status).length}
            </div>
          </div>
        </div>

        <DataGrid<LibBookType>
          columns={columns}
          data={filteredBooks}
          loading={booksLoading}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No damaged or lost books found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filterType === 'all' 
                  ? 'All books are in good condition.' 
                  : `No books match the selected filter: ${filterType}.`
                }
              </p>
            </div>
          }
          className="mt-4"
        />
      </Card>

      <DialogForm 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title="Update Book Status" 
        size="lg"
      >
        {editingBook && (
          <>
            <FormSection columns={1}>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">{editingBook.title}</h4>
                <p className="text-sm text-gray-600">Accession No: {editingBook.accession_no}</p>
                <p className="text-sm text-gray-600">Current Status: {editingBook.status}</p>
              </div>
            </FormSection>
            <FormSection columns={2}>
              <FormField label="Mark as Damaged">
                <div className="flex flex-col">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={statusUpdateData.damaged_status}
                      onChange={(e) => handleInputChange('damaged_status', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Damaged</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Book has physical damage but is still readable
                  </p>
                </div>
              </FormField>
              <FormField label="Mark as Lost">
                <div className="flex flex-col">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={statusUpdateData.lost_status}
                      onChange={(e) => handleInputChange('lost_status', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Lost</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Book cannot be located
                  </p>
                </div>
              </FormField>
            </FormSection>
            <FormSection columns={1}>
              <FormField label="Book Status">
                <Select
                  value={statusUpdateData.status}
                  onChange={(value) => handleInputChange('status', value as LibBookStatusEnum)}
                  options={Object.values(LibBookStatusEnum).map(status => ({ 
                    label: status, 
                    value: status 
                  }))}
                />
              </FormField>
              <FormField label="Additional Notes (Optional)">
                <Textarea
                  value={statusUpdateData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any relevant details about the condition or circumstances..."
                  rows={3}
                />
              </FormField>
            </FormSection>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The book status will be automatically updated based on the flags you select:
              </p>
              <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc">
                <li>Lost flag → Status: Lost</li>
                <li>Damaged flag only → Status: Damaged</li>
                <li>Both flags → Status: Lost (takes precedence)</li>
                <li>Neither flag → Status: Available</li>
              </ul>
            </div>
          </>
        )}
        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button onClick={handleStatusUpdate}>
            Update Status
          </Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default DamagedLostBooksPage;
