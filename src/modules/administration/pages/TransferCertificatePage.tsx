import React, { useState, useMemo } from 'react';
import { useAppData } from '@/hooks/useAppData';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DocumentTextIcon, PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { TransferCertificateStudent } from '../data/types';

export const TransferCertificateContent: React.FC = () => {

  const { transferCertificateStudents, loading } = useAppData();

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<TransferCertificateStudent | null>(null);

  const mockStudents: TransferCertificateStudent[] = useMemo(() => {
    let filtered = transferCertificateStudents || [];

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

  const generateCertificate = (student: TransferCertificateStudent) => {
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
        <h1 className="text-2xl font-bold text-surface-foreground">Transfer Certificate (T.C.)</h1>
      </div>
      
      {!selectedStudent ? (
        <Card>
          <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-primary-800">Transfer Certificate Generation</h3>
                <p className="text-sm text-primary-700 mt-1">
                  Generate official transfer certificates for students leaving the school. 
                  Select a student to preview and print their transfer certificate.
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
                    Generate T.C.
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
              <h1 className="text-3xl font-bold text-surface-foreground mb-2">TRANSFER CERTIFICATE</h1>
              <p className="text-surface-muted-fg">School Name Here</p>
              <p className="text-sm text-surface-muted-fg">Address Line 1, City, Country</p>
            </div>

            <div className="mb-6 p-4 bg-surface-muted border border-surface-border">
              <p className="text-sm text-surface-foreground">
                <strong>Certificate No:</strong> TC-{new Date().getFullYear()}-{selectedStudent.student_id}
              </p>
              <p className="text-sm text-surface-foreground">
                <strong>Date:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-surface-foreground leading-relaxed">
                This is to certify that <strong>{selectedStudent.name}</strong>, son/daughter of 
                <strong> {selectedStudent.father_name}</strong> and <strong>{selectedStudent.mother_name}</strong>, 
                was a bonafide student of this institution.
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
                The student has cleared all dues to the school and has no outstanding obligations. 
                This certificate is issued for the purpose of admission to another educational institution.
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

const TransferCertificatePage: React.FC = () => (
  <div className="space-y-6">
    <TransferCertificateContent />
  </div>
);

export default TransferCertificatePage;
