import React, { useState, useEffect } from 'react';
import { LibBookType, LibBookStatusEnum, LibBookCategoryType, LibBookAvailabilityStatusEnum } from '../data/types';
import { useBookData } from '../data/useBookData';
import { useBookCategoryData } from '../data/useBookCategoryData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, BookOpenIcon, MagnifyingGlassIcon as SearchIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

// Simple Checkbox component
const Checkbox: React.FC<{
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ label, name, checked, onChange }) => (
  <div className="flex items-center">
    <input
      type="checkbox"
      id={name}
      name={name}
      checked={checked}
      onChange={onChange}
      className="mr-2"
    />
    <label htmlFor={name}>{label}</label>
  </div>
);

interface BookFormData {
  title: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  accession_no: string;
  publication_year?: number;
  edition?: string;
  purchase_cost?: number;
  status: LibBookStatusEnum;
  location_shelf?: string;
  category_id?: number;
  is_digital?: boolean;
  digital_access_url?: string;
  digital_format?: string;
  availability_status?: LibBookAvailabilityStatusEnum;
  damaged_status?: boolean;
  lost_status?: boolean;
}

const BooksPage: React.FC = () => {
  const { data: books, create: addBook, update: updateBook, remove: deleteBook, search, isLoading: booksLoading, error: booksError } = useBookData();
  const { data: bookCategories, isLoading: categoriesLoading, error: categoriesError } = useBookCategoryData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initialFormData: Partial<LibBookType> = {
     title: '',
     author: '',
     publisher: '',
     isbn: '',
     accession_no: '',
     publication_year: undefined,
     edition: '',
     purchase_cost: 0,
     status: LibBookStatusEnum.AVAILABLE,
     location_shelf: '',
     category_id: undefined,
     is_digital: false,
     digital_access_url: '',
     digital_format: '',
     availability_status: LibBookAvailabilityStatusEnum.AVAILABLE,
     damaged_status: false,
     lost_status: false,
   };

  const handleEditClick = (book: LibBookType) => {
    openModal(book);
  };

   const [editingBook, setEditingBook] = useState<LibBookType | null>(null);
   const [formData, setFormData] = useState<BookFormData>(initialFormData as BookFormData);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBooks, setFilteredBooks] = useState<LibBookType[]>([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState({
    author: '',
    publicationYear: '',
    availability: '',
    category: '',
    publisher: ''
  });

  useEffect(() => {
    setFilteredBooks(books);
  }, [books]);

  const openModal = (book?: LibBookType) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author || '',
        publisher: book.publisher || '',
        isbn: book.isbn || '',
        accession_no: book.accession_no,
        publication_year: book.publication_year || undefined,
        edition: book.edition || '',
        purchase_cost: book.purchase_cost || 0,
        status: book.status,
        location_shelf: book.location_shelf || '',
        category_id: book.category_id || undefined,
        is_digital: book.is_digital || false,
        digital_access_url: book.digital_access_url || '',
        digital_format: book.digital_format || '',
        availability_status: book.availability_status || LibBookAvailabilityStatusEnum.AVAILABLE,
        damaged_status: book.damaged_status || false,
        lost_status: book.lost_status || false,
      });
    } else {
      setEditingBook(null);
      setFormData(initialFormData as BookFormData);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    let processedValue: string | number | boolean | undefined = value;

    if (name === 'category_id') {
      processedValue = value ? parseInt(value) : undefined;
    } else if (name === 'purchase_cost') {
      processedValue = parseFloat(value) || 0;
    } else if (name === 'publication_year') {
      processedValue = parseInt(value) || undefined;
    } else if (name === 'is_digital') {
      processedValue = checked;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSearch = async () => {
    const results = await search(searchQuery);
    setFilteredBooks(results);
  };

  const handleAdvancedSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAdvancedSearchFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleAdvancedSearch = async () => {
    let results = books;

    if (advancedSearchFilters.author) {
      results = results.filter(book => 
        book.author?.toLowerCase().includes(advancedSearchFilters.author.toLowerCase())
      );
    }

    if (advancedSearchFilters.publicationYear) {
      results = results.filter(book => 
        book.publication_year?.toString() === advancedSearchFilters.publicationYear
      );
    }

    if (advancedSearchFilters.availability) {
      results = results.filter(book => 
        book.availability_status === advancedSearchFilters.availability
      );
    }

    if (advancedSearchFilters.category) {
      results = results.filter(book => 
        book.category_id?.toString() === advancedSearchFilters.category
      );
    }

    if (advancedSearchFilters.publisher) {
      results = results.filter(book => 
        book.publisher?.toLowerCase().includes(advancedSearchFilters.publisher.toLowerCase())
      );
    }

    setFilteredBooks(results);
  };

  const clearAdvancedFilters = () => {
    setAdvancedSearchFilters({
      author: '',
      publicationYear: '',
      availability: '',
      category: '',
      publisher: ''
    });
    setFilteredBooks(books);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.accession_no || !formData.status) {
      alert("Title, Accession Number, and Status are required.");
      return;
    }
    const payload: Omit<LibBookType, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'category_name'> = {
      title: formData.title!,
      author: formData.author || undefined,
      publisher: formData.publisher || undefined,
      isbn: formData.isbn || undefined,
      accession_no: formData.accession_no!,
      publication_year: formData.publication_year || undefined,
      edition: formData.edition || undefined,
      purchase_cost: formData.purchase_cost ? Number(formData.purchase_cost) : undefined,
      status: formData.status,
      location_shelf: formData.location_shelf || undefined,
      category_id: formData.category_id ? Number(formData.category_id) : undefined,
      is_digital: formData.is_digital || false,
      digital_access_url: formData.digital_access_url || undefined,
      digital_format: formData.digital_format || undefined,
      availability_status: formData.availability_status || undefined,
      damaged_status: formData.damaged_status || false,
      lost_status: formData.lost_status || false,
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
      await deleteBook(id);
    }
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
      key: 'category_name',
      header: 'Category',
      sortable: true,
      filterable: true
    },
      {
        key: 'publication_year',
        header: 'Pub. Year',
        render: (book) => book.publication_year || 'N/A',
      },
      {
        key: 'is_digital',
        header: 'Digital',
        render: (book) => (book.is_digital ? 'Yes' : 'No'),
      },
      {
        key: 'digital_access_url',
        header: 'Digital Access URL',
        render: (book) =>
          book.digital_access_url ? (
            <a href={book.digital_access_url} target="_blank" rel="noopener noreferrer">
              Link
            </a>
          ) : (
            'N/A'
          ),
      },
      {
        key: 'digital_format',
        header: 'Digital Format',
        render: (book) => book.digital_format || 'N/A',
      },
      {
        key: 'availability_status',
        header: 'Availability',
        render: (book) => book.availability_status || 'N/A',
      },
      {
        key: 'damaged_status',
        header: 'Damaged',
        render: (book) => (book.damaged_status ? 'Yes' : 'No'),
      },
      {
        key: 'lost_status',
        header: 'Lost',
        render: (book) => (book.lost_status ? 'Yes' : 'No'),
      },
      {
        key: 'status',
        header: 'Status',
        render: (book) => <span className={`status-${book.status.toLowerCase()}`}>{book.status}</span>,
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
            onClick={() => handleEditClick(row)} 
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

  if ((booksLoading || categoriesLoading) && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Books...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Library Book Catalog Management" actions={
        <div className="flex items-center space-x-2">
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Book
          </Button>
          <Input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSearch} leftIcon={<SearchIcon className="w-4 h-4" />}>
            Search
          </Button>
        </div>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Manage all books in the library catalog.
        </p>
        
        {/* Basic Search */}
        <div className="mb-4 flex items-center">
          <Input
            type="text"
            placeholder="Search books..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mr-2"
          />
          <Button
            onClick={handleSearch}
            leftIcon={<SearchIcon className="w-4 h-4" />}
            className="mr-2"
          >
            Search
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
          >
            {showAdvancedSearch ? 'Hide' : 'Advanced'} Search
          </Button>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <Card className="mb-4 bg-gray-50">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Advanced Search Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  name="author"
                  label="Author"
                  placeholder="Filter by author..."
                  value={advancedSearchFilters.author}
                  onChange={handleAdvancedSearchChange}
                />
                <Input
                  name="publicationYear"
                  label="Publication Year"
                  type="number"
                  placeholder="e.g., 2023"
                  value={advancedSearchFilters.publicationYear}
                  onChange={handleAdvancedSearchChange}
                />
                <Select
                  name="availability"
                  label="Availability Status"
                  value={advancedSearchFilters.availability}
                  onChange={handleAdvancedSearchChange}
                >
                  <option value="">All Availability</option>
                  {Object.values(LibBookAvailabilityStatusEnum).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
                <Select
                  name="category"
                  label="Category"
                  value={advancedSearchFilters.category}
                  onChange={handleAdvancedSearchChange}
                >
                  <option value="">All Categories</option>
                  {(bookCategories || []).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
                <Input
                  name="publisher"
                  label="Publisher"
                  placeholder="Filter by publisher..."
                  value={advancedSearchFilters.publisher}
                  onChange={handleAdvancedSearchChange}
                />
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <Button
                  onClick={handleAdvancedSearch}
                  leftIcon={<SearchIcon className="w-4 h-4" />}
                >
                  Apply Filters
                </Button>
                <Button
                  variant="secondary"
                  onClick={clearAdvancedFilters}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        )}
        <DataGrid<LibBookType>
          columns={columns}
          data={filteredBooks}
          loading={booksLoading && isModalOpen}
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
            <Button onClick={handleSubmit} disabled={booksLoading}>
              {booksLoading ? <Spinner size="sm"/> : (editingBook ? 'Save Changes' : 'Add Book')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="title" label="Book Title" value={formData.title || ''} onChange={handleInputChange} required containerClassName="md:col-span-2"/>
            <Input name="accession_no" label="Accession Number" value={formData.accession_no || ''} onChange={handleInputChange} required />
            <Input name="author" label="Author(s)" value={formData.author || ''} onChange={handleInputChange} />
            <Input name="publisher" label="Publisher" value={formData.publisher || ''} onChange={handleInputChange} />
            <Input
              label="ISBN"
              name="isbn"
              value={formData.isbn || ''}
              onChange={handleInputChange}
            />
            <Input
              label="Publication Year"
              name="publication_year"
              type="number"
              value={formData.publication_year || ''}
              onChange={handleInputChange}
            />
            <Input
              label="Edition"
              name="edition"
              value={formData.edition || ''}
              onChange={handleInputChange}
            />
            <Input
              label="Location (Shelf)"
              name="location_shelf"
              value={formData.location_shelf || ''}
              onChange={handleInputChange}
            />
            <Checkbox
              label="Is Digital?"
              name="is_digital"
              checked={formData.is_digital || false}
              onChange={handleInputChange}
            />
            {formData.is_digital && (
              <Input
                label="Digital Access URL"
                name="digital_access_url"
                value={formData.digital_access_url || ''}
                onChange={handleInputChange}
              />
            )}
            {formData.is_digital && (
              <Input
                label="Digital Format"
                name="digital_format"
                value={formData.digital_format || ''}
                onChange={handleInputChange}
              />
            )}
            <Select
              label="Availability Status"
              name="availability_status"
              value={formData.availability_status || ''}
              onChange={handleInputChange}
              options={Object.values(LibBookAvailabilityStatusEnum).map(status => ({ label: status, value: status }))}
            />
            <Checkbox
              label="Damaged?"
              name="damaged_status"
              checked={formData.damaged_status || false}
              onChange={handleInputChange}
            />
            <Checkbox
              label="Lost?"
              name="lost_status"
              checked={formData.lost_status || false}
              onChange={handleInputChange}
            />
            <Select name="category_id" label="Category" value={formData.category_id || ''} onChange={handleInputChange}>
                <option value="">Select Category</option>
                {(bookCategories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
            <Input name="purchase_cost" label="Purchase Cost (KES)" type="number" step="0.01" value={formData.purchase_cost ?? ''} onChange={handleInputChange} />
            <Select name="status" label="Status" value={formData.status} onChange={handleInputChange} required>
                {Object.values(LibBookStatusEnum).map(status => <option key={status} value={status}>{status}</option>)}
            </Select>
        </div>
      </Modal>
    </div>
  );
};

export default BooksPage;
