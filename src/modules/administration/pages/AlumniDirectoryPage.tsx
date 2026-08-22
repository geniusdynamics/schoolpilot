import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';

import { useAppData } from '@/hooks/useAppData';
import { EnvelopeIcon, EyeIcon, PhoneIcon, PlusIcon } from '@/components/ui/icons';
import {
  AlumniRecord,
  AlumniEngagementStatus,
  AlumniCategory,
} from '../data/alumniTypes';

const AlumniDirectoryPage: React.FC = () => {

  const { students = [], loading } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedGraduationYear, setSelectedGraduationYear] = useState<string>('');
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniRecord | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Generate mock alumni data from students with alumni status
  const alumniRecords: AlumniRecord[] = useMemo(() => {
    const studentsWithAlumniStatus = students.filter((s: any) =>
      s.status === 'Alumni' || s.status === 'Transferred' || s.status === 'Withdrawn'
    );

    if (studentsWithAlumniStatus.length === 0) {
      // If no students with alumni status exist, create sample records
      return [
        {
          id: 'alumni-001',
          student_id: 'stu-001',
          admission_number: 'STU-2020-001',
          first_name: 'James',
          last_name: 'Mwangi',
          gender: 'Male',
          graduation_year: '2024',
          graduation_class_name: 'Form 4',
          graduation_stream_name: 'East',
          phone: '+254712345678',
          email: 'james.mwangi@email.com',
          current_occupation: 'Software Engineer',
          employer: 'Tech Corp Ltd',
          current_city: 'Nairobi',
          current_country: 'Kenya',
          engagement_status: AlumniEngagementStatus.ACTIVE,
          alumni_category: AlumniCategory.DISTINGUISHED,
          is_newsletter_subscribed: true,
          last_contact_date: '2026-05-15',
          notes: 'Active alumni mentor for computer science students',
          created_at: '2024-12-01T00:00:00Z',
          updated_at: '2026-05-15T00:00:00Z',
        },
        {
          id: 'alumni-002',
          student_id: 'stu-002',
          admission_number: 'STU-2019-045',
          first_name: 'Grace',
          last_name: 'Akinyi',
          gender: 'Female',
          graduation_year: '2023',
          graduation_class_name: 'Form 4',
          graduation_stream_name: 'West',
          phone: '+254723456789',
          email: 'grace.akinyi@email.com',
          current_occupation: 'Medical Doctor',
          employer: 'Kenyatta Hospital',
          current_city: 'Nairobi',
          current_country: 'Kenya',
          engagement_status: AlumniEngagementStatus.ACTIVE,
          alumni_category: AlumniCategory.MENTOR,
          is_newsletter_subscribed: true,
          last_contact_date: '2026-04-20',
          notes: 'Medical career mentor',
          created_at: '2023-11-15T00:00:00Z',
          updated_at: '2026-04-20T00:00:00Z',
        },
        {
          id: 'alumni-003',
          student_id: 'stu-003',
          admission_number: 'STU-2021-102',
          first_name: 'Peter',
          last_name: 'Kamau',
          gender: 'Male',
          graduation_year: '2023',
          graduation_class_name: 'Form 4',
          graduation_stream_name: 'East',
          phone: '+254734567890',
          current_occupation: 'University Student',
          employer: 'University of Nairobi',
          current_city: 'Nairobi',
          current_country: 'Kenya',
          engagement_status: AlumniEngagementStatus.INACTIVE,
          alumni_category: AlumniCategory.GENERAL,
          is_newsletter_subscribed: false,
          last_contact_date: '2025-08-10',
          created_at: '2023-12-01T00:00:00Z',
          updated_at: '2025-08-10T00:00:00Z',
        },
        {
          id: 'alumni-004',
          student_id: 'stu-004',
          admission_number: 'STU-2018-078',
          first_name: 'Sarah',
          last_name: 'Wanjiku',
          gender: 'Female',
          graduation_year: '2022',
          graduation_class_name: 'Form 4',
          graduation_stream_name: 'West',
          phone: '+254745678901',
          email: 'sarah.wanjiku@email.com',
          current_occupation: 'Chartered Accountant',
          employer: 'Deloitte Kenya',
          current_city: 'Mombasa',
          current_country: 'Kenya',
          engagement_status: AlumniEngagementStatus.ACTIVE,
          alumni_category: AlumniCategory.DONOR,
          is_newsletter_subscribed: true,
          last_contact_date: '2026-05-01',
          notes: 'Regular donor to scholarship fund',
          created_at: '2022-12-01T00:00:00Z',
          updated_at: '2026-05-01T00:00:00Z',
        },
        {
          id: 'alumni-005',
          student_id: 'stu-005',
          admission_number: 'STU-2020-156',
          first_name: 'David',
          last_name: 'Ochieng',
          gender: 'Male',
          graduation_year: '2024',
          graduation_class_name: 'Form 4',
          graduation_stream_name: 'East',
          current_occupation: 'Civil Engineer',
          employer: 'KPLC',
          current_city: 'Kisumu',
          current_country: 'Kenya',
          engagement_status: AlumniEngagementStatus.LOST_CONTACT,
          alumni_category: AlumniCategory.GENERAL,
          is_newsletter_subscribed: false,
          created_at: '2024-11-20T00:00:00Z',
          updated_at: '2025-06-15T00:00:00Z',
        },
      ];
    }

    return studentsWithAlumniStatus.map((s: any, index: number) => ({
      id: `alumni-${s.id || index}`,
      student_id: s.id || `stu-${index}`,
      admission_number: s.admission_number || s.admissionNo || `STU-${2000 + index}`,
      first_name: s.first_name || s.firstName || '',
      last_name: s.last_name || s.lastName || '',
      gender: s.gender || '',
      graduation_year: s.graduation_year || s.graduationYear || '2024',
      graduation_class_name: s.class_name || s.className || null,
      graduation_stream_name: s.stream_name || s.streamName || null,
      phone: s.phone || null,
      email: s.email || null,
      current_occupation: s.current_occupation || null,
      employer: s.employer || null,
      current_city: s.current_city || null,
      current_country: s.current_country || 'Kenya',
      engagement_status: s.engagement_status || AlumniEngagementStatus.ACTIVE,
      alumni_category: s.alumni_category || AlumniCategory.GENERAL,
      is_newsletter_subscribed: s.is_newsletter_subscribed !== false,
      last_contact_date: s.last_contact_date || null,
      notes: s.notes || null,
      created_at: s.created_at || new Date().toISOString(),
      updated_at: s.updated_at || new Date().toISOString(),
    }));
  }, [students]);

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
          {item.employer && <div className="text-xs text-gray-500">{item.employer}</div>}
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
            <a href={`mailto:${item.email}`} className="inline-flex items-center p-1 text-blue-600 hover:text-blue-800">
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
    <div className="space-y-6">
      <Card
        title="Alumni Directory"
        description="Manage and track alumni from graduation through their career journey"
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
            onChange={(value) => setSelectedStatus(value)}
            options={Object.values(AlumniEngagementStatus).map(s => ({ label: s, value: s }))}
          />
          <Select
            placeholder="Filter by Graduation Year"
            value={selectedGraduationYear}
            onChange={(value) => setSelectedGraduationYear(value)}
            options={graduationYears.map(y => ({ label: y, value: y }))}
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
              <div className="text-gray-400 text-5xl mb-4">&#127891;</div>
              <p className="text-gray-500">No alumni records found. Alumni are created when students graduate.</p>
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
                <label className="text-xs font-medium text-gray-500">Admission Number</label>
                <p className="mt-1 text-sm">{selectedAlumni.admission_number}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Graduation Year</label>
                <p className="mt-1 text-sm">{selectedAlumni.graduation_year}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Graduation Class</label>
                <p className="mt-1 text-sm">{selectedAlumni.graduation_class_name || '-'} {selectedAlumni.graduation_stream_name || ''}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Status</label>
                <div className="mt-1">{getEngagementBadge(selectedAlumni.engagement_status)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Category</label>
                <div className="mt-1">{getCategoryBadge(selectedAlumni.alumni_category)}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Gender</label>
                <p className="mt-1 text-sm">{selectedAlumni.gender || '-'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-sm">{selectedAlumni.email || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Phone</label>
                  <p className="mt-1 text-sm">{selectedAlumni.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">City</label>
                  <p className="mt-1 text-sm">{selectedAlumni.current_city || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Country</label>
                  <p className="mt-1 text-sm">{selectedAlumni.current_country || '-'}</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Professional Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Occupation</label>
                  <p className="mt-1 text-sm">{selectedAlumni.current_occupation || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Employer</label>
                  <p className="mt-1 text-sm">{selectedAlumni.employer || '-'}</p>
                </div>
              </div>
            </div>

            {selectedAlumni.notes && (
              <div className="border-t pt-4">
                <label className="text-xs font-medium text-gray-500">Notes</label>
                <p className="mt-1 text-sm text-gray-700">{selectedAlumni.notes}</p>
              </div>
            )}

            <div className="border-t pt-3 flex justify-between text-xs text-gray-400">
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
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsAddModalOpen(false)}>
              Save Record
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Alumni records are typically created automatically when a student graduates and their status changes to "Alumni".
            Use this form for manual records or bulk imports.
          </div>
          <Select
            label="Select Student"
            placeholder="Choose a student to convert to alumni..."
            value=""
            onChange={() => {}}
            options={students
              .filter((s: any) => s.status !== 'Alumni')
              .slice(0, 20)
              .map((s: any) => ({
                label: `${s.first_name || ''} ${s.last_name || ''} (${s.admission_number || s.admissionNo || ''})`,
                value: s.id || '',
              }))}
          />
          <Input label="Graduation Year" placeholder="e.g. 2024" value="" onChange={() => {}} />
          <Select
            label="Alumni Category"
            placeholder="Select category"
            value=""
            onChange={() => {}}
            options={Object.values(AlumniCategory).map(c => ({ label: c, value: c }))}
          />
          <Input label="Current Occupation" placeholder="e.g. Software Engineer" value="" onChange={() => {}} />
          <Input label="Employer" placeholder="e.g. Company Name" value="" onChange={() => {}} />
          <Textarea label="Notes" placeholder="Additional notes..." value="" onChange={() => {}} rows={3} />
        </div>
      </Modal>
    </div>
  );
};

export default AlumniDirectoryPage;

export const AlumniDirectoryContent = AlumniDirectoryPage;
