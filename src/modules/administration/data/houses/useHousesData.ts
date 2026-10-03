import { useCallback, useMemo } from 'react';
import { logger } from '@/utils/logging';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';

// ABOUTME: Database-backed hook for the houses module.
// ABOUTME: Reads/writes the real `houses`, `point_categories` and `point_transactions`
// ABOUTME: collections via useDatabaseCollection — no local mock state.

import type {
  House,
  PointCategory,
  PointTransaction,
  StudentPointSummary,
  HouseLeaderboardEntry,
} from './types';

export const useHousesData = () => {
  const housesCollection = useDatabaseCollection<House>('houses');
  const categoriesCollection = useDatabaseCollection<PointCategory>('point_categories');
  const transactionsCollection = useDatabaseCollection<PointTransaction>('point_transactions');

  // Data comes straight from the database — empty until seeded or populated
  const houses = housesCollection.data;
  const categories = categoriesCollection.data;
  const transactions = transactionsCollection.data;

  const loading =
    housesCollection.loading || categoriesCollection.loading || transactionsCollection.loading;
  const error =
    housesCollection.error?.message ||
    categoriesCollection.error?.message ||
    transactionsCollection.error?.message ||
    null;

  // ── Houses CRUD ──────────────────────────────────────────────
  const loadHouses = useCallback(async () => {
    await housesCollection.refresh();
  }, [housesCollection]);

  const createHouse = useCallback(
    async (data: Partial<House>) => {
      const now = new Date().toISOString();
      return housesCollection.insert({
        totalPoints: 0,
        meritPoints: 0,
        demeritPoints: 0,
        memberCount: 0,
        createdAt: now,
        updatedAt: now,
        ...data,
      } as Omit<House, 'id'> & { id?: string });
    },
    [housesCollection]
  );

  const updateHouse = useCallback(
    async (id: string, updates: Partial<House>) => {
      return housesCollection.update(id, { ...updates, updatedAt: new Date().toISOString() });
    },
    [housesCollection]
  );

  const deleteHouse = useCallback(
    async (id: string) => {
      return housesCollection.remove(id);
    },
    [housesCollection]
  );

  // ── Categories CRUD ──────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    await categoriesCollection.refresh();
  }, [categoriesCollection]);

  const createCategory = useCallback(
    async (data: Partial<PointCategory>) => {
      return categoriesCollection.insert({
        isActive: true,
        requiresApproval: false,
        evidenceRequired: false,
        ...data,
      } as Omit<PointCategory, 'id'> & { id?: string });
    },
    [categoriesCollection]
  );

  const updateCategory = useCallback(
    async (id: string, updates: Partial<PointCategory>) => {
      return categoriesCollection.update(id, updates);
    },
    [categoriesCollection]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      return categoriesCollection.remove(id);
    },
    [categoriesCollection]
  );

  // ── Transactions ─────────────────────────────────────────────
  const loadTransactions = useCallback(async () => {
    await transactionsCollection.refresh();
  }, [transactionsCollection]);

  /** Recompute a house's point rollups from its approved/pending transactions. */
  const buildHousePointPatch = useCallback(
    (houseId: string): Partial<House> | null => {
      const houseTx = transactions.filter(t => t.houseId === houseId);
      if (!houseTx.length) return null;
      let meritPoints = 0;
      let demeritPoints = 0;
      houseTx.forEach(t => {
        if (t.type === 'merit') meritPoints += Math.abs(t.points || 0);
        else demeritPoints += Math.abs(t.points || 0);
      });
      return {
        meritPoints,
        demeritPoints,
        totalPoints: meritPoints - demeritPoints,
      };
    },
    [transactions]
  );

  const createTransaction = useCallback(
    async (data: Partial<PointTransaction>) => {
      const created = await transactionsCollection.insert({
        status: 'pending' as const,
        awardedAt: new Date().toISOString(),
        ...data,
      } as Omit<PointTransaction, 'id'> & { id?: string });

      // Roll the awarded points into the house document so leaderboards stay consistent
      if (created && data.houseId) {
        const patch = buildHousePointPatch(data.houseId);
        const house = houses.find(h => h.id === data.houseId);
        if (patch && house) {
          try {
            await housesCollection.update(house.id, patch);
          } catch (err) {
            logger.warn('[useHousesData] Failed to update house point rollups:', err);
          }
        }
      }
      return created;
    },
    [transactionsCollection, housesCollection, houses, buildHousePointPatch]
  );

  const approveTransaction = useCallback(
    async (id: string, approvedBy: string) => {
      const tx = transactions.find(t => t.id === id);
      const result = await transactionsCollection.update(id, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString(),
      });
      if (tx?.houseId) {
        const patch = buildHousePointPatch(tx.houseId);
        if (patch) await housesCollection.update(tx.houseId, patch);
      }
      return result;
    },
    [transactionsCollection, transactions, housesCollection, buildHousePointPatch]
  );

  const rejectTransaction = useCallback(
    async (id: string) => {
      const tx = transactions.find(t => t.id === id);
      const result = await transactionsCollection.update(id, { status: 'rejected' as any });
      if (tx?.houseId) {
        const patch = buildHousePointPatch(tx.houseId);
        if (patch) await housesCollection.update(tx.houseId, patch);
      }
      return result;
    },
    [transactionsCollection, transactions, housesCollection, buildHousePointPatch]
  );

  // ── Derived views ────────────────────────────────────────────
  const getLeaderboard = useCallback((): HouseLeaderboardEntry[] => {
    return [...houses]
      .map((h): HouseLeaderboardEntry => ({
        houseId: h.id,
        houseName: h.name,
        color: h.color,
        totalPoints: h.totalPoints ?? 0,
        meritPoints: h.meritPoints ?? 0,
        demeritPoints: h.demeritPoints ?? 0,
        memberCount: h.memberCount ?? 0,
        rank: 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [houses]);

  const getStudentSummary = useCallback(
    (studentId: string): StudentPointSummary | null => {
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
    },
    [transactions]
  );

  const getTransactionsByHouse = useCallback(
    (houseId: string) => transactions.filter(t => t.houseId === houseId),
    [transactions]
  );

  const getTransactionsByStudent = useCallback(
    (studentId: string) => transactions.filter(t => t.studentId === studentId),
    [transactions]
  );

  const getPendingTransactions = useCallback(
    () => transactions.filter(t => t.status === 'pending'),
    [transactions]
  );

  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
};
