import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '@/contexts/AppDataContext';
import { StudentDetailProfile, StudentPaymentLogItem } from '@/types';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Tabs from '@/components/ui/Tabs';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import { UserCircleIcon, AcademicCapIcon, EnvelopeIcon, PhoneIcon, DownloadIcon, MessageIcon, EditIcon, CurrencyDollarIcon, PrinterIcon } from '@/components/ui/icons';

const StudentDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const { getStudentDetailsById, loading } = useAppData();
  const [studentProfile, setStudentProfile] = useState<StudentDetailProfile | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (studentId) {
      setIsLoadingPage(true);
      getStudentDetailsById(studentId)
        .then(data => {
          if (isMounted) {
            setStudentProfile(data);
          }
        })
        .catch(() => {
          if (isMounted) {
            setStudentProfile(null);
          }
        })
        .finally(() => {
            if (isMounted) {
                setIsLoadingPage(false);
            }
        });
    } else {
        if (isMounted) {
            setStudentProfile(null);
            setIsLoadingPage(false);
        }
    }
    return () => {
        isMounted = false;
    };
  }, [studentId, getStudentDetailsById]);

  if (isLoadingPage) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /> <span className="ml-2">Loading student details...</span></div>;
  }

  if (!studentProfile) {
    return <Card title="Error"><p>Student not found.</p></Card>;
  }

  const {
    photo_path, first_name, last_name, admission_no,
    current_class_name, current_class_stream_name, email, phone,
    primary_guardian, remarks, date_of_birth, gender,
    address, religion,
    enrolled_subjects, payment_history
  } = studentProfile;

  const fullName = `${first_name} ${last_name}`;

  const enrolledSubjectsColumns = [
    { header: 'Course Name', accessor: 'courseName' as keyof typeof enrolled_subjects[0] },
    { header: 'Instructor', accessor: 'professorInstructorName' as keyof typeof enrolled_subjects[0] },
    { header: 'Status', accessor: 'status' as keyof typeof enrolled_subjects[0] },
  ];

  const paymentHistoryColumns = [
    { header: 'Receipt No', accessor: 'transactionId' as keyof StudentPaymentLogItem },
    { header: 'Date', accessor: 'paymentDate' as keyof StudentPaymentLogItem, render: (item: StudentPaymentLogItem) => new Date(item.paymentDate).toLocaleDateString() },
    { header: 'Amount Paid (KES)', accessor: 'amount' as keyof StudentPaymentLogItem, render: (item: StudentPaymentLogItem) => item.amount.toFixed(2) },
    { header: 'Method', accessor: 'paymentMethod' as keyof StudentPaymentLogItem },
    { header: 'Reference/Notes', accessor: 'description' as keyof StudentPaymentLogItem },
    { header: 'Action', accessor: 'id' as keyof StudentPaymentLogItem, render: (item: StudentPaymentLogItem) => <Button size="sm" variant="ghost" leftIcon={<PrinterIcon className="w-4 h-4"/>}>Receipt</Button> },
  ];

  const tabs = [
    {
      label: 'Student Bio',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <p><strong className="font-medium text-gray-700">Admission No:</strong> {admission_no}</p>
          <p><strong className="font-medium text-gray-700">Full Name:</strong> {fullName}</p>
          <p><strong className="font-medium text-gray-700">Date of Birth:</strong> {date_of_birth ? new Date(date_of_birth).toLocaleDateString() : 'N/A'}</p>
          <p><strong className="font-medium text-gray-700">Gender:</strong> {gender}</p>
          <p><strong className="font-medium text-gray-700">Class:</strong> {current_class_name || 'N/A'} - {current_class_stream_name || 'N/A'}</p>
          <p><strong className="font-medium text-gray-700">Primary Guardian:</strong> {primary_guardian?.name || 'N/A'} ({primary_guardian?.relationship_type || 'N/A'})</p>
          <p><strong className="font-medium text-gray-700">Guardian Phone:</strong> {primary_guardian?.phone || 'N/A'}</p>
          <p><strong className="font-medium text-gray-700">Address:</strong> {address || 'N/A'}</p>
          <p><strong className="font-medium text-gray-700">Religion:</strong> {religion || 'N/A'}</p>
          <p className="md:col-span-2"><strong className="font-medium text-gray-700">Remarks/About:</strong> {remarks || 'N/A'}</p>
        </div>
      )
    },
    {
      label: 'Enrolled Subjects',
      content: <Table columns={enrolledSubjectsColumns} data={enrolled_subjects || []} emptyStateMessage="No subjects enrolled." />
    },
    {
      label: 'Payment History',
      content: <Table columns={paymentHistoryColumns} data={payment_history || []} emptyStateMessage="No payment history found." />
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Student Profile</h1>
                <p className="text-sm text-gray-500">
                <Link to="/dashboard" className="hover:underline">Dashboard</Link> &gt;
                <Link to="/administration/students" className="hover:underline"> Students</Link> &gt; {fullName}
                </p>
            </div>
            <div className="flex space-x-2 mt-3 md:mt-0">
                <Button variant="primary" leftIcon={<CurrencyDollarIcon className="w-5 h-5"/>} as={Link} to={`/administration/students/${studentId}/financial`}>View Financials</Button>
                <Button variant="secondary" leftIcon={<EditIcon className="w-5 h-5" />} onClick={() => {/* TODO: Navigate to edit student page */}}>Edit Profile</Button>
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
                <h2 className="text-xl font-semibold text-gray-800">{fullName}</h2>
                <p className="text-sm text-gray-500">ID: {admission_no}</p>
                <p className="text-sm text-indigo-600 font-medium flex items-center justify-center mt-1">
                    <AcademicCapIcon className="w-4 h-4 mr-1" /> {current_class_name || 'N/A'} - {current_class_stream_name || 'N/A'}
                </p>
              </div>
              <div className="border-t px-4 py-3 space-y-2">
                {email && <p className="text-sm text-gray-600 flex items-center"><EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400"/> {email}</p>}
                {phone && <p className="text-sm text-gray-600 flex items-center"><PhoneIcon className="w-4 h-4 mr-2 text-gray-400"/> {phone}</p>}
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
    </div>
  );
};

export default StudentDetailPage;