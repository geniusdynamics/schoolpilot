// ABOUTME: Canonical student profile route: one learner read from the repository by the route id,
// ABOUTME: with the current placement and primary guardian. This is the page the directory links to.
import React from 'react';
import { Link, useParams } from 'react-router-dom';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useEntityQuery } from '@/data/query';
import { asId } from '@/domain/ids';

import { useCanonicalRepository } from '../data/canonicalRepository';
import { withCanonicalRepository } from '../data/withCanonicalRepository';

const text = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : '—';

export const StudentProfileContent: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const repository = useCanonicalRepository();
  const enabled = Boolean(studentId);

  const learnerQuery = useEntityQuery(
    repository,
    'learner',
    { where: { id: studentId ?? '__missing__' }, limit: 1 },
    { enabled }
  );
  const enrolmentQuery = useEntityQuery(
    repository,
    'enrolment',
    {
      where: { learner_id: studentId ?? '__missing__' },
      conditions: { status: { in: ['active', 'repeating'] } },
      limit: 1,
    },
    { enabled }
  );
  const learner = learnerQuery.data?.items[0];
  const placement = enrolmentQuery.data?.items[0];
  const classGroupId = placement?.class_group_id;
  const classGroupQuery = useEntityQuery(
    repository,
    'class_group',
    { where: { id: classGroupId ?? '__missing__' }, limit: 1 },
    { enabled: Boolean(classGroupId) }
  );
  const classGroup = classGroupQuery.data?.items[0];

  const guardianLinkQuery = useEntityQuery(
    repository,
    'learner_guardian',
    { where: { learner_id: studentId ?? '__missing__', is_primary: true }, limit: 1 },
    { enabled }
  );
  const guardianId = guardianLinkQuery.data?.items[0]?.guardian_id;
  const guardianQuery = useEntityQuery(
    repository,
    'guardian',
    { where: { id: guardianId ?? '__missing__' }, limit: 1 },
    { enabled: Boolean(guardianId) }
  );
  const guardian = guardianQuery.data?.items[0];

  if (learnerQuery.status === 'loading' && !learner) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-2">Loading student profile...</span>
      </div>
    );
  }

  if (!studentId || !learner) {
    return (
      <Card title="Student not found">
        <p className="text-sm text-surface-muted-fg">
          This learner is not in the current school database.
        </p>
        <Link className="mt-4 inline-block text-sm font-medium text-primary-700" to="/administration/students">
          Back to students
        </Link>
      </Card>
    );
  }

  const name =
    `${learner.preferred_name ?? learner.given_name} ${learner.family_name}`.trim() ||
    learner.admission_number;
  const guardianName = guardian
    ? `${guardian.preferred_name ?? guardian.given_name} ${guardian.family_name}`.trim()
    : '—';

  return (
    <div className="space-y-3">
      <Card
        title="Student Profile"
        actions={
          <Link
            to="/administration/students"
            className="text-sm font-medium text-primary-700 hover:underline"
          >
            Back to students
          </Link>
        }
      >
        <div className="flex flex-col gap-1 border-b border-surface-border pb-4">
          <h1 className="text-2xl font-bold text-surface-foreground">{name}</h1>
          <p className="font-mono text-sm text-surface-muted-fg">{learner.admission_number}</p>
          <p className="text-sm text-surface-muted-fg">
            {classGroup ? `Class: ${classGroup.name}` : 'No active class placement'} ·{' '}
            {text(learner.status)}
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Admission date
            </dt>
            <dd className="mt-1 text-sm text-surface-foreground">{text(learner.admission_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Date of birth
            </dt>
            <dd className="mt-1 text-sm text-surface-foreground">{text(learner.date_of_birth)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Gender
            </dt>
            <dd className="mt-1 text-sm capitalize text-surface-foreground">{text(learner.gender)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Residence
            </dt>
            <dd className="mt-1 text-sm capitalize text-surface-foreground">
              {text(learner.residence_status)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Phone
            </dt>
            <dd className="mt-1 text-sm text-surface-foreground">
              {text(learner.phones?.[0]?.number)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Email
            </dt>
            <dd className="mt-1 text-sm text-surface-foreground">
              {text(learner.emails?.[0]?.address)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Primary guardian
            </dt>
            <dd className="mt-1 text-sm text-surface-foreground">{text(guardianName)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Guardian phone
            </dt>
            <dd className="mt-1 text-sm text-surface-foreground">
              {text(guardian?.phones?.[0]?.number)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Previous school
            </dt>
            <dd className="mt-1 text-sm text-surface-foreground">{text(learner.previous_school)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-surface-muted-fg">
              Learner id
            </dt>
            <dd className="mt-1 break-all font-mono text-xs text-surface-muted-fg">
              {asId<'learner'>(learner.id)}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  );
};

const StudentProfilePage = withCanonicalRepository(StudentProfileContent);
export default StudentProfilePage;
