// ABOUTME: Portal profile page showing user profile, contact info, and academic details
// ABOUTME: Displays student-specific info (class, stream) or parent-specific info (linked children)

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import {
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  UsersIcon,
  CogIcon,
} from '@/components/ui/icons';

type UserRole = 'student' | 'parent' | 'guardian';

interface StudentInfo {
  admissionNo: string;
  fullName: string;
  className: string;
  streamName: string;
  enrollmentDate: string;
  academicYear: string;
}

interface ChildInfo {
  id: string;
  fullName: string;
  admissionNo: string;
  className: string;
  streamName: string;
}

interface UserProfile {
  role: UserRole;
  displayName: string;
  email: string;
  phone: string;
  address: string;
  photoPath?: string | null;
  student?: StudentInfo | null;
  children?: ChildInfo[];
}

// Mock profile data
const mockProfile: UserProfile = {
  role: 'student',
  displayName: 'John Doe',
  email: 'john.doe@school.edu',
  phone: '+254 700 123 456',
  address: '123 School Lane, Nairobi, Kenya',
  photoPath: null,
  student: {
    admissionNo: 'ADM-2026-001',
    fullName: 'John Doe',
    className: 'Form 1',
    streamName: 'A',
    enrollmentDate: '2026-01-06',
    academicYear: '2026',
  },
  children: [],
};

const mockParentProfile: UserProfile = {
  role: 'parent',
  displayName: 'Jane Doe',
  email: 'jane.doe@email.com',
  phone: '+254 700 789 012',
  address: '123 School Lane, Nairobi, Kenya',
  photoPath: null,
  student: null,
  children: [
    {
      id: 'STU001',
      fullName: 'John Doe',
      admissionNo: 'ADM-2026-001',
      className: 'Form 1',
      streamName: 'A',
    },
    {
      id: 'STU002',
      fullName: 'Sarah Doe',
      admissionNo: 'ADM-2024-015',
      className: 'Form 3',
      streamName: 'B',
    },
  ],
};

const roleLabels: Record<UserRole, string> = {
  student: 'Student',
  parent: 'Parent/Guardian',
  guardian: 'Guardian',
};

export const PortalProfileContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const [profile, setProfile] = useState<UserProfile>(mockProfile);
  const [isEditing, setIsEditing] = useState(false);

  // Toggle between student and parent profiles for demonstration
  const switchRole = (role: UserRole) => {
    if (role === 'parent') {
      setProfile(mockParentProfile);
    } else {
      setProfile(mockProfile);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    // In a real app, this would save to the backend
  };

  const avatarInitials = profile.displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Role Switcher (for demonstration) */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">View as:</span>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['student', 'parent'] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => switchRole(role)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                profile.role === role
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Profile Header Card */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6 px-6 py-6">
          {/* Avatar */}
          {profile.photoPath ? (
            <img
              src={profile.photoPath}
              alt={profile.displayName}
              className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-semibold shadow-md">
              {avatarInitials}
            </div>
          )}

          {/* Profile Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-semibold text-gray-900">{profile.displayName}</h1>
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-indigo-50 text-indigo-700">
                {roleLabels[profile.role]}
              </span>
              {profile.student && (
                <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-emerald-50 text-emerald-700">
                  {profile.student.className} {profile.student.streamName}
                </span>
              )}
            </div>
            {profile.student && (
              <p className="text-sm text-gray-500 mt-1">
                Admission: {profile.student.admissionNo} &middot; Since {new Date(profile.student.enrollmentDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? t('profile.saveProfile') : t('profile.editProfile')}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card title={t('profile.personalInfo')} className="border-slate-200 bg-white shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <UserCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-sm font-medium text-gray-900">{profile.displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium text-gray-900">{profile.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <GlobeAltIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm font-medium text-gray-900">{profile.address}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Academic Information (for students) */}
        {profile.student && (
          <Card title={t('profile.academicInfo')} className="border-slate-200 bg-white shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <AcademicCapIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Admission Number</p>
                  <p className="text-sm font-mono font-medium text-gray-900">{profile.student.admissionNo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AcademicCapIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Class & Stream</p>
                  <p className="text-sm font-medium text-gray-900">{profile.student.className} - {profile.student.streamName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AcademicCapIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Enrollment Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(profile.student.enrollmentDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <AcademicCapIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Academic Year</p>
                  <p className="text-sm font-medium text-gray-900">{profile.student.academicYear}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Linked Children (for parents/guardians) */}
        {profile.role !== 'student' && profile.children && profile.children.length > 0 && (
          <Card
            title={`Linked Children (${profile.children.length})`}
            className="border-slate-200 bg-white shadow-sm lg:col-span-2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {child.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{child.fullName}</p>
                    <p className="text-xs text-gray-500">{child.admissionNo}</p>
                    <p className="text-xs text-emerald-600 font-medium">{child.className} - {child.streamName}</p>
                  </div>
                  <UsersIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Settings Placeholder */}
      <Card title="Settings & Preferences" className="border-slate-200 bg-white shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <CogIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Notification Preferences</p>
                <p className="text-xs text-gray-500">Configure email and SMS notifications</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Configure</Button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <CogIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Language</p>
                <p className="text-xs text-gray-500">Current: English</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Change</Button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <CogIcon className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Change Password</p>
                <p className="text-xs text-gray-500">Update your account password</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

const PortalProfilePage: React.FC = () => {
  return <PortalProfileContent />;
};

export default PortalProfilePage;
