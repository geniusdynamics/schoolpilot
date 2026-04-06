import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '@/services/databaseService';
import { initialMockHouses, initialMockPointCategories, initialMockPointTransactions } from './mockData';
import type {
  House,
  PointCategory,
  PointTransaction,
  StudentPointSummary,
  HouseLeaderboardEntry,
  TransactionType,
  TransactionStatus
} from './types';

export const useHousesData = () => {
  const [houses, setHouses] = useState<House[]>([]);
  const [categories, setCategories] = useState<PointCategory[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with mock data
  useEffect(() => {
    setHouses(initialMockHouses);
    setCategories(initialMockPointCategories);
    setTransactions(initialMockPointTransactions);
  }, []);

  // Load houses from database
  const loadHouses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['houses'];
      const docs = await collection.find().exec();
      setHouses(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for houses:', err.message);
      setHouses(initialMockHouses);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create house
  const createHouse = useCallback(async (data: Partial<House>) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['houses'];
      const now = new Date().toISOString();
      const newHouse = {
        id: `HOUS${Date.now()}`,
        totalPoints: 0,
        meritPoints: 0,
        demeritPoints: 0,
        memberCount: 0,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as House;
      await collection.insert(newHouse as any);
      setHouses(prev => [...prev, newHouse]);
      return newHouse;
    } catch (err: any) {
      console.warn('Failed to create house in DB, using local state:', err.message);
      const now = new Date().toISOString();
      const newHouse = {
        id: `HOUS${Date.now()}`,
        totalPoints: 0,
        meritPoints: 0,
        demeritPoints: 0,
        memberCount: 0,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as House;
      setHouses(prev => [...prev, newHouse]);
      return newHouse;
    }
  }, []);

  // Update house
  const updateHouse = useCallback(async (id: string, updates: Partial<House>) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['houses'];
      const doc = await collection.findOne(id).exec();
      if (doc) {
        await doc.update({ $set: { ...updates, updatedAt: new Date().toISOString() } });
      }
    } catch (err: any) {
      console.warn('Failed to update house in DB, using local state:', err.message);
    }
    setHouses(prev => prev.map(h => h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h));
  }, []);

  // Delete house
  const deleteHouse = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['houses'];
      const doc = await collection.findOne(id).exec();
      if (doc) await doc.remove();
    } catch (err: any) {
      console.warn('Failed to delete house in DB, using local state:', err.message);
    }
    setHouses(prev => prev.filter(h => h.id !== id));
  }, []);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['point_categories'];
      const docs = await collection.find().exec();
      setCategories(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for categories:', err.message);
      setCategories(initialMockPointCategories);
    }
  }, []);

  // Create category
  const createCategory = useCallback(async (data: Partial<PointCategory>) => {
    const newCategory = { id: `PCAT${Date.now()}`, ...data } as PointCategory;
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, []);

  // Update category
  const updateCategory = useCallback(async (id: string, updates: Partial<PointCategory>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // Delete category
  const deleteCategory = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    try {
      const db = await databaseService.getDatabase();
      const collection = db.collections['point_transactions'];
      const docs = await collection.find().sort({ awardedAt: 'desc' }).exec();
      setTransactions(docs.map(doc => doc.toJSON()));
    } catch (err: any) {
      console.warn('Using mock data for transactions:', err.message);
      setTransactions(initialMockPointTransactions);
    }
  }, []);

  // Create transaction
  const createTransaction = useCallback(async (data: Partial<PointTransaction>) => {
    const newTx = {
      id: `PTRX${Date.now()}`,
      status: 'pending' as TransactionStatus,
      awardedAt: new Date().toISOString(),
      ...data,
    } as PointTransaction;
    setTransactions(prev => [newTx, ...prev]);
    // Update house points
    if (data.houseId && data.points) {
      const actualPoints = data.type === 'demerit' ? -Math.abs(data.points) : Math.abs(data.points);
      setHouses(prev => prev.map(h =>
        h.id === data.houseId
          ? {
              ...h,
              totalPoints: h.totalPoints + actualPoints,
              meritPoints: data.type === 'merit' ? h.meritPoints + actualPoints : h.meritPoints,
              demeritPoints: data.type === 'demerit' ? h.demeritPoints + Math.abs(data.points) : h.demeritPoints,
            }
          : h
      ));
    }
    return newTx;
  }, []);

  // Approve transaction
  const approveTransaction = useCallback(async (id: string, approvedBy: string) => {
    const now = new Date().toISOString();
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'approved' as TransactionStatus, approvedBy, approvedAt: now } : t
    ));
  }, []);

  // Reject transaction
  const rejectTransaction = useCallback(async (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  // Get leaderboard
  const getLeaderboard = useCallback((): HouseLeaderboardEntry[] => {
    return houses
      .map((h, index) => ({
        houseId: h.id,
        houseName: h.name,
        color: h.color,
        totalPoints: h.totalPoints,
        meritPoints: h.meritPoints,
        demeritPoints: h.demeritPoints,
        memberCount: h.memberCount,
        rank: index + 1,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [houses]);

  // Get student point summary
  const getStudentSummary = useCallback((studentId: string): StudentPointSummary | null => {
    const studentTx = transactions.filter(t => t.studentId === studentId);
    if (studentTx.length === 0) return null;

    const meritPoints = studentTx.filter(t => t.type === 'merit').reduce((sum, t) => sum + t.points, 0);
    const demeritPoints = studentTx.filter(t => t.type === 'demerit').reduce((sum, t) => sum + t.points, 0);

    return {
      studentId,
      studentName: studentTx[0]?.studentName || '',
      houseId: studentTx[0]?.houseId || '',
      houseName: studentTx[0]?.houseName || '',
      className: studentTx[0]?.className || '',
      totalPoints: meritPoints + demeritPoints,
      meritPoints,
      demeritPoints,
      netPoints: meritPoints - Math.abs(demeritPoints),
      recentTransactions: studentTx.slice(0, 10),
    };
  }, [transactions]);

  // Get transactions by house
  const getTransactionsByHouse = useCallback((houseId: string) => {
    return transactions.filter(t => t.houseId === houseId);
  }, [transactions]);

  // Get transactions by student
  const getTransactionsByStudent = useCallback((studentId: string) => {
    return transactions.filter(t => t.studentId === studentId);
  }, [transactions]);

  // Get pending transactions
  const getPendingTransactions = useCallback(() => {
    return transactions.filter(t => t.status === 'pending');
  }, [transactions]);

  return {
    houses,
    categories,
    transactions,
    loading,
    error,
    loadHouses,
    loadCategories,
    loadTransactions,
    createHouse,
    updateHouse,
    deleteHouse,
    createCategory,
    updateCategory,
    deleteCategory,
    createTransaction,
    approveTransaction,
    rejectTransaction,
    getLeaderboard,
    getStudentSummary,
    getTransactionsByHouse,
    getTransactionsByStudent,
    getPendingTransactions,
  };
};
