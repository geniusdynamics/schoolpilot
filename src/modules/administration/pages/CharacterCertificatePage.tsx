import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DocumentTextIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';

interface Student {
  id: string;
  student_id: string;
  name: string;
  class_name: string;
  section: string;
  roll_number: string;
  admission_date: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  address: string;
}

export const CharacterCertificateContent: React.FC = () => {

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
        admission_date: '2019-01-15',
        father_name: 'Robert Doe',
        mother_name: 'Mary Doe',
        date_of_birth: '2008-05-20',
        address: '123 Education Lane, City'
      },
      {
        id: 'stu-2',
        student_id: 'STU-002',
        name: 'Jane Smith',
        class_name: 'Grade 10',
        section: 'B',
        roll_number: '002',
        admission_date: '2019-01-15',
        father_name: 'William Smith',
        mother_name: 'Elizabeth Smith',
        date_of_birth: '2008-08-15',
        address: '456 Academic Road, City'
      },
      {
        id: 'stu-3',
        student_id: 'STU-003',
        name: 'Michael Johnson',
        class_name: 'Grade 9',
        section: 'A',
        roll_number: '001',
        admission_date: '2020-01-10',
        father_name: 'David Johnson',
        mother_name: 'Sarah Johnson',
        date_of_birth: '2009-03-10',
        address: '789 School Street, City'
      }
    ];

    let filtered = students;

    if (selectedClass) {
      filtered = filtered.filter(s => s.class_name === selectedClass);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        (s.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (s.student_id?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
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

  if (loading?.all && mockStudents.length === 0) {
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
        <h1 className="text-2xl font-bold text-surface-foreground">Character Certificate (C.C.)</h1>
      </div>
      
      {!selectedStudent ? (
        <Card>
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-800">Character Certificate Generation</h3>
                <p className="text-sm text-green-700 mt-1">
                  Generate official character certificates for students. 
                  Select a student to preview and print their character certificate.
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-surface-foreground mb-1">Class</label>
              <select
                value={selectedClass}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
                className="w-full border border-surface-border rounded-md px-3 py-2"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-surface-foreground mb-1">Search</label>
              <input
                type="text"
                placeholder="Student name, ID..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="w-full border border-surface-border rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* Student List */}
          <div className="space-y-3">
            {mockStudents.map(student => (
              <div
                key={student.id}
                className="p-4 border border-surface-border rounded-lg hover:bg-surface-muted cursor-pointer"
                onClick={() => generateCertificate(student)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-surface-foreground">{student.name}</h4>
                    <p className="text-sm text-surface-muted-fg">{student.student_id} | {student.class_name} - {student.section}</p>
                  </div>
                  <Button size="sm" variant="secondary">
                    Generate C.C.
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
              â† Back to Students
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
          <div className="border-2 border-surface-border p-8 bg-surface-card" style={{ minHeight: '800px' }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-surface-foreground mb-2">CHARACTER CERTIFICATE</h1>
              <p className="text-surface-muted-fg">School Name Here</p>
              <p className="text-sm text-surface-muted-fg">Address Line 1, City, Country</p>
            </div>

            <div className="mb-6 p-4 bg-surface-muted border border-surface-border">
              <p className="text-sm text-surface-foreground">
                <strong>Certificate No:</strong> CC-{new Date().getFullYear()}-{selectedStudent.student_id}
              </p>
              <p className="text-sm text-surface-foreground">
                <strong>Date:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-surface-foreground leading-relaxed">
                This is to certify that <strong>{selectedStudent.name}</strong>, son/daughter of 
                <strong> {selectedStudent.father_name}</strong> and <strong>{selectedStudent.mother_name}</strong>, 
                is a student of this institution studying in <strong>{selectedStudent.class_name} - {selectedStudent.section}</strong>.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-surface-foreground leading-relaxed">
                <strong>Student Details:</strong>
              </p>
              <table className="w-full mt-2 border-collapse">
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Student ID:</td>
                    <td className="py-2 px-4">{selectedStudent.student_id}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Date of Birth:</td>
                    <td className="py-2 px-4">{new Date(selectedStudent.date_of_birth).toLocaleDateString()}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Class/Section:</td>
                    <td className="py-2 px-4">{selectedStudent.class_name} - {selectedStudent.section}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Roll Number:</td>
                    <td className="py-2 px-4">{selectedStudent.roll_number}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-4 font-semibold">Admission Date:</td>
                    <td className="py-2 px-4">{new Date(selectedStudent.admission_date).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4 font-semibold">Address:</td>
                    <td className="py-2 px-4">{selectedStudent.address}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-6">
              <p className="text-surface-foreground leading-relaxed">
                To the best of my knowledge, the student bears a good moral character and has maintained 
                satisfactory conduct throughout his/her stay in this institution. He/She has been regular 
                in attendance and has shown satisfactory progress in studies.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-surface-foreground leading-relaxed">
                I have no hesitation in recommending this student for any course of study or employment 
                that he/she may wish to pursue.
              </p>
            </div>

            <div className="mt-12 flex justify-between">
              <div className="text-center">
                <div className="h-16 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-surface-muted-fg">Class Teacher</p>
              </div>
              <div className="text-center">
                <div className="h-16 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-surface-muted-fg">Principal</p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-surface-muted-fg">
                This is a computer-generated document and does not require a physical signature.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

const CharacterCertificatePage: React.FC = () => (
  <div className="space-y-6">
    <CharacterCertificateContent />
  </div>
);

export default CharacterCertificatePage;
