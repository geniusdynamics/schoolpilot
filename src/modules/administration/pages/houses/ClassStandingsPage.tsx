import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { UsersIcon } from '@/components/ui/icons';
import { useHousesData } from '../../data/houses/useHousesData';
import { useTranslation } from 'react-i18next';
import type { PointTransaction } from '../../data/houses/types';
import { TransactionType } from '../../data/houses/types';

interface ClassStanding {
  className: string;
  students: ClassStudentStanding[];
}

interface ClassStudentStanding {
  studentId: string;
  studentName: string;
  houseId: string;
  houseName: string;
  houseColor: string;
  totalPoints: number;
  meritPoints: number;
  demeritPoints: number;
  netPoints: number;
  rank: number;
}

// Build class standings from transactions
const buildClassStandings = (
  transactions: PointTransaction[],
  houses: { id: string; name: string; color: string }[]
): ClassStanding[] => {
  const classMap = new Map<string, Map<string, ClassStudentStanding>>();

  transactions.forEach(tx => {
    if (!tx.className) return;

    if (!classMap.has(tx.className)) {
      classMap.set(tx.className, new Map());
    }

    const studentMap = classMap.get(tx.className)!;
    const key = tx.studentId;

    if (!studentMap.has(key)) {
      const house = houses.find(h => h.id === tx.houseId);
      studentMap.set(key, {
        studentId: tx.studentId,
        studentName: tx.studentName || 'Unknown',
        houseId: tx.houseId,
        houseName: tx.houseName || house?.name || 'Unknown',
        houseColor: house?.color || '#9CA3AF',
        totalPoints: 0,
        meritPoints: 0,
        demeritPoints: 0,
        netPoints: 0,
        rank: 0,
      });
    }

    const student = studentMap.get(key)!;
    if (tx.type === TransactionType.MERIT) {
      student.meritPoints += tx.points;
    } else {
      student.demeritPoints += tx.points;
    }
    student.totalPoints = student.meritPoints + student.demeritPoints;
    student.netPoints = student.meritPoints - student.demeritPoints;
  });

  // Convert to array, sort by net points, and assign ranks
  const standings: ClassStanding[] = [];
  classMap.forEach((studentMap, className) => {
    const students = Array.from(studentMap.values())
      .sort((a, b) => b.netPoints - a.netPoints)
      .map((student, index) => ({ ...student, rank: index + 1 }));
    standings.push({ className, students });
  });

  // Sort classes by name
  standings.sort((a, b) => a.className.localeCompare(b.className));

  return standings;
};

// Student row component
const StudentRow: React.FC<{
  student: ClassStudentStanding;
  showRank: boolean;
}> = ({ student, showRank }) => {
  const rankColors: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-gray-100 text-gray-700',
    3: 'bg-amber-100 text-amber-800',
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {showRank && (
          <span
            className={`inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full ${
              student.rank <= 3 ? rankColors[student.rank] || 'bg-gray-50 text-gray-600' : 'bg-gray-50 text-gray-600'
            }`}
          >
            {student.rank}
          </span>
        )}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: student.houseColor }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {student.studentName}
          </p>
          <p className="text-xs text-gray-500">{student.houseName}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-center min-w-[60px]">
          <p className="text-xs text-green-600 font-medium">+{student.meritPoints}</p>
        </div>
        <div className="text-center min-w-[60px]">
          <p className="text-xs text-red-600 font-medium">-{student.demeritPoints}</p>
        </div>
        <div className="text-center min-w-[70px]">
          <p className={`text-sm font-bold ${student.netPoints >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            {student.netPoints >= 0 ? '+' : ''}{student.netPoints}
          </p>
        </div>
      </div>
    </div>
  );
};

const ClassStandingsPage: React.FC = () => {
  const { t } = useTranslation('houses');
  const { houses, transactions, loading } = useHousesData();

  const [selectedClass, setSelectedClass] = useState('');

  // Build class standings
  const classStandings = useMemo(() => {
    return buildClassStandings(transactions, houses);
  }, [transactions, houses, buildClassStandings]);

  // Filter by selected class
  const filteredStandings = useMemo(() => {
    if (!selectedClass) return classStandings;
    return classStandings.filter(cs => cs.className === selectedClass);
  }, [classStandings, selectedClass]);

  // Get unique class names for filter
  const classNames = useMemo(() => {
    return Array.from(new Set(transactions.map(tx => tx.className).filter(Boolean))).sort();
  }, [transactions]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const allStudents = filteredStandings.flatMap(cs => cs.students);
    if (allStudents.length === 0) return null;

    const totalMerits = allStudents.reduce((sum, s) => sum + s.meritPoints, 0);
    const totalDemerits = allStudents.reduce((sum, s) => sum + s.demeritPoints, 0);
    const avgNet = Math.round(allStudents.reduce((sum, s) => sum + s.netPoints, 0) / allStudents.length);

    return {
      totalStudents: allStudents.length,
      totalMerits,
      totalDemerits,
      avgNet,
      classCount: filteredStandings.length,
    };
  }, [filteredStandings]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {overallStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-indigo-600">{overallStats.classCount}</p>
            <p className="text-xs text-gray-500 mt-1">Classes</p>
          </Card>
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-blue-600">{overallStats.totalStudents}</p>
            <p className="text-xs text-gray-500 mt-1">Students</p>
          </Card>
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-green-600">+{overallStats.totalMerits}</p>
            <p className="text-xs text-gray-500 mt-1">Total Merits</p>
          </Card>
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-red-600">-{overallStats.totalDemerits}</p>
            <p className="text-xs text-gray-500 mt-1">Total Demerits</p>
          </Card>
          <Card variant="compact" className="text-center">
            <p className="text-2xl font-bold text-purple-600">{overallStats.avgNet >= 0 ? '+' : ''}{overallStats.avgNet}</p>
            <p className="text-xs text-gray-500 mt-1">Avg Net/Student</p>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Card
        title={t('houses.classStandings', 'Class Standings')}
        subtitle="Student rankings grouped by class"
        icon={<UsersIcon className="w-5 h-5 text-indigo-600" />}
        actions={
          classNames.length > 0 && (
            <Select
              value={selectedClass}
              onChange={(e: any) => setSelectedClass(e.target.value)}
            >
              <option value="">All Classes</option>
              {classNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          )
        }
      >
        {filteredStandings.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {t('common.noData')}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No class standings data available yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredStandings.map((classStanding) => (
              <div key={classStanding.className}>
                {/* Class Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">
                    {classStanding.className}
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {classStanding.students.length} students
                  </span>
                </div>

                {/* Table Header */}
                <div className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-t-lg border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="w-7" />
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center min-w-[60px]">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Merits
                      </span>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Demerits
                      </span>
                    </div>
                    <div className="text-center min-w-[70px]">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net
                      </span>
                    </div>
                  </div>
                </div>

                {/* Students */}
                <div className="bg-white border border-gray-200 rounded-b-lg divide-y divide-gray-100">
                  {classStanding.students.map((student) => (
                    <StudentRow
                      key={student.studentId}
                      student={student}
                      showRank={true}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* House Breakdown per Class */}
      {filteredStandings.length > 0 && (
        <Card
          title="House Distribution"
          subtitle="Student count by house per class"
        >
          <div className="space-y-4">
            {filteredStandings.map((classStanding) => {
              // Group students by house
              const houseCounts = new Map<string, { count: number; name: string; color: string }>();
              classStanding.students.forEach(student => {
                if (!houseCounts.has(student.houseId)) {
                  houseCounts.set(student.houseId, {
                    count: 0,
                    name: student.houseName,
                    color: student.houseColor,
                  });
                }
                houseCounts.get(student.houseId)!.count++;
              });

              return (
                <div key={classStanding.className}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{classStanding.className}</h4>
                  <div className="flex flex-wrap gap-3">
                    {Array.from(houseCounts.entries()).map(([houseId, data]) => (
                      <div
                        key={houseId}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: data.color }}
                        />
                        <span className="text-sm font-medium text-gray-900">{data.name}</span>
                        <span className="text-xs text-gray-500">({data.count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClassStandingsPage;
