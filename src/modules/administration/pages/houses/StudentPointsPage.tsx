import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import Spinner from '@/components/ui/Spinner';
import { UserGroupIcon, SearchIcon } from '@/components/ui/icons';
import { useHousesData } from '../../data/houses/useHousesData';
import { useTranslation } from 'react-i18next';
import type { StudentPointSummary, PointTransaction } from '../../data/houses/types';
import { TransactionType } from '../../data/houses/types';

// Mock student summaries generated from transactions
const buildStudentSummaries = (
  transactions: PointTransaction[]
): StudentPointSummary[] => {
  const studentMap = new Map<string, StudentPointSummary>();

  transactions.forEach(tx => {
    const key = tx.studentId;
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        studentId: tx.studentId,
        studentName: tx.studentName || 'Unknown',
        houseId: tx.houseId,
        houseName: tx.houseName || 'Unknown',
        className: tx.className || '',
        totalPoints: 0,
        meritPoints: 0,
        demeritPoints: 0,
        netPoints: 0,
        recentTransactions: [],
      });
    }

    const summary = studentMap.get(key)!;
    if (tx.type === TransactionType.MERIT) {
      summary.meritPoints += tx.points;
    } else {
      summary.demeritPoints += tx.points;
    }
    summary.totalPoints = summary.meritPoints + summary.demeritPoints;
    summary.netPoints = summary.meritPoints - summary.demeritPoints;
    summary.recentTransactions.push(tx);
  });

  // Sort by net points descending and assign ranks
  const summaries = Array.from(studentMap.values()).sort((a, b) => b.netPoints - a.netPoints);
  summaries.forEach((s, index) => {
    s.overallRank = index + 1;
  });

  return summaries;
};

const StudentPointsPage: React.FC = () => {
  const { t } = useTranslation('houses');
  const { houses, transactions, loading, getStudentSummary } = useHousesData();

  const [selectedHouse, setSelectedHouse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentPointSummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Build student summaries from transactions
  const studentSummaries = useMemo(() => {
    return buildStudentSummaries(transactions);
  }, [transactions]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return studentSummaries.filter(student => {
      if (selectedHouse && student.houseId !== selectedHouse) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (student.studentName?.toLowerCase() ?? '').includes(query) ||
          (student.houseName || '').toLowerCase().includes(query) ||
          (student.className || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [studentSummaries, selectedHouse, searchQuery]);

  const handleViewStudent = (student: StudentPointSummary) => {
    // Also get the detailed summary from the hook
    const detailedSummary = getStudentSummary(student.studentId);
    setSelectedStudent(detailedSummary || student);
    setIsDetailModalOpen(true);
  };

  const columns: DataGridColumn<StudentPointSummary>[] = [
    {
      key: 'overallRank',
      header: 'Rank',
      sortable: true,
      filterable: false,
      width: 80,
      align: 'center',
      render: (value: number) => (
        <span className={`font-bold ${value <= 3 ? 'text-indigo-600' : 'text-gray-600'}`}>
          #{value}
        </span>
      ),
    },
    {
      key: 'studentName',
      header: 'Student',
      sortable: true,
      filterable: true,
      width: 200,
      render: (value, item) => (
        <div>
          <span className="font-medium">{value}</span>
          {item.className && (
            <p className="text-xs text-gray-500">{item.className}</p>
          )}
        </div>
      ),
    },
    {
      key: 'houseName',
      header: 'House',
      sortable: true,
      filterable: true,
      width: 140,
      render: (value) => value || '-',
    },
    {
      key: 'meritPoints',
      header: 'Merits',
      sortable: true,
      filterable: false,
      width: 100,
      align: 'center',
      render: (value: number) => (
        <span className="font-semibold text-green-600">+{value}</span>
      ),
    },
    {
      key: 'demeritPoints',
      header: 'Demerits',
      sortable: true,
      filterable: false,
      width: 100,
      align: 'center',
      render: (value: number) => (
        <span className="font-semibold text-red-600">-{value}</span>
      ),
    },
    {
      key: 'netPoints',
      header: 'Net Points',
      sortable: true,
      filterable: false,
      width: 120,
      align: 'center',
      render: (value: number) => (
        <span className={`font-bold text-lg ${value >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
          {value >= 0 ? '+' : ''}{value}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      sortable: false,
      filterable: false,
      width: 120,
      sticky: 'right',
      render: (_, item) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewStudent(item)}
        >
          View Details
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title={t('houses.studentPoints', 'Student Points')}
        subtitle="View individual student point summaries"
      >
        {/* Search and Filter */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by student name, house, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={selectedHouse}
            onChange={(e: any) => setSelectedHouse(e.target.value)}
          >
            <option value="">All Houses</option>
            {houses.map(house => (
              <option key={house.id} value={house.id}>{house.name}</option>
            ))}
          </Select>
          {(searchQuery || selectedHouse) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setSelectedHouse('');
              }}
            >
              Clear
            </Button>
          )}
        </div>

        <DataGrid
          columns={columns}
          data={filteredStudents}
          sortable
          filterable={false}
          emptyState={
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {t('common.noData')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No student point data available yet.
              </p>
            </div>
          }
        />
      </Card>

      {/* Student Detail Modal */}
      <DialogForm
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedStudent?.studentName || 'Student Details'}
        size="lg"
      >
        {selectedStudent && (
          <>
            <FormSection columns={3}>
              <div className="text-center">
                <p className="text-xs text-gray-500">House</p>
                <p className="font-semibold text-base">{selectedStudent.houseName}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Net Points</p>
                <p className={`font-bold text-xl ${selectedStudent.netPoints >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                  {selectedStudent.netPoints >= 0 ? '+' : ''}{selectedStudent.netPoints}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Overall Rank</p>
                <p className="font-bold text-xl text-gray-900">#{selectedStudent.overallRank}</p>
              </div>
            </FormSection>

            <FormSection columns={2}>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 font-medium">Merit Points</p>
                <p className="text-2xl font-bold text-green-700">+{selectedStudent.meritPoints}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-sm text-red-600 font-medium">Demerit Points</p>
                <p className="text-2xl font-bold text-red-700">-{selectedStudent.demeritPoints}</p>
              </div>
            </FormSection>

            {selectedStudent.recentTransactions && selectedStudent.recentTransactions.length > 0 && (
              <FormSection title="Recent Transactions">
                <div className="space-y-2">
                  {selectedStudent.recentTransactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {tx.categoryName || tx.type}
                        </p>
                        <p className="text-xs text-gray-500">{tx.reason}</p>
                      </div>
                      <div className="text-right ml-4">
                        <span
                          className={`font-semibold text-sm ${
                            tx.type === TransactionType.MERIT ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {tx.type === TransactionType.MERIT ? '+' : '-'}{tx.points}
                        </span>
                        <p className="text-xs text-gray-400">
                          {new Date(tx.awardedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </FormSection>
            )}
          </>
        )}
      </DialogForm>
    </div>
  );
};

export default StudentPointsPage;
