// ABOUTME: The academics dashboard, read from the canonical school: learning areas, assessments,
// ABOUTME: class groups and the marks actually recorded. There is no sample trend and no invented
// ABOUTME: activity: a panel with nothing behind it says so.

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BeakerIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  TableCellsIcon,
  ArrowRightIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Spinner from '@/components/ui/Spinner';
import Card from '@/components/ui/Card';
import ModuleDashboardShell, {
  DashboardMetric,
  DashboardPanel,
  DashboardNotification,
  DashboardQuickAction,
  DashboardAlertBanner,
} from '@/components/ModuleDashboardShell';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useCanonicalAcademics } from '../data/useCanonicalAcademics';

export const AcademicsDashboardPageContent: React.FC = () => {
  const { t } = useTranslation('academics');
  const canonical = useCanonicalAcademics();
  const { assessments, classGroups, levels, learningAreas, marks, enrolments } = canonical;

  const recentMarks = useMemo(() => {
    const ordered = [...marks].sort((left, right) =>
      (right.entered_at ?? '').localeCompare(left.entered_at ?? '')
    );
    return ordered.slice(0, 5).map((mark) => {
      const enrolment = canonical.enrolmentById.get(mark.enrolment_id);
      const learner = enrolment ? canonical.learnerById.get(enrolment.learner_id) : undefined;
      return {
        id: mark.id,
        score: mark.score ?? null,
        status: mark.status_code,
        enteredAt: mark.entered_at ?? null,
        learnerName: learner
          ? [learner.given_name, learner.family_name].filter(Boolean).join(' ')
          : (enrolment?.learner_id ?? 'Unknown learner'),
        learningAreaName:
          canonical.learningAreaById.get(mark.learning_area_id)?.name ?? 'Unknown learning area',
        assessmentName:
          assessments.find((assessment) => assessment.id === mark.assessment_id)?.name ??
          'Unknown assessment',
      };
    });
  }, [
    marks,
    assessments,
    canonical.enrolmentById,
    canonical.learnerById,
    canonical.learningAreaById,
  ]);

  if (canonical.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (canonical.isError) {
    return (
      <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-800">
        The school’s academic records could not be read. Reload the page, and tell the administrator
        if it keeps happening.
      </p>
    );
  }

  const openAssessments = assessments.filter((assessment) => assessment.status === 'open').length;
  const draftAssessments = assessments.filter((assessment) => assessment.status === 'draft').length;
  const areasWithAssessment = learningAreas.filter(
    (area) =>
      assessments.some(
        (assessment) =>
          assessment.learning_area_ids.length === 0 ||
          assessment.learning_area_ids.includes(area.id)
      )
  ).length;
  const areasWithoutAssessment = learningAreas.length - areasWithAssessment;

  const metrics: DashboardMetric[] = [
    {
      key: 'learning-areas',
      label: t('dashboard.totalSubjects') || 'Learning areas',
      value: learningAreas.length,
      icon: <BookOpenIcon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: `${levels.length} ${levels.length === 1 ? 'level' : 'levels'}`,
      to: '/academics/subjects',
      colorScheme: 'blue',
      description: 'Curriculum learning areas on file',
    },
    {
      key: 'assessments',
      label: t('dashboard.examSessions') || 'Assessments',
      value: assessments.length,
      icon: <AcademicCapIcon className="h-6 w-6" />,
      trend: openAssessments > 0 ? 'up' : 'neutral',
      trendValue: `${openAssessments} open`,
      to: '/academics/exam-setup',
      colorScheme: 'violet',
      description: 'Assessments across the school’s periods',
    },
    {
      key: 'marks',
      label: 'Marks recorded',
      value: marks.length,
      icon: <DocumentTextIcon className="h-6 w-6" />,
      to: '/academics/marks-entry',
      colorScheme: 'cyan',
      description:
        marks.length === 0 ? 'No marks entered yet.' : 'Marks saved through marks entry',
    },
    {
      key: 'class-groups',
      label: 'Class groups',
      value: classGroups.length,
      icon: <TableCellsIcon className="h-6 w-6" />,
      trend: 'neutral',
      trendValue: `${enrolments.length} ${enrolments.length === 1 ? 'enrolment' : 'enrolments'}`,
      to: '/academics/allocations',
      colorScheme: 'emerald',
      description: 'Classes and streams on file',
    },
  ];

  const alertBanners: DashboardAlertBanner[] = [
    {
      type: 'task',
      count: areasWithoutAssessment,
      label: 'Learning areas without an assessment',
      description: 'Nothing can be marked until one is added',
      to: '/academics/exam-setup',
    },
    {
      type: 'approval',
      count: openAssessments,
      label: 'Open assessments',
      description: 'Their marks can be entered now',
      to: '/academics/marks-entry',
    },
    {
      type: 'message',
      count: marks.length,
      label: 'Marks recorded',
      description: marks.length === 0 ? 'No marks entered yet' : 'Saved in this school',
      to: '/academics/marks-entry',
    },
    {
      type: 'overdue',
      count: draftAssessments,
      label: 'Draft assessments',
      description: 'Not yet open for marks',
      to: '/academics/exam-setup',
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      key: 'learning-areas',
      label: 'Manage learning areas',
      description: 'Configure the curriculum',
      to: '/academics/subjects',
      icon: <BookOpenIcon className="h-5 w-5" />,
      colorScheme: 'blue',
    },
    {
      key: 'assessments',
      label: 'Exam setup',
      description: 'Schedule the assessments',
      to: '/academics/exam-setup',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      colorScheme: 'violet',
    },
    {
      key: 'marks',
      label: 'Marks entry',
      description: 'Record the marks',
      to: '/academics/marks-entry',
      icon: <DocumentTextIcon className="h-5 w-5" />,
      colorScheme: 'cyan',
    },
    {
      key: 'results',
      label: 'Results',
      description: 'See the computed grades',
      to: '/academics/results',
      icon: <AcademicCapIcon className="h-5 w-5" />,
      colorScheme: 'indigo',
    },
    {
      key: 'grading',
      label: 'Grading',
      description: 'Review the grading scales',
      to: '/academics/grading-systems',
      icon: <ShieldCheckIcon className="h-5 w-5" />,
      colorScheme: 'emerald',
    },
    {
      key: 'analysis',
      label: 'Exam analysis',
      description: 'View the performance',
      to: '/academics/exam-analysis',
      icon: <TableCellsIcon className="h-5 w-5" />,
      colorScheme: 'amber',
    },
  ];

  const marksByArea = learningAreas
    .map((area) => ({
      name: area.name,
      uv: marks.filter((mark) => mark.learning_area_id === area.id).length,
    }))
    .filter((entry) => entry.uv > 0)
    .sort((left, right) => right.uv - left.uv)
    .slice(0, 8);

  const charts: DashboardPanel[] = [
    {
      key: 'marks-by-learning-area',
      title: 'Marks recorded by learning area',
      content:
        marksByArea.length === 0 ? (
          <p className="py-10 text-center text-sm text-surface-muted-fg">No marks entered yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RechartsBarChart
              data={marksByArea}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="uv" fill="#6366f1" name="Marks" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        ),
    },
  ];

  const notifications: DashboardNotification[] = [
    {
      id: 'assessment-coverage',
      title: 'Assessment coverage',
      message:
        learningAreas.length === 0
          ? 'No learning areas are on file yet.'
          : `${areasWithAssessment} of ${learningAreas.length} learning areas have an assessment; the rest cannot be marked.`,
      severity: areasWithoutAssessment > 0 ? 'warning' : 'normal',
    },
    {
      id: 'marks',
      title: 'Marks',
      message:
        marks.length === 0
          ? 'No marks entered yet.'
          : `${marks.length} marks are recorded across ${marksByArea.length} learning area${
              marksByArea.length === 1 ? '' : 's'
            }.`,
      severity: 'normal',
    },
  ];

  return (
    <ModuleDashboardShell
      title={t('dashboard.title') || 'Academics Dashboard'}
      subtitle={
        t('dashboard.overviewDescription') ||
        'Curriculum, assessments, class groups and marks, read from the school’s own records.'
      }
      heroIcon={<BeakerIcon className="h-8 w-8 text-white" />}
      accentColor="blue"
      metrics={metrics}
      alertBanners={alertBanners}
      quickActions={quickActions}
      quickNavCards
      charts={charts}
      notifications={notifications}
    >
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Academic structure" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-surface-border py-2">
              <span className="text-sm text-surface-muted-fg">Learning areas</span>
              <span className="font-semibold text-surface-foreground">{learningAreas.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-surface-border py-2">
              <span className="text-sm text-surface-muted-fg">Class groups</span>
              <span className="font-semibold text-surface-foreground">{classGroups.length}</span>
            </div>
            <div className="flex items-center justify-between border-b border-surface-border py-2">
              <span className="text-sm text-surface-muted-fg">Levels</span>
              <span className="font-semibold text-surface-foreground">{levels.length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-surface-muted-fg">Assessments</span>
              <span className="font-semibold text-primary-600">{assessments.length}</span>
            </div>
          </div>
        </Card>

        <Card title="Recent marks" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-3">
            {recentMarks.length === 0 ? (
              <p className="py-6 text-center text-sm text-surface-muted-fg">
                No marks entered yet.
              </p>
            ) : (
              recentMarks.map((mark) => (
                <div key={mark.id} className="flex items-start gap-3 py-2">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <DocumentTextIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-surface-foreground">
                      {mark.learnerName}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-surface-muted-fg">
                      <ClockIcon className="h-3 w-3" />
                      {mark.learningAreaName} · {mark.assessmentName} ·{' '}
                      {mark.enteredAt ? new Date(mark.enteredAt).toLocaleDateString() : 'no date'}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary-600">
                    {mark.score === null ? mark.status : mark.score}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Quick overview" className="border-slate-200 bg-surface-card shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary-50 p-3 text-center">
                <p className="text-2xl font-bold text-primary-700">{learningAreas.length}</p>
                <p className="text-xs text-primary-600">Learning areas</p>
              </div>
              <div className="rounded-lg bg-violet-50 p-3 text-center">
                <p className="text-2xl font-bold text-violet-700">{assessments.length}</p>
                <p className="text-xs text-violet-600">Assessments</p>
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-emerald-700">Open assessments</span>
                <span className="font-bold text-emerald-700">{openAssessments}</span>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700">Marks recorded</span>
                <span className="font-bold text-amber-700">
                  {marks.length === 0 ? 'None yet' : marks.length}
                </span>
              </div>
            </div>
            <button
              onClick={() => (window.location.hash = '#/academics/exam-analysis')}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-surface-accent px-4 py-2 text-sm font-medium text-surface-foreground transition-colors hover:bg-gray-200"
            >
              View exam analysis <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </section>
    </ModuleDashboardShell>
  );
};

const AcademicsDashboardPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <AcademicsDashboardPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default AcademicsDashboardPage;
