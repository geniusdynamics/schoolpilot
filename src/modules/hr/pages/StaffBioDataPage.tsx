import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import { UserIcon, PlusIcon, AcademicCapIcon, BriefcaseIcon, DocumentTextIcon, ChartBarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { initialMockStaffBioData } from '../data/mockData';
import type { StaffBioData, Qualification, EmploymentHistory, Contract, PerformanceReview } from '../data/types';

export const StaffBioDataPageContent: React.FC = () => {
  const { t } = useTranslation('hr');
  const { loading } = useAppData();

  const [selectedStaff, setSelectedStaff] = useState<StaffBioData | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'qualifications' | 'employment' | 'contracts' | 'performance'>('qualifications');

  // Use centralized mock data (in production, this would come from useAppData)
  const mockStaffBioData: StaffBioData[] = useMemo(() => {
    let filtered = initialMockStaffBioData;

    if (selectedDepartment) {
      filtered = filtered.filter(s => s.department === selectedDepartment);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        (s.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.staff_id?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedDepartment, searchTerm]);

  const departments = ['Academics', 'Sports', 'Administration', 'Finance', 'HR', 'Library'];

  if (loading && mockStaffBioData.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading staff bio data...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Staff Bio Data & Records</h1>
      </div>
      
      {!selectedStaff ? (
        <Card>
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex items-start gap-3">
              <UserIcon className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-indigo-800">Comprehensive Staff Records</h3>
                <p className="text-sm text-indigo-700 mt-1">
                  View and manage complete staff bio data including qualifications, employment history, 
                  contracts, and performance reviews. Select a staff member to view detailed records.
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Staff name, ID..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* Staff List */}
          <div className="space-y-3">
            {mockStaffBioData.map(staff => (
              <div
                key={staff.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedStaff(staff)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-800">{staff.name}</h4>
                    <p className="text-sm text-gray-600">{staff.staff_id} | {staff.designation} | {staff.department}</p>
                  </div>
                  <Button size="sm" variant="secondary">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Button onClick={() => setSelectedStaff(null)} variant="secondary">
              ← Back to Staff List
            </Button>
            <h2 className="text-xl font-bold text-gray-800">{selectedStaff.name}</h2>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('qualifications')}
                className={`pb-2 px-4 font-medium ${activeTab === 'qualifications' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              >
                <AcademicCapIcon className="w-4 h-4 inline mr-1" />
                Qualifications
              </button>
              <button
                onClick={() => setActiveTab('employment')}
                className={`pb-2 px-4 font-medium ${activeTab === 'employment' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              >
                <BriefcaseIcon className="w-4 h-4 inline mr-1" />
                Employment History
              </button>
              <button
                onClick={() => setActiveTab('contracts')}
                className={`pb-2 px-4 font-medium ${activeTab === 'contracts' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              >
                <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                Contracts
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`pb-2 px-4 font-medium ${activeTab === 'performance' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
              >
                <ChartBarIcon className="w-4 h-4 inline mr-1" />
                Performance Reviews
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Basic Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="font-medium">Staff ID:</span> {selectedStaff.staff_id}</div>
              <div><span className="font-medium">Designation:</span> {selectedStaff.designation}</div>
              <div><span className="font-medium">Department:</span> {selectedStaff.department}</div>
              <div><span className="font-medium">Date of Birth:</span> {new Date(selectedStaff.date_of_birth).toLocaleDateString()}</div>
              <div><span className="font-medium">Gender:</span> {selectedStaff.gender}</div>
              <div><span className="font-medium">Marital Status:</span> {selectedStaff.marital_status}</div>
              <div><span className="font-medium">Blood Group:</span> {selectedStaff.blood_group}</div>
              <div><span className="font-medium">Phone:</span> {selectedStaff.phone}</div>
              <div><span className="font-medium">Email:</span> {selectedStaff.email}</div>
              <div className="col-span-2 md:col-span-3"><span className="font-medium">Address:</span> {selectedStaff.address}</div>
              <div><span className="font-medium">Emergency Contact:</span> {selectedStaff.emergency_contact_name}</div>
              <div><span className="font-medium">Emergency Phone:</span> {selectedStaff.emergency_contact_phone}</div>
              <div><span className="font-medium">Relation:</span> {selectedStaff.emergency_contact_relation}</div>
            </div>
          </div>

          {activeTab === 'qualifications' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Qualifications</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Qualification
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.qualifications.map(qual => (
                  <div key={qual.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{qual.degree}</h4>
                        <p className="text-sm text-gray-600">{qual.institution} | {qual.year}</p>
                        <p className="text-xs text-gray-500">Field: {qual.field}</p>
                      </div>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'employment' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Employment History</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Employment
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.employment_history.map(emp => (
                  <div key={emp.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{emp.position}</h4>
                        <p className="text-sm text-gray-600">{emp.organization}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(emp.start_date).toLocaleDateString()} - {emp.end_date ? new Date(emp.end_date).toLocaleDateString() : 'Present'}
                        </p>
                        {emp.reason_for_leaving && (
                          <p className="text-xs text-gray-500 mt-1">Reason: {emp.reason_for_leaving}</p>
                        )}
                      </div>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'contracts' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Contracts</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Contract
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.contracts.map(contract => (
                  <div key={contract.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{contract.contract_type}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-700 font-semibold">KES {contract.salary.toLocaleString()}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contract.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      </div>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Performance Reviews</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Review
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.performance_reviews.map(review => (
                  <div key={review.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{review.review_period}</h4>
                        <p className="text-sm text-gray-600">Rating: {review.rating}/5.0</p>
                        <p className="text-sm text-gray-600">Reviewer: {review.reviewer}</p>
                        <p className="text-sm text-gray-600">Date: {new Date(review.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-700 mt-2 italic">"{review.comments}"</p>
                      </div>
                      <Button size="sm" variant="secondary">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
const StaffBioDataPage: React.FC = () => (
  <div className="space-y-6">
    <StaffBioDataPageContent />
  </div>
);

export default StaffBioDataPage;
