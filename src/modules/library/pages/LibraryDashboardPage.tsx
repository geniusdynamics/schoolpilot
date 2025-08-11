import React from 'react';
import Card from '@/components/ui/Card';
import { LibraryIcon, BookOpenIcon, ArrowsRightLeftIcon, SparklesIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { ChartData, BookStatus, FineStatus } from '@/types';
import DonutChart from '@/components/ui/DonutChart'; // Ensure you have this component
import { useTranslation } from 'react-i18next';
import { useBookData } from '../data/useBookData';
import { useLoanData } from '../data/useLoanData';
import { useFineData } from '../data/useFineData';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card className="shadow-md">
    <div className="flex items-center p-4">
      <div className="p-3 rounded-full bg-green-100 text-green-600">
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </Card>
);

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


  return (
    <div className="space-y-6">
      <Card title="Library Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
            <StatCard title="Total Books" value={totalBooks} icon={<BookOpenIcon className="w-7 h-7"/>} />
            <StatCard title="Books on Loan" value={booksOnLoan} icon={<ArrowsRightLeftIcon className="w-7 h-7"/>} />
            <StatCard title="Overdue Books" value={overdueBooksCount} icon={<BookOpenIcon className="w-7 h-7 text-red-500"/>} />
            <StatCard title="Damaged Books" value={damagedBooksCount} icon={<BookOpenIcon className="w-7 h-7 text-orange-500"/>} />
            <StatCard title="Lost Books" value={lostBooksCount} icon={<BookOpenIcon className="w-7 h-7 text-gray-800"/>} />
            <StatCard title="Pending Fines" value={pendingFines} icon={<SparklesIcon className="w-7 h-7 text-yellow-500"/>} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {booksByCategoryData.length > 0 && (
              <Card title="Books by Category">
                <DonutChart data={booksByCategoryData} title="" />
              </Card>
            )}
            
            {topBorrowed.length > 0 && (
              <Card title="Top Borrowed Books">
                <div className="space-y-2">
                  {topBorrowed.map((book, index) => (
                    <div key={book.title} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <span className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center mr-3">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900 truncate">{book.title}</span>
                      </div>
                      <span className="text-sm text-gray-500">{book.count} loans</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
         
          <div className="text-center py-8 mt-6">
            <LibraryIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Library Portal Overview</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Manage book catalog, track loans and returns, handle fines, and oversee library resources.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LibraryDashboardPage;