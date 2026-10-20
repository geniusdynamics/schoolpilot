// ABOUTME: Student profile page — loads one learner by route id through useAdministration().
// ABOUTME: Resolves class, stream and guardian at read time and edits bio-data in an in-page dialog.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdministration } from '../hooks/useAdministration';
import type { ParentsGuardian, StudentDetailProfile } from '@/core/types';
import { PersonGender } from '@/core/types';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Tabs from '@/components/ui/Tabs';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { EntityForm, EntityFieldConfig } from '@/components/ui/forms';
import { UserCircleIcon, AcademicCapIcon, EnvelopeIcon, PhoneIcon, DownloadIcon, MessageIcon, EditIcon, CurrencyDollarIcon, PrinterIcon } from '@/components/ui/icons';
import { CameraIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/hooks/useToast';
import { fileToImageDataUrl, ImageUploadError } from '@/services/storage/imageUpload';

type StudentProfile = Partial<StudentDetailProfile> & Pick<StudentDetailProfile, 'id'> & {
  guardians?: ParentsGuardian[];
};
type PaymentLogItem = StudentDetailProfile['payment_history'][number];
type EnrolledSubject = StudentDetailProfile['enrolled_subjects'][number];

/** Bio-data fields the profile's Edit button can change. */
const BIO_DATA_FIELDS = [
  'first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth',
  'religion', 'address', 'email', 'phone', 'remarks',
] as const;

const StudentDetailPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { studentId } = useParams<{ studentId: string }>();
  const { getStudentDetailsById, updateStudent, students, classes, classStreams } = useAdministration();
  const toast = useToast();
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [loadedProfile, setLoadedProfile] = useState<StudentProfile | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isEditingBioData, setIsEditingBioData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!studentId) {
      setLoadedProfile(null);
      setIsLoadingPage(false);
      return undefined;
    }
    setIsLoadingPage(true);
    getStudentDetailsById(studentId)
      .then((data) => { if (isMounted) setLoadedProfile(data); })
      .catch(() => { if (isMounted) setLoadedProfile(null); })
      .finally(() => { if (isMounted) setIsLoadingPage(false); });
    return () => { isMounted = false; };
  }, [studentId, getStudentDetailsById]);

  // A learner just created in the UI may already be in the live collection before
  // the repository read sees it; ids are compared as strings (seeded ids vs uuids).
  const studentProfile = useMemo<StudentProfile | null>(() => {
    if (loadedProfile) return loadedProfile;
    const live = (students || []).find((student) => String(student.id) === String(studentId));
    return live ? (live as StudentProfile) : null;
  }, [loadedProfile, students, studentId]);

  // Display names are resolved from live collections; denormalised names are a fallback only.
  const classLabel = useMemo(() => {
    if (!studentProfile) return { className: null, streamName: null };
    const stream = (classStreams || []).find((s) => String(s.id) === String(studentProfile.current_class_stream_id));
    const klass = stream ? (classes || []).find((c) => String(c.id) === String(stream.class_id)) : undefined;
    return {
      className: klass?.name ?? stream?.class_name ?? studentProfile.current_class_name ?? null,
      streamName: stream?.name ?? studentProfile.current_class_stream_name ?? null,
    };
  }, [studentProfile, classes, classStreams]);

  const primaryGuardian = studentProfile?.primary_guardian ?? studentProfile?.guardians?.[0] ?? null;

  const bioDataFields: EntityFieldConfig[] = useMemo(() => [
    { name: 'first_name', label: t('students.detail.firstName', 'First Name'), required: true },
    { name: 'middle_name', label: t('students.detail.middleName', 'Middle Name') },
    { name: 'last_name', label: t('students.detail.lastName', 'Last Name'), required: true },
    {
      name: 'gender',
      label: t('students.detail.gender', 'Gender'),
      type: 'select',
      required: true,
      options: Object.values(PersonGender).map((value) => ({ value, label: value })),
    },
    { name: 'date_of_birth', label: t('students.detail.dateOfBirth', 'Date of Birth'), type: 'date' },
    { name: 'religion', label: t('students.detail.religion', 'Religion') },
    { name: 'email', label: t('students.detail.email', 'Email'), type: 'email' },
    { name: 'phone', label: t('students.detail.phone', 'Phone'), type: 'tel' },
    { name: 'address', label: t('students.detail.address', 'Address'), colSpan: 2 },
    { name: 'remarks', label: t('students.detail.remarks', 'Remarks/About'), type: 'textarea', colSpan: 2 },
  ], [t]);

  const bioDataInitial = useMemo(() => {
    const initial: Record<string, string> = {};
    if (!studentProfile) return initial;
    for (const field of BIO_DATA_FIELDS) {
      const value = studentProfile[field];
      initial[field] = value == null ? '' : String(value);
    }
    if (initial.date_of_birth) initial.date_of_birth = initial.date_of_birth.slice(0, 10);
    return initial;
  }, [studentProfile]);

  // EntityForm shows the toast and keeps the dialog open when this throws.
  const handleBioDataSave = useCallback(async (values: Record<string, unknown>) => {
    if (!studentProfile) return;
    const patch: Record<string, unknown> = {};
    for (const field of BIO_DATA_FIELDS) {
      const value = values[field];
      patch[field] = value === '' || value === undefined ? null : value;
    }
    await updateStudent(String(studentProfile.id), patch);
    setLoadedProfile({ ...studentProfile, ...patch } as StudentProfile);
  }, [studentProfile, updateStudent]);

  // Photo upload — size/type-guarded data URL persisted on the student record (2.6)
  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file
    if (!file || !studentProfile) return;
    try {
      setIsUploadingPhoto(true);
      const dataUrl = await fileToImageDataUrl(file);
      await updateStudent(String(studentProfile.id ?? studentId), { photo_path: dataUrl });
      setLoadedProfile({ ...studentProfile, photo_path: dataUrl });
      toast.showSuccess('Profile photo updated.');
    } catch (error) {
      if (error instanceof ImageUploadError) {
        toast.showWarning(error.message);
      } else {
        toast.showError('Failed to update profile photo.');
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (isLoadingPage && !studentProfile) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /> <span className="ml-2">Loading student details...</span></div>;
  }

  if (!studentProfile) {
    return <Card title="Error"><p>Student not found.</p></Card>;
  }

  const {
    photo_path, first_name, last_name, admission_no,
    email, phone, remarks, date_of_birth, gender,
    address, religion,
    enrolled_subjects, payment_history
  } = studentProfile;
  const { className: current_class_name, streamName: current_class_stream_name } = classLabel;

  const fullName = [first_name, last_name].filter(Boolean).join(' ');

  const enrolledSubjectsColumns: DataGridColumn<EnrolledSubject>[] = [
    { key: 'courseName', header: 'Course Name', sortable: true, filterable: true, width: 200 },
    { key: 'professorInstructorName', header: 'Instructor', sortable: true, filterable: true, width: 180 },
    { key: 'status', header: 'Status', sortable: true, filterable: true, width: 120 },
  ];

  const paymentHistoryColumns: DataGridColumn<PaymentLogItem>[] = [
    { key: 'transactionId', header: 'Receipt No', sortable: true, filterable: true, width: 120 },
    {
      key: 'paymentDate',
      header: 'Date',
      sortable: true,
      filterable: true,
      width: 120,
      render: (_value, item) => new Date(item.paymentDate).toLocaleDateString()
    },
    {
      key: 'amount',
      header: 'Amount Paid (KES)',
      sortable: true,
      filterable: true,
      width: 150,
      render: (_value, item) => item.amount.toFixed(2)
    },
    { key: 'paymentMethod', header: 'Method', sortable: true, filterable: true, width: 120 },
    { key: 'description', header: 'Reference/Notes', sortable: true, filterable: true, width: 180 },
    {
      key: 'actions',
      header: 'Action',
      sortable: false,
      filterable: false,
      width: 100,
      sticky: 'right',
      render: () => <Button size="sm" variant="ghost" leftIcon={<PrinterIcon className="w-4 h-4"/>}>Receipt</Button>
    },
  ];

  const tabs = [
    {
      label: 'Student Bio',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <p><strong className="font-medium text-surface-foreground">Admission No:</strong> {admission_no}</p>
          <p><strong className="font-medium text-surface-foreground">Full Name:</strong> {fullName}</p>
          <p><strong className="font-medium text-surface-foreground">Date of Birth:</strong> {date_of_birth ? new Date(date_of_birth).toLocaleDateString() : 'N/A'}</p>
          <p><strong className="font-medium text-surface-foreground">Gender:</strong> {gender}</p>
          <p><strong className="font-medium text-surface-foreground">Class:</strong> {current_class_name || 'N/A'} - {current_class_stream_name || 'N/A'}</p>
          <p><strong className="font-medium text-surface-foreground">Primary Guardian:</strong> {primaryGuardian?.name || 'N/A'} ({primaryGuardian?.relationship_type || 'N/A'})</p>
          <p><strong className="font-medium text-surface-foreground">Guardian Phone:</strong> {primaryGuardian?.phone || 'N/A'}</p>
          <p><strong className="font-medium text-surface-foreground">Address:</strong> {address || 'N/A'}</p>
          <p><strong className="font-medium text-surface-foreground">Religion:</strong> {religion || 'N/A'}</p>
          <p className="md:col-span-2"><strong className="font-medium text-surface-foreground">Remarks/About:</strong> {remarks || 'N/A'}</p>
        </div>
      )
    },
    {
      label: 'Enrolled Subjects',
      content: <DataGrid
        columns={enrolledSubjectsColumns}
        data={enrolled_subjects || []}
        sortable
        filterable
        emptyState={{
          icon: <AcademicCapIcon className="h-12 w-12 text-surface-muted-fg" />,
          title: 'No subjects enrolled',
          description: 'This student is not enrolled in any subjects yet.',
        }}
      />
    },
    {
      label: 'Payment History',
      content: <DataGrid
        columns={paymentHistoryColumns}
        data={payment_history || []}
        sortable
        filterable
        emptyState={{
          icon: <CurrencyDollarIcon className="h-12 w-12 text-surface-muted-fg" />,
          title: 'No payment history found',
          description: 'No payments have been recorded for this student.',
        }}
      />
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b">
            <div>
                <h1 className="text-2xl font-bold text-surface-foreground">Student Profile</h1>
                <p className="text-sm text-surface-muted-fg">
                <Link to="/dashboard" className="hover:underline">Dashboard</Link> &gt;
                <Link to="/administration/students" className="hover:underline"> Students</Link> &gt; {fullName}
                </p>
            </div>
            <div className="flex space-x-2 mt-3 md:mt-0">
                <Button variant="primary" leftIcon={<CurrencyDollarIcon className="w-5 h-5"/>} as={Link} to={`/administration/students/${studentId}/financial`}>View Financials</Button>
                <Button variant="secondary" leftIcon={<EditIcon className="w-5 h-5" />} onClick={() => setIsEditingBioData(true)}>Edit Profile</Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <div className="text-center p-4">
                {photo_path ? (
                  <img src={photo_path} alt={fullName} className="w-32 h-32 rounded-full mx-auto mb-4 object-cover ring-4 ring-indigo-200 shadow-md" />
                ) : (
                  <UserCircleIcon className="w-32 h-32 text-gray-300 mx-auto mb-4" />
                )}
                <label className={`inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer ${isUploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                  <CameraIcon className="w-4 h-4" />
                  {isUploadingPhoto ? 'Uploading…' : 'Change photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={handlePhotoSelected} disabled={isUploadingPhoto} />
                </label>
                <h2 className="text-xl font-semibold text-surface-foreground">{fullName}</h2>
                <p className="text-sm text-surface-muted-fg">ID: {admission_no}</p>
                <p className="text-sm text-indigo-600 font-medium flex items-center justify-center mt-1">
                    <AcademicCapIcon className="w-4 h-4 mr-1" /> {current_class_name || 'N/A'} - {current_class_stream_name || 'N/A'}
                </p>
              </div>
              <div className="border-t px-4 py-3 space-y-2">
                {email && <p className="text-sm text-surface-muted-fg flex items-center"><EnvelopeIcon className="w-4 h-4 mr-2 text-surface-muted-fg"/> {email}</p>}
                {phone && <p className="text-sm text-surface-muted-fg flex items-center"><PhoneIcon className="w-4 h-4 mr-2 text-surface-muted-fg"/> {phone}</p>}
              </div>
              <div className="px-4 py-3 border-t flex space-x-2">
                  <Button size="sm" variant="ghost" leftIcon={<MessageIcon className="w-4 h-4" />}>Send Message</Button>
                  <Button size="sm" variant="ghost" leftIcon={<DownloadIcon className="w-4 h-4" />}>Report Card</Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Tabs tabs={tabs} />
          </div>
        </div>
      </Card>

      {isEditingBioData && (
        <EntityForm
          isOpen
          onClose={() => setIsEditingBioData(false)}
          title={t('students.detail.editBioData', 'Edit Bio Data')}
          description={[fullName, admission_no].filter(Boolean).join(' · ')}
          initialData={bioDataInitial}
          fields={bioDataFields}
          onSubmit={handleBioDataSave}
        />
      )}
    </div>
  );
};

export default StudentDetailPage;
