// hooks/useRxDBData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subscription } from 'rxjs';
import { RxCollection, RxDocumentData } from 'rxdb';
import type { SchoolDatabase, SchoolDatabaseCollections } from '../services/rxdbService';
import { getDatabase, seedDatabaseWithMockData, clearDatabase as clearDbFnFromService, getUsingDummyDataFlag as getDummyFlagFnFromService, generateId, generateNumericId } from '../services/rxdbService';
import * as allTypes from '../types';
import type { AppDataLoadingStates, RawInitialData, AppDataContextType } from '../types';
import { rbacService } from '../core/rbacService';
import { 
  FinStudentInvoiceType, 
  FinStudentInvoiceItemType, 
  FinStudentPaymentType, 
  FinFeeAdjustmentType, 
  FinInvoicePaymentApplicationType, 
  FinCustomerInvoiceType, 
  FinSupplierInvoiceType, 
  FinGeneralPaymentType, 
  FinGeneralLedgerEntryType, 
  FinStudentOpeningBalanceType, 
  FinTransportRouteType, 
  FinStudentTransportAssignmentType 
} from '../modules/finance/data/types';
import type { RbacRole, Permission, UserRole, Role } from '../core/types';

const createInitialLoadingStates = (): AppDataLoadingStates => ({
  all: true, schoolDetails: true, roles: true, users: true, students: true, staff: true, classes: true,
  subjects: true, subjectPapers: true, examSessions: true, examPaperSettings: true,
  gradingSchemes: true, studentExamResults: true, classSubjectAllocations: true,
  teacherSubjectAssignments: true, studentSubjectEnrollments: true, timetablePeriodDefs: true, timetableEntries: true,
  departments: true, designations: true, studentCategories: true, dormitories: true,
  academicYears: true, schoolPeriods: true, academicYearStructures: true, academicPeriodDefinitions: true,
  financialYears: true, classStreams: true, parentsGuardians: true, studentGuardianRelationships: true,
  partners: true, clubs: true, customers: true, studentHealthRecords: true, studentAttendance: true,
  templatesComm: true, campaigns: true,
  chartOfAccounts: true, banks: true, suppliers: true,
  feeTemplates: true, feeTemplateItems: true, expenseCategories: true, supplierInvoices: true,
  warehouses: true, itemCategoriesInv: true,
  itemsInv: true, fixedAssets: true, assetDepreciationLogs: true, requisitions: true, purchaseOrders: true,
  stockLevels: true, stockTransactions: true, payrollPeriods: true, payrollItemTypes: true,
  staffSalarySettings: true, payslips: true, bookCategories: true, books: true, loans: true, fines: true,
  customerInvoices: true, workflows: true, mealPlans: true, menus: true, merchants: true, auditLogs: true,
  expenseClaims: true, studentOpeningBalances: true, feeAdjustments: true, transportRoutes: true,
  studentTransportAssignments: true, studentInvoices: true, studentInvoiceItems: true, studentPayments: true,
  invoicePaymentApplications: true, studentMealPlans: true, mealConsumptionLogs: true,
  walletTransactions: true, studentWallets: true, generalPayments: true, generalLedgerEntries: true,
  rfqs: true, appSettings: true, studentClassHistory: true, healthIncidentReports: true, disciplinaryRecords: true,
  permissions: true,
  userRoles: true,
});

const unimplementedAsync = async (..._args: any[]): Promise<any> => { console.warn("RxDB function not implemented yet."); await new Promise(resolve => setTimeout(resolve, 50)); return null; };
const unimplementedSync = (..._args: any[]): any[] => { console.warn("RxDB getter not implemented yet."); return []; };

// Mapping function: RbacRole -> Role (legacy)
function mapRbacRoleToLegacyRole(rbacRole: RbacRole, idx: number): Role {
  return {
    id: idx + 1, // Assign a numeric id for legacy consumers
    name: rbacRole.name,
    description: rbacRole.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export const useRxDBData = (
    getDbFn: typeof getDatabase,
    seedDbFn: (db: SchoolDatabase, mockData: RawInitialData) => Promise<void>,
    clearDbFn: typeof clearDbFnFromService,
    getDummyFlagFn: typeof getDummyFlagFnFromService,
    mockDataForSeeding: RawInitialData
): AppDataContextType => {
  const [dbInstance, setDbInstance] = useState<SchoolDatabase | null>(null);
  const [loading, setLoading] = useState<AppDataLoadingStates>(createInitialLoadingStates());
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [isUsingRxDBDummyData, setIsUsingRxDBDummyData] = useState<boolean | null>(null);
  const [data, setData] = useState<Omit<AppDataContextType, 'loading' | 'rawInitialData' | 'initializationError' | 'isRxDBModeActive' | 'isUsingRxDBDummyData' | 'triggerSeedRxDB' | 'triggerClearRxDB' | 'getStudentDetailsById' | 'getStudentFinancialDetailsById' | 'updateSchoolDetails'| 'addUser' | 'updateUser'| 'deleteUser' | 'addRole'| 'updateRole'|'deleteRole'|'addStudent'|'updateStudent'|'deleteStudent'|'addStaffMember'|'updateStaffMember'|'deleteStaffMember'|'addParentGuardian'|'updateParentGuardian'|'deleteParentGuardian'|'addStudentGuardianRelationship'|'updateStudentGuardianRelationship'|'deleteStudentGuardianRelationship'|'addDepartment'|'updateDepartment'|'deleteDepartment'|'addDesignation'|'updateDesignation'|'deleteDesignation'|'addStudentCategory'|'updateStudentCategory'|'deleteStudentCategory'|'addDormitory'|'updateDormitory'|'deleteDormitory'|'addAcademicYearStructure'|'updateAcademicYearStructure'|'deleteAcademicYearStructure'|'addAcademicPeriodDefinition'|'updateAcademicPeriodDefinition'|'deleteAcademicPeriodDefinition'|'addAcademicYear'|'updateAcademicYear'|'deleteAcademicYear'|'addSchoolPeriod'|'updateSchoolPeriod'|'deleteSchoolPeriod'|'addPartner'|'updatePartner'|'deletePartner'|'addClub'|'updateClub'|'deleteClub'|'addCustomer'|'updateCustomer'|'deleteCustomer'|'addStudentHealthRecord'|'updateStudentHealthRecord'|'saveStudentAttendance'|'getStudentAttendanceByFilters'|'addTemplateComm'|'updateTemplateComm'|'deleteTemplateComm'|'addCampaign'|'updateCampaign'|'deleteCampaign'|'addAuditLog'|'addClass'|'updateClass'|'deleteClass'|'addClassStream'|'updateClassStream'|'deleteClassStream'|'addSubject'|'updateSubject'|'deleteSubject'|'addSubjectPaper'|'updateSubjectPaper'|'deleteSubjectPaper'|'addExamSession'|'updateExamSession'|'deleteExamSession'|'addExamPaperSetting'|'updateExamPaperSetting'|'deleteExamPaperSetting'|'addGradingScheme'|'updateGradingScheme'|'deleteGradingScheme'|'getStudentsForExamEntry'|'getExamPaperSettingsForSession'|'saveStudentExamResult'|'getTimetablePeriodDefs'|'addTimetablePeriodDef'|'updateTimetablePeriodDef'|'deleteTimetablePeriodDef'|'getTimetableEntries'|'addTimetableEntry'|'updateTimetableEntry'|'deleteTimetableEntry'|'addClassSubjectAllocation'|'updateClassSubjectAllocation'|'deleteClassSubjectAllocation'|'addTeacherSubjectAssignment'|'deleteTeacherSubjectAssignment'|'addStudentSubjectEnrollment'|'updateStudentSubjectEnrollment'|'deleteStudentSubjectEnrollment'|'addChartOfAccount'|'updateChartOfAccount'|'deleteChartOfAccount'|'addBank'|'updateBank'|'deleteBank'|'addSupplier'|'updateSupplier'|'deleteSupplier'|'addFeeTemplate'|'updateFeeTemplate'|'deleteFeeTemplate'|'addExpenseClaim'|'updateExpenseClaim'|'deleteExpenseClaim'|'addExpenseCategory'|'updateExpenseCategory'|'deleteExpenseCategory'|'addCustomerInvoice'|'updateCustomerInvoice'|'deleteCustomerInvoice'|'addSupplierInvoice'|'updateSupplierInvoice'|'deleteSupplierInvoice'|'addStudentOpeningBalance'|'updateStudentOpeningBalance'|'deleteStudentOpeningBalance'|'addFeeAdjustment'|'updateFeeAdjustment'|'deleteFeeAdjustment'|'addTransportRoute'|'updateTransportRoute'|'deleteTransportRoute'|'addStudentTransportAssignment'|'updateStudentTransportAssignment'|'deleteStudentTransportAssignment'|'generateStudentInvoices'|'addStudentPayment'|'updateStudentPayment'|'deleteStudentPayment'|'applyPaymentToInvoices'|'addGeneralPayment'|'updateGeneralPayment'|'deleteGeneralPayment'|'addFinancialYear'|'updateFinancialYear'|'deleteFinancialYear'|'addPayrollPeriod'|'updatePayrollPeriod'|'deletePayrollPeriod'|'addPayrollItemType'|'updatePayrollItemType'|'deletePayrollItemType'|'updateStaffSalarySetting'|'generatePayslipsForPeriod'|'addWarehouse'|'updateWarehouse'|'deleteWarehouse'|'addItemCategoryInv'|'updateItemCategoryInv'|'deleteItemCategoryInv'|'addItemInv'|'updateItemInv'|'deleteItemInv'|'addFixedAsset'|'updateFixedAsset'|'deleteFixedAsset'|'addAssetDepreciationLog'|'addRequisition'|'updateRequisition'|'deleteRequisition'|'updateRequisitionStatus'|'addPurchaseOrder'|'updatePurchaseOrder'|'deletePurchaseOrder'|'addStockTransaction'|'addRfq'|'updateRfq'|'deleteRfq'|'addBookCategory'|'updateBookCategory'|'deleteBookCategory'|'addBook'|'updateBook'|'deleteBook'|'addLoan'|'updateLoan'|'addFine'|'updateFineStatus'|'addMealPlan'|'updateMealPlan'|'deleteMealPlan'|'addMenu'|'updateMenu'|'deleteMenu'|'addStudentMealPlan'|'updateStudentMealPlan'|'deleteStudentMealPlan'|'addMealConsumptionLog'|'addMerchant'|'updateMerchant'|'deleteMerchant'|'addWalletTransaction'|'addWorkflow'|'updateWorkflow'|'deleteWorkflow'|'addWorkflowState'|'updateWorkflowState'|'deleteWorkflowState'>>({} as any);
  const [rbac, setRbac] = useState<{ permissions: Permission[]; roles: RbacRole[]; userRoles: UserRole[] }>({ permissions: [], roles: [], userRoles: [] });
  
  useEffect(() => {
    let isMounted = true;
    const subscriptions: Subscription[] = [];

    const setupCollectionSubscription = <T extends Record<string, any>>(
        collectionName: keyof SchoolDatabaseCollections,
        setState: React.Dispatch<React.SetStateAction<T[]>>,
        setLoadingStateKey: keyof AppDataLoadingStates
    ) => {
        if (dbInstance && dbInstance[collectionName] && isMounted) {
            setLoading(prev => ({ ...prev, [setLoadingStateKey]: true, all: true }));
            const sub = (dbInstance[collectionName] as RxCollection<T>).find().$.subscribe(docs => {
                if (isMounted) {
                    setState(docs.map(d => d.toJSON() as T));
                    setLoading(prev => ({ ...prev, [setLoadingStateKey]: false }));
                }
            });
            subscriptions.push(sub);
        }
    };
    
    const setupSingleDocSubscription = <T extends Record<string, any>>(
        collectionName: keyof SchoolDatabaseCollections,
        docId: string | number,
        setState: React.Dispatch<React.SetStateAction<T | null>>,
        setLoadingStateKey: keyof AppDataLoadingStates
    ) => {
         if (dbInstance && dbInstance[collectionName] && isMounted) {
            setLoading(prev => ({ ...prev, [setLoadingStateKey]: true, all: true }));
            const primaryPath = (dbInstance[collectionName] as RxCollection<T>).schema.primaryPath as keyof T;
            const query = (dbInstance[collectionName] as RxCollection<T>).findOne({ selector: { [primaryPath as string]: docId } as any });
            const sub = query.$.subscribe(doc => {
                 if (isMounted) {
                    setState(doc ? doc.toJSON() as T : null);
                    setLoading(prev => ({ ...prev, [setLoadingStateKey]: false }));
                }
            });
            subscriptions.push(sub);
         }
    };

    (async () => {
      try {
        if(!dbInstance) {
            const db = await getDbFn();
            setDbInstance(db);
        }

        if(dbInstance && isMounted) {
            const dummyFlag = await getDummyFlagFn(dbInstance);
            if (isMounted) setIsUsingRxDBDummyData(dummyFlag);

            const allCollections = Object.keys(dbInstance.collections) as (keyof SchoolDatabaseCollections)[];
            allCollections.forEach(colName => {
                const stateKey = colName === 'classes' ? 'classes' : colName;
                const setState = (items: any) => setData(prev => ({...prev, [stateKey]: items}));

                if(colName === 'school_details') {
                    setupSingleDocSubscription(colName, 1, (val) => setData(prev => ({...prev, schoolDetails: val})), 'schoolDetails');
                } else if (colName === 'app_settings') {
                    setupSingleDocSubscription(colName, 'config', (val) => setData(prev => ({...prev, appSettings: val})), 'appSettings');
                } else {
                    setupCollectionSubscription(colName, setState, colName as keyof AppDataLoadingStates);
                }
            });
             if (isMounted) {
                setTimeout(() => {
                    if (isMounted) {
                        setLoading(prev => {
                            const stillLoadingSomething = Object.values(prev).some(status => status === true);
                            return { ...prev, all: stillLoadingSomething };
                        });
                    }
                }, 500); 
            }

            // RBAC: Load from rbacService
            rbacService.setDatabase(dbInstance);
            await rbacService.loadFromDb();
            if (isMounted) {
                setRbac({
                    permissions: rbacService.getAllPermissions(),
                    roles: rbacService.getAllRoles(),
                    userRoles: Array.from(rbacService["userRoles"].values()).flat(),
                });
                setLoading(prev => ({ ...prev, permissions: false, roles: false, userRoles: false }));
            }
        }
      } catch (err: any) {
        if (isMounted) {
            setInitializationError(err);
            setLoading(Object.keys(createInitialLoadingStates()).reduce((acc, key) => ({...acc, [key]: false}), {} as AppDataLoadingStates));
        }
      }
    })();
    return () => { isMounted = false; subscriptions.forEach(sub => sub.unsubscribe()); };
  }, [getDbFn, getDummyFlagFn, dbInstance]);

  const triggerSeedRxDB = useCallback(async () => {
    if (dbInstance) {
      await seedDbFn(dbInstance, mockDataForSeeding);
      setIsUsingRxDBDummyData(true);
    }
  }, [dbInstance, seedDbFn, mockDataForSeeding]);

  const triggerClearRxDB = useCallback(async () => {
    if (dbInstance) {
      await clearDbFn(dbInstance);
      setIsUsingRxDBDummyData(false);
    }
  }, [dbInstance, clearDbFn]);
  
  const getStudentDetailsById = useCallback(async (studentId: string): Promise<allTypes.StudentDetailProfile | null> => {
      if(!dbInstance) throw new Error("Database not initialized");
      const studentDoc = await dbInstance.students.findOne(studentId).exec();
      if (!studentDoc) return null;
      const studentBase = studentDoc.toJSON();
      
  // Subject CRUD operations
  const addSubject = useCallback(async (data: Omit<Subject, 'id'>): Promise<Subject> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newSubject: Subject = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.subjects.insert(newSubject);
    return newSubject;
  }, [dbInstance]);

  const updateSubject = useCallback(async (id: string, data: Partial<Subject>): Promise<Subject | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.subjects.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteSubject = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.subjects.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // SubjectPaper CRUD operations
  const addSubjectPaper = useCallback(async (data: Omit<SubjectPaper, 'id'>): Promise<SubjectPaper> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newSubjectPaper: SubjectPaper = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.subjectpapers.insert(newSubjectPaper);
    return newSubjectPaper;
  }, [dbInstance]);

  const updateSubjectPaper = useCallback(async (id: string, data: Partial<SubjectPaper>): Promise<SubjectPaper | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.subjectpapers.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteSubjectPaper = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.subjectpapers.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // ClassSubjectAllocation CRUD operations
  const addClassSubjectAllocation = useCallback(async (data: Omit<ClassSubjectAllocation, 'id'>): Promise<ClassSubjectAllocation> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newClassSubjectAllocation: ClassSubjectAllocation = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.classsubjectallocations.insert(newClassSubjectAllocation);
    return newClassSubjectAllocation;
  }, [dbInstance]);

  const updateClassSubjectAllocation = useCallback(async (id: string, data: Partial<ClassSubjectAllocation>): Promise<ClassSubjectAllocation | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.classsubjectallocations.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteClassSubjectAllocation = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.classsubjectallocations.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentSubjectEnrollment CRUD operations
  const addStudentSubjectEnrollment = useCallback(async (data: Omit<StudentSubjectEnrollment, 'id'>): Promise<StudentSubjectEnrollment> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentSubjectEnrollment: StudentSubjectEnrollment = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentsubjectenrollments.insert(newStudentSubjectEnrollment);
    return newStudentSubjectEnrollment;
  }, [dbInstance]);

  const updateStudentSubjectEnrollment = useCallback(async (id: string, data: Partial<StudentSubjectEnrollment>): Promise<StudentSubjectEnrollment | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentsubjectenrollments.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentSubjectEnrollment = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentsubjectenrollments.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // TeacherSubjectAssignment CRUD operations
  const addTeacherSubjectAssignment = useCallback(async (data: Omit<TeacherSubjectAssignment, 'id'>): Promise<TeacherSubjectAssignment> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newTeacherSubjectAssignment: TeacherSubjectAssignment = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.teachersubjectassignments.insert(newTeacherSubjectAssignment);
    return newTeacherSubjectAssignment;
  }, [dbInstance]);

  const updateTeacherSubjectAssignment = useCallback(async (id: string, data: Partial<TeacherSubjectAssignment>): Promise<TeacherSubjectAssignment | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.teachersubjectassignments.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteTeacherSubjectAssignment = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.teachersubjectassignments.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // GradingSchemeLevel CRUD operations
  const addGradingSchemeLevel = useCallback(async (data: Omit<GradingSchemeLevel, 'id'>): Promise<GradingSchemeLevel> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newGradingSchemeLevel: GradingSchemeLevel = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.gradingschemelevels.insert(newGradingSchemeLevel);
    return newGradingSchemeLevel;
  }, [dbInstance]);

  const updateGradingSchemeLevel = useCallback(async (id: string, data: Partial<GradingSchemeLevel>): Promise<GradingSchemeLevel | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.gradingschemelevels.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteGradingSchemeLevel = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.gradingschemelevels.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // GradingScheme CRUD operations
  const addGradingScheme = useCallback(async (data: Omit<GradingScheme, 'id'>): Promise<GradingScheme> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newGradingScheme: GradingScheme = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.gradingschemes.insert(newGradingScheme);
    return newGradingScheme;
  }, [dbInstance]);

  const updateGradingScheme = useCallback(async (id: string, data: Partial<GradingScheme>): Promise<GradingScheme | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.gradingschemes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteGradingScheme = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.gradingschemes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // ExamPaperSetting CRUD operations
  const addExamPaperSetting = useCallback(async (data: Omit<ExamPaperSetting, 'id'>): Promise<ExamPaperSetting> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newExamPaperSetting: ExamPaperSetting = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.exampapersettings.insert(newExamPaperSetting);
    return newExamPaperSetting;
  }, [dbInstance]);

  const updateExamPaperSetting = useCallback(async (id: string, data: Partial<ExamPaperSetting>): Promise<ExamPaperSetting | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.exampapersettings.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteExamPaperSetting = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.exampapersettings.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // ExamSession CRUD operations
  const addExamSession = useCallback(async (data: Omit<ExamSession, 'id'>): Promise<ExamSession> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newExamSession: ExamSession = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.examsessions.insert(newExamSession);
    return newExamSession;
  }, [dbInstance]);

  const updateExamSession = useCallback(async (id: string, data: Partial<ExamSession>): Promise<ExamSession | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.examsessions.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteExamSession = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.examsessions.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentPaperMark CRUD operations
  const addStudentPaperMark = useCallback(async (data: Omit<StudentPaperMark, 'id'>): Promise<StudentPaperMark> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentPaperMark: StudentPaperMark = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentpapermarks.insert(newStudentPaperMark);
    return newStudentPaperMark;
  }, [dbInstance]);

  const updateStudentPaperMark = useCallback(async (id: string, data: Partial<StudentPaperMark>): Promise<StudentPaperMark | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentpapermarks.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentPaperMark = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentpapermarks.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentExamResult CRUD operations
  const addStudentExamResult = useCallback(async (data: Omit<StudentExamResult, 'id'>): Promise<StudentExamResult> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentExamResult: StudentExamResult = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentexamresults.insert(newStudentExamResult);
    return newStudentExamResult;
  }, [dbInstance]);

  const updateStudentExamResult = useCallback(async (id: string, data: Partial<StudentExamResult>): Promise<StudentExamResult | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentexamresults.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentExamResult = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentexamresults.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // TimetableEntry CRUD operations
  const addTimetableEntry = useCallback(async (data: Omit<TimetableEntry, 'id'>): Promise<TimetableEntry> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newTimetableEntry: TimetableEntry = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.timetableentrys.insert(newTimetableEntry);
    return newTimetableEntry;
  }, [dbInstance]);

  const updateTimetableEntry = useCallback(async (id: string, data: Partial<TimetableEntry>): Promise<TimetableEntry | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.timetableentrys.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteTimetableEntry = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.timetableentrys.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // ExamResultSummary CRUD operations
  const addExamResultSummary = useCallback(async (data: Omit<ExamResultSummary, 'id'>): Promise<ExamResultSummary> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newExamResultSummary: ExamResultSummary = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.examresultsummarys.insert(newExamResultSummary);
    return newExamResultSummary;
  }, [dbInstance]);

  const updateExamResultSummary = useCallback(async (id: string, data: Partial<ExamResultSummary>): Promise<ExamResultSummary | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.examresultsummarys.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteExamResultSummary = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.examresultsummarys.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentFinancialSummary CRUD operations
  const addStudentFinancialSummary = useCallback(async (data: Omit<StudentFinancialSummary, 'id'>): Promise<StudentFinancialSummary> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentFinancialSummary: StudentFinancialSummary = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentfinancialsummarys.insert(newStudentFinancialSummary);
    return newStudentFinancialSummary;
  }, [dbInstance]);

  const updateStudentFinancialSummary = useCallback(async (id: string, data: Partial<StudentFinancialSummary>): Promise<StudentFinancialSummary | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentfinancialsummarys.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentFinancialSummary = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentfinancialsummarys.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentInvoiceChargeItem CRUD operations
  const addStudentInvoiceChargeItem = useCallback(async (data: Omit<StudentInvoiceChargeItem, 'id'>): Promise<StudentInvoiceChargeItem> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentInvoiceChargeItem: StudentInvoiceChargeItem = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentinvoicechargeitems.insert(newStudentInvoiceChargeItem);
    return newStudentInvoiceChargeItem;
  }, [dbInstance]);

  const updateStudentInvoiceChargeItem = useCallback(async (id: string, data: Partial<StudentInvoiceChargeItem>): Promise<StudentInvoiceChargeItem | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentinvoicechargeitems.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentInvoiceChargeItem = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentinvoicechargeitems.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentPaymentLogItem CRUD operations
  const addStudentPaymentLogItem = useCallback(async (data: Omit<StudentPaymentLogItem, 'id'>): Promise<StudentPaymentLogItem> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentPaymentLogItem: StudentPaymentLogItem = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentpaymentlogitems.insert(newStudentPaymentLogItem);
    return newStudentPaymentLogItem;
  }, [dbInstance]);

  const updateStudentPaymentLogItem = useCallback(async (id: string, data: Partial<StudentPaymentLogItem>): Promise<StudentPaymentLogItem | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentpaymentlogitems.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentPaymentLogItem = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentpaymentlogitems.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentEnrolledSubject CRUD operations
  const addStudentEnrolledSubject = useCallback(async (data: Omit<StudentEnrolledSubject, 'id'>): Promise<StudentEnrolledSubject> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentEnrolledSubject: StudentEnrolledSubject = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentenrolledsubjects.insert(newStudentEnrolledSubject);
    return newStudentEnrolledSubject;
  }, [dbInstance]);

  const updateStudentEnrolledSubject = useCallback(async (id: string, data: Partial<StudentEnrolledSubject>): Promise<StudentEnrolledSubject | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentenrolledsubjects.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentEnrolledSubject = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentenrolledsubjects.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AdminPartnerType CRUD operations
  const addAdminPartnerType = useCallback(async (data: Omit<AdminPartnerType, 'id'>): Promise<AdminPartnerType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAdminPartnerType: AdminPartnerType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.adminpartnertypes.insert(newAdminPartnerType);
    return newAdminPartnerType;
  }, [dbInstance]);

  const updateAdminPartnerType = useCallback(async (id: string, data: Partial<AdminPartnerType>): Promise<AdminPartnerType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminpartnertypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAdminPartnerType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminpartnertypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AdminClubAndSocietyType CRUD operations
  const addAdminClubAndSocietyType = useCallback(async (data: Omit<AdminClubAndSocietyType, 'id'>): Promise<AdminClubAndSocietyType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAdminClubAndSocietyType: AdminClubAndSocietyType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.adminclubandsocietytypes.insert(newAdminClubAndSocietyType);
    return newAdminClubAndSocietyType;
  }, [dbInstance]);

  const updateAdminClubAndSocietyType = useCallback(async (id: string, data: Partial<AdminClubAndSocietyType>): Promise<AdminClubAndSocietyType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminclubandsocietytypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAdminClubAndSocietyType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminclubandsocietytypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AdminCustomerType CRUD operations
  const addAdminCustomerType = useCallback(async (data: Omit<AdminCustomerType, 'id'>): Promise<AdminCustomerType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAdminCustomerType: AdminCustomerType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.admincustomertypes.insert(newAdminCustomerType);
    return newAdminCustomerType;
  }, [dbInstance]);

  const updateAdminCustomerType = useCallback(async (id: string, data: Partial<AdminCustomerType>): Promise<AdminCustomerType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.admincustomertypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAdminCustomerType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.admincustomertypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AdminStudentHealthRecordType CRUD operations
  const addAdminStudentHealthRecordType = useCallback(async (data: Omit<AdminStudentHealthRecordType, 'id'>): Promise<AdminStudentHealthRecordType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAdminStudentHealthRecordType: AdminStudentHealthRecordType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.adminstudenthealthrecordtypes.insert(newAdminStudentHealthRecordType);
    return newAdminStudentHealthRecordType;
  }, [dbInstance]);

  const updateAdminStudentHealthRecordType = useCallback(async (id: string, data: Partial<AdminStudentHealthRecordType>): Promise<AdminStudentHealthRecordType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminstudenthealthrecordtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAdminStudentHealthRecordType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminstudenthealthrecordtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AdminStudentAttendanceType CRUD operations
  const addAdminStudentAttendanceType = useCallback(async (data: Omit<AdminStudentAttendanceType, 'id'>): Promise<AdminStudentAttendanceType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAdminStudentAttendanceType: AdminStudentAttendanceType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.adminstudentattendancetypes.insert(newAdminStudentAttendanceType);
    return newAdminStudentAttendanceType;
  }, [dbInstance]);

  const updateAdminStudentAttendanceType = useCallback(async (id: string, data: Partial<AdminStudentAttendanceType>): Promise<AdminStudentAttendanceType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminstudentattendancetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAdminStudentAttendanceType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.adminstudentattendancetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AdminTemplateCommType CRUD operations
  const addAdminTemplateCommType = useCallback(async (data: Omit<AdminTemplateCommType, 'id'>): Promise<AdminTemplateCommType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAdminTemplateCommType: AdminTemplateCommType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.admintemplatecommtypes.insert(newAdminTemplateCommType);
    return newAdminTemplateCommType;
  }, [dbInstance]);

  const updateAdminTemplateCommType = useCallback(async (id: string, data: Partial<AdminTemplateCommType>): Promise<AdminTemplateCommType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.admintemplatecommtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAdminTemplateCommType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.admintemplatecommtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AdminCampaignType CRUD operations
  const addAdminCampaignType = useCallback(async (data: Omit<AdminCampaignType, 'id'>): Promise<AdminCampaignType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAdminCampaignType: AdminCampaignType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.admincampaigntypes.insert(newAdminCampaignType);
    return newAdminCampaignType;
  }, [dbInstance]);

  const updateAdminCampaignType = useCallback(async (id: string, data: Partial<AdminCampaignType>): Promise<AdminCampaignType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.admincampaigntypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAdminCampaignType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.admincampaigntypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // WorkflowState CRUD operations
  const addWorkflowState = useCallback(async (data: Omit<WorkflowState, 'id'>): Promise<WorkflowState> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newWorkflowState: WorkflowState = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.workflowstates.insert(newWorkflowState);
    return newWorkflowState;
  }, [dbInstance]);

  const updateWorkflowState = useCallback(async (id: string, data: Partial<WorkflowState>): Promise<WorkflowState | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.workflowstates.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteWorkflowState = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.workflowstates.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Workflow CRUD operations
  const addWorkflow = useCallback(async (data: Omit<Workflow, 'id'>): Promise<Workflow> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.workflows.insert(newWorkflow);
    return newWorkflow;
  }, [dbInstance]);

  const updateWorkflow = useCallback(async (id: string, data: Partial<Workflow>): Promise<Workflow | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.workflows.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteWorkflow = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.workflows.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // ParentsGuardian CRUD operations
  const addParentsGuardian = useCallback(async (data: Omit<ParentsGuardian, 'id'>): Promise<ParentsGuardian> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newParentsGuardian: ParentsGuardian = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.parentsguardians.insert(newParentsGuardian);
    return newParentsGuardian;
  }, [dbInstance]);

  const updateParentsGuardian = useCallback(async (id: string, data: Partial<ParentsGuardian>): Promise<ParentsGuardian | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.parentsguardians.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteParentsGuardian = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.parentsguardians.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentHealthRecord CRUD operations
  const addStudentHealthRecord = useCallback(async (data: Omit<StudentHealthRecord, 'id'>): Promise<StudentHealthRecord> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentHealthRecord: StudentHealthRecord = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studenthealthrecords.insert(newStudentHealthRecord);
    return newStudentHealthRecord;
  }, [dbInstance]);

  const updateStudentHealthRecord = useCallback(async (id: string, data: Partial<StudentHealthRecord>): Promise<StudentHealthRecord | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studenthealthrecords.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentHealthRecord = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studenthealthrecords.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Dormitory CRUD operations
  const addDormitory = useCallback(async (data: Omit<Dormitory, 'id'>): Promise<Dormitory> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newDormitory: Dormitory = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.dormitorys.insert(newDormitory);
    return newDormitory;
  }, [dbInstance]);

  const updateDormitory = useCallback(async (id: string, data: Partial<Dormitory>): Promise<Dormitory | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.dormitorys.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteDormitory = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.dormitorys.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentCategory CRUD operations
  const addStudentCategory = useCallback(async (data: Omit<StudentCategory, 'id'>): Promise<StudentCategory> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentCategory: StudentCategory = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentcategorys.insert(newStudentCategory);
    return newStudentCategory;
  }, [dbInstance]);

  const updateStudentCategory = useCallback(async (id: string, data: Partial<StudentCategory>): Promise<StudentCategory | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentcategorys.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentCategory = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentcategorys.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Designation CRUD operations
  const addDesignation = useCallback(async (data: Omit<Designation, 'id'>): Promise<Designation> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newDesignation: Designation = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.designations.insert(newDesignation);
    return newDesignation;
  }, [dbInstance]);

  const updateDesignation = useCallback(async (id: string, data: Partial<Designation>): Promise<Designation | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.designations.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteDesignation = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.designations.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Department CRUD operations
  const addDepartment = useCallback(async (data: Omit<Department, 'id'>): Promise<Department> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newDepartment: Department = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.departments.insert(newDepartment);
    return newDepartment;
  }, [dbInstance]);

  const updateDepartment = useCallback(async (id: string, data: Partial<Department>): Promise<Department | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.departments.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteDepartment = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.departments.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinChartOfAccountType CRUD operations
  const addFinChartOfAccountType = useCallback(async (data: Omit<FinChartOfAccountType, 'id'>): Promise<FinChartOfAccountType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinChartOfAccountType: FinChartOfAccountType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finchartofaccounttypes.insert(newFinChartOfAccountType);
    return newFinChartOfAccountType;
  }, [dbInstance]);

  const updateFinChartOfAccountType = useCallback(async (id: string, data: Partial<FinChartOfAccountType>): Promise<FinChartOfAccountType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finchartofaccounttypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinChartOfAccountType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finchartofaccounttypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinExpenseCategoryType CRUD operations
  const addFinExpenseCategoryType = useCallback(async (data: Omit<FinExpenseCategoryType, 'id'>): Promise<FinExpenseCategoryType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinExpenseCategoryType: FinExpenseCategoryType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finexpensecategorytypes.insert(newFinExpenseCategoryType);
    return newFinExpenseCategoryType;
  }, [dbInstance]);

  const updateFinExpenseCategoryType = useCallback(async (id: string, data: Partial<FinExpenseCategoryType>): Promise<FinExpenseCategoryType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finexpensecategorytypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinExpenseCategoryType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finexpensecategorytypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinBankType CRUD operations
  const addFinBankType = useCallback(async (data: Omit<FinBankType, 'id'>): Promise<FinBankType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinBankType: FinBankType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finbanktypes.insert(newFinBankType);
    return newFinBankType;
  }, [dbInstance]);

  const updateFinBankType = useCallback(async (id: string, data: Partial<FinBankType>): Promise<FinBankType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finbanktypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinBankType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finbanktypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinSupplierType CRUD operations
  const addFinSupplierType = useCallback(async (data: Omit<FinSupplierType, 'id'>): Promise<FinSupplierType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinSupplierType: FinSupplierType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finsuppliertypes.insert(newFinSupplierType);
    return newFinSupplierType;
  }, [dbInstance]);

  const updateFinSupplierType = useCallback(async (id: string, data: Partial<FinSupplierType>): Promise<FinSupplierType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finsuppliertypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinSupplierType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finsuppliertypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinFeeTemplateItemType CRUD operations
  const addFinFeeTemplateItemType = useCallback(async (data: Omit<FinFeeTemplateItemType, 'id'>): Promise<FinFeeTemplateItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinFeeTemplateItemType: FinFeeTemplateItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finfeetemplateitemtypes.insert(newFinFeeTemplateItemType);
    return newFinFeeTemplateItemType;
  }, [dbInstance]);

  const updateFinFeeTemplateItemType = useCallback(async (id: string, data: Partial<FinFeeTemplateItemType>): Promise<FinFeeTemplateItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finfeetemplateitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinFeeTemplateItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finfeetemplateitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinFeeTemplateType CRUD operations
  const addFinFeeTemplateType = useCallback(async (data: Omit<FinFeeTemplateType, 'id'>): Promise<FinFeeTemplateType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinFeeTemplateType: FinFeeTemplateType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finfeetemplatetypes.insert(newFinFeeTemplateType);
    return newFinFeeTemplateType;
  }, [dbInstance]);

  const updateFinFeeTemplateType = useCallback(async (id: string, data: Partial<FinFeeTemplateType>): Promise<FinFeeTemplateType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finfeetemplatetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinFeeTemplateType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finfeetemplatetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinExpenseClaimType CRUD operations
  const addFinExpenseClaimType = useCallback(async (data: Omit<FinExpenseClaimType, 'id'>): Promise<FinExpenseClaimType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinExpenseClaimType: FinExpenseClaimType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finexpenseclaimtypes.insert(newFinExpenseClaimType);
    return newFinExpenseClaimType;
  }, [dbInstance]);

  const updateFinExpenseClaimType = useCallback(async (id: string, data: Partial<FinExpenseClaimType>): Promise<FinExpenseClaimType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finexpenseclaimtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinExpenseClaimType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finexpenseclaimtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinStudentOpeningBalanceType CRUD operations
  const addFinStudentOpeningBalanceType = useCallback(async (data: Omit<FinStudentOpeningBalanceType, 'id'>): Promise<FinStudentOpeningBalanceType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinStudentOpeningBalanceType: FinStudentOpeningBalanceType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finstudentopeningbalancetypes.insert(newFinStudentOpeningBalanceType);
    return newFinStudentOpeningBalanceType;
  }, [dbInstance]);

  const updateFinStudentOpeningBalanceType = useCallback(async (id: string, data: Partial<FinStudentOpeningBalanceType>): Promise<FinStudentOpeningBalanceType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finstudentopeningbalancetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinStudentOpeningBalanceType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finstudentopeningbalancetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinFeeAdjustmentType CRUD operations
  const addFinFeeAdjustmentType = useCallback(async (data: Omit<FinFeeAdjustmentType, 'id'>): Promise<FinFeeAdjustmentType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinFeeAdjustmentType: FinFeeAdjustmentType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finfeeadjustmenttypes.insert(newFinFeeAdjustmentType);
    return newFinFeeAdjustmentType;
  }, [dbInstance]);

  const updateFinFeeAdjustmentType = useCallback(async (id: string, data: Partial<FinFeeAdjustmentType>): Promise<FinFeeAdjustmentType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finfeeadjustmenttypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinFeeAdjustmentType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finfeeadjustmenttypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinTransportRouteType CRUD operations
  const addFinTransportRouteType = useCallback(async (data: Omit<FinTransportRouteType, 'id'>): Promise<FinTransportRouteType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinTransportRouteType: FinTransportRouteType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fintransportroutetypes.insert(newFinTransportRouteType);
    return newFinTransportRouteType;
  }, [dbInstance]);

  const updateFinTransportRouteType = useCallback(async (id: string, data: Partial<FinTransportRouteType>): Promise<FinTransportRouteType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fintransportroutetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinTransportRouteType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fintransportroutetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinStudentTransportAssignmentType CRUD operations
  const addFinStudentTransportAssignmentType = useCallback(async (data: Omit<FinStudentTransportAssignmentType, 'id'>): Promise<FinStudentTransportAssignmentType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinStudentTransportAssignmentType: FinStudentTransportAssignmentType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finstudenttransportassignmenttypes.insert(newFinStudentTransportAssignmentType);
    return newFinStudentTransportAssignmentType;
  }, [dbInstance]);

  const updateFinStudentTransportAssignmentType = useCallback(async (id: string, data: Partial<FinStudentTransportAssignmentType>): Promise<FinStudentTransportAssignmentType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finstudenttransportassignmenttypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinStudentTransportAssignmentType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finstudenttransportassignmenttypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinStudentInvoiceItemType CRUD operations
  const addFinStudentInvoiceItemType = useCallback(async (data: Omit<FinStudentInvoiceItemType, 'id'>): Promise<FinStudentInvoiceItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinStudentInvoiceItemType: FinStudentInvoiceItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finstudentinvoiceitemtypes.insert(newFinStudentInvoiceItemType);
    return newFinStudentInvoiceItemType;
  }, [dbInstance]);

  const updateFinStudentInvoiceItemType = useCallback(async (id: string, data: Partial<FinStudentInvoiceItemType>): Promise<FinStudentInvoiceItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finstudentinvoiceitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinStudentInvoiceItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.finstudentinvoiceitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinStudentInvoiceType CRUD operations
  const addFinStudentInvoiceType = useCallback(async (data: Omit<FinStudentInvoiceType, 'id'>): Promise<FinStudentInvoiceType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinStudentInvoiceType: FinStudentInvoiceType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finstudentinvoicetypes.insert(newFinStudentInvoiceType);
    return newFinStudentInvoiceType;
  }, [dbInstance]);

  const updateFinStudentInvoiceType = useCallback(async (id: string, data: Partial<FinStudentInvoiceType>): Promise<FinStudentInvoiceType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finstudentinvoicetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinStudentInvoiceType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.finstudentinvoicetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinStudentPaymentType CRUD operations
  const addFinStudentPaymentType = useCallback(async (data: Omit<FinStudentPaymentType, 'id'>): Promise<FinStudentPaymentType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinStudentPaymentType: FinStudentPaymentType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finstudentpaymenttypes.insert(newFinStudentPaymentType);
    return newFinStudentPaymentType;
  }, [dbInstance]);

  const updateFinStudentPaymentType = useCallback(async (id: string, data: Partial<FinStudentPaymentType>): Promise<FinStudentPaymentType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finstudentpaymenttypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinStudentPaymentType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.finstudentpaymenttypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinInvoicePaymentApplicationType CRUD operations
  const addFinInvoicePaymentApplicationType = useCallback(async (data: Omit<FinInvoicePaymentApplicationType, 'id'>): Promise<FinInvoicePaymentApplicationType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinInvoicePaymentApplicationType: FinInvoicePaymentApplicationType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fininvoicepaymentapplicationtypes.insert(newFinInvoicePaymentApplicationType);
    return newFinInvoicePaymentApplicationType;
  }, [dbInstance]);

  const updateFinInvoicePaymentApplicationType = useCallback(async (id: string, data: Partial<FinInvoicePaymentApplicationType>): Promise<FinInvoicePaymentApplicationType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fininvoicepaymentapplicationtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinInvoicePaymentApplicationType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fininvoicepaymentapplicationtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinCustomerInvoiceItemType CRUD operations
  const addFinCustomerInvoiceItemType = useCallback(async (data: Omit<FinCustomerInvoiceItemType, 'id'>): Promise<FinCustomerInvoiceItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinCustomerInvoiceItemType: FinCustomerInvoiceItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fincustomerinvoiceitemtypes.insert(newFinCustomerInvoiceItemType);
    return newFinCustomerInvoiceItemType;
  }, [dbInstance]);

  const updateFinCustomerInvoiceItemType = useCallback(async (id: string, data: Partial<FinCustomerInvoiceItemType>): Promise<FinCustomerInvoiceItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fincustomerinvoiceitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinCustomerInvoiceItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fincustomerinvoiceitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinCustomerInvoiceType CRUD operations
  const addFinCustomerInvoiceType = useCallback(async (data: Omit<FinCustomerInvoiceType, 'id'>): Promise<FinCustomerInvoiceType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinCustomerInvoiceType: FinCustomerInvoiceType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fincustomerinvoicetypes.insert(newFinCustomerInvoiceType);
    return newFinCustomerInvoiceType;
  }, [dbInstance]);

  const updateFinCustomerInvoiceType = useCallback(async (id: string, data: Partial<FinCustomerInvoiceType>): Promise<FinCustomerInvoiceType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fincustomerinvoicetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinCustomerInvoiceType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fincustomerinvoicetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinSupplierInvoiceType CRUD operations
  const addFinSupplierInvoiceType = useCallback(async (data: Omit<FinSupplierInvoiceType, 'id'>): Promise<FinSupplierInvoiceType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinSupplierInvoiceType: FinSupplierInvoiceType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.finsupplierinvoicetypes.insert(newFinSupplierInvoiceType);
    return newFinSupplierInvoiceType;
  }, [dbInstance]);

  const updateFinSupplierInvoiceType = useCallback(async (id: string, data: Partial<FinSupplierInvoiceType>): Promise<FinSupplierInvoiceType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.finsupplierinvoicetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinSupplierInvoiceType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.finsupplierinvoicetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinGeneralPaymentItemType CRUD operations
  const addFinGeneralPaymentItemType = useCallback(async (data: Omit<FinGeneralPaymentItemType, 'id'>): Promise<FinGeneralPaymentItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinGeneralPaymentItemType: FinGeneralPaymentItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fingeneralpaymentitemtypes.insert(newFinGeneralPaymentItemType);
    return newFinGeneralPaymentItemType;
  }, [dbInstance]);

  const updateFinGeneralPaymentItemType = useCallback(async (id: string, data: Partial<FinGeneralPaymentItemType>): Promise<FinGeneralPaymentItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fingeneralpaymentitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinGeneralPaymentItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fingeneralpaymentitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinGeneralPaymentType CRUD operations
  const addFinGeneralPaymentType = useCallback(async (data: Omit<FinGeneralPaymentType, 'id'>): Promise<FinGeneralPaymentType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinGeneralPaymentType: FinGeneralPaymentType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fingeneralpaymenttypes.insert(newFinGeneralPaymentType);
    return newFinGeneralPaymentType;
  }, [dbInstance]);

  const updateFinGeneralPaymentType = useCallback(async (id: string, data: Partial<FinGeneralPaymentType>): Promise<FinGeneralPaymentType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fingeneralpaymenttypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinGeneralPaymentType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fingeneralpaymenttypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FinGeneralLedgerEntryType CRUD operations
  const addFinGeneralLedgerEntryType = useCallback(async (data: Omit<FinGeneralLedgerEntryType, 'id'>): Promise<FinGeneralLedgerEntryType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFinGeneralLedgerEntryType: FinGeneralLedgerEntryType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fingeneralledgerentrytypes.insert(newFinGeneralLedgerEntryType);
    return newFinGeneralLedgerEntryType;
  }, [dbInstance]);

  const updateFinGeneralLedgerEntryType = useCallback(async (id: string, data: Partial<FinGeneralLedgerEntryType>): Promise<FinGeneralLedgerEntryType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fingeneralledgerentrytypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFinGeneralLedgerEntryType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fingeneralledgerentrytypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // HRPayrollPeriodType CRUD operations
  const addHRPayrollPeriodType = useCallback(async (data: Omit<HRPayrollPeriodType, 'id'>): Promise<HRPayrollPeriodType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newHRPayrollPeriodType: HRPayrollPeriodType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.hrpayrollperiodtypes.insert(newHRPayrollPeriodType);
    return newHRPayrollPeriodType;
  }, [dbInstance]);

  const updateHRPayrollPeriodType = useCallback(async (id: string, data: Partial<HRPayrollPeriodType>): Promise<HRPayrollPeriodType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.hrpayrollperiodtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteHRPayrollPeriodType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.hrpayrollperiodtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // HRPayrollItemTypeType CRUD operations
  const addHRPayrollItemTypeType = useCallback(async (data: Omit<HRPayrollItemTypeType, 'id'>): Promise<HRPayrollItemTypeType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newHRPayrollItemTypeType: HRPayrollItemTypeType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.hrpayrollitemtypetypes.insert(newHRPayrollItemTypeType);
    return newHRPayrollItemTypeType;
  }, [dbInstance]);

  const updateHRPayrollItemTypeType = useCallback(async (id: string, data: Partial<HRPayrollItemTypeType>): Promise<HRPayrollItemTypeType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.hrpayrollitemtypetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteHRPayrollItemTypeType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.hrpayrollitemtypetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // HRStaffRecurringItemType CRUD operations
  const addHRStaffRecurringItemType = useCallback(async (data: Omit<HRStaffRecurringItemType, 'id'>): Promise<HRStaffRecurringItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newHRStaffRecurringItemType: HRStaffRecurringItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.hrstaffrecurringitemtypes.insert(newHRStaffRecurringItemType);
    return newHRStaffRecurringItemType;
  }, [dbInstance]);

  const updateHRStaffRecurringItemType = useCallback(async (id: string, data: Partial<HRStaffRecurringItemType>): Promise<HRStaffRecurringItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.hrstaffrecurringitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteHRStaffRecurringItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.hrstaffrecurringitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // HRStaffSalarySettingType CRUD operations
  const addHRStaffSalarySettingType = useCallback(async (data: Omit<HRStaffSalarySettingType, 'id'>): Promise<HRStaffSalarySettingType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newHRStaffSalarySettingType: HRStaffSalarySettingType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.hrstaffsalarysettingtypes.insert(newHRStaffSalarySettingType);
    return newHRStaffSalarySettingType;
  }, [dbInstance]);

  const updateHRStaffSalarySettingType = useCallback(async (id: string, data: Partial<HRStaffSalarySettingType>): Promise<HRStaffSalarySettingType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.hrstaffsalarysettingtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteHRStaffSalarySettingType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.hrstaffsalarysettingtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // HRPayslipItemType CRUD operations
  const addHRPayslipItemType = useCallback(async (data: Omit<HRPayslipItemType, 'id'>): Promise<HRPayslipItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newHRPayslipItemType: HRPayslipItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.hrpayslipitemtypes.insert(newHRPayslipItemType);
    return newHRPayslipItemType;
  }, [dbInstance]);

  const updateHRPayslipItemType = useCallback(async (id: string, data: Partial<HRPayslipItemType>): Promise<HRPayslipItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.hrpayslipitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteHRPayslipItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.hrpayslipitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // HRPayslipType CRUD operations
  const addHRPayslipType = useCallback(async (data: Omit<HRPayslipType, 'id'>): Promise<HRPayslipType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newHRPayslipType: HRPayslipType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.hrpaysliptypes.insert(newHRPayslipType);
    return newHRPayslipType;
  }, [dbInstance]);

  const updateHRPayslipType = useCallback(async (id: string, data: Partial<HRPayslipType>): Promise<HRPayslipType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.hrpaysliptypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteHRPayslipType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.hrpaysliptypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // PayrollPeriod CRUD operations
  const addPayrollPeriod = useCallback(async (data: Omit<PayrollPeriod, 'id'>): Promise<PayrollPeriod> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newPayrollPeriod: PayrollPeriod = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.payrollperiods.insert(newPayrollPeriod);
    return newPayrollPeriod;
  }, [dbInstance]);

  const updatePayrollPeriod = useCallback(async (id: string, data: Partial<PayrollPeriod>): Promise<PayrollPeriod | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.payrollperiods.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deletePayrollPeriod = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.payrollperiods.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // PayrollItemType CRUD operations
  const addPayrollItemType = useCallback(async (data: Omit<PayrollItemType, 'id'>): Promise<PayrollItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newPayrollItemType: PayrollItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.payrollitemtypes.insert(newPayrollItemType);
    return newPayrollItemType;
  }, [dbInstance]);

  const updatePayrollItemType = useCallback(async (id: string, data: Partial<PayrollItemType>): Promise<PayrollItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.payrollitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deletePayrollItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.payrollitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StaffRecurringItem CRUD operations
  const addStaffRecurringItem = useCallback(async (data: Omit<StaffRecurringItem, 'id'>): Promise<StaffRecurringItem> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStaffRecurringItem: StaffRecurringItem = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.staffrecurringitems.insert(newStaffRecurringItem);
    return newStaffRecurringItem;
  }, [dbInstance]);

  const updateStaffRecurringItem = useCallback(async (id: string, data: Partial<StaffRecurringItem>): Promise<StaffRecurringItem | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.staffrecurringitems.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStaffRecurringItem = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.staffrecurringitems.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StaffSalarySetting CRUD operations
  const addStaffSalarySetting = useCallback(async (data: Omit<StaffSalarySetting, 'id'>): Promise<StaffSalarySetting> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStaffSalarySetting: StaffSalarySetting = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.staffsalarysettings.insert(newStaffSalarySetting);
    return newStaffSalarySetting;
  }, [dbInstance]);

  const updateStaffSalarySetting = useCallback(async (id: string, data: Partial<StaffSalarySetting>): Promise<StaffSalarySetting | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.staffsalarysettings.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStaffSalarySetting = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.staffsalarysettings.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // PayslipItem CRUD operations
  const addPayslipItem = useCallback(async (data: Omit<PayslipItem, 'id'>): Promise<PayslipItem> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newPayslipItem: PayslipItem = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.payslipitems.insert(newPayslipItem);
    return newPayslipItem;
  }, [dbInstance]);

  const updatePayslipItem = useCallback(async (id: string, data: Partial<PayslipItem>): Promise<PayslipItem | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.payslipitems.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deletePayslipItem = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.payslipitems.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Payslip CRUD operations
  const addPayslip = useCallback(async (data: Omit<Payslip, 'id'>): Promise<Payslip> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newPayslip: Payslip = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.payslips.insert(newPayslip);
    return newPayslip;
  }, [dbInstance]);

  const updatePayslip = useCallback(async (id: string, data: Partial<Payslip>): Promise<Payslip | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.payslips.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deletePayslip = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.payslips.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvRFQType CRUD operations
  const addInvRFQType = useCallback(async (data: Omit<InvRFQType, 'id'>): Promise<InvRFQType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvRFQType: InvRFQType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invrfqtypes.insert(newInvRFQType);
    return newInvRFQType;
  }, [dbInstance]);

  const updateInvRFQType = useCallback(async (id: string, data: Partial<InvRFQType>): Promise<InvRFQType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invrfqtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvRFQType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invrfqtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvWarehouseType CRUD operations
  const addInvWarehouseType = useCallback(async (data: Omit<InvWarehouseType, 'id'>): Promise<InvWarehouseType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvWarehouseType: InvWarehouseType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invwarehousetypes.insert(newInvWarehouseType);
    return newInvWarehouseType;
  }, [dbInstance]);

  const updateInvWarehouseType = useCallback(async (id: string, data: Partial<InvWarehouseType>): Promise<InvWarehouseType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invwarehousetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvWarehouseType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invwarehousetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvItemCategoryType CRUD operations
  const addInvItemCategoryType = useCallback(async (data: Omit<InvItemCategoryType, 'id'>): Promise<InvItemCategoryType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvItemCategoryType: InvItemCategoryType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invitemcategorytypes.insert(newInvItemCategoryType);
    return newInvItemCategoryType;
  }, [dbInstance]);

  const updateInvItemCategoryType = useCallback(async (id: string, data: Partial<InvItemCategoryType>): Promise<InvItemCategoryType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invitemcategorytypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvItemCategoryType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invitemcategorytypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvItemType CRUD operations
  const addInvItemType = useCallback(async (data: Omit<InvItemType, 'id'>): Promise<InvItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvItemType: InvItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invitemtypes.insert(newInvItemType);
    return newInvItemType;
  }, [dbInstance]);

  const updateInvItemType = useCallback(async (id: string, data: Partial<InvItemType>): Promise<InvItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvFixedAssetType CRUD operations
  const addInvFixedAssetType = useCallback(async (data: Omit<InvFixedAssetType, 'id'>): Promise<InvFixedAssetType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvFixedAssetType: InvFixedAssetType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invfixedassettypes.insert(newInvFixedAssetType);
    return newInvFixedAssetType;
  }, [dbInstance]);

  const updateInvFixedAssetType = useCallback(async (id: string, data: Partial<InvFixedAssetType>): Promise<InvFixedAssetType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invfixedassettypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvFixedAssetType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invfixedassettypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvAssetDepreciationLogType CRUD operations
  const addInvAssetDepreciationLogType = useCallback(async (data: Omit<InvAssetDepreciationLogType, 'id'>): Promise<InvAssetDepreciationLogType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvAssetDepreciationLogType: InvAssetDepreciationLogType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invassetdepreciationlogtypes.insert(newInvAssetDepreciationLogType);
    return newInvAssetDepreciationLogType;
  }, [dbInstance]);

  const updateInvAssetDepreciationLogType = useCallback(async (id: string, data: Partial<InvAssetDepreciationLogType>): Promise<InvAssetDepreciationLogType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invassetdepreciationlogtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvAssetDepreciationLogType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invassetdepreciationlogtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvStockLevelType CRUD operations
  const addInvStockLevelType = useCallback(async (data: Omit<InvStockLevelType, 'id'>): Promise<InvStockLevelType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvStockLevelType: InvStockLevelType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invstockleveltypes.insert(newInvStockLevelType);
    return newInvStockLevelType;
  }, [dbInstance]);

  const updateInvStockLevelType = useCallback(async (id: string, data: Partial<InvStockLevelType>): Promise<InvStockLevelType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invstockleveltypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvStockLevelType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invstockleveltypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvStockTransactionType CRUD operations
  const addInvStockTransactionType = useCallback(async (data: Omit<InvStockTransactionType, 'id'>): Promise<InvStockTransactionType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvStockTransactionType: InvStockTransactionType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invstocktransactiontypes.insert(newInvStockTransactionType);
    return newInvStockTransactionType;
  }, [dbInstance]);

  const updateInvStockTransactionType = useCallback(async (id: string, data: Partial<InvStockTransactionType>): Promise<InvStockTransactionType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invstocktransactiontypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvStockTransactionType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invstocktransactiontypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvRequisitionItemType CRUD operations
  const addInvRequisitionItemType = useCallback(async (data: Omit<InvRequisitionItemType, 'id'>): Promise<InvRequisitionItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvRequisitionItemType: InvRequisitionItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invrequisitionitemtypes.insert(newInvRequisitionItemType);
    return newInvRequisitionItemType;
  }, [dbInstance]);

  const updateInvRequisitionItemType = useCallback(async (id: string, data: Partial<InvRequisitionItemType>): Promise<InvRequisitionItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invrequisitionitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvRequisitionItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invrequisitionitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvRequisitionType CRUD operations
  const addInvRequisitionType = useCallback(async (data: Omit<InvRequisitionType, 'id'>): Promise<InvRequisitionType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvRequisitionType: InvRequisitionType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invrequisitiontypes.insert(newInvRequisitionType);
    return newInvRequisitionType;
  }, [dbInstance]);

  const updateInvRequisitionType = useCallback(async (id: string, data: Partial<InvRequisitionType>): Promise<InvRequisitionType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invrequisitiontypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvRequisitionType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invrequisitiontypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvPurchaseOrderItemType CRUD operations
  const addInvPurchaseOrderItemType = useCallback(async (data: Omit<InvPurchaseOrderItemType, 'id'>): Promise<InvPurchaseOrderItemType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvPurchaseOrderItemType: InvPurchaseOrderItemType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invpurchaseorderitemtypes.insert(newInvPurchaseOrderItemType);
    return newInvPurchaseOrderItemType;
  }, [dbInstance]);

  const updateInvPurchaseOrderItemType = useCallback(async (id: string, data: Partial<InvPurchaseOrderItemType>): Promise<InvPurchaseOrderItemType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invpurchaseorderitemtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvPurchaseOrderItemType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invpurchaseorderitemtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // InvPurchaseOrderType CRUD operations
  const addInvPurchaseOrderType = useCallback(async (data: Omit<InvPurchaseOrderType, 'id'>): Promise<InvPurchaseOrderType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newInvPurchaseOrderType: InvPurchaseOrderType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.invpurchaseordertypes.insert(newInvPurchaseOrderType);
    return newInvPurchaseOrderType;
  }, [dbInstance]);

  const updateInvPurchaseOrderType = useCallback(async (id: string, data: Partial<InvPurchaseOrderType>): Promise<InvPurchaseOrderType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.invpurchaseordertypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteInvPurchaseOrderType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.invpurchaseordertypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Warehouse CRUD operations
  const addWarehouse = useCallback(async (data: Omit<Warehouse, 'id'>): Promise<Warehouse> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newWarehouse: Warehouse = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.warehouses.insert(newWarehouse);
    return newWarehouse;
  }, [dbInstance]);

  const updateWarehouse = useCallback(async (id: string, data: Partial<Warehouse>): Promise<Warehouse | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.warehouses.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteWarehouse = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.warehouses.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // ItemCategoryInv CRUD operations
  const addItemCategoryInv = useCallback(async (data: Omit<ItemCategoryInv, 'id'>): Promise<ItemCategoryInv> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newItemCategoryInv: ItemCategoryInv = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.itemcategoryinvs.insert(newItemCategoryInv);
    return newItemCategoryInv;
  }, [dbInstance]);

  const updateItemCategoryInv = useCallback(async (id: string, data: Partial<ItemCategoryInv>): Promise<ItemCategoryInv | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.itemcategoryinvs.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteItemCategoryInv = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.itemcategoryinvs.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // ItemInv CRUD operations
  const addItemInv = useCallback(async (data: Omit<ItemInv, 'id'>): Promise<ItemInv> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newItemInv: ItemInv = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.iteminvs.insert(newItemInv);
    return newItemInv;
  }, [dbInstance]);

  const updateItemInv = useCallback(async (id: string, data: Partial<ItemInv>): Promise<ItemInv | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.iteminvs.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteItemInv = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.iteminvs.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // FixedAsset CRUD operations
  const addFixedAsset = useCallback(async (data: Omit<FixedAsset, 'id'>): Promise<FixedAsset> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFixedAsset: FixedAsset = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fixedassets.insert(newFixedAsset);
    return newFixedAsset;
  }, [dbInstance]);

  const updateFixedAsset = useCallback(async (id: string, data: Partial<FixedAsset>): Promise<FixedAsset | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fixedassets.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFixedAsset = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fixedassets.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // AssetDepreciationLog CRUD operations
  const addAssetDepreciationLog = useCallback(async (data: Omit<AssetDepreciationLog, 'id'>): Promise<AssetDepreciationLog> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newAssetDepreciationLog: AssetDepreciationLog = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.assetdepreciationlogs.insert(newAssetDepreciationLog);
    return newAssetDepreciationLog;
  }, [dbInstance]);

  const updateAssetDepreciationLog = useCallback(async (id: string, data: Partial<AssetDepreciationLog>): Promise<AssetDepreciationLog | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.assetdepreciationlogs.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteAssetDepreciationLog = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.assetdepreciationlogs.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StockLevel CRUD operations
  const addStockLevel = useCallback(async (data: Omit<StockLevel, 'id'>): Promise<StockLevel> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStockLevel: StockLevel = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.stocklevels.insert(newStockLevel);
    return newStockLevel;
  }, [dbInstance]);

  const updateStockLevel = useCallback(async (id: string, data: Partial<StockLevel>): Promise<StockLevel | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.stocklevels.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStockLevel = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.stocklevels.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StockTransaction CRUD operations
  const addStockTransaction = useCallback(async (data: Omit<StockTransaction, 'id'>): Promise<StockTransaction> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStockTransaction: StockTransaction = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.stocktransactions.insert(newStockTransaction);
    return newStockTransaction;
  }, [dbInstance]);

  const updateStockTransaction = useCallback(async (id: string, data: Partial<StockTransaction>): Promise<StockTransaction | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.stocktransactions.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStockTransaction = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.stocktransactions.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // RequisitionItem CRUD operations
  const addRequisitionItem = useCallback(async (data: Omit<RequisitionItem, 'id'>): Promise<RequisitionItem> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newRequisitionItem: RequisitionItem = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.requisitionitems.insert(newRequisitionItem);
    return newRequisitionItem;
  }, [dbInstance]);

  const updateRequisitionItem = useCallback(async (id: string, data: Partial<RequisitionItem>): Promise<RequisitionItem | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.requisitionitems.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteRequisitionItem = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.requisitionitems.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Requisition CRUD operations
  const addRequisition = useCallback(async (data: Omit<Requisition, 'id'>): Promise<Requisition> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newRequisition: Requisition = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.requisitions.insert(newRequisition);
    return newRequisition;
  }, [dbInstance]);

  const updateRequisition = useCallback(async (id: string, data: Partial<Requisition>): Promise<Requisition | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.requisitions.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteRequisition = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.requisitions.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // PurchaseOrderItem CRUD operations
  const addPurchaseOrderItem = useCallback(async (data: Omit<PurchaseOrderItem, 'id'>): Promise<PurchaseOrderItem> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newPurchaseOrderItem: PurchaseOrderItem = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.purchaseorderitems.insert(newPurchaseOrderItem);
    return newPurchaseOrderItem;
  }, [dbInstance]);

  const updatePurchaseOrderItem = useCallback(async (id: string, data: Partial<PurchaseOrderItem>): Promise<PurchaseOrderItem | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.purchaseorderitems.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deletePurchaseOrderItem = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.purchaseorderitems.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // PurchaseOrder CRUD operations
  const addPurchaseOrder = useCallback(async (data: Omit<PurchaseOrder, 'id'>): Promise<PurchaseOrder> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newPurchaseOrder: PurchaseOrder = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.purchaseorders.insert(newPurchaseOrder);
    return newPurchaseOrder;
  }, [dbInstance]);

  const updatePurchaseOrder = useCallback(async (id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.purchaseorders.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deletePurchaseOrder = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.purchaseorders.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // LibBookCategoryType CRUD operations
  const addLibBookCategoryType = useCallback(async (data: Omit<LibBookCategoryType, 'id'>): Promise<LibBookCategoryType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newLibBookCategoryType: LibBookCategoryType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.libbookcategorytypes.insert(newLibBookCategoryType);
    return newLibBookCategoryType;
  }, [dbInstance]);

  const updateLibBookCategoryType = useCallback(async (id: string, data: Partial<LibBookCategoryType>): Promise<LibBookCategoryType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.libbookcategorytypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteLibBookCategoryType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.libbookcategorytypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // LibBookType CRUD operations
  const addLibBookType = useCallback(async (data: Omit<LibBookType, 'id'>): Promise<LibBookType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newLibBookType: LibBookType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.libbooktypes.insert(newLibBookType);
    return newLibBookType;
  }, [dbInstance]);

  const updateLibBookType = useCallback(async (id: string, data: Partial<LibBookType>): Promise<LibBookType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.libbooktypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteLibBookType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.libbooktypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // LibLoanType CRUD operations
  const addLibLoanType = useCallback(async (data: Omit<LibLoanType, 'id'>): Promise<LibLoanType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newLibLoanType: LibLoanType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.libloantypes.insert(newLibLoanType);
    return newLibLoanType;
  }, [dbInstance]);

  const updateLibLoanType = useCallback(async (id: string, data: Partial<LibLoanType>): Promise<LibLoanType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.libloantypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteLibLoanType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.libloantypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // LibFineType CRUD operations
  const addLibFineType = useCallback(async (data: Omit<LibFineType, 'id'>): Promise<LibFineType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newLibFineType: LibFineType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.libfinetypes.insert(newLibFineType);
    return newLibFineType;
  }, [dbInstance]);

  const updateLibFineType = useCallback(async (id: string, data: Partial<LibFineType>): Promise<LibFineType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.libfinetypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteLibFineType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.libfinetypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // BookCategory CRUD operations
  const addBookCategory = useCallback(async (data: Omit<BookCategory, 'id'>): Promise<BookCategory> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newBookCategory: BookCategory = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.bookcategorys.insert(newBookCategory);
    return newBookCategory;
  }, [dbInstance]);

  const updateBookCategory = useCallback(async (id: string, data: Partial<BookCategory>): Promise<BookCategory | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.bookcategorys.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteBookCategory = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.bookcategorys.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Book CRUD operations
  const addBook = useCallback(async (data: Omit<Book, 'id'>): Promise<Book> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newBook: Book = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.books.insert(newBook);
    return newBook;
  }, [dbInstance]);

  const updateBook = useCallback(async (id: string, data: Partial<Book>): Promise<Book | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.books.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteBook = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.books.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Loan CRUD operations
  const addLoan = useCallback(async (data: Omit<Loan, 'id'>): Promise<Loan> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newLoan: Loan = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.loans.insert(newLoan);
    return newLoan;
  }, [dbInstance]);

  const updateLoan = useCallback(async (id: string, data: Partial<Loan>): Promise<Loan | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.loans.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteLoan = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.loans.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Fine CRUD operations
  const addFine = useCallback(async (data: Omit<Fine, 'id'>): Promise<Fine> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newFine: Fine = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.fines.insert(newFine);
    return newFine;
  }, [dbInstance]);

  const updateFine = useCallback(async (id: string, data: Partial<Fine>): Promise<Fine | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.fines.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteFine = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.fines.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // NutrMealPlanType CRUD operations
  const addNutrMealPlanType = useCallback(async (data: Omit<NutrMealPlanType, 'id'>): Promise<NutrMealPlanType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newNutrMealPlanType: NutrMealPlanType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.nutrmealplantypes.insert(newNutrMealPlanType);
    return newNutrMealPlanType;
  }, [dbInstance]);

  const updateNutrMealPlanType = useCallback(async (id: string, data: Partial<NutrMealPlanType>): Promise<NutrMealPlanType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.nutrmealplantypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteNutrMealPlanType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.nutrmealplantypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // NutrStudentMealPlanType CRUD operations
  const addNutrStudentMealPlanType = useCallback(async (data: Omit<NutrStudentMealPlanType, 'id'>): Promise<NutrStudentMealPlanType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newNutrStudentMealPlanType: NutrStudentMealPlanType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.nutrstudentmealplantypes.insert(newNutrStudentMealPlanType);
    return newNutrStudentMealPlanType;
  }, [dbInstance]);

  const updateNutrStudentMealPlanType = useCallback(async (id: string, data: Partial<NutrStudentMealPlanType>): Promise<NutrStudentMealPlanType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.nutrstudentmealplantypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteNutrStudentMealPlanType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.nutrstudentmealplantypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // NutrMenuType CRUD operations
  const addNutrMenuType = useCallback(async (data: Omit<NutrMenuType, 'id'>): Promise<NutrMenuType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newNutrMenuType: NutrMenuType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.nutrmenutypes.insert(newNutrMenuType);
    return newNutrMenuType;
  }, [dbInstance]);

  const updateNutrMenuType = useCallback(async (id: string, data: Partial<NutrMenuType>): Promise<NutrMenuType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.nutrmenutypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteNutrMenuType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.nutrmenutypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // NutrMealConsumptionLogType CRUD operations
  const addNutrMealConsumptionLogType = useCallback(async (data: Omit<NutrMealConsumptionLogType, 'id'>): Promise<NutrMealConsumptionLogType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newNutrMealConsumptionLogType: NutrMealConsumptionLogType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.nutrmealconsumptionlogtypes.insert(newNutrMealConsumptionLogType);
    return newNutrMealConsumptionLogType;
  }, [dbInstance]);

  const updateNutrMealConsumptionLogType = useCallback(async (id: string, data: Partial<NutrMealConsumptionLogType>): Promise<NutrMealConsumptionLogType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.nutrmealconsumptionlogtypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteNutrMealConsumptionLogType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.nutrmealconsumptionlogtypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // NutrMerchantType CRUD operations
  const addNutrMerchantType = useCallback(async (data: Omit<NutrMerchantType, 'id'>): Promise<NutrMerchantType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newNutrMerchantType: NutrMerchantType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.nutrmerchanttypes.insert(newNutrMerchantType);
    return newNutrMerchantType;
  }, [dbInstance]);

  const updateNutrMerchantType = useCallback(async (id: string, data: Partial<NutrMerchantType>): Promise<NutrMerchantType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.nutrmerchanttypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteNutrMerchantType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.nutrmerchanttypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // NutrStudentWalletType CRUD operations
  const addNutrStudentWalletType = useCallback(async (data: Omit<NutrStudentWalletType, 'id'>): Promise<NutrStudentWalletType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newNutrStudentWalletType: NutrStudentWalletType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.nutrstudentwallettypes.insert(newNutrStudentWalletType);
    return newNutrStudentWalletType;
  }, [dbInstance]);

  const updateNutrStudentWalletType = useCallback(async (id: string, data: Partial<NutrStudentWalletType>): Promise<NutrStudentWalletType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.nutrstudentwallettypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteNutrStudentWalletType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.nutrstudentwallettypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // NutrWalletTransactionType CRUD operations
  const addNutrWalletTransactionType = useCallback(async (data: Omit<NutrWalletTransactionType, 'id'>): Promise<NutrWalletTransactionType> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newNutrWalletTransactionType: NutrWalletTransactionType = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.nutrwallettransactiontypes.insert(newNutrWalletTransactionType);
    return newNutrWalletTransactionType;
  }, [dbInstance]);

  const updateNutrWalletTransactionType = useCallback(async (id: string, data: Partial<NutrWalletTransactionType>): Promise<NutrWalletTransactionType | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.nutrwallettransactiontypes.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteNutrWalletTransactionType = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.nutrwallettransactiontypes.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // MealPlan CRUD operations
  const addMealPlan = useCallback(async (data: Omit<MealPlan, 'id'>): Promise<MealPlan> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newMealPlan: MealPlan = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.mealplans.insert(newMealPlan);
    return newMealPlan;
  }, [dbInstance]);

  const updateMealPlan = useCallback(async (id: string, data: Partial<MealPlan>): Promise<MealPlan | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.mealplans.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteMealPlan = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.mealplans.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentMealPlan CRUD operations
  const addStudentMealPlan = useCallback(async (data: Omit<StudentMealPlan, 'id'>): Promise<StudentMealPlan> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentMealPlan: StudentMealPlan = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentmealplans.insert(newStudentMealPlan);
    return newStudentMealPlan;
  }, [dbInstance]);

  const updateStudentMealPlan = useCallback(async (id: string, data: Partial<StudentMealPlan>): Promise<StudentMealPlan | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentmealplans.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentMealPlan = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.studentmealplans.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Menu CRUD operations
  const addMenu = useCallback(async (data: Omit<Menu, 'id'>): Promise<Menu> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newMenu: Menu = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.menus.insert(newMenu);
    return newMenu;
  }, [dbInstance]);

  const updateMenu = useCallback(async (id: string, data: Partial<Menu>): Promise<Menu | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.menus.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteMenu = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.menus.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // MealConsumptionLog CRUD operations
  const addMealConsumptionLog = useCallback(async (data: Omit<MealConsumptionLog, 'id'>): Promise<MealConsumptionLog> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newMealConsumptionLog: MealConsumptionLog = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.mealconsumptionlogs.insert(newMealConsumptionLog);
    return newMealConsumptionLog;
  }, [dbInstance]);

  const updateMealConsumptionLog = useCallback(async (id: string, data: Partial<MealConsumptionLog>): Promise<MealConsumptionLog | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.mealconsumptionlogs.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteMealConsumptionLog = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.mealconsumptionlogs.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // WalletTransaction CRUD operations
  const addWalletTransaction = useCallback(async (data: Omit<WalletTransaction, 'id'>): Promise<WalletTransaction> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newWalletTransaction: WalletTransaction = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.wallettransactions.insert(newWalletTransaction);
    return newWalletTransaction;
  }, [dbInstance]);

  const updateWalletTransaction = useCallback(async (id: string, data: Partial<WalletTransaction>): Promise<WalletTransaction | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.wallettransactions.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteWalletTransaction = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.wallettransactions.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // StudentWallet CRUD operations
  const addStudentWallet = useCallback(async (data: Omit<StudentWallet, 'id'>): Promise<StudentWallet> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newStudentWallet: StudentWallet = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.studentwallets.insert(newStudentWallet);
    return newStudentWallet;
  }, [dbInstance]);

  const updateStudentWallet = useCallback(async (id: string, data: Partial<StudentWallet>): Promise<StudentWallet | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.studentwallets.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteStudentWallet = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.studentwallets.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);

  // Merchant CRUD operations
  const addMerchant = useCallback(async (data: Omit<Merchant, 'id'>): Promise<Merchant> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const newMerchant: Merchant = {
      id: Date.now().toString(),
      ...data
    };
    
    await dbInstance.merchants.insert(newMerchant);
    return newMerchant;
  }, [dbInstance]);

  const updateMerchant = useCallback(async (id: string, data: Partial<Merchant>): Promise<Merchant | null> => {
    if (!dbInstance) {
      throw new Error("Database not initialized");
    }
    
    const doc = await dbInstance.merchants.findOne(id).exec();
    if (!doc) return null;
    
    await doc.patch(data);
    return doc.toJSON();
  }, [dbInstance]);

  const deleteMerchant = useCallback(async (id: string): Promise<boolean> => {
    if (!dbInstance) {
      return unimplementedAsync(id) as Promise<boolean>;
    }
    
    const doc = await dbInstance.merchants.findOne(id).exec();
    if (!doc) return false;
    
    await doc.remove();
    return true;
  }, [dbInstance]);
return {
          ...studentBase,
          financial_summary: { totalFees: 0, totalPaid: 0, currentBalance: 0, totalDiscount:0, totalFine:0 },
          invoices_charges: [],
          payment_history: [],
          enrolled_subjects: []
      };
  }, [dbInstance]);

  const getStudentFinancialDetailsById = useCallback(async (studentId: string): Promise<allTypes.StudentDetailProfile | null> => {
      return getStudentDetailsById(studentId); // Alias for now
  }, [getStudentDetailsById]);


  const updateSchoolDetails = useCallback(async (details: Partial<allTypes.SchoolDetails>) => {
    if (!dbInstance) return null;
    const doc = await dbInstance.school_details.findOne(1).exec();
    const finalDetails = { ...doc?.toJSON(), ...details, updated_at: new Date().toISOString() };
    await doc?.patch(finalDetails);
    return finalDetails as allTypes.SchoolDetails;
  }, [dbInstance]);

  const addGeneric = useCallback(async <T extends Record<string, any>>(collectionName: keyof SchoolDatabaseCollections, docData: Omit<T, 'id' | 'created_at' | 'updated_at'>, idField: keyof T = 'id'): Promise<T> => {
      if (!dbInstance) throw new Error("DB not ready");
      const collection = dbInstance[collectionName] as RxCollection<T>;
      const isNumericId = collection.schema.jsonSchema.properties[idField as string].type === 'number';
      const newDoc = {
          ...docData,
          [idField]: isNumericId ? generateNumericId() : generateId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
      };
      const inserted = await collection.insert(newDoc as RxDocumentData<T>);
      return inserted.toJSON() as T;
  }, [dbInstance]);

  const updateGeneric = useCallback(async <T extends Record<string, any>>(collectionName: keyof SchoolDatabaseCollections, updatedDocData: T, idField: keyof T = 'id'): Promise<T> => {
      if (!dbInstance) throw new Error("DB not ready");
      const collection = dbInstance[collectionName] as RxCollection<T>;
      const doc = await collection.findOne({selector: {[idField]: updatedDocData[idField]}}).exec();
      if (!doc) throw new Error("Document not found");
      const finalData = { ...updatedDocData, updated_at: new Date().toISOString() };
      await doc.patch(finalData as Partial<T>);
      return finalData;
  }, [dbInstance]);
  
  const deleteGeneric = useCallback(async (collectionName: keyof SchoolDatabaseCollections, id: string | number) => {
    if (!dbInstance) throw new Error("DB not ready");
    const collection = dbInstance[collectionName] as RxCollection<any>;
    const doc = await collection.findOne(id).exec();
    if(doc) await doc.remove();
  }, [dbInstance]);


  const contextValue: AppDataContextType = useMemo(() => ({
    ...(data as any),
    loading,
    initializationError,
    isRxDBModeActive: !!dbInstance && !initializationError,
    isUsingRxDBDummyData,
    triggerSeedRxDB,
    triggerClearRxDB,
    rawInitialData: mockDataForSeeding,
    
    // Core CRUDs
    updateSchoolDetails,
    addUser: (d) => addGeneric('users', d, 'id'),
    updateUser: (d) => updateGeneric('users', d, 'id'),
    deleteUser: (id) => deleteGeneric('users', id),
    addRole: (d) => addGeneric('roles', d, 'id'),
    updateRole: (d) => updateGeneric('roles', d, 'id'),
    deleteRole: (id) => deleteGeneric('roles', id),
    
    // Administration
    addStudent: (d) => addGeneric('students', d, 'id'),
    updateStudent: (d) => updateGeneric('students', d, 'id'),
    deleteStudent: (id) => deleteGeneric('students', id),
    getStudentDetailsById,
    getStudentFinancialDetailsById,
    addStaffMember: (d) => addGeneric('staff', d, 'id'),
    updateStaffMember: (d) => updateGeneric('staff', d, 'id'),
    deleteStaffMember: (id) => deleteGeneric('staff', id),
    addDepartment: (d) => addGeneric('departments', d, 'id'),
    updateDepartment: (d) => updateGeneric('departments', d, 'id'),
    deleteDepartment: (id) => deleteGeneric('departments', id),
    addDesignation: (d) => addGeneric('designations', d, 'id'),
    updateDesignation: (d) => updateGeneric('designations', d, 'id'),
    deleteDesignation: (id) => deleteGeneric('designations', id),
    addStudentCategory: (d) => addGeneric('student_categories', d, 'id'),
    updateStudentCategory: (d) => updateGeneric('student_categories', d, 'id'),
    deleteStudentCategory: (id) => deleteGeneric('student_categories', id),
    addDormitory: (d) => addGeneric('dormitories', d, 'id'),
    updateDormitory: (d) => updateGeneric('dormitories', d, 'id'),
    deleteDormitory: (id) => deleteGeneric('dormitories', id),
    addAcademicYearStructure: (d) => addGeneric('academic_year_structures', d, 'id'),
    updateAcademicYearStructure: (d) => updateGeneric('academic_year_structures', d, 'id'),
    deleteAcademicYearStructure: (id) => deleteGeneric('academic_year_structures', id),
    addAcademicPeriodDefinition: (d) => addGeneric('academic_period_definitions', d, 'id'),
    updateAcademicPeriodDefinition: (d) => updateGeneric('academic_period_definitions', d, 'id'),
    deleteAcademicPeriodDefinition: (id) => deleteGeneric('academic_period_definitions', id),
    addAcademicYear: (d) => addGeneric('academic_years', d, 'id'),
    updateAcademicYear: (d) => updateGeneric('academic_years', d, 'id'),
    deleteAcademicYear: (id) => deleteGeneric('academic_years', id),
    addSchoolPeriod: (d) => addGeneric('school_periods', d, 'id'),
    updateSchoolPeriod: (d) => updateGeneric('school_periods', d, 'id'),
    deleteSchoolPeriod: (id) => deleteGeneric('school_periods', id),
    addPartner: (d) => addGeneric('partners', d, 'id'),
    updatePartner: (d) => updateGeneric('partners', d, 'id'),
    deletePartner: (id) => deleteGeneric('partners', id),
    addClub: (d) => addGeneric('clubs', d, 'id'),
    updateClub: (d) => updateGeneric('clubs', d, 'id'),
    deleteClub: (id) => deleteGeneric('clubs', id),
    addCustomer: (d) => addGeneric('customers', d, 'id'),
    updateCustomer: (d) => updateGeneric('customers', d, 'id'),
    deleteCustomer: (id) => deleteGeneric('customers', id),
    addStudentHealthRecord: (d) => addGeneric('student_health_records', d, 'id'),
    updateStudentHealthRecord: (d) => updateGeneric('student_health_records', d, 'id'),
    
    // Academics
    addClass: (d) => addGeneric('classes', d, 'id'),
    updateClass: (d) => updateGeneric('classes', d, 'id'),
    deleteClass: (id) => deleteGeneric('classes', id),
    addClassStream: async (classId, streamData) => {
        const newStream = await addGeneric('class_streams', {...streamData, class_id: classId}, 'id');
        const classDoc = await dbInstance?.classes.findOne(classId).exec();
        await classDoc?.patch({ streams: [...(classDoc.toJSON().streams || []), newStream] });
        return newStream;
    },
    updateClassStream: (d) => updateGeneric('class_streams', d, 'id'),
    deleteClassStream: (id) => deleteGeneric('class_streams', id),
    addSubject: (d) => addGeneric('subjects', d, 'id'),
    updateSubject: (d) => updateGeneric('subjects', d, 'id'),
    deleteSubject: (id) => deleteGeneric('subjects', id),

    // Attendance
    saveStudentAttendance: (d) => addGeneric('student_attendance', d, 'id'),
    getStudentAttendanceByFilters: (filters) => {
      if (!dbInstance) return [];
      // Simple implementation - in real app would apply filters
      return data.studentAttendance || [];
    },
    
    // Communication
    addTemplateComm: (d) => addGeneric('templates_comm', d, 'id'),
    updateTemplateComm: (d) => updateGeneric('templates_comm', d, 'id'),
    deleteTemplateComm: (id) => deleteGeneric('templates_comm', id),
    addCampaign: (d) => addGeneric('campaigns', d, 'id'),
    updateCampaign: (d) => updateGeneric('campaigns', d, 'id'),
    deleteCampaign: (id) => deleteGeneric('campaigns', id),
    
    // Audit
    addAuditLog: (d) => addGeneric('audit_logs', d, 'id'),
    
    // Academic Subject Papers
    addSubjectPaper: (d) => addGeneric('subject_papers', d, 'id'),
    updateSubjectPaper: (d) => updateGeneric('subject_papers', d, 'id'),
    deleteSubjectPaper: (id) => deleteGeneric('subject_papers', id),
    
    // Exam Sessions
    addExamSession: (d) => addGeneric('exam_sessions', d, 'id'),
    updateExamSession: (d) => updateGeneric('exam_sessions', d, 'id'),
    deleteExamSession: (id) => deleteGeneric('exam_sessions', id),
    
    // Exam Paper Settings
    addExamPaperSetting: (d) => addGeneric('exam_paper_settings', d, 'id'),
    updateExamPaperSetting: (d) => updateGeneric('exam_paper_settings', d, 'id'),
    deleteExamPaperSetting: (id) => deleteGeneric('exam_paper_settings', id),
    
    // Grading Schemes
    addGradingScheme: (d) => addGeneric('grading_schemes', d, 'id'),
    updateGradingScheme: (d) => updateGeneric('grading_schemes', d, 'id'),
    deleteGradingScheme: (id) => deleteGeneric('grading_schemes', id),
    
    // Exam Entry Functions
    getStudentsForExamEntry: (classId, sessionId) => {
      if (!dbInstance) return [];
      return data.students?.filter(s => s.class_id === classId) || [];
    },
    getExamPaperSettingsForSession: (sessionId) => {
      if (!dbInstance) return [];
      return data.examPaperSettings?.filter(eps => eps.exam_session_id === sessionId) || [];
    },
    
    // Student Exam Results
    saveStudentExamResult: (d) => addGeneric('student_exam_results', d, 'id'),
    
    // Timetable Period Definitions
    getTimetablePeriodDefs: () => data.timetablePeriodDefs || [],
    addTimetablePeriodDef: (d) => addGeneric('timetable_period_defs', d, 'id'),
    updateTimetablePeriodDef: (d) => updateGeneric('timetable_period_defs', d, 'id'),
    deleteTimetablePeriodDef: (id) => deleteGeneric('timetable_period_defs', id),
    
    // Timetable Entries
    getTimetableEntries: () => data.timetableEntries || [],
    addTimetableEntry: (d) => addGeneric('timetable_entries', d, 'id'),
    updateTimetableEntry: (d) => updateGeneric('timetable_entries', d, 'id'),
    deleteTimetableEntry: (id) => deleteGeneric('timetable_entries', id),
    
    // Class Subject Allocations
    addClassSubjectAllocation: (d) => addGeneric('class_subject_allocations', d, 'id'),
    updateClassSubjectAllocation: (d) => updateGeneric('class_subject_allocations', d, 'id'),
    deleteClassSubjectAllocation: (id) => deleteGeneric('class_subject_allocations', id),
    
    // Teacher Subject Assignments
    addTeacherSubjectAssignment: (d) => addGeneric('teacher_subject_assignments', d, 'id'),
    deleteTeacherSubjectAssignment: (id) => deleteGeneric('teacher_subject_assignments', id),
    
    // Student Subject Enrollments
    addStudentSubjectEnrollment: (d) => addGeneric('student_subject_enrollments', d, 'id'),
    updateStudentSubjectEnrollment: (d) => updateGeneric('student_subject_enrollments', d, 'id'),
    deleteStudentSubjectEnrollment: (id) => deleteGeneric('student_subject_enrollments', id),
    
    // Chart of Accounts
    addChartOfAccount: (d) => addGeneric('chart_of_accounts', d, 'id'),
    updateChartOfAccount: (d) => updateGeneric('chart_of_accounts', d, 'id'),
    deleteChartOfAccount: (id) => deleteGeneric('chart_of_accounts', id),
    
    // Banks
    addBank: (d) => addGeneric('banks', d, 'id'),
    updateBank: (d) => updateGeneric('banks', d, 'id'),
    deleteBank: (id) => deleteGeneric('banks', id),
    
    // Suppliers
    addSupplier: (d) => addGeneric('suppliers', d, 'id'),
    updateSupplier: (d) => updateGeneric('suppliers', d, 'id'),
    deleteSupplier: (id) => deleteGeneric('suppliers', id),
    
    // Fee Templates
    addFeeTemplate: (d) => addGeneric('fee_templates', d, 'id'),
    updateFeeTemplate: (d) => updateGeneric('fee_templates', d, 'id'),
    deleteFeeTemplate: (id) => deleteGeneric('fee_templates', id),
    
    // Expense Claims
    addExpenseClaim: (d) => addGeneric('expense_claims', d, 'id'),
    updateExpenseClaim: (d) => updateGeneric('expense_claims', d, 'id'),
    deleteExpenseClaim: (id) => deleteGeneric('expense_claims', id),
    
    // Expense Categories
    addExpenseCategory: (d) => addGeneric('expense_categories', d, 'id'),
    updateExpenseCategory: (d) => updateGeneric('expense_categories', d, 'id'),
    deleteExpenseCategory: (id) => deleteGeneric('expense_categories', id),
    
    // Customer Invoices
    addCustomerInvoice: (d) => addGeneric('customer_invoices', d, 'id'),
    updateCustomerInvoice: (d) => updateGeneric('customer_invoices', d, 'id'),
    deleteCustomerInvoice: (id) => deleteGeneric('customer_invoices', id),
    
    // Supplier Invoices
    addSupplierInvoice: (d) => addGeneric('supplier_invoices', d, 'id'),
    updateSupplierInvoice: (d) => updateGeneric('supplier_invoices', d, 'id'),
    deleteSupplierInvoice: (id) => deleteGeneric('supplier_invoices', id),
    
    // Student Opening Balances
    addStudentOpeningBalance: (d) => addGeneric('student_opening_balances', d, 'id'),
    updateStudentOpeningBalance: (d) => updateGeneric('student_opening_balances', d, 'id'),
    deleteStudentOpeningBalance: (id) => deleteGeneric('student_opening_balances', id),
    
    // Fee Adjustments
    addFeeAdjustment: (d) => addGeneric('fee_adjustments', d, 'id'),
    updateFeeAdjustment: (d) => updateGeneric('fee_adjustments', d, 'id'),
    deleteFeeAdjustment: (id) => deleteGeneric('fee_adjustments', id),
    
    // Transport Routes
    addTransportRoute: (d) => addGeneric('transport_routes', d, 'id'),
    updateTransportRoute: (d) => updateGeneric('transport_routes', d, 'id'),
    deleteTransportRoute: (id) => deleteGeneric('transport_routes', id),
    
    // Student Transport Assignments
    addStudentTransportAssignment: (d) => addGeneric('student_transport_assignments', d, 'id'),
    updateStudentTransportAssignment: (d) => updateGeneric('student_transport_assignments', d, 'id'),
    deleteStudentTransportAssignment: (id) => deleteGeneric('student_transport_assignments', id),
    
    // Student Invoice Generation and Payments
    generateStudentInvoices: async (params) => {
      // Implementation for generating student invoices
      if (!dbInstance) throw new Error("DB not ready");
      // This would contain complex logic for invoice generation
      console.log("Generating student invoices with params:", params);
      return { success: true, invoicesGenerated: 0 };
    },
    addStudentPayment: (d) => addGeneric('student_payments', d, 'id'),
    updateStudentPayment: (d) => updateGeneric('student_payments', d, 'id'),
    deleteStudentPayment: (id) => deleteGeneric('student_payments', id),
    applyPaymentToInvoices: async (paymentId, invoiceApplications) => {
      if (!dbInstance) throw new Error("DB not ready");
      // Implementation for applying payments to invoices
      console.log("Applying payment", paymentId, "to invoices:", invoiceApplications);
      return { success: true };
    },
    
    // General Payments
    addGeneralPayment: (d) => addGeneric('general_payments', d, 'id'),
    updateGeneralPayment: (d) => updateGeneric('general_payments', d, 'id'),
    deleteGeneralPayment: (id) => deleteGeneric('general_payments', id),
    
    // Financial Years
    addFinancialYear: (d) => addGeneric('financial_years', d, 'id'),
    updateFinancialYear: (d) => updateGeneric('financial_years', d, 'id'),
    deleteFinancialYear: (id) => deleteGeneric('financial_years', id),
    
    // Payroll Periods
    addPayrollPeriod: (d) => addGeneric('payroll_periods', d, 'id'),
    updatePayrollPeriod: (d) => updateGeneric('payroll_periods', d, 'id'),
    deletePayrollPeriod: (id) => deleteGeneric('payroll_periods', id),
    
    // Payroll Item Types
    addPayrollItemType: (d) => addGeneric('payroll_item_types', d, 'id'),
    updatePayrollItemType: (d) => updateGeneric('payroll_item_types', d, 'id'),
    deletePayrollItemType: (id) => deleteGeneric('payroll_item_types', id),
    
    // Staff Salary Settings and Payslips
    updateStaffSalarySetting: (d) => updateGeneric('staff_salary_settings', d, 'staff_id'),
    generatePayslipsForPeriod: async (periodId) => {
      if (!dbInstance) throw new Error("DB not ready");
      // Implementation for generating payslips
      console.log("Generating payslips for period:", periodId);
      return { success: true, payslipsGenerated: 0 };
    },
    
    // Warehouses
    addWarehouse: (d) => addGeneric('warehouses', d, 'id'),
    updateWarehouse: (d) => updateGeneric('warehouses', d, 'id'),
    deleteWarehouse: (id) => deleteGeneric('warehouses', id),
    
    // Item Categories (Inventory)
    addItemCategoryInv: (d) => addGeneric('item_categories_inv', d, 'id'),
    updateItemCategoryInv: (d) => updateGeneric('item_categories_inv', d, 'id'),
    deleteItemCategoryInv: (id) => deleteGeneric('item_categories_inv', id),
    
    // Items (Inventory)
    addItemInv: (d) => addGeneric('items_inv', d, 'id'),
    updateItemInv: (d) => updateGeneric('items_inv', d, 'id'),
    deleteItemInv: (id) => deleteGeneric('items_inv', id),
    
    // Fixed Assets
    addFixedAsset: (d) => addGeneric('fixed_assets', d, 'id'),
    updateFixedAsset: (d) => updateGeneric('fixed_assets', d, 'id'),
    deleteFixedAsset: (id) => deleteGeneric('fixed_assets', id),
    
    // Asset Depreciation Logs
    addAssetDepreciationLog: (d) => addGeneric('asset_depreciation_logs', d, 'id'),
    
    // Requisitions
    addRequisition: (d) => addGeneric('requisitions', d, 'id'),
    updateRequisition: (d) => updateGeneric('requisitions', d, 'id'),
    deleteRequisition: (id) => deleteGeneric('requisitions', id),
    updateRequisitionStatus: async (id, status) => {
      if (!dbInstance) throw new Error("DB not ready");
      const doc = await dbInstance.requisitions.findOne(id).exec();
      if (!doc) throw new Error("Requisition not found");
      await doc.patch({ status, updated_at: new Date().toISOString() });
      return doc.toJSON();
    },
    
    // Purchase Orders
    addPurchaseOrder: (d) => addGeneric('purchase_orders', d, 'id'),
    updatePurchaseOrder: (d) => updateGeneric('purchase_orders', d, 'id'),
    deletePurchaseOrder: (id) => deleteGeneric('purchase_orders', id),
    
    // Stock Transactions
    addStockTransaction: (d) => addGeneric('stock_transactions', d, 'id'),
    
    // RFQs
    addRfq: (d) => addGeneric('rfqs', d, 'id'),
    updateRfq: (d) => updateGeneric('rfqs', d, 'id'),
    deleteRfq: (id) => deleteGeneric('rfqs', id),
    
    // Book Categories
    addBookCategory: (d) => addGeneric('book_categories', d, 'id'),
    updateBookCategory: (d) => updateGeneric('book_categories', d, 'id'),
    deleteBookCategory: (id) => deleteGeneric('book_categories', id),
    
    // Books
    addBook: (d) => addGeneric('books', d, 'id'),
    updateBook: (d) => updateGeneric('books', d, 'id'),
    deleteBook: (id) => deleteGeneric('books', id),
    
    // Loans and Fines
    addLoan: (d) => addGeneric('loans', d, 'id'),
    updateLoan: (d) => updateGeneric('loans', d, 'id'),
    addFine: (d) => addGeneric('fines', d, 'id'),
    updateFineStatus: async (id, status) => {
      if (!dbInstance) throw new Error("DB not ready");
      const doc = await dbInstance.fines.findOne(id).exec();
      if (!doc) throw new Error("Fine not found");
      await doc.patch({ status, updated_at: new Date().toISOString() });
      return doc.toJSON();
    },
    
    // Meal Plans
    addMealPlan: (d) => addGeneric('meal_plans', d, 'id'),
    updateMealPlan: (d) => updateGeneric('meal_plans', d, 'id'),
    deleteMealPlan: (id) => deleteGeneric('meal_plans', id),
    
    // Menus
    addMenu: (d) => addGeneric('menus', d, 'id'),
    updateMenu: (d) => updateGeneric('menus', d, 'id'),
    deleteMenu: (id) => deleteGeneric('menus', id),
    
    // Student Meal Plans
    addStudentMealPlan: (d) => addGeneric('student_meal_plans', d, 'id'),
    updateStudentMealPlan: (d) => updateGeneric('student_meal_plans', d, 'id'),
    deleteStudentMealPlan: (id) => deleteGeneric('student_meal_plans', id),
    
    // Meal Consumption Logs
    addMealConsumptionLog: (d) => addGeneric('meal_consumption_logs', d, 'id'),
    
    // Merchants
    addMerchant: (d) => addGeneric('merchants', d, 'id'),
    updateMerchant: (d) => updateGeneric('merchants', d, 'id'),
    deleteMerchant: (id) => deleteGeneric('merchants', id),
    
    // Wallet Transactions
    addWalletTransaction: (d) => addGeneric('wallet_transactions', d, 'id'),
    
    // Workflows
    addWorkflow: (d) => addGeneric('workflows', d, 'id'),
    updateWorkflow: (d) => updateGeneric('workflows', d, 'id'),
    deleteWorkflow: (id) => deleteGeneric('workflows', id),
    addWorkflowState: (d) => addGeneric('workflow_states', d, 'id'),
    updateWorkflowState: (d) => updateGeneric('workflow_states', d, 'id'),
    deleteWorkflowState: (id) => deleteGeneric('workflow_states', id),
    
    // Parent/Guardian Management
    addParentGuardian: (d) => addGeneric('parents_guardians', d, 'id'),
    updateParentGuardian: (d) => updateGeneric('parents_guardians', d, 'id'),
    deleteParentGuardian: (id) => deleteGeneric('parents_guardians', id),
    addStudentGuardianRelationship: (d) => addGeneric('student_guardian_relationships', d, 'id'),
    updateStudentGuardianRelationship: (d) => updateGeneric('student_guardian_relationships', d, 'id'),
    deleteStudentGuardianRelationship: (id) => deleteGeneric('student_guardian_relationships', id),
    // RBAC fields and methods
    permissions: rbac.permissions,
    roles: rbac.roles,
    userRoles: rbac.userRoles,
    addPermission: rbacService.addPermission.bind(rbacService),
    updatePermission: rbacService.updatePermission.bind(rbacService),
    deletePermission: rbacService.deletePermission.bind(rbacService),
    assignUserRole: rbacService.assignRoleToUserDb.bind(rbacService),
    removeUserRole: rbacService.removeRoleFromUserDb.bind(rbacService),
    rbacRoles: rbac.roles,
  }), [data, loading, initializationError, isUsingRxDBDummyData, triggerSeedRxDB, triggerClearRxDB, dbInstance, getStudentDetailsById, updateSchoolDetails, rbac]);
  
  return contextValue;
};
