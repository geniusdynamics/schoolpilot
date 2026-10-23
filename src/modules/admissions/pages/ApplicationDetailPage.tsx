import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tabs from '@/components/ui/Tabs';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeftIcon, PrinterIcon, TrashIcon, CheckCircleIcon, DownloadIcon, DocumentTextIcon } from '@/components/ui/icons';
import { useAdmissionsData } from '../data/useAdmissionsData';
import {
  Application,
  ApplicationDocument,
  ApplicationReview,
  ApplicationNote,
  ApplicationStatus,
} from '../data/types';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { format } from 'date-fns';

const statusColors: Record<ApplicationStatus, string> = {
  [ApplicationStatus.DRAFT]: 'bg-surface-accent text-surface-foreground',
  [ApplicationStatus.SUBMITTED]: 'bg-primary-100 text-primary-800',
  [ApplicationStatus.UNDER_REVIEW]: 'bg-yellow-100 text-yellow-800',
  [ApplicationStatus.INTERVIEW_SCHEDULED]: 'bg-purple-100 text-purple-800',
  [ApplicationStatus.APPROVED]: 'bg-green-100 text-green-800',
  [ApplicationStatus.REJECTED]: 'bg-red-100 text-red-800',
  [ApplicationStatus.DEFERRED]: 'bg-orange-100 text-orange-800',
  [ApplicationStatus.WAITLISTED]: 'bg-indigo-100 text-indigo-800',
  [ApplicationStatus.ENROLLED]: 'bg-teal-100 text-teal-800',
};

export const ApplicationDetailPageContent: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { getApplication, getApplicationDocuments, getApplicationReviews, getApplicationNotes, deleteApplication } = useAdmissionsData();
  const { showToast } = useToast();
  const confirm = useConfirm();
  
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [reviews, setReviews] = useState<ApplicationReview[]>([]);
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadApplicationData = useCallback(async () => {
    if (!applicationId) return;
    
    setLoading(true);
    try {
      const [app, docs, revs, noteList] = await Promise.all([
        getApplication(applicationId),
        getApplicationDocuments(applicationId),
        getApplicationReviews(applicationId),
        getApplicationNotes(applicationId),
      ]);
      
      setApplication(app);
      setDocuments(docs);
      setReviews(revs);
      setNotes(noteList);
    } catch {
      showToast({
        type: 'error',
        message: 'Failed to load application details.',
      });
    } finally {
      setLoading(false);
    }
  }, [applicationId, getApplication, getApplicationDocuments, getApplicationReviews, getApplicationNotes, showToast]);

  useEffect(() => {
    loadApplicationData();
  }, [loadApplicationData]);

  const handleBack = () => {
    navigate('/admissions/applications');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = async () => {
    if (!application) return;
    
    if (await confirm({ title: 'Delete application', message: 'Are you sure you want to delete this application? This action cannot be undone.', variant: 'danger' })) {
      try {
        await deleteApplication(application.id);
        showToast({
          type: 'success',
          message: 'Application deleted successfully.',
        });
        navigate('/admissions/applications');
      } catch {
        showToast({
          type: 'error',
          message: 'Failed to delete application.',
        });
      }
    }
  };

  const handleReview = () => {
    navigate(`/admissions/review/${applicationId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-surface-foreground">Application not found</h3>
        <Button onClick={handleBack} className="mt-4">
          Back to Applications
        </Button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: `Documents (${documents.length})` },
    { id: 'reviews', label: `Reviews (${reviews.length})` },
    { id: 'notes', label: `Notes (${notes.length})` },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={handleBack} leftIcon={<ArrowLeftIcon className="w-5 h-5" />}>
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-surface-foreground">
              Application #{application.applicationNumber}
            </h1>
            <p className="text-sm text-surface-muted-fg">
              Submitted on {application.submissionDate ? format(new Date(application.submissionDate), 'MMM d, yyyy') : 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handlePrint} leftIcon={<PrinterIcon className="w-4 h-4" />}>
            Print
          </Button>
          {[ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW].includes(application.status) && (
            <Button onClick={handleReview} leftIcon={<CheckCircleIcon className="w-4 h-4" />}>
              Review
            </Button>
          )}
          <Button variant="danger" onClick={handleDelete} leftIcon={<TrashIcon className="w-4 h-4" />}>
            Delete
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg ${statusColors[application.status]}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Status: {application.status}</span>
          {application.reviewDeadline && (
            <span className="text-sm">
              Review Deadline: {format(new Date(application.reviewDeadline), 'MMM d, yyyy')}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card title="Personal Information">
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Full Name:</span>
                  <span className="font-medium">{`${application.firstName} ${application.middleName || ''} ${application.lastName}`}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Date of Birth:</span>
                  <span>{application.dateOfBirth ? format(new Date(application.dateOfBirth), 'MMM d, yyyy') : 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Gender:</span>
                  <span>{application.gender}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Nationality:</span>
                  <span>{application.nationality || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Religion:</span>
                  <span>{application.religion || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Birth Cert #:</span>
                  <span>{application.birthCertificateNumber || 'N/A'}</span>
                </div>
              </div>
            </Card>

            {/* Guardian Information */}
            <Card title="Guardian Information">
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Guardian Type:</span>
                  <span>{application.guardianType || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Name:</span>
                  <span className="font-medium">{`${application.guardianFirstName || ''} ${application.guardianLastName || ''}`}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Phone:</span>
                  <span>{application.guardianPhone || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Email:</span>
                  <span>{application.guardianEmail || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Occupation:</span>
                  <span>{application.guardianOccupation || 'N/A'}</span>
                </div>
              </div>
            </Card>

            {/* Application Details */}
            <Card title="Application Details">
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Application Type:</span>
                  <span>{application.applicationType}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Intended Class:</span>
                  <span>{application.intendedClassName || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Academic Year:</span>
                  <span>{application.academicYearName || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Application #:</span>
                  <span className="font-mono">{application.applicationNumber}</span>
                </div>
              </div>
            </Card>

            {/* Academic Background */}
            <Card title="Academic Background">
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Previous School:</span>
                  <span>{application.previousSchool || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Previous Class:</span>
                  <span>{application.previousClass || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">KCPE Index #:</span>
                  <span>{application.kcpeIndexNumber || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">KCPE Marks:</span>
                  <span>{application.kcpeMarks || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">KCPE Grade:</span>
                  <span>{application.kcpeGrade || 'N/A'}</span>
                </div>
              </div>
            </Card>

            {/* Address */}
            <Card title="Address Information" className="lg:col-span-2">
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Residential Address:</span>
                  <span>{application.residentialAddress || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Postal Address:</span>
                  <span>{application.postalAddress || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">County:</span>
                  <span>{application.county || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-surface-muted-fg">Sub-County:</span>
                  <span>{application.subCounty || 'N/A'}</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'documents' && (
          <Card title="Submitted Documents">
            <div className="p-4">
              {documents.length === 0 ? (
                <p className="text-surface-muted-fg text-center py-8">No documents submitted yet.</p>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-8 h-8 text-surface-muted-fg" />
                        <div>
                          <p className="font-medium">{doc.documentType}</p>
                          <p className="text-sm text-surface-muted-fg">{doc.originalFilename}</p>
                          <p className="text-xs text-surface-muted-fg">
                            Uploaded on {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          doc.status === 'Verified' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {doc.status}
                        </span>
                        <Button size="sm" variant="ghost" leftIcon={<DownloadIcon className="w-4 h-4" />}>
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'reviews' && (
          <Card title="Reviews">
            <div className="p-4">
              {reviews.length === 0 ? (
                <p className="text-surface-muted-fg text-center py-8">No reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{review.reviewerName || 'Unknown Reviewer'}</span>
                        <span className="text-sm text-surface-muted-fg">
                          {format(new Date(review.reviewDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-surface-muted-fg">Academic Score:</span>
                          <p className="font-medium">{review.academicScore || 'N/A'}/100</p>
                        </div>
                        <div>
                          <span className="text-sm text-surface-muted-fg">Interview Score:</span>
                          <p className="font-medium">{review.interviewScore || 'N/A'}/100</p>
                        </div>
                        <div>
                          <span className="text-sm text-surface-muted-fg">Recommendation:</span>
                          <p className="font-medium">{review.recommendation}</p>
                        </div>
                      </div>
                      {review.comments && (
                        <div className="bg-surface-muted p-3 rounded">
                          <span className="text-sm text-surface-muted-fg">Comments:</span>
                          <p className="mt-1">{review.comments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'notes' && (
          <Card title="Internal Notes">
            <div className="p-4">
              {notes.length === 0 ? (
                <p className="text-surface-muted-fg text-center py-8">No notes added yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{note.authorName || 'Unknown'}</span>
                        <span className="text-sm text-surface-muted-fg">
                          {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p>{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card title="Decision History">
            <div className="p-4">
              <div className="border-l-2 border-surface-border ml-3 space-y-6">
                <div className="relative pl-8">
                  <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-primary-500" />
                  <p className="font-medium">Application Created</p>
                  <p className="text-sm text-surface-muted-fg">
                    {format(new Date(application.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {application.submissionDate && (
                  <div className="relative pl-8">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-500" />
                    <p className="font-medium">Application Submitted</p>
                    <p className="text-sm text-surface-muted-fg">
                      {format(new Date(application.submissionDate), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {application.reviewDate && (
                  <div className="relative pl-8">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-yellow-500" />
                    <p className="font-medium">Under Review</p>
                    <p className="text-sm text-surface-muted-fg">
                      {format(new Date(application.reviewDate), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {application.decisionDate && (
                  <div className="relative pl-8">
                    <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full ${
                      application.status === ApplicationStatus.APPROVED ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <p className="font-medium">Decision: {application.status}</p>
                    <p className="text-sm text-surface-muted-fg">
                      {format(new Date(application.decisionDate), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
                {application.enrollmentDate && (
                  <div className="relative pl-8">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-teal-500" />
                    <p className="font-medium">Student Enrolled</p>
                    <p className="text-sm text-surface-muted-fg">
                      {format(new Date(application.enrollmentDate), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </Tabs>
    </div>
  );
};
const ApplicationDetailPage: React.FC = () => (
  <div className="space-y-3">
    <ApplicationDetailPageContent />
  </div>
);

export default ApplicationDetailPage;
