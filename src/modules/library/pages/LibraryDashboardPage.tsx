import React from 'react';
import { LibraryIcon, BookOpenIcon, ArrowsRightLeftIcon, SparklesIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { ChartData, BookStatus, FineStatus } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import ModuleDashboardShell, { DashboardMetric, DashboardNotification, DashboardPanel } from '@/components/ModuleDashboardShell';
import Card from '@/components/ui/Card';

const LibraryDashboardPage: React.FC = () => {
  const { 
    books, 
    loans, 
    fines, 
    bookCategories,
    loading 
  } = useAppData(); // Updated

  if (loading.books || loading.loans || loading.fines || loading.bookCategories) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const totalBooks = (books || []).length;
  const booksOnLoan = (books || []).filter(b => b.status === BookStatus.ON_LOAN).length;
  
  const overdueLoans = (loans || []).filter(loan => {
    if (loan.return_date) return false; // Already returned
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    today.setHours(0,0,0,0); // Compare dates only
    return today > dueDate;
  });
  const overdueBooksCount = (overdueLoans || []).length;

  const pendingFines = (fines || []).filter(f => f.status === FineStatus.PENDING || f.status === FineStatus.BILLED).length;

  // Calculate damaged and lost books count
  const damagedBooksCount = (books || []).filter(b => b.damaged_status).length;
  const lostBooksCount = (books || []).filter(b => b.lost_status).length;

  // Calculate top borrowed books
  const loanCounts = (loans || [])
    .reduce((counts, loan) => {
      const bookTitle = books.find(b => b.id === loan.book_id)?.title || 'Unknown Book';
      counts[bookTitle] = counts[bookTitle] ? counts[bookTitle] + 1 : 1;
      return counts;
    }, {} as Record<string, number>);

  const topBorrowed = Object.entries(loanCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([title, count]) => ({ title, count }));

  const booksByCategoryData: ChartData[] = (bookCategories || []).map(category => ({
    name: category.name,
    value: (books || []).filter(book => book.category_id === category.id).length,
  })).filter(d => d.value > 0);


  const metrics: DashboardMetric[] = [
    { key: 'books', label: 'Total Books', value: totalBooks, icon: <BookOpenIcon className="h-6 w-6 text-emerald-700" /> },
    { key: 'on-loan', label: 'Books on Loan', value: booksOnLoan, icon: <ArrowsRightLeftIcon className="h-6 w-6 text-blue-700" /> },
    { key: 'overdue', label: 'Overdue Books', value: overdueBooksCount, icon: <BookOpenIcon className="h-6 w-6 text-rose-700" /> },
    { key: 'damaged', label: 'Damaged Books', value: damagedBooksCount, icon: <BookOpenIcon className="h-6 w-6 text-amber-700" /> },
    { key: 'lost', label: 'Lost Books', value: lostBooksCount, icon: <BookOpenIcon className="h-6 w-6 text-slate-700" /> },
    { key: 'fines', label: 'Pending Fines', value: pendingFines, icon: <SparklesIcon className="h-6 w-6 text-yellow-700" /> },
  ];

  const charts: DashboardPanel[] = booksByCategoryData.length > 0
    ? [{ key: 'books-by-category', title: 'Books by Category', content: <DonutChart data={booksByCategoryData} title="" /> }]
    : [];

  const notifications: DashboardNotification[] = [
    {
      id: 'overdue-books',
      title: 'Overdue Loans',
      message: overdueBooksCount > 0 ? `${overdueBooksCount} books are currently overdue.` : 'No books are currently overdue.',
      severity: overdueBooksCount > 0 ? 'warning' : 'normal',
    },
    {
      id: 'pending-fines',
      title: 'Pending Fines',
      message: pendingFines > 0 ? `${pendingFines} fines require follow-up.` : 'No pending fines at the moment.',
      severity: pendingFines > 0 ? 'warning' : 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title="Library Dashboard"
      subtitle="Track catalog health, lending performance, and borrower compliance from current library data."
      heroIcon={<LibraryIcon className="h-8 w-8 text-white" />}
      metrics={metrics}
      charts={charts}
      notifications={notifications}
    >
      {topBorrowed.length > 0 && (
        <Card title="Top Borrowed Books" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-2">
            {topBorrowed.map((book, index) => (
              <div key={book.title} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center">
                  <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-medium text-gray-900">{book.title}</span>
                </div>
                <span className="text-sm text-gray-500">{book.count} loans</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </ModuleDashboardShell>
  );
};

export default LibraryDashboardPage;
