// ABOUTME: Overdue Books Report for library module
// ABOUTME: Shows all books that are currently overdue with borrower details

import React, { useState, useCallback, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { ClockIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { DataGrid } from '@/components/ui/data';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { formatKES } from '@/utils/format';

interface OverdueItem {
  loanId: string;
  bookTitle: string;
  bookIsbn?: string;
  borrowerName: string;
  borrowerType: 'user';
  borrowerId: string;
  loanDate: string;
  dueDate: string;
  daysOverdue: number;
  fineAmount?: number;
}

const OverdueReport: React.FC = () => {
  const { loans, books, students, staff, loading } = useAppData();

  const [selectedBorrowerType, setSelectedBorrowerType] = useState<'all' | 'user'>('all');
  const [minDaysOverdue, setMinDaysOverdue] = useState<number>(1);
  const [filteredOverdueItems, setFilteredOverdueItems] = useState<OverdueItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateOverdueItems = useCallback(() => {
    const today = new Date();
    const overdueItems: OverdueItem[] = [];

    (loans || []).forEach(loan => {
      // Only consider loans that haven't been returned and are past due
      if (loan.return_date || !loan.due_date) return;

      const dueDate = new Date(loan.due_date);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) return; // Not overdue

      const book = (books || []).find(b => b.id === loan.book_id);
      
      // Determine borrower details - the Loan interface uses user_id and user_name
      const borrowerName = loan.user_name || 'Unknown User';
      const borrowerType: 'user' = 'user';

      // Calculate potential fine (assuming 10 per day - this should be configurable)
      const finePerDay = 10;
      const fineAmount = daysOverdue * finePerDay;

      overdueItems.push({
        loanId: loan.id,
        bookTitle: book?.title || 'Unknown Book',
        bookIsbn: book?.isbn || undefined,
        borrowerName,
        borrowerType,
        borrowerId: loan.user_id,
        loanDate: loan.loan_date,
        dueDate: loan.due_date,
        daysOverdue,
        fineAmount
      });
    });

    return overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [loans, books, students, staff]);

  const handleGenerateReport = useCallback(() => {
    setIsGenerating(true);
    
    let overdueItems = generateOverdueItems();

    // Apply filters
    if (selectedBorrowerType !== 'all') {
      overdueItems = overdueItems.filter(item => item.borrowerType === selectedBorrowerType);
    }

    if (minDaysOverdue > 1) {
      overdueItems = overdueItems.filter(item => item.daysOverdue >= minDaysOverdue);
    }

    setFilteredOverdueItems(overdueItems);
    setIsGenerating(false);
  }, [generateOverdueItems, selectedBorrowerType, minDaysOverdue]);

  // Generate report on initial mount once data is loaded
  useEffect(() => {
    if (!loading.loans && !loading.books && !loading.students && !loading.staff) {
      handleGenerateReport();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { header: 'Book Title', key: 'bookTitle' as keyof OverdueItem },
    { header: 'ISBN', key: 'bookIsbn' as keyof OverdueItem },
    { header: 'Borrower', key: 'borrowerName' as keyof OverdueItem },
    { header: 'Type', key: 'borrowerType' as keyof OverdueItem },
    // Keys must match the camelCase OverdueItem fields so DataGrid sorting/filtering works
    { header: 'Loan Date', key: 'loanDate', render: (_v: any, item: OverdueItem) => new Date(item.loanDate).toLocaleDateString() },
    { header: 'Due Date', key: 'dueDate', render: (_v: any, item: OverdueItem) => new Date(item.dueDate).toLocaleDateString() },
    { header: 'Days Overdue', key: 'daysOverdue', render: (_v: any, item: OverdueItem) => (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${
        item.daysOverdue > 30 ? 'bg-red-100 text-red-800' :
        item.daysOverdue > 14 ? 'bg-orange-100 text-orange-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {item.daysOverdue} days
      </span>
    )},
    { header: 'Potential Fine', key: 'fineAmount', align: 'right' as const, render: (_v: any, item: OverdueItem) => formatKES(item.fineAmount ?? 0) },
  ];

  const isLoadingPage = loading.loans || loading.books || loading.students || loading.staff;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Book Title', 'ISBN', 'Borrower', 'Type', 'Borrow Date', 'Due Date', 'Days Overdue', 'Potential Fine'];
    const rows = (filteredOverdueItems || []).map(item => [
      item.bookTitle,
      item.bookIsbn || '',
      item.borrowerName,
      item.borrowerType,
      new Date(item.loanDate).toLocaleDateString(),
      new Date(item.dueDate).toLocaleDateString(),
      item.daysOverdue?.toString() ?? '',
      formatKES(item.fineAmount ?? 0)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `overdue_books_report_${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const totalFineAmount = filteredOverdueItems.reduce((sum, item) => sum + (item.fineAmount || 0), 0);

  return (
    <div className="space-y-6">
      <Card title="Overdue Books Report" icon={ClockIcon}>
        <div className="p-4 border-b mb-4 bg-surface-muted rounded-md filter-section">
          <p className="text-sm text-surface-muted-fg mb-4">
            Generate a report of all overdue library books with borrower information and potential fines.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
            <Select 
              label="Borrower Type" 
              value={selectedBorrowerType} 
              onChange={e => setSelectedBorrowerType(e.target.value as 'all' | 'user')}
            >
              <option value="all">All Borrowers</option>
              <option value="user">Library Users</option>
            </Select>
            
            <div>
              <label className="block text-sm font-medium text-surface-foreground mb-1">
                Minimum Days Overdue
              </label>
              <input
                type="number"
                min="1"
                value={minDaysOverdue}
                onChange={e => setMinDaysOverdue(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <Button 
              onClick={handleGenerateReport} 
              disabled={isGenerating || isLoadingPage} 
              className="h-10"
            >
              {isGenerating ? <Spinner size="sm" /> : 'Generate Report'}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{filteredOverdueItems.length}</p>
              <p className="text-sm text-surface-muted-fg">Overdue Books</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {filteredOverdueItems.filter(item => item.daysOverdue > 14).length}
              </p>
              <p className="text-sm text-surface-muted-fg">Over 2 Weeks</p>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatKES(totalFineAmount)}</p>
              <p className="text-sm text-surface-muted-fg">Total Potential Fines</p>
            </div>
          </Card>
        </div>

        {isLoadingPage && !isGenerating ? (
          <div className="flex justify-center items-center py-10">
            <Spinner size="lg" />
            <span className="ml-2">Loading initial data...</span>
          </div>
        ) : isGenerating ? (
          <div className="flex justify-center items-center py-10">
            <Spinner />
            <span className="ml-2">Generating report...</span>
          </div>
        ) : (
          <>
            <div className="flex justify-end space-x-2 mb-4 print-hide">
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                Print Report
              </Button>
              <Button variant="secondary" size="sm" onClick={handleExportCSV}>
                Export CSV
              </Button>
            </div>
            <DataGrid 
              columns={columns} 
              data={filteredOverdueItems} 
              loading={isGenerating} 
              emptyState="No overdue books found"
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default OverdueReport;
