import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PlusIcon, AcademicCapIcon, BriefcaseIcon, DocumentTextIcon, ChartBarIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import type { StaffBioData } from '../data/types';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useCanonicalStaff } from '../data/useCanonicalStaff';

import { formatDate } from '@/utils/format';
import { formatMoney } from '@/domain/money';
export const StaffBioDataPageContent: React.FC = () => {

  const { staff, isLoading } = useCanonicalStaff();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'qualifications' | 'employment' | 'contracts' | 'performance'>('qualifications');

  // Live staff records mapped into the bio-data display shape.
  const staffBioData: StaffBioData[] = useMemo(() => {
    return staff.map(s => ({
      id: String(s.id),
      staff_id: s.employee_number || '',
      name: s.display_name || [s.given_name, s.family_name].filter(Boolean).join(' ').trim() || 'Unnamed',
      designation: s.job_title || '',
      department: s.department || '',
      date_of_birth: s.date_of_birth || '',
      gender: s.gender || '',
      marital_status: '',
      blood_group: '',
      phone: s.phone || '',
      email: s.email || '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relation: '',
      // Sub-records are not tracked per-staff yet; their tabs render empty states below.
      qualifications: [],
      employment_history: [],
      contracts: [],
      performance_reviews: [],
      created_at: s.created_at || '',
    }));
  }, [staff]);

  const departments = useMemo(
    () => Array.from(new Set(staffBioData.map(s => s.department).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [staffBioData]
  );

  const filteredStaff = useMemo(() => {
    let filtered = staffBioData;

    if (selectedDepartment) {
      filtered = filtered.filter(s => s.department === selectedDepartment);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.staff_id.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [staffBioData, selectedDepartment, searchTerm]);

  // Resolve the selected member from live data so edits stay fresh.
  const selectedStaff = useMemo(
    () => (selectedStaffId ? staffBioData.find(s => s.id === selectedStaffId) ?? null : null),
    [staffBioData, selectedStaffId]
  );

  if (isLoading && staffBioData.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading staff bio data...</span>
      </div>
    );
  }

  const renderDetailValue = (value: string) => value || '—';

  return (
    <div className="p-6">
      <PageHeaderWithTabs
        title="Staff Bio Data & Records"
        info="View and manage complete staff bio data including qualifications, employment history, contracts, and performance reviews. Select a staff member to view detailed records."
      />

      {!selectedStaff ? (
        <Card>
          {/* Filters */}
          <div className="mb-4 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-surface-foreground mb-1">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDepartment(e.target.value)}
                className="w-full border border-surface-border rounded-md px-3 py-2"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
              <input
                type="text"
                placeholder="Staff name, ID..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full border border-surface-border rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* Staff List */}
          <div className="space-y-3">
            {filteredStaff.map(staff => (
              <div
                key={staff.id}
                className="p-4 border border-surface-border rounded-lg hover:bg-surface-muted cursor-pointer"
                onClick={() => setSelectedStaffId(staff.id)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-surface-foreground">{staff.name}</h4>
                    <p className="text-sm text-surface-muted-fg">
                      {[staff.staff_id, staff.designation, staff.department].filter(Boolean).join(' | ') || '—'}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
            {filteredStaff.length === 0 && (
              <div className="py-8 text-center text-surface-muted-fg">
                No staff records found.
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <Button onClick={() => setSelectedStaffId(null)} variant="secondary">
              ← Back to Staff List
            </Button>
            <h2 className="text-xl font-bold text-surface-foreground">{selectedStaff.name}</h2>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-surface-border">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('qualifications')}
                className={`pb-2 px-4 font-medium ${activeTab === 'qualifications' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-surface-muted-fg'}`}
              >
                <AcademicCapIcon className="w-4 h-4 inline mr-1" />
                Qualifications
              </button>
              <button
                onClick={() => setActiveTab('employment')}
                className={`pb-2 px-4 font-medium ${activeTab === 'employment' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-surface-muted-fg'}`}
              >
                <BriefcaseIcon className="w-4 h-4 inline mr-1" />
                Employment History
              </button>
              <button
                onClick={() => setActiveTab('contracts')}
                className={`pb-2 px-4 font-medium ${activeTab === 'contracts' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-surface-muted-fg'}`}
              >
                <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                Contracts
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`pb-2 px-4 font-medium ${activeTab === 'performance' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-surface-muted-fg'}`}
              >
                <ChartBarIcon className="w-4 h-4 inline mr-1" />
                Performance Reviews
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mb-6 p-4 bg-surface-muted border border-surface-border rounded-lg">
            <h3 className="font-semibold text-surface-foreground mb-2">Basic Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="font-medium">Staff ID:</span> {renderDetailValue(selectedStaff.staff_id)}</div>
              <div><span className="font-medium">Designation:</span> {renderDetailValue(selectedStaff.designation)}</div>
              <div><span className="font-medium">Department:</span> {renderDetailValue(selectedStaff.department)}</div>
              <div><span className="font-medium">Date Joined:</span> {formatDate(selectedStaff.created_at)}</div>
              <div><span className="font-medium">Gender:</span> {renderDetailValue(selectedStaff.gender)}</div>
              <div><span className="font-medium">Phone:</span> {renderDetailValue(selectedStaff.phone)}</div>
              <div><span className="font-medium">Email:</span> {renderDetailValue(selectedStaff.email)}</div>
              <div><span className="font-medium">Address:</span> {renderDetailValue(selectedStaff.address)}</div>
            </div>
          </div>

          {activeTab === 'qualifications' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-surface-foreground">Qualifications</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Qualification
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.qualifications.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg py-4">No qualification records available for this staff member yet.</p>
                ) : selectedStaff.qualifications.map(qual => (
                  <div key={qual.id} className="p-4 border border-surface-border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-surface-foreground">{qual.degree}</h4>
                        <p className="text-sm text-surface-muted-fg">{qual.institution} | {qual.year}</p>
                        <p className="text-xs text-surface-muted-fg">Field: {qual.field}</p>
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
                <h3 className="text-lg font-semibold text-surface-foreground">Employment History</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Employment
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.employment_history.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg py-4">No employment history records available for this staff member yet.</p>
                ) : selectedStaff.employment_history.map(emp => (
                  <div key={emp.id} className="p-4 border border-surface-border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-surface-foreground">{emp.position}</h4>
                        <p className="text-sm text-surface-muted-fg">{emp.organization}</p>
                        <p className="text-xs text-surface-muted-fg">
                          {formatDate(emp.start_date)} - {emp.end_date ? formatDate(emp.end_date) : 'Present'}
                        </p>
                        {emp.reason_for_leaving && (
                          <p className="text-xs text-surface-muted-fg mt-1">Reason: {emp.reason_for_leaving}</p>
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
                <h3 className="text-lg font-semibold text-surface-foreground">Contracts</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Contract
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.contracts.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg py-4">No contract records available for this staff member yet.</p>
                ) : selectedStaff.contracts.map(contract => (
                  <div key={contract.id} className="p-4 border border-surface-border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-surface-foreground">{contract.contract_type}</h4>
                        <p className="text-sm text-surface-muted-fg">
                          {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                        </p>
                        <p className="text-sm text-surface-foreground font-semibold">{formatMoney(contract.salary, 'KES')}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          contract.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-surface-accent text-surface-foreground'
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
                <h3 className="text-lg font-semibold text-surface-foreground">Performance Reviews</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Review
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStaff.performance_reviews.length === 0 ? (
                  <p className="text-sm text-surface-muted-fg py-4">No performance reviews available for this staff member yet.</p>
                ) : selectedStaff.performance_reviews.map(review => (
                  <div key={review.id} className="p-4 border border-surface-border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-surface-foreground">{review.review_period}</h4>
                        <p className="text-sm text-surface-muted-fg">Rating: {review.rating}/5.0</p>
                        <p className="text-sm text-surface-muted-fg">Reviewer: {review.reviewer}</p>
                        <p className="text-sm text-surface-muted-fg">Date: {formatDate(review.date)}</p>
                        <p className="text-sm text-surface-foreground mt-2 italic">"{review.comments}"</p>
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
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StaffBioDataPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StaffBioDataPage;
