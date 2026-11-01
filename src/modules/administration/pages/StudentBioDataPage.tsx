// ABOUTME: Student bio-data directory over the canonical learner record, with class/stream filters and profile links.
// ABOUTME: The old app-data screen and its fake medical/document tabs are replaced by the one canonical learner source.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';

import { useCanonicalLearners, type CanonicalLearner } from '../data/useCanonicalLearners';

interface BioRow {
  readonly id: string;
  readonly admission_no: string;
  readonly name: string;
  readonly class_name: string;
  readonly stream_name: string;
  readonly gender: string;
  readonly date_of_birth: string;
  readonly guardian: string;
  readonly guardian_phone: string;
  readonly phone: string;
  readonly email: string;
  readonly religion: string;
  readonly county: string;
}

export const StudentBioDataContent: React.FC = () => {
  const { learners, isLoading } = useCanonicalLearners();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const rows = useMemo<BioRow[]>(
    () =>
      learners.map((learner: CanonicalLearner) => ({
        id: learner.id,
        admission_no: learner.admission_no,
        name: learner.display_name || learner.name,
        class_name: learner.current_class_name,
        stream_name: learner.current_class_stream_name,
        gender: learner.gender,
        date_of_birth: learner.date_of_birth,
        guardian: learner.primary_guardian,
        guardian_phone: learner.primary_guardian_phone,
        phone: learner.phone,
        email: learner.email,
        religion: learner.religion,
        county: learner.county,
      })),
    [learners]
  );

  const classOptions = useMemo(
    () => [...new Set(rows.map((row) => row.class_name).filter(Boolean))].sort(),
    [rows]
  );
  const streamOptions = useMemo(() => {
    const scoped = selectedClass ? rows.filter((row) => row.class_name === selectedClass) : rows;
    return [...new Set(scoped.map((row) => row.stream_name).filter(Boolean))].sort();
  }, [rows, selectedClass]);

  const visible = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return rows.filter(
      (row) =>
        (!selectedClass || row.class_name === selectedClass) &&
        (!selectedStream || row.stream_name === selectedStream) &&
        (!term ||
          row.name.toLowerCase().includes(term) ||
          row.admission_no.toLowerCase().includes(term) ||
          row.guardian.toLowerCase().includes(term))
    );
  }, [rows, selectedClass, selectedStream, searchTerm]);

  const columns: DataGridColumn<BioRow>[] = [
    { key: 'admission_no', header: 'Adm No', sortable: true, filterable: false },
    { key: 'name', header: 'Student', sortable: true, filterable: false },
    { key: 'class_name', header: 'Class', sortable: true, filterable: false },
    { key: 'stream_name', header: 'Stream', sortable: true, filterable: false },
    { key: 'gender', header: 'Gender', sortable: true, filterable: false },
    {
      key: 'date_of_birth',
      header: 'Date of Birth',
      sortable: true,
      filterable: false,
      render: (value: string) => (value ? new Date(value).toLocaleDateString() : '—'),
    },
    { key: 'guardian', header: 'Guardian', sortable: true, filterable: false },
    { key: 'guardian_phone', header: 'Guardian Phone', sortable: true, filterable: false },
    { key: 'phone', header: 'Student Phone', sortable: true, filterable: false },
    { key: 'email', header: 'Email', sortable: true, filterable: false },
    { key: 'religion', header: 'Religion', sortable: true, filterable: false },
    { key: 'county', header: 'County', sortable: true, filterable: false },
    {
      key: 'actions',
      header: 'Profile',
      sortable: false,
      filterable: false,
      render: (_value, row) => (
        <a
          href={`/administration/students/${row.id}`}
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          View
        </a>
      ),
    },
  ];

  if (isLoading && rows.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-2">Loading student bio data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card
        title="Student Bio Data"
        info="The canonical learner record with placement and primary guardian. Medical and document detail is held on the learner profile rather than duplicated here."
      >
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class</span>
            <select
              value={selectedClass}
              onChange={(event) => {
                setSelectedClass(event.target.value);
                setSelectedStream('');
              }}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All classes</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Stream</span>
            <select
              value={selectedStream}
              onChange={(event) => setSelectedStream(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All streams</option>
              {streamOptions.map((stream) => (
                <option key={stream} value={stream}>{stream}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Search</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Name, admission or guardian"
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
        </div>

        <DataGrid
          data={visible}
          columns={columns}
          pagination={{ pageSize: 25 }}
          sortable
          filterable={false}
          emptyState={{
            title: 'No learners match the filters',
            description: 'Change the class, stream or search, or add learners to the directory.',
          }}
        />
      </Card>
    </div>
  );
};

export default StudentBioDataContent;
