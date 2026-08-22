import React from 'react';
import { LibraryIcon, BookOpenIcon, ArrowsRightLeftIcon, ArrowRightIcon, ClockIcon, PlusIcon, MagnifyingGlassIcon, ArrowLeftIcon, CurrencyDollarIcon, ExclamationCircleIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';
import Spinner from '@/components/ui/Spinner';
import { ChartData, BookStatus, FineStatus } from '@/types';
import DonutChart from '@/components/ui/DonutChart';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardNotification,
  DashboardPanel,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';
import Card from '@/components/ui/Card';

export const LibraryDashboardPageContent: React.FC = () => {
  const {
    books,
    loans,
    fines,
    bookCategories,
    students,
    loading,
  } = useAppData();

  if (loading.books || loading.loans || loading.fines || loading.bookCategories) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const totalBooks = (books || []).length;
  const availableBooks = (books || []).filter(b => b.status === BookStatus.AVAILABLE).length;
  const booksOnLoan = (books || []).filter(b => b.status === BookStatus.ON_LOAN).length;

  const overdueLoans = (loans || []).filter(loan => {
    if (loan.return_date) return false;
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today > dueDate;
  });
  const overdueBooksCount = (overdueLoans || []).length;

  const pendingFines = (fines || []).filter(f => f.status === FineStatus.PENDING || f.status === FineStatus.BILLED).length;
  const totalFinesAmount = (fines || [])
    .filter(f => f.status === FineStatus.PENDING || f.status === FineStatus.BILLED)
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  // Calculate damaged and lost books count
  const damagedBooksCount = (books || []).filter(b => b.damaged_status).length;
  const lostBooksCount = (books || []).filter(b => b.lost_status).length;

  // Calculate top borrowed books
  const loanCounts = (loans || [])
    .reduce((counts, loan) => {
      const bookTitle = (books || []).find(b => b.id === loan.book_id)?.title || 'Unknown Book';
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

  // Books status for chart
  const bookStatusData: ChartData[] = [
    { name: 'Available', value: availableBooks },
    { name: 'On Loan', value: booksOnLoan },
    { name: 'Damaged', value: damagedBooksCount },
    { name: 'Lost', value: lostBooksCount },
  ].filter(d => d.value > 0);

  // Enhanced metrics with trends and color schemes
  const metrics: DashboardMetric[] = [
    {
      key: 'books',
      label: 'Total Books',
      value: totalBooks.toLocaleString(),
      icon: <BookOpenIcon className="h-6 w-6" />,
      trend: 'up',
      trendValue: '+12',
      to: '/library/books',
      colorScheme: 'emerald',
      description: 'In library catalog',
    },
    {
      key: 'on-loan',
      label: 'Books on Loan',
      value: booksOnLoan,
      icon: <ArrowsRightLeftIcon className="h-6 w-6" />,
      trend: booksOnLoan > totalBooks * 0.3 ? 'up' : 'neutral',
      trendValue: `${Math.round((booksOnLoan / Math.max(totalBooks, 1)) * 100)}% of total`,
      to: '/library/loans',
      colorScheme: 'blue',
      description: 'Currently borrowed',
    },
    {
      key: 'overdue',
      label: 'Overdue Books',
      value: overdueBooksCount,
      icon: <ExclamationCircleIcon className="h-6 w-6" />,
      trend: overdueBooksCount > 0 ? 'up' : 'down',
      trendValue: overdueBooksCount > 0 ? 'Action needed' : 'All good',
      to: '/library/loans?filter=overdue',
      colorScheme: overdueBooksCount > 0 ? 'rose' : 'emerald',
      description: 'Past due date',
    },
    {
      key: 'fines',
      label: 'Pending Fines',
      value: `Ksh ${totalFinesAmount.toLocaleString()}`,
      icon: <CurrencyDollarIcon className="h-6 w-6" />,
      trend: pendingFines > 0 ? 'up' : 'down',
      trendValue: `${pendingFines} unresolved`,
      to: '/library/fines',
      colorScheme: pendingFines > 0 ? 'amber' : 'emerald',
      description: 'Outstanding payments',
    },
  ];

  // Alert banners
  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'overdue',
      count: overdueBooksCount,
      label: 'Overdue Books',
      description: 'Require immediate return',
      to: '/library/loans?filter=overdue',
    },
    {
      type: 'fees',
      count: pendingFines,
      label: 'Pending Fines',
      description: 'Outstanding payments',
      to: '/library/fines',
    },
    {
      type: 'message',
      count: availableBooks,
      label: 'Available Books',
      description: 'Ready for borrowing',
      to: '/library/books',
    },
    {
      type: 'task',
      count: damagedBooksCount + lostBooksCount,
      label: 'Damaged/Lost',
      description: 'Needs attention',
      to: '/library/books?filter=damaged',
    },
  ];

  // Enhanced quick actions with descriptions
  const quickActions: DashboardQuickAction[] = [
    {
      key: 'add-book',
      label: 'Add New Book',
      description: 'Register book to catalog',
      to: '/library/books/add',
      icon: <PlusIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'issue-book',
      label: 'Issue Book',
      description: 'Lend book to student',
      to: '/library/loans/issue',
      icon: <ArrowsRightLeftIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'return-book',
      label: 'Return Book',
      description: 'Process book return',
      to: '/library/loans/return',
      icon: <ArrowLeftIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'catalog',
      label: 'Browse Catalog',
      description: 'Search library books',
      to: '/library/books',
      icon: <MagnifyingGlassIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'fines',
      label: 'Manage Fines',
      description: 'Process payments',
      to: '/library/fines',
      icon: <CurrencyDollarIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
    {
      key: 'categories',
      label: 'Categories',
      description: 'Manage book categories',
      to: '/library/categories',
      icon: <BookOpenIcon className="h-5 w-5" />,
      colorScheme: 'rose',
    },
  ];

  // Enhanced charts
  const charts: DashboardPanel[] = [
    ...(booksByCategoryData.length > 0 ? [{
      key: 'books-by-category',
      title: 'Books by Category',
      content: <DonutChart data={booksByCategoryData} title="" />,
    }] : []),
    ...(bookStatusData.length > 0 ? [{
      key: 'book-status',
      title: 'Book Status Distribution',
      content: <DonutChart data={bookStatusData} title="" />,
    }] : []),
  ];

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
      message: pendingFines > 0 ? `${pendingFines} fines (Ksh ${totalFinesAmount.toLocaleString()}) require follow-up.` : 'No pending fines at the moment.',
      severity: pendingFines > 0 ? 'warning' : 'normal',
    },
    {
      id: 'collection-health',
      title: 'Collection Health',
      message: damagedBooksCount + lostBooksCount > 0
        ? `${damagedBooksCount} damaged, ${lostBooksCount} lost books.`
        : 'Collection in good condition.',
      severity: damagedBooksCount + lostBooksCount > 5 ? 'warning' : 'normal',
    },
  ];

  // Mock recent library activity
  const recentActivity = [
    { action: 'Book returned - The Great Gatsby', time: '15 minutes ago', type: 'return' },
    { action: 'New fine assessed', time: '1 hour ago', type: 'fine' },
    { action: 'Book issued to John Doe', time: '3 hours ago', type: 'issue' },
    { action: 'New book cataloged', time: '1 day ago', type: 'catalog' },
  ];

  return (
    <ModuleDashboardShell
      title="Library Dashboard"
      subtitle="Track catalog health, lending performance, and borrower compliance from current library data."
      heroIcon={<LibraryIcon className="h-8 w-8 text-white" />}
      accentColor="rose"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards={true}
      charts={charts}
      notifications={notifications}
    >
      {/* Additional Library Info Panels */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lending Summary */}
        <Card title="Lending Summary" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Available Books</span>
              <span className="font-semibold text-emerald-600">{availableBooks}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">On Loan</span>
              <span className="font-semibold text-blue-600">{booksOnLoan}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active Loans</span>
              <span className="font-semibold text-gray-900">{(loans || []).filter((l: any) => !l.return_date).length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Total Borrowers</span>
              <span className="font-semibold text-violet-600">
                {new Set((loans || []).map((l: any) => l.student_id)).size}
              </span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card title="Recent Activity" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 py-2">
                <div className={`
                  flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0
                  ${activity.type === 'return' ? 'bg-emerald-100 text-emerald-600' :
                    activity.type === 'fine' ? 'bg-amber-100 text-amber-600' :
                    activity.type === 'issue' ? 'bg-blue-100 text-blue-600' :
                    'bg-violet-100 text-violet-600'}
                `}>
                  {activity.type === 'return' ? <ArrowLeftIcon className="h-4 w-4" /> :
                   activity.type === 'fine' ? <CurrencyDollarIcon className="h-4 w-4" /> :
                   activity.type === 'issue' ? <ArrowsRightLeftIcon className="h-4 w-4" /> :
                   <PlusIcon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Overview */}
        <Card title="Quick Overview" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{totalBooks > 0 ? Math.round((availableBooks / totalBooks) * 100) : 0}%</p>
                <p className="text-xs text-emerald-600">Availability</p>
              </div>
              <div className="rounded-lg bg-rose-50 p-3 text-center">
                <p className="text-2xl font-bold text-rose-700">{overdueBooksCount}</p>
                <p className="text-xs text-rose-600">Overdue</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Categories</span>
                <span className="font-bold text-amber-700">{(bookCategories || []).length}</span>
              </div>
            </div>
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">Avg. Loans per Book</span>
                <span className="font-bold text-blue-700">
                  {totalBooks > 0 ? ((loans || []).length / totalBooks).toFixed(1) : '0'}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.hash = '#/library/loans'}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              View All Loans <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>

      {/* Top Borrowed Books */}
      {topBorrowed.length > 0 && (
        <Card title="Top Borrowed Books" className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-2">
            {topBorrowed.map((book, index) => (
              <div key={book.title} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
                <div className="flex items-center">
                  <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs text-white">
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
const LibraryDashboardPage: React.FC = () => (
  <div className="space-y-6">
    <LibraryDashboardPageContent />
  </div>
);

export default LibraryDashboardPage;
