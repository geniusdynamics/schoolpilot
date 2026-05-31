import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { TabNavigation } from '@/components/ui';
import { StudentExamProfile } from '../components';
import { 
  ChartBarIcon
} from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,

} from 'recharts';
import {
  initialMockSubjectPerformanceData,
  initialMockPerformanceOverTimeData,
  initialMockSubjectBreakdownData
} from '../data/mockData';

export const StudentExamAnalysisPageContent: React.FC = () => {
  useTranslation('academics');
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();
  const { students, loading } = useAppData();

  const [activeTab, setActiveTab] = useState('student-analysis');
  const [selectedExam, setSelectedExam] = useState('opener-102');

  // Find student from data
  const student = useMemo(() => {
    return (students || []).find(s => String(s.id) === studentId) || {
      id: studentId || '1266',
      first_name: 'Evelia',
      last_name: 'Akinyi',
      admission_number: '1266',
      current_class_stream_name: '2 Alpha',
      kcpe_score: 331,
    };
  }, [students, studentId]);

  // Tab navigation
  const tabs = [
    { id: 'student-analysis', label: 'Student Analysis', icon: <ChartBarIcon className="h-4 w-4" /> },
  ];

  // Mock filter options
  const examOptions = [
    { value: 'opener-102', label: 'Opener exam 102' },
    { value: 'mid-term', label: 'Mid Term Exam' },
    { value: 'end-term', label: 'End Term Exam' },
  ];

  const isLoading = loading.students;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Tab Navigation */}
      <TabNavigation 
        tabs={tabs} 
        variant="sidebar"
        activeTabId={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Form 2 - Opener exam 102 - (2022 Term 1)
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Change Exam:</span>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500"
          >
            {examOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Profile & Performance */}
      <StudentExamProfile
        studentName={`${student.first_name} ${student.last_name}`}
        admissionNumber={student.admission_number || '1266'}
        stream={student.current_class_stream_name || '2 Alpha'}
        examName="Opener exam 102"
        meanMarks={71}
        totalPoints={141}
        maxPoints={180}
        overallPosition={15}
        totalStudents={36}
        streamPosition={6}
        streamTotal={15}
        meanGrade="B+"
        kcpeScore={student.kcpe_score || 331}
        onProfileClick={() => navigate(`/administration/students/${studentId}`)}
        onMessageClick={() => navigate(`/administration/message-campaigns?student=${studentId}`)}
        onNotesClick={() => navigate(`/administration/students/${studentId}/notes`)}
      />

      {/* Subject Performance Chart */}
      <Card>
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-gray-500" />
            Exam Performance Comparison
          </h3>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={initialMockSubjectPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="subject" 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="student" 
                name="Evelia"
                stroke="#10b981" 
                fill="#86efac" 
                fillOpacity={0.6}
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="class" 
                name="Form 2"
                stroke="#6b7280" 
                fill="#d1d5db" 
                fillOpacity={0.4}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Table */}
        <Card>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Subject Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gr.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialMockSubjectBreakdownData.map((subject) => (
                  <tr key={subject.name} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-900">{subject.name}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{subject.marks}%</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 ${subject.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {subject.change >= 0 ? '↗' : '↘'}
                        {Math.abs(subject.change)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        subject.grade.startsWith('A') ? 'bg-emerald-100 text-emerald-700' :
                        subject.grade.startsWith('B') ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {subject.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{subject.rank} / 15</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Performance Over Time */}
        <Card>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Performance Over Time</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={initialMockPerformanceOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="exam" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[60, 80]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="student" 
                  name="Evelia"
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="class" 
                  name="Class Average"
                  stroke="#6b7280" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#6b7280', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
const StudentExamAnalysisPage: React.FC = () => (
  <div className="space-y-6">
    <StudentExamAnalysisPageContent />
  </div>
);

export default StudentExamAnalysisPage;
