import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppData } from '@/hooks/useAppData';
import { Staff } from '@/types';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import { UserCircleIcon, EnvelopeIcon, PhoneIcon, EditIcon, BriefcaseIcon, BuildingOfficeIcon, CalendarIcon } from '@/components/ui/icons';

const StaffDetailPage: React.FC = () => {
  const { staffId } = useParams<{ staffId: string }>();
  const { staff, loading } = useAppData();
  const [staffMember, setStaffMember] = useState<Staff | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (staffId) {
      setIsLoadingPage(true);
      const foundStaff = staff.find(s => s.id === staffId);
      if (isMounted) {
        setStaffMember(foundStaff || null);
        setIsLoadingPage(false);
      }
    } else {
      if (isMounted) {
        setStaffMember(null);
        setIsLoadingPage(false);
      }
    }
    return () => {
      isMounted = false;
    };
  }, [staffId, staff]);

  if (isLoadingPage || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading staff details...</span>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <Card title="Error">
        <p>Staff member not found.</p>
      </Card>
    );
  }

  const {
    photo_path,
    first_name,
    last_name,
    staff_no,
    email,
    phone,
    department_name,
    designation_title,
    hod_of_department_name,
    is_active,
    created_at,
  } = staffMember;

  const fullName = `${first_name} ${last_name}`;

  const tabs = [
    {
      label: 'Staff Bio',
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <p>
            <strong className="font-medium text-gray-700">Staff No:</strong> {staff_no}
          </p>
          <p>
            <strong className="font-medium text-gray-700">Full Name:</strong> {fullName}
          </p>
          <p>
            <strong className="font-medium text-gray-700">Department:</strong>{' '}
            {department_name || 'N/A'}
          </p>
          <p>
            <strong className="font-medium text-gray-700">Designation:</strong>{' '}
            {designation_title || 'N/A'}
          </p>
          <p>
            <strong className="font-medium text-gray-700">Status:</strong>{' '}
            <span
              className={`px-2 py-1 rounded text-xs ${
                is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {is_active ? 'Active' : 'Inactive'}
            </span>
          </p>
          <p>
            <strong className="font-medium text-gray-700">Joined Date:</strong>{' '}
            {created_at ? new Date(created_at).toLocaleDateString() : 'N/A'}
          </p>
          <p>
            <strong className="font-medium text-gray-700">Email:</strong>{' '}
            {email || 'N/A'}
          </p>
          <p>
            <strong className="font-medium text-gray-700">Phone:</strong>{' '}
            {phone || 'N/A'}
          </p>
          {hod_of_department_name && (
            <p className="md:col-span-2">
              <strong className="font-medium text-gray-700">HOD Of:</strong>{' '}
              {hod_of_department_name}
            </p>
          )}
        </div>
      ),
    },
    {
      label: 'Employment History',
      content: (
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Employment History
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Employment history tracking will be implemented here.
          </p>
        </div>
      ),
    },
    {
      label: 'Assigned Classes/Subjects',
      content: (
        <div className="text-center py-12">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Class & Subject Assignments
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Class and subject assignments will be displayed here.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Staff Profile</h1>
            <p className="text-sm text-gray-500">
              <Link to="/dashboard" className="hover:underline">
                Dashboard
              </Link>{' '}
              &gt;
              <Link to="/administration/staff" className="hover:underline">
                {' '}
                Staff
              </Link>{' '}
              &gt; {fullName}
            </p>
          </div>
          <div className="flex space-x-2 mt-3 md:mt-0">
            <Button
              variant="secondary"
              leftIcon={<EditIcon className="w-5 h-5" />}
              onClick={() => {
                /* TODO: Navigate to edit staff page */
              }}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <div className="text-center p-4">
                {photo_path ? (
                  <img
                    src={photo_path}
                    alt={fullName}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover ring-4 ring-indigo-200 shadow-md"
                  />
                ) : (
                  <UserCircleIcon className="w-32 h-32 text-gray-300 mx-auto mb-4" />
                )}
                <h2 className="text-xl font-semibold text-gray-800">{fullName}</h2>
                <p className="text-sm text-gray-500">ID: {staff_no}</p>
                <p className="text-sm text-indigo-600 font-medium flex items-center justify-center mt-1">
                  <BriefcaseIcon className="w-4 h-4 mr-1" />{' '}
                  {designation_title || 'N/A'}
                </p>
                <p className="text-sm text-gray-500 flex items-center justify-center mt-1">
                  <BuildingOfficeIcon className="w-4 h-4 mr-1" />{' '}
                  {department_name || 'N/A'}
                </p>
              </div>
              <div className="border-t px-4 py-3 space-y-2">
                {email && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <EnvelopeIcon className="w-4 h-4 mr-2 text-gray-400" /> {email}
                  </p>
                )}
                {phone && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <PhoneIcon className="w-4 h-4 mr-2 text-gray-400" /> {phone}
                  </p>
                )}
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

export default StaffDetailPage;

export const StaffDetailContent = StaffDetailPage;
