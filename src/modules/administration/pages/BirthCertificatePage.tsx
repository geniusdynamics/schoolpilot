import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DocumentTextIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

interface Student {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  section: string;
  roll_number: string;
  date_of_birth: string;
  gender: string;
  father_name: string;
  mother_name: string;
  birth_place: string;
  address: string;
}

export const BirthCertificateContent: React.FC = () => {
  const { t } = useTranslation('administration');
  const { loading } = useAppData();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Mock data for students (in production, this would come from useAppData)
  const mockStudents: Student[] = useMemo(() => {
    const students: Student[] = [
      {
        id: 'stu-1',
        student_id: 'STU-001',
        name: 'John Doe',
        class_name: 'Grade 10',
        section: 'A',
        roll_number: '001',
        date_of_birth: '2008-05-20',
        gender: 'Male',
        father_name: 'Robert Doe',
        mother_name: 'Mary Doe',
        birth_place: 'City Hospital, City',
        address: '123 Education Lane, City'
      },
      {
        id: 'stu-2',
        student_id: 'STU-002',
        name: 'Jane Smith',
        class_name: 'Grade 10',
        section: 'B',
        roll_number: '002',
        date_of_birth: '2008-08-15',
        gender: 'Female',
        father_name: 'William Smith',
        mother_name: 'Elizabeth Smith',
        birth_place: 'City General Hospital, City',
        address: '456 Academic Road, City'
      },
      {
        id: 'stu-3',
        student_id: 'STU-003',
        name: 'Michael Johnson',
        class_name: 'Grade 9',
        section: 'A',
        roll_number: '001',
        date_of_birth: '2009-03-10',
        gender: 'Male',
        father_name: 'David Johnson',
        mother_name: 'Sarah Johnson',
        birth_place: 'Community Health Center, City',
        address: '789 School Street, City'
      }
    ];

    let filtered = students;

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

  const generateCertificate = (student: Student) => {
    setSelectedStudent(student);
  };

  const printCertificate = () => {
    window.print();
  };

  if (loading && mockStudents.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading students...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Birth Certificate</h1>
      </div>
      
      {!selectedStudent ? (
        <Card>
          <div className="mb-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="w-5 h-5 text-pink-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-pink-800">Birth Certificate Generation</h3>
                <p className="text-sm text-pink-700 mt-1">
                  Generate official birth certificates for students. 
                  Select a student to preview and print their birth certificate.
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
            {mockStudents.map(student => (
              <div
                key={student.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => generateCertificate(student)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-800">{student.name}</h4>
                    <p className="text-sm text-gray-600">{student.student_id} | {student.class_name} - {student.section}</p>
                  </div>
                  <Button size="sm" variant="secondary">
                    Generate Certificate
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
              ← Back to Students
            </Button>
            <div className="flex gap-2">
              <Button onClick={printCertificate} variant="secondary">
                <PrinterIcon className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="secondary">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Certificate Preview */}
          <div className="border-2 border-gray-300 p-8 bg-white" style={{ minHeight: '800px' }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">BIRTH CERTIFICATE</h1>
              <p className="text-gray-600">School Name Here</p>
              <p className="text-sm text-gray-500">Address Line 1, City, Country</p>
            </div>

            <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>Certificate No:</strong> BC-{new Date().getFullYear()}-{selectedStudent.student_id}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Date:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                This is to certify that <strong>{selectedStudent.name}</strong>, 
                <strong> {selectedStudent.gender}</strong>, was born on 
                <strong> {new Date(selectedStudent.date_of_birth).toLocaleDateString()}</strong> 
                at <strong>{selectedStudent.birth_place}</strong>.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                <strong>Child's Details:</strong>
              </p>
              <table className="w-full mt-2 border-collapse">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Name:</td>
                    <td className="py-2 px-4">{selectedStudent.name}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Gender:</td>
                    <td className="py-2 px-4">{selectedStudent.gender}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Date of Birth:</td>
                    <td className="py-2 px-4">{new Date(selectedStudent.date_of_birth).toLocaleDateString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Place of Birth:</td>
                    <td className="py-2 px-4">{selectedStudent.birth_place}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold">Address:</td>
                    <td className="py-2 px-4">{selectedStudent.address}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                <strong>Parent's Details:</strong>
              </p>
              <table className="w-full mt-2 border-collapse">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Father's Name:</td>
                    <td className="py-2 px-4">{selectedStudent.father_name}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold">Mother's Name:</td>
                    <td className="py-2 px-4">{selectedStudent.mother_name}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                This certificate is issued based on the school records and is for official purposes only.
              </p>
            </div>

            <div className="mt-12 flex justify-between">
              <div className="text-center">
                <div className="h-16 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">School Authority</p>
              </div>
              <div className="text-center">
                <div className="h-16 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">Principal</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                This is a computer-generated document and does not require a physical signature.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const BirthCertificatePage: React.FC = () => (
  <div className="space-y-6">
    <BirthCertificateContent />
  </div>
);

export default BirthCertificatePage;
