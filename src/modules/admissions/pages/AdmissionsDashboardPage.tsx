import React from 'react';
import Card from '@/components/ui/Card';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  CheckCircleIcon,
  InboxIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
} from '@/components/ui/icons';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import DonutChart from '@/components/ui/DonutChart';
import { Link } from 'react-router-dom';
import { useAdmissionsData } from '../data/useAdmissionsData';
import { ApplicationStatus } from '../data/types';

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}> = ({ title, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <Card className="shadow-md">
      <div className="flex items-center p-4">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
};

const AdmissionsDashboardPage: React.FC = () => {
  const { statistics, loading } = useAdmissionsData();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusChartData = statistics.byStatus.map(s => ({
    name: s.status,
    value: s.count,
  }));

  const classChartData = statistics.byClass.map(c => ({
    name: c.className,
    value: c.count,
  }));

  return (
    <div className="space-y-6">
      <Card title="Admissions Dashboard" className="bg-white shadow-xl">
        <div className="p-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Total Applications"
              value={statistics.totalApplications}
              icon={<DocumentTextIcon className="w-7 h-7" />}
              color="blue"
            />
            <StatCard
              title="Pending Review"
              value={statistics.pendingReview}
              icon={<InboxIcon className="w-7 h-7" />}
              color="yellow"
            />
            <StatCard
              title="Approved"
              value={statistics.approved}
              icon={<CheckCircleIcon className="w-7 h-7" />}
              color="green"
            />
            <StatCard
              title="Enrolled"
              value={statistics.enrolled}
              icon={<UsersIcon className="w-7 h-7" />}
              color="purple"
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <StatCard
              title="Rejected"
              value={statistics.rejected}
              icon={<ExclamationTriangleIcon className="w-7 h-7" />}
              color="red"
            />
            <StatCard
              title="This Month"
              value={statistics.thisMonth}
              icon={<ChartBarIcon className="w-7 h-7" />}
              color="blue"
            />
            <StatCard
              title="Waitlisted"
              value={statistics.waitlisted}
              icon={<UsersIcon className="w-7 h-7" />}
              color="yellow"
            />
          </div>

          {/* Quick Actions */}
          <Card title="Quick Actions" className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              <Button
                as={Link}
                to="/admissions/new-application"
                variant="primary"
                leftIcon={<PlusIcon className="w-5 h-5" />}
              >
                New Application
              </Button>
              <Button
                as={Link}
                to="/admissions/applications"
                variant="outline"
                leftIcon={<EyeIcon className="w-5 h-5" />}
              >
                View Applications
              </Button>
              <Button
                as={Link}
                to="/admissions/review-queue"
                variant="outline"
                leftIcon={<InboxIcon className="w-5 h-5" />}
              >
                Review Queue
              </Button>
            </div>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {statusChartData.length > 0 && (
              <Card title="Applications by Status">
                <div className="p-4">
                  <DonutChart data={statusChartData} title="" />
                </div>
              </Card>
            )}
            {classChartData.length > 0 && (
              <Card title="Applications by Class">
                <div className="p-4">
                  <DonutChart data={classChartData} title="" />
                </div>
              </Card>
            )}
          </div>

          {/* Welcome Section */}
          <div className="text-center py-8 mt-6">
            <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Admissions Management
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Manage student admission applications from submission through enrollment.
              Track applications, review candidates, and process enrollments efficiently.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdmissionsDashboardPage;
