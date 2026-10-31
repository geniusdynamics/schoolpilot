import React, { useState, useMemo } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, DataGridColumn } from '@/components/ui/data';

import { asId } from '@/domain/ids';
import { useToast } from '@/hooks/useToast';
import { useWritableRepository } from '../data/useWritableRepository';
import { useCanonicalLearners, type CanonicalLearner } from '../data/useCanonicalLearners';
import { EnvelopeIcon, EyeIcon, PhoneIcon, PlusIcon } from '@/components/ui/icons';
import {
  AlumniRecord,
  AlumniEngagementStatus,
  AlumniCategory,
} from '../data/alumniTypes';

interface AlumniMeta {
  graduation_year?: string;
  category?: AlumniCategory;
  engagement_status?: AlumniEngagementStatus;
  occupation?: string;
  employer?: string;
  newsletter?: boolean;
  notes?: string;
  added_at?: string;
}

/** The alumni detail a learner carries in the canonical `attributes` JSON. */
function alumniMeta(learner: CanonicalLearner): AlumniMeta {
  const raw = learner.attributes.alumni;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as AlumniMeta;
}

const AlumniDirectoryPage: React.FC = () => {
  const repository = useWritableRepository();
  const { learners, learnerRows, learnersLookup, isLoading: loading } = useCanonicalLearners();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedGraduationYear, setSelectedGraduationYear] = useState<string>('');
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savingAlumni, setSavingAlumni] = useState(false);
  const [alumniDraft, setAlumniDraft] = useState({
    student_id: '',
    graduation_year: String(new Date().getFullYear()),
    category: AlumniCategory.GENERAL as AlumniCategory,
    engagement_status: AlumniEngagementStatus.ACTIVE as AlumniEngagementStatus,
    occupation: '',
    employer: '',
    newsletter: false,
    notes: '',
  });

  const alumniRecords: AlumniRecord[] = useMemo(
    () =>
      learners
        .filter((learner) => learner.status === 'Alumni')
        .map((learner) => {
          const meta = alumniMeta(learner);
          const stamp = meta.added_at ?? learner.admission_date ?? new Date().toISOString();
          return {
            id: learner.id,
            student_id: learner.id,
            admission_number: learner.admission_no,
            first_name: learner.first_name,
            last_name: learner.last_name,
            gender: learner.gender,
            graduation_year: meta.graduation_year ?? '',
            graduation_class_name: learner.current_class_name,
            graduation_stream_name: learner.current_class_stream_name,
            phone: learner.phone,
            email: learner.email,
            current_occupation: meta.occupation ?? '',
            employer: meta.employer ?? '',
            engagement_status: meta.engagement_status ?? AlumniEngagementStatus.ACTIVE,
            alumni_category: meta.category ?? AlumniCategory.GENERAL,
            is_newsletter_subscribed: meta.newsletter === true,
            notes: meta.notes ?? learner.remarks,
            created_at: stamp,
            updated_at: stamp,
          };
        }),
    [learners]
  );

  const graduationYears = useMemo(() => {
    const years = new Set(alumniRecords.map(r => r.graduation_year).filter(Boolean));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [alumniRecords]);

  const filteredRecords = useMemo(() => {
    let results = alumniRecords;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(r =>
        (r.first_name?.toLowerCase() ?? '').includes(q) ||
        (r.last_name?.toLowerCase() ?? '').includes(q) ||
        (r.admission_number?.toLowerCase() ?? '').includes(q) ||
        (r.current_occupation && r.current_occupation.toLowerCase().includes(q)) ||
        (r.employer && r.employer.toLowerCase().includes(q))
      );
    }

    if (selectedStatus) {
      results = results.filter(r => r.engagement_status === selectedStatus);
    }

    if (selectedGraduationYear) {
      results = results.filter(r => r.graduation_year === selectedGraduationYear);
    }

    return results;
  }, [alumniRecords, searchQuery, selectedStatus, selectedGraduationYear]);

  const closeAlumniModal = () => {
    setIsAddModalOpen(false);
    setAlumniDraft({
      student_id: '',
      graduation_year: String(new Date().getFullYear()),
      category: AlumniCategory.GENERAL,
      engagement_status: AlumniEngagementStatus.ACTIVE,
      occupation: '',
      employer: '',
      newsletter: false,
      notes: '',
    });
  };

  const saveAlumniRecord = async () => {
    const learnerRow = learnerRows.find((row) => row.id === alumniDraft.student_id);
    const year = alumniDraft.graduation_year.trim();
    if (!learnerRow || !year) {
      toast.showWarning('Choose a learner and enter the graduation year.');
      return;
    }
    setSavingAlumni(true);
    try {
      const learner = learners.find((row) => row.id === learnerRow.id);
      const current = learner ? alumniMeta(learner) : {};
      const attributes = {
        ...(learnerRow.attributes ?? {}),
        alumni: {
          ...current,
          graduation_year: year,
          category: alumniDraft.category,
          engagement_status: alumniDraft.engagement_status,
          occupation: alumniDraft.occupation.trim(),
          employer: alumniDraft.employer.trim(),
          newsletter: alumniDraft.newsletter,
          notes: alumniDraft.notes.trim(),
          added_at: current.added_at ?? new Date().toISOString(),
        },
      };
      await repository.update(
        'learner',
        asId<'learner'>(learnerRow.id),
        { status: 'graduated', attributes },
        { expectedVersion: learnerRow.rowVersion }
      );
      toast.showSuccess('Alumni record saved.');
      closeAlumniModal();
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Could not save the alumni record.');
    } finally {
      setSavingAlumni(false);
    }
  };

  const getEngagementBadge = (status: AlumniEngagementStatus) => {
    return (
      <Badge variant={
        status === AlumniEngagementStatus.ACTIVE ? 'success' :
        status === AlumniEngagementStatus.INACTIVE ? 'warning' : 'danger'
      }>
        {status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: AlumniCategory) => {
    return <Badge variant={
      category === AlumniCategory.DISTINGUISHED ? 'info' :
      category === AlumniCategory.DONOR ? 'success' : 'warning'
    }>{category}</Badge>;
  };

  const columns: DataGridColumn<AlumniRecord>[] = [
    { key: 'admission_number', header: 'Admission No', width: 120, sortable: true, filterable: true },
    {
      key: 'first_name',
      header: 'Name',
      width: 200,
      sortable: true,
      filterable: true,
      render: (value, item) => [item.first_name, item.last_name].filter(Boolean).join(' ') || '—',
    },
    { key: 'graduation_year', header: 'Graduated', width: 100, sortable: true, filterable: true },
    { key: 'graduation_class_name', header: 'Class', width: 100, sortable: true },
    {
      key: 'current_occupation',
      header: 'Occupation',
      width: 180,
      sortable: true,
      render: (value, item) => (
        <div>
          <div className="text-sm font-medium">{item.current_occupation || '-'}</div>
          {item.employer && <div className="text-xs text-surface-muted-fg">{item.employer}</div>}
        </div>
      ),
    },
    {
      key: 'engagement_status',
      header: 'Status',
      width: 110,
      sortable: true,
      filterable: true,
      render: (value, item) => getEngagementBadge(item.engagement_status),
    },
    {
      key: 'alumni_category',
      header: 'Category',
      width: 120,
      sortable: true,
      filterable: true,
      render: (value, item) => getCategoryBadge(item.alumni_category),
    },
    {
      key: 'current_city',
      header: 'Location',
      width: 120,
      sortable: true,
      render: (value, item) => {
        const parts = [item.current_city, item.current_country].filter(Boolean);
        return parts.join(', ') || '-';
      },
    },
    {
      key: 'id',
      header: 'Actions',
      width: 120,
      sortable: false,
      render: (value, item) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedAlumni(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          >
            View
          </Button>
          {item.email && (
            <a href={`mailto:${item.email}`} className="inline-flex items-center p-1 text-primary-600 hover:text-primary-800">
              <EnvelopeIcon className="w-4 h-4" />
            </a>
          )}
          {item.phone && (
            <a href={`tel:${item.phone}`} className="inline-flex items-center p-1 text-green-600 hover:text-green-800">
              <PhoneIcon className="w-4 h-4" />
            </a>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <Card
        title="Alumni Directory"
        info="Manage and track alumni from graduation through their career journey"
        actions={
          <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Alumni Record
          </Button>
        }
      >
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Input
            placeholder="Search by name, admission no, occupation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            placeholder="Filter by Status"
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(String(value))}
            options={[
              { label: 'All statuses', value: '' },
              ...Object.values(AlumniEngagementStatus).map(s => ({ label: s, value: s })),
            ]}
          />
          <Select
            placeholder="Filter by Graduation Year"
            value={selectedGraduationYear}
            onValueChange={(value) => setSelectedGraduationYear(String(value))}
            options={[
              { label: 'All years', value: '' },
              ...graduationYears.map(y => ({ label: y, value: y })),
            ]}
          />
        </div>

        <DataGrid
          data={filteredRecords as AlumniRecord[]}
          columns={columns}
          sortable={true}
          filterable={true}
          loading={loading}
          emptyState={
            <div className="text-center py-8">
              <div className="text-surface-muted-fg text-5xl mb-4">&#127891;</div>
              <p className="text-surface-muted-fg">No alumni records found. Alumni are created when students graduate.</p>
            </div>
          }
        />
      </Card>

      {/* Alumni Detail Modal */}
      {selectedAlumni && (
        <Modal
          isOpen={!!selectedAlumni}
          onClose={() => setSelectedAlumni(null)}
          title={[selectedAlumni.first_name, selectedAlumni.last_name].filter(Boolean).join(' ') || 'Alumni Details'}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-surface-muted-fg">Admission Number</label>
                <p className="mt-1 text-sm">{selectedAlumni.admission_number}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-muted-fg">Graduation Year</label>
                <p className="mt-1 text-sm">{selectedAlumni.graduation_year}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-muted-fg">Graduation Class</label>
                <p className="mt-1 text-sm">{selectedAlumni.graduation_class_name || '-'} {selectedAlumni.graduation_stream_name || ''}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-muted-fg">Status</label>
                <div className="mt-1">{getEngagementBadge(selectedAlumni.engagement_status)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-muted-fg">Category</label>
                <div className="mt-1">{getCategoryBadge(selectedAlumni.alumni_category)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-surface-muted-fg">Gender</label>
                <p className="mt-1 text-sm">{selectedAlumni.gender || '-'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-surface-foreground mb-3">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-surface-muted-fg">Email</label>
                  <p className="mt-1 text-sm">{selectedAlumni.email || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-muted-fg">Phone</label>
                  <p className="mt-1 text-sm">{selectedAlumni.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-muted-fg">City</label>
                  <p className="mt-1 text-sm">{selectedAlumni.current_city || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-muted-fg">Country</label>
                  <p className="mt-1 text-sm">{selectedAlumni.current_country || '-'}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-surface-foreground mb-3">Professional Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-surface-muted-fg">Occupation</label>
                  <p className="mt-1 text-sm">{selectedAlumni.current_occupation || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-surface-muted-fg">Employer</label>
                  <p className="mt-1 text-sm">{selectedAlumni.employer || '-'}</p>
                </div>
              </div>
            </div>

            {selectedAlumni.notes && (
              <div className="border-t pt-4">
                <label className="text-xs font-medium text-surface-muted-fg">Notes</label>
                <p className="mt-1 text-sm text-surface-foreground">{selectedAlumni.notes}</p>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between text-xs text-surface-muted-fg">
              <span>Newsletter: {selectedAlumni.is_newsletter_subscribed ? 'Subscribed' : 'Unsubscribed'}</span>
              <span>Last Contact: {selectedAlumni.last_contact_date ? new Date(selectedAlumni.last_contact_date).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Alumni Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Alumni Record"
        footer={
          <>
            <Button variant="secondary" onClick={closeAlumniModal} disabled={savingAlumni}>
              Cancel
            </Button>
            <Button onClick={() => void saveAlumniRecord()} loading={savingAlumni}>
              Save Record
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700">
            Search a learner by name or admission number. Saving marks the learner graduated and stores the alumni
            details on the learner record, so the directory and portal have one source of truth.
          </div>
          <EntityPicker
            label="Learner"
            value={alumniDraft.student_id ? asId<'learner'>(alumniDraft.student_id) : null}
            onChange={(id) => setAlumniDraft((current) => ({ ...current, student_id: id ?? '' }))}
            lookup={learnersLookup}
            filter={(row) => row.status !== 'graduated'}
            placeholder="Search by name or admission number"
            allowClear
            helperText={
              alumniDraft.student_id
                ? (() => {
                    const learner = learners.find((row) => row.id === alumniDraft.student_id);
                    return learner
                      ? `${learner.admission_no}${learner.current_class_name ? ` · ${learner.current_class_name} ${learner.current_class_stream_name}` : ''}`
                      : '';
                  })()
                : 'The alumnus is chosen from the canonical learner directory.'
            }
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Graduation Year"
              placeholder="e.g. 2024"
              value={alumniDraft.graduation_year}
              onChange={(event) =>
                setAlumniDraft((current) => ({ ...current, graduation_year: event.target.value }))
              }
            />
            <Select
              label="Alumni Category"
              value={alumniDraft.category}
              onValueChange={(value) =>
                setAlumniDraft((current) => ({ ...current, category: value as AlumniCategory }))
              }
              options={Object.values(AlumniCategory).map((category) => ({
                label: category,
                value: category,
              }))}
            />
            <Input
              label="Current Occupation"
              placeholder="e.g. Software Engineer"
              value={alumniDraft.occupation}
              onChange={(event) =>
                setAlumniDraft((current) => ({ ...current, occupation: event.target.value }))
              }
            />
            <Input
              label="Employer"
              placeholder="e.g. Company Name"
              value={alumniDraft.employer}
              onChange={(event) =>
                setAlumniDraft((current) => ({ ...current, employer: event.target.value }))
              }
            />
            <Select
              label="Engagement Status"
              value={alumniDraft.engagement_status}
              onValueChange={(value) =>
                setAlumniDraft((current) => ({
                  ...current,
                  engagement_status: value as AlumniEngagementStatus,
                }))
              }
              options={Object.values(AlumniEngagementStatus).map((status) => ({
                label: status,
                value: status,
              }))}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-surface-foreground">
              <input
                type="checkbox"
                checked={alumniDraft.newsletter}
                onChange={(event) =>
                  setAlumniDraft((current) => ({ ...current, newsletter: event.target.checked }))
                }
                className="h-4 w-4 rounded border-surface-border text-primary-600 focus:ring-primary-500"
              />
              Subscribe to the alumni newsletter
            </label>
          </div>
          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            value={alumniDraft.notes}
            onChange={(event) =>
              setAlumniDraft((current) => ({ ...current, notes: event.target.value }))
            }
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};

const AlumniDirectoryPageWithRepository = withCanonicalRepository(AlumniDirectoryPage);
export default AlumniDirectoryPageWithRepository;

export const AlumniDirectoryContent = AlumniDirectoryPage;
