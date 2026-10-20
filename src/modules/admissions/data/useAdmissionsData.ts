import { logger } from '@/utils/logging';

// ABOUTME: Self-contained hook for admissions data management
// ABOUTME: Provides CRUD operations for applications, documents, reviews and decisions
// ABOUTME: All database access goes through the provider-agnostic ICollection API
//
// GAP(P1-E04): the canonical registry models no admission application, review, document,
// approval or note entity, so the application pipeline of spec 04 §2.1-2.5 keeps its own
// collections until a registry change adds them. Admitting a learner is not one of these
// rows: it goes through AdmissionService on the Admit learner page, which writes the
// canonical learner, guardians, links, identifiers and enrolment in one transaction.

import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/database/databaseService';
import type { ICollection } from '@/services/database/interfaces';
import type {
  Application,
  ApplicationFormData,
  ApplicationFilters,
  ApplicationStatistics,
  ApplicationDocument,
  ApplicationReview,
  ReviewFormData,
  DecisionFormData,
  ApplicationNote,
  ApplicationStatus,
} from './types';
import { ApplicationStatus as AppStatus } from './types';

// Registered collection names (see src/services/database/collections.ts):
// admissions_applications, application_reviews, application_documents,
// application_approvals, application_notes.
const COLLECTIONS = {
  applications: 'admissions_applications',
  reviews: 'application_reviews',
  documents: 'application_documents',
  decisions: 'application_approvals',
  notes: 'application_notes',
} as const;

// Resolve an ICollection through the live database manager.
const getCollection = async (name: string): Promise<ICollection<any>> => {
  const db = await databaseService.getDatabase();
  const collection = db.getCollection(name);
  if (!collection) {
    throw new Error(`Collection '${name}' is not registered`);
  }
  return collection;
};

// Generate unique application number
const generateApplicationNumber = (): string => {
  const prefix = 'APP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const useAdmissionsData = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<ApplicationStatistics>({
    totalApplications: 0,
    pendingReview: 0,
    approved: 0,
    rejected: 0,
    deferred: 0,
    waitlisted: 0,
    enrolled: 0,
    pipeline: { contacts: 0, enquired: 0, applied: 0, admitted: 0, enrolled: 0 },
    byClass: [],
    byStatus: [],
    thisMonth: 0,
    thisWeek: 0,
    today: 0,
    monthlyData: [],
    funnel: [],
    postAdmissions: { declined: 0, enrolled: 0, total: 0 },
    trends: {
      enquiries: { direction: 'neutral', value: '0%' },
      applications: { direction: 'neutral', value: '0%' },
      enrollment: { direction: 'neutral', value: '0%' },
      conversionRate: { direction: 'neutral', value: '0%' },
    },
  });

  // Load applications from database
  const loadApplications = useCallback(async (filters?: ApplicationFilters) => {
    setLoading(true);
    setError(null);
    try {
      const collection = await getCollection(COLLECTIONS.applications);
      // ICollection exposes plain find(); filter in JS to mimic the old query builder.
      let apps = ((await collection.find({})) || []) as Application[];

      if (filters) {
        if (filters.status) {
          apps = apps.filter(app => app.status === filters.status);
        }
        if (filters.classId) {
          apps = apps.filter(app => app.intendedClassId === filters.classId);
        }
        if (filters.academicYearId) {
          apps = apps.filter(app => app.academicYearId === filters.academicYearId);
        }
        if (filters.applicationType) {
          apps = apps.filter(app => app.applicationType === filters.applicationType);
        }
        if (filters.searchQuery) {
          const regex = new RegExp(filters.searchQuery, 'i');
          apps = apps.filter(app => regex.test(app.firstName));
        }
        if (filters.dateFrom) {
          apps = apps.filter(app => app.createdAt >= filters.dateFrom!);
        }
        if (filters.dateTo) {
          apps = apps.filter(app => app.createdAt <= filters.dateTo!);
        }
      }

      setApplications(apps);

      // Update statistics
      updateStatistics(apps);
    } catch (err) {
      setError('Failed to load applications');
      logger.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update statistics based on applications
  const updateStatistics = (apps: Application[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const enrolledCount = apps.filter(a => a.status === AppStatus.ENROLLED).length;

    const stats: ApplicationStatistics = {
      totalApplications: apps.length,
      pendingReview: apps.filter(a => a.status === AppStatus.UNDER_REVIEW).length,
      approved: apps.filter(a => a.status === AppStatus.APPROVED).length,
      rejected: apps.filter(a => a.status === AppStatus.REJECTED).length,
      deferred: apps.filter(a => a.status === AppStatus.DEFERRED).length,
      waitlisted: apps.filter(a => a.status === AppStatus.WAITLISTED).length,
      enrolled: enrolledCount,
      pipeline: {
        contacts: apps.length,
        enquired: apps.length,
        applied: apps.filter(a => a.status !== AppStatus.DRAFT).length,
        admitted: apps.filter(
          a => a.status === AppStatus.APPROVED || a.status === AppStatus.ENROLLED
        ).length,
        enrolled: enrolledCount,
      },
      byClass: [],
      byStatus: [],
      thisMonth: apps.filter(a => new Date(a.createdAt) >= startOfMonth).length,
      thisWeek: apps.filter(a => new Date(a.createdAt) >= startOfWeek).length,
      today: apps.filter(a => new Date(a.createdAt) >= startOfDay).length,
      // Time-series/funnel analytics are not derived yet - kept empty as before.
      monthlyData: [],
      funnel: [],
      postAdmissions: { declined: 0, enrolled: enrolledCount, total: apps.length },
      trends: {
        enquiries: { direction: 'neutral', value: '0%' },
        applications: { direction: 'neutral', value: '0%' },
        enrollment: { direction: 'neutral', value: '0%' },
        conversionRate: { direction: 'neutral', value: '0%' },
      },
    };

    // Group by class
    const classMap = new Map<string, { classId: string; className: string; count: number }>();
    apps.forEach(app => {
      if (app.intendedClassId) {
        const existing = classMap.get(app.intendedClassId);
        if (existing) {
          existing.count++;
        } else {
          classMap.set(app.intendedClassId, {
            classId: app.intendedClassId,
            className: app.intendedClassName || 'Unknown',
            count: 1,
          });
        }
      }
    });
    stats.byClass = Array.from(classMap.values());

    // Group by status
    const statusMap = new Map<ApplicationStatus, number>();
    apps.forEach(app => {
      const count = statusMap.get(app.status) || 0;
      statusMap.set(app.status, count + 1);
    });
    stats.byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    setStatistics(stats);
  };

  // Create new application
  const createApplication = async (formData: ApplicationFormData): Promise<Application> => {
    setLoading(true);
    try {
      const collection = await getCollection(COLLECTIONS.applications);

      const now = new Date().toISOString();
      const applicationNumber = generateApplicationNumber();

      const newApplication: Application = {
        id: databaseService.generateId(),
        applicationNumber,
        ...formData,
        status: AppStatus.SUBMITTED,
        submissionDate: now,
        createdAt: now,
        updatedAt: now,
      };

      await collection.insert(newApplication);

      const next = [...applications, newApplication];
      setApplications(next);
      updateStatistics(next);

      return newApplication;
    } catch (err) {
      setError('Failed to create application');
      logger.error('Error creating application:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update application
  const updateApplication = async (id: string, updates: Partial<Application>): Promise<void> => {
    setLoading(true);
    try {
      const collection = await getCollection(COLLECTIONS.applications);

      const updatedAt = new Date().toISOString();
      await collection.update(id, {
        ...updates,
        updatedAt,
      });

      setApplications(prev =>
        prev.map(app =>
          app.id === id ? { ...app, ...updates, updatedAt } : app
        )
      );
    } catch (err) {
      setError('Failed to update application');
      logger.error('Error updating application:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete application
  const deleteApplication = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const collection = await getCollection(COLLECTIONS.applications);

      await collection.remove(id);
      const next = applications.filter(app => app.id !== id);
      setApplications(next);
      updateStatistics(next);
    } catch (err) {
      setError('Failed to delete application');
      logger.error('Error deleting application:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get single application by ID
  const getApplication = async (id: string): Promise<Application | null> => {
    try {
      const collection = await getCollection(COLLECTIONS.applications);

      const doc = await collection.findById(id);
      return (doc as Application) ?? null;
    } catch (err) {
      setError('Failed to load application');
      logger.error('Error loading application:', err);
      return null;
    }
  };

  // Get single application by application number (reference)
  const getApplicationByReference = async (applicationNumber: string): Promise<Application | null> => {
    try {
      const collection = await getCollection(COLLECTIONS.applications);

      const results = ((await collection.find({})) || []) as Application[];
      return results.find(app => app.applicationNumber === applicationNumber) ?? null;
    } catch (err) {
      setError('Failed to load application');
      logger.error('Error loading application by reference:', err);
      return null;
    }
  };

  // Add review to application
  const addReview = async (applicationId: string, reviewData: ReviewFormData, reviewerId: string): Promise<void> => {
    setLoading(true);
    try {
      const collection = await getCollection(COLLECTIONS.reviews);

      const review: ApplicationReview = {
        id: databaseService.generateId(),
        applicationId,
        reviewerId,
        ...reviewData,
        reviewDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await collection.insert(review);

      // Update application status to under review
      await updateApplication(applicationId, {
        status: AppStatus.UNDER_REVIEW,
        reviewDate: new Date().toISOString(),
      });
    } catch (err) {
      setError('Failed to add review');
      logger.error('Error adding review:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Make admission decision (decisions persist to application_approvals)
  const makeDecision = async (
    applicationId: string,
    decisionData: DecisionFormData,
    decidedBy: string
  ): Promise<void> => {
    setLoading(true);
    try {
      const collection = await getCollection(COLLECTIONS.decisions);

      const decision = {
        id: databaseService.generateId(),
        applicationId,
        decidedBy,
        decision: decisionData.decision,
        conditions: decisionData.conditions,
        finalComments: decisionData.finalComments,
        assignedClassId: decisionData.assignedClassId,
        assignedStreamId: decisionData.assignedStreamId,
        admissionNumber: decisionData.admissionNumber,
        startDate: decisionData.startDate,
        decisionDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      await collection.insert(decision);

      // Update application with decision
      await updateApplication(applicationId, {
        status: decisionData.decision,
        decisionDate: new Date().toISOString(),
      });

      // GAP(P1-E04): an approval records the decision only. Admitting the learner is the
      // AdmissionService call on /admissions/admit, which writes the canonical learner,
      // guardians, links, identifiers and enrolment; the old student and admission_enrollments
      // rows are gone, because `learner` and `enrolment` are canonical entities.
    } catch (err) {
      setError('Failed to make decision');
      logger.error('Error making decision:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Upload document
  const uploadDocument = async (
    applicationId: string,
    file: File,
    documentType: string,
    uploadedBy: string
  ): Promise<ApplicationDocument> => {
    setLoading(true);
    try {
      const collection = await getCollection(COLLECTIONS.documents);

      // Generate unique filename
      const timestamp = Date.now();
      const storedFilename = `${applicationId}_${documentType}_${timestamp}_${file.name}`;

      // In a real implementation, you would upload to a storage service
      // For now, we store the file metadata
      const document: ApplicationDocument = {
        id: databaseService.generateId(),
        applicationId,
        documentType: documentType as any,
        originalFilename: file.name,
        storedFilename,
        filePath: `/uploads/admissions/${storedFilename}`,
        fileSize: file.size,
        mimeType: file.type,
        status: 'Pending' as any,
        uploadedAt: new Date().toISOString(),
        uploadedBy,
      };

      await collection.insert(document);

      return document;
    } catch (err) {
      setError('Failed to upload document');
      logger.error('Error uploading document:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Add note to application
  const addNote = async (
    applicationId: string,
    content: string,
    authorId: string,
    isInternal: boolean = true
  ): Promise<ApplicationNote> => {
    try {
      const collection = await getCollection(COLLECTIONS.notes);

      const note: ApplicationNote = {
        id: databaseService.generateId(),
        applicationId,
        authorId,
        content,
        isInternal,
        createdAt: new Date().toISOString(),
      };

      await collection.insert(note);

      return note;
    } catch (err) {
      setError('Failed to add note');
      logger.error('Error adding note:', err);
      throw err;
    }
  };

  // Get application documents
  const getApplicationDocuments = async (applicationId: string): Promise<ApplicationDocument[]> => {
    try {
      const collection = await getCollection(COLLECTIONS.documents);

      const results = ((await collection.find({})) || []) as ApplicationDocument[];
      return results.filter(doc => doc.applicationId === applicationId);
    } catch (err) {
      setError('Failed to load documents');
      logger.error('Error loading application documents:', err);
      return [];
    }
  };

  // Get application reviews
  const getApplicationReviews = async (applicationId: string): Promise<ApplicationReview[]> => {
    try {
      const collection = await getCollection(COLLECTIONS.reviews);

      const results = ((await collection.find({})) || []) as ApplicationReview[];
      return results.filter(review => review.applicationId === applicationId);
    } catch (err) {
      setError('Failed to load reviews');
      logger.error('Error loading application reviews:', err);
      return [];
    }
  };

  // Get application notes
  const getApplicationNotes = async (applicationId: string): Promise<ApplicationNote[]> => {
    try {
      const collection = await getCollection(COLLECTIONS.notes);

      const results = ((await collection.find({})) || []) as ApplicationNote[];
      return results.filter(note => note.applicationId === applicationId);
    } catch (err) {
      setError('Failed to load notes');
      logger.error('Error loading application notes:', err);
      return [];
    }
  };

  // Initial load
  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  return {
    // Data
    applications,
    statistics,
    loading,
    error,

    // Actions
    loadApplications,
    createApplication,
    updateApplication,
    deleteApplication,
    getApplication,
    getApplicationByReference,
    addReview,
    makeDecision,
    uploadDocument,
    addNote,
    getApplicationDocuments,
    getApplicationReviews,
    getApplicationNotes,
  };
};

export default useAdmissionsData;
