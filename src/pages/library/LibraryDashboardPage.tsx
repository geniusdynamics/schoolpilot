import React from 'react';
import Card from '../../components/ui/Card';
import { LibraryIcon, BookOpenIcon, ArrowsRightLeftIcon, SparklesIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';
import { ChartData, LibBookStatusEnum, LibFineStatusEnum } from '@/types';
import DonutChart from '../../components/ui/DonutChart'; // Ensure you have this component

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

  const totalBooks = books.length;
  const booksOnLoan = books.filter(b => b.status === BookStatus.ON_LOAN).length;
  
  const overdueLoans = loans.filter(loan => {
    if (loan.return_date) return false; // Already returned
    const dueDate = new Date(loan.due_date);
    const today = new Date();
    today.setHours(0,0,0,0); // Compare dates only
    return today > dueDate;
  });
  const overdueBooksCount = overdueLoans.length;

  const pendingFines = fines.filter(f => f.status === FineStatus.PENDING || f.status === FineStatus.BILLED).length;

  const booksByCategoryData: ChartData[] = bookCategories.map(category => ({
    name: category.name,
    value: books.filter(book => book.category_id === category.id).length,
  })).filter(d => d.value > 0);


  return (
    <div className="space-y-6">
      <Card title="Library Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard title="Total Books" value={totalBooks} icon={<BookOpenIcon className="w-7 h-7"/>} />
            <StatCard title="Books on Loan" value={booksOnLoan} icon={<ArrowsRightLeftIcon className="w-7 h-7"/>} />
            <StatCard title="Overdue Books" value={overdueBooksCount} icon={<BookOpenIcon className="w-7 h-7 text-red-500"/>} />
            <StatCard title="Pending Fines" value={pendingFines} icon={<SparklesIcon className="w-7 h-7 text-yellow-500"/>} />
          </div>

          {booksByCategoryData.length > 0 && (
             <Card title="Books by Category" className="mt-6">
                <DonutChart data={booksByCategoryData} title="" />
            </Card>
          )}
         
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