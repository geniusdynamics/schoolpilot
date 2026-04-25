import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import { UserIcon, PlusIcon, HeartIcon, PhoneIcon, DocumentTextIcon, AcademicCapIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { StudentBioData } from '../data/types';

const StudentBioDataPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const { studentBioData, loading } = useAppData();

  const [selectedStudent, setSelectedStudent] = useState<StudentBioData | null>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'medical' | 'emergency' | 'documents' | 'basic'>('basic');

  const mockStudentBioData: StudentBioData[] = useMemo(() => {
    let filtered = studentBioData || [];

    if (selectedClass) {
      filtered = filtered.filter(s => s.class_name === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.student_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [selectedClass, searchTerm]);

  const classes = ['Grade 10', 'Grade 9', 'Grade 8', 'Grade 7'];

  if (loading && mockStudentBioData.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">{t('studentBioData.loading', 'Loading student bio data...')}</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('studentBioData.title', 'Student Bio Data Management')}</h1>
      </div>
      
      {!selectedStudent ? (
        <Card>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <UserIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800">{t('studentBioData.profiles', 'Comprehensive Student Profiles')}</h3>
                <p className="text-sm text-blue-700 mt-1">
                  {t('studentBioData.description', 'View and manage complete student bio data including emergency contacts, medical history, allergies, and documents.')}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Student name, ID..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* Student List */}
          <div className="space-y-3">
            {mockStudentBioData.map(student => (
              <div
                key={student.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedStudent(student)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-800">{student.name}</h4>
                    <p className="text-sm text-gray-600">{student.student_id} | {student.class_name} - {student.section}</p>
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
            <Button onClick={() => setSelectedStudent(null)} variant="secondary">
              ← {t('studentBioData.backToStudents', 'Back to Students')}
            </Button>
            <h2 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h2>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('basic')}
                className={`pb-2 px-4 font-medium ${activeTab === 'basic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                <UserIcon className="w-4 h-4 inline mr-1" />
                {t('studentBioData.basicInfo', 'Basic Info')}
              </button>
              <button
                onClick={() => setActiveTab('medical')}
                className={`pb-2 px-4 font-medium ${activeTab === 'medical' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                <HeartIcon className="w-4 h-4 inline mr-1" />
                {t('studentBioData.medical', 'Medical')}
              </button>
              <button
                onClick={() => setActiveTab('emergency')}
                className={`pb-2 px-4 font-medium ${activeTab === 'emergency' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                <PhoneIcon className="w-4 h-4 inline mr-1" />
                {t('studentBioData.emergencyContacts', 'Emergency')}
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`pb-2 px-4 font-medium ${activeTab === 'documents' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
              >
                <DocumentTextIcon className="w-4 h-4 inline mr-1" />
                Documents
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'basic' && (
            <div>
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="font-medium">Student ID:</span> {selectedStudent.student_id}</div>
                  <div><span className="font-medium">Class/Section:</span> {selectedStudent.class_name} - {selectedStudent.section}</div>
                  <div><span className="font-medium">Roll Number:</span> {selectedStudent.roll_number}</div>
                  <div><span className="font-medium">Date of Birth:</span> {new Date(selectedStudent.date_of_birth).toLocaleDateString()}</div>
                  <div><span className="font-medium">Gender:</span> {selectedStudent.gender}</div>
                  <div><span className="font-medium">Blood Group:</span> {selectedStudent.blood_group}</div>
                  <div><span className="font-medium">Nationality:</span> {selectedStudent.nationality}</div>
                  <div><span className="font-medium">Religion:</span> {selectedStudent.religion}</div>
                  <div><span className="font-medium">Mother Tongue:</span> {selectedStudent.mother_tongue}</div>
                  <div><span className="font-medium">Phone:</span> {selectedStudent.phone}</div>
                  <div><span className="font-medium">Email:</span> {selectedStudent.email}</div>
                  <div className="col-span-2 md:col-span-3"><span className="font-medium">Address:</span> {selectedStudent.address}, {selectedStudent.city}, {selectedStudent.state} - {selectedStudent.postal_code}</div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-4">Parent/Guardian Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="font-medium">Father:</span> {selectedStudent.father_name}</div>
                  <div><span className="font-medium">Father Phone:</span> {selectedStudent.father_phone}</div>
                  <div><span className="font-medium">Father Occupation:</span> {selectedStudent.father_occupation}</div>
                  <div><span className="font-medium">Mother:</span> {selectedStudent.mother_name}</div>
                  <div><span className="font-medium">Mother Phone:</span> {selectedStudent.mother_phone}</div>
                  <div><span className="font-medium">Mother Occupation:</span> {selectedStudent.mother_occupation}</div>
                  {selectedStudent.guardian_name && (
                    <>
                      <div><span className="font-medium">Guardian:</span> {selectedStudent.guardian_name}</div>
                      <div><span className="font-medium">Guardian Phone:</span> {selectedStudent.guardian_phone}</div>
                      <div><span className="font-medium">Relationship:</span> {selectedStudent.guardian_relationship}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'medical' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Medical Conditions</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Condition
                </Button>
              </div>
              <div className="space-y-3 mb-6">
                {selectedStudent.medical_conditions.length > 0 ? (
                  selectedStudent.medical_conditions.map(condition => (
                    <div key={condition.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{condition.condition}</h4>
                          <p className="text-sm text-gray-600">Diagnosed: {new Date(condition.diagnosis_date).toLocaleDateString()}</p>
                          <p className="text-sm text-gray-600">Severity: {condition.severity}</p>
                          <p className="text-sm text-gray-600">Treatment: {condition.treatment}</p>
                          {condition.notes && <p className="text-sm text-gray-500 mt-1">Notes: {condition.notes}</p>}
                        </div>
                        <Button size="sm" variant="secondary">Edit</Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No medical conditions recorded</p>
                )}
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">Allergies</h3>
                {selectedStudent.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.allergies.map((allergy, index) => (
                      <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-red-600">No allergies recorded</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'emergency' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Emergency Contacts</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Contact
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStudent.emergency_contacts.map(contact => (
                  <div key={contact.id} className={`p-4 border rounded-lg ${contact.is_primary ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800">{contact.name}</h4>
                          {contact.is_primary && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">Primary</span>}
                        </div>
                        <p className="text-sm text-gray-600">Relationship: {contact.relationship}</p>
                        <p className="text-sm text-gray-600">Phone: {contact.phone}</p>
                        <p className="text-sm text-gray-600">Address: {contact.address}</p>
                      </div>
                      <Button size="sm" variant="secondary">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Documents</h3>
                <Button size="sm" variant="secondary">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Document
                </Button>
              </div>
              <div className="space-y-3">
                {selectedStudent.documents.map(doc => (
                  <div key={doc.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{doc.document_type}</h4>
                        <p className="text-sm text-gray-600">Number: {doc.document_number}</p>
                        <p className="text-sm text-gray-600">Issued: {new Date(doc.issue_date).toLocaleDateString()}</p>
                        {doc.expiry_date && <p className="text-sm text-gray-600">Expires: {new Date(doc.expiry_date).toLocaleDateString()}</p>}
                        <p className="text-sm text-gray-600">Authority: {doc.issuing_authority}</p>
                      </div>
                      <Button size="sm" variant="secondary">Edit</Button>
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

export default StudentBioDataPage;
