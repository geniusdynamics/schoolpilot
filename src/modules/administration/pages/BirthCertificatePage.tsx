import React, { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PrinterIcon, DownloadIcon } from '@/components/ui/icons';
import Spinner from '@/components/ui/Spinner';
import { useCanonicalLearners } from '../data/useCanonicalLearners';

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

  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const { learners, isLoading } = useCanonicalLearners();
  const certificateStudents: Student[] = useMemo(
    () =>
      learners.map((learner) => {
        const relationship = learner.primary_guardian_relationship.toLowerCase();
        return {
          id: learner.id,
          student_id: learner.admission_no,
          name: learner.display_name || learner.name,
          class_name: learner.current_class_name,
          section: learner.current_class_stream_name,
          roll_number: '',
          father_name: relationship === 'father' ? learner.primary_guardian : '',
          mother_name: relationship === 'mother' ? learner.primary_guardian : '',
          date_of_birth: learner.date_of_birth,
          gender: learner.gender,
          birth_place: learner.county,
          address: learner.county,
        };
      }),
    [learners]
  );

  const classes = useMemo(
    () => [...new Set(certificateStudents.map((student) => student.class_name).filter(Boolean))].sort(),
    [certificateStudents]
  );

  const generateCertificate = (student: Student) => {
    setSelectedStudent(student);
  };

  const printCertificate = () => {
    window.print();
  };

  if (isLoading && certificateStudents.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading students...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {!selectedStudent ? (
        <Card
          title="Birth Certificate"
          info="Generate official birth certificates for students. Select a student to preview and print their birth certificate."
        >

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
            {certificateStudents.map(student => (
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
                    Generate Certificate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card title="Birth Certificate">
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
          <div className="border-2 border-surface-border p-8 bg-surface-card" style={{ minHeight: '800px' }}>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-surface-foreground mb-2">BIRTH CERTIFICATE</h1>
              <p className="text-surface-muted-fg">School Name Here</p>
              <p className="text-sm text-surface-muted-fg">Address Line 1, City, Country</p>
            </div>

            <div className="mb-6 p-4 bg-surface-muted border border-surface-border">
              <p className="text-sm text-surface-foreground">
                <strong>Certificate No:</strong> BC-{new Date().getFullYear()}-{selectedStudent.student_id}
              </p>
              <p className="text-sm text-surface-foreground">
                <strong>Date:</strong> {new Date().toLocaleDateString()}
              </p>
            </div>

            <div className="mb-6">
              <p className="text-surface-foreground leading-relaxed">
                This is to certify that <strong>{selectedStudent.name}</strong>, 
                <strong> {selectedStudent.gender}</strong>, was born on 
                <strong> {new Date(selectedStudent.date_of_birth).toLocaleDateString()}</strong> 
                at <strong>{selectedStudent.birth_place}</strong>.
              </p>
            </div>

            <div className="mb-6">
              <p className="text-surface-foreground leading-relaxed">
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
              <p className="text-surface-foreground leading-relaxed">
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
              <p className="text-surface-foreground leading-relaxed">
                This certificate is issued based on the school records and is for official purposes only.
              </p>
            </div>

            <div className="mt-12 flex justify-between">
              <div className="text-center">
                <div className="h-16 border-b border-gray-400 mb-2"></div>
                <p className="text-sm text-surface-muted-fg">School Authority</p>
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

const BirthCertificatePage: React.FC = () => (
  <div className="space-y-3">
    <BirthCertificateContent />
  </div>
);

export default BirthCertificatePage;
