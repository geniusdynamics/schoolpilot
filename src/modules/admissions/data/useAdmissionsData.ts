// ABOUTME: Self-contained hook for admissions data management
// ABOUTME: Provides CRUD operations for applications, documents, reviews, and enrollment

import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/database/databaseService';
import type {
  Application,
  ApplicationFormData,
  ApplicationFilters,
  ApplicationStatistics,
  ApplicationDocument,
  ApplicationReview,
  ReviewFormData,
  DecisionFormData,
  EnrollmentDetails,
  ApplicationNote,
  ApplicationStatus,
} from './types';
import { ApplicationStatus as AppStatus } from './types';

// Generate unique application number
const generateApplicationNumber = (): string => {
  const prefix = 'APP';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Generate unique admission number
const generateAdmissionNumber = (): string => {
  const prefix = 'ADM';
  const year = new Date().getFullYear().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${year}${random}`;
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
      const db = await databaseService.getDatabase();
      const collection = db.collections['applications'];
      
      let query = collection.find();
      
      // Apply filters
      if (filters) {
        if (filters.status) {
          query = query.where('status').eq(filters.status);
        }
        if (filters.classId) {
          query = query.where('intendedClassId').eq(filters.classId);
        }
        if (filters.academicYearId) {
          query = query.where('academicYearId').eq(filters.academicYearId);
        }
        if (filters.applicationType) {
          query = query.where('applicationType').eq(filters.applicationType);
        }
        if (filters.searchQuery) {
          const regex = new RegExp(filters.searchQuery, 'i');
          query = query.where('firstName').regex(regex);
        }
        if (filters.dateFrom) {
          query = query.where('createdAt').gte(filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.where('createdAt').lte(filters.dateTo);
        }
      }
      
      const results = await query.exec();
      const apps = results.map((doc: any) => doc.toJSON()) as Application[];
      setApplications(apps);
      
      // Update statistics
      updateStatistics(apps);
    } catch (err) {
      setError('Failed to load applications');
      console.error('Error loading applications:', err);
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

    const stats: ApplicationStatistics = {
      totalApplications: apps.length,
      pendingReview: apps.filter(a => a.status === AppStatus.UNDER_REVIEW).length,
      approved: apps.filter(a => a.status === AppStatus.APPROVED).length,
      rejected: apps.filter(a => a.status === AppStatus.REJECTED).length,
      deferred: apps.filter(a => a.status === AppStatus.DEFERRED).length,
      waitlisted: apps.filter(a => a.status === AppStatus.WAITLISTED).length,
      enrolled: apps.filter(a => a.status === AppStatus.ENROLLED).length,
      byClass: [],
      byStatus: [],
      thisMonth: apps.filter(a => new Date(a.createdAt) >= startOfMonth).length,
      thisWeek: apps.filter(a => new Date(a.createdAt) >= startOfWeek).length,
      today: apps.filter(a => new Date(a.createdAt) >= startOfDay).length,
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
      const db = await databaseService.getDatabase();
      const collection = db.collections['applications'];
      
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
      
      setApplications(prev => [...prev, newApplication]);
      updateStatistics([...applications, newApplication]);
      
      return newApplication;
    } catch (err) {
      setError('Failed to create application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update application
  const updateApplication = async (id: string, updates: Partial<Application>): Promise<void> => {
    setLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['applications'];
      
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.update({
          $set: {
            ...updates,
            updatedAt: new Date().toISOString(),
          },
        });
        
        setApplications(prev =>
          prev.map(app =>
            app.id === id ? { ...app, ...updates, updatedAt: new Date().toISOString() } : app
          )
        );
      }
    } catch (err) {
      setError('Failed to update application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete application
  const deleteApplication = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['applications'];
      
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.remove();
        setApplications(prev => prev.filter(app => app.id !== id));
        updateStatistics(applications.filter(app => app.id !== id));
      }
    } catch (err) {
      setError('Failed to delete application');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get single application by ID
  const getApplication = async (id: string): Promise<Application | null> => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['applications'];
      
      const doc = await collection.findOne(id).exec();
      return doc ? doc.toJSON() as Application : null;
    } catch (err) {
      setError('Failed to load application');
      return null;
    }
  };

  // Get single application by application number (reference)
  const getApplicationByReference = async (applicationNumber: string): Promise<Application | null> => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['applications'];

      const results = await collection.find().where('applicationNumber').eq(applicationNumber).exec();
      if (results.length === 0) return null;
      return results[0].toJSON() as Application;
    } catch (err) {
      setError('Failed to load application');
      return null;
    }
  };

  // Add review to application
  const addReview = async (applicationId: string, reviewData: ReviewFormData, reviewerId: string): Promise<void> => {
    setLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['application_reviews'];
      
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
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Make admission decision
  const makeDecision = async (
    applicationId: string,
    decisionData: DecisionFormData,
    decidedBy: string
  ): Promise<void> => {
    setLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['admission_decisions'];
      
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
      
      // If approved, process enrollment
      if (decisionData.decision === AppStatus.APPROVED) {
        await processEnrollment(applicationId, decisionData, decidedBy);
      }
    } catch (err) {
      setError('Failed to make decision');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Process enrollment and create student record
  const processEnrollment = async (
    applicationId: string,
    decisionData: DecisionFormData,
    enrolledBy: string
  ): Promise<EnrollmentDetails> => {
    try {
      const db = await databaseService.getDatabase();
      const app = await getApplication(applicationId);
      
      if (!app) {
        throw new Error('Application not found');
      }
      
      // Create student record
      const studentId = databaseService.generateId();
      const admissionNumber = decisionData.admissionNumber || generateAdmissionNumber();
      
      const student = {
        id: studentId,
        admission_no: admissionNumber,
        first_name: app.firstName,
        middle_name: app.middleName,
        last_name: app.lastName,
        gender: app.gender,
        date_of_birth: app.dateOfBirth,
        current_class_stream_id: decisionData.assignedStreamId ? parseInt(decisionData.assignedStreamId) : null,
        student_category_id: null,
        dormitory_id: decisionData.dormitoryId ? parseInt(decisionData.dormitoryId) : null,
        admission_date: decisionData.startDate || new Date().toISOString(),
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: app.guardianEmail,
        phone: app.guardianPhone,
        address: app.residentialAddress,
        religion: app.religion,
        county: app.county,
        primary_school: app.previousSchool,
        marks_attained_primary: app.kcpeMarks?.toString(),
      };
      
      await db.collections['students'].insert(student);
      
      // Create enrollment record
      const enrollment: EnrollmentDetails = {
        id: databaseService.generateId(),
        applicationId,
        studentId,
        admissionNumber,
        enrolledAt: new Date().toISOString(),
        enrolledBy,
        classId: decisionData.assignedClassId || '',
        streamId: decisionData.assignedStreamId,
        dormitoryId: decisionData.dormitoryId,
        feeStructureId: decisionData.feeStructureId,
        documentsReceived: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await db.collections['enrollments'].insert(enrollment);
      
      // Update application to enrolled status
      await updateApplication(applicationId, {
        status: AppStatus.ENROLLED,
        enrollmentDate: new Date().toISOString(),
      });
      
      return enrollment;
    } catch (err) {
      setError('Failed to process enrollment');
      throw err;
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
      const db = await databaseService.getDatabase();
      const collection = db.collections['application_documents'];
      
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
      const db = await databaseService.getDatabase();
      const collection = db.collections['application_notes'];
      
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
      throw err;
    }
  };

  // Get application documents
  const getApplicationDocuments = async (applicationId: string): Promise<ApplicationDocument[]> => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['application_documents'];
      
      const results = await collection.find().where('applicationId').eq(applicationId).exec();
      return results.map((doc: any) => doc.toJSON()) as ApplicationDocument[];
    } catch (err) {
      setError('Failed to load documents');
      return [];
    }
  };

  // Get application reviews
  const getApplicationReviews = async (applicationId: string): Promise<ApplicationReview[]> => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['application_reviews'];
      
      const results = await collection.find().where('applicationId').eq(applicationId).exec();
      return results.map((doc: any) => doc.toJSON()) as ApplicationReview[];
    } catch (err) {
      setError('Failed to load reviews');
      return [];
    }
  };

  // Get application notes
  const getApplicationNotes = async (applicationId: string): Promise<ApplicationNote[]> => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['application_notes'];
      
      const results = await collection.find().where('applicationId').eq(applicationId).exec();
      return results.map((doc: any) => doc.toJSON()) as ApplicationNote[];
    } catch (err) {
      setError('Failed to load notes');
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
    processEnrollment,
    uploadDocument,
    addNote,
    getApplicationDocuments,
    getApplicationReviews,
    getApplicationNotes,
  };
};

export default useAdmissionsData;
