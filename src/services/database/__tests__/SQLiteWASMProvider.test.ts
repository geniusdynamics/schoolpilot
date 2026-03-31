import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteWASMProvider } from '../SQLiteWASMProvider';

// Mock sqlite3 initialization
vi.mock('@sqlite.org/sqlite-wasm', () => {
  return {
    default: vi.fn().mockResolvedValue({
      oo1: {
        DB: class MockDB {
          exec = vi.fn();
          close = vi.fn();
        },
        OpfsDb: class MockOpfsDb {
          exec = vi.fn();
          close = vi.fn();
        }
      }
    })
  };
});

describe('SQLiteWASMProvider', () => {
  let provider: SQLiteWASMProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new SQLiteWASMProvider({ name: 'test_db', version: 1 });
    // Mock internal state to simulate initialization
    provider['isInitialized'] = true;
    provider['db'] = { exec: vi.fn(), close: vi.fn() } as any;
  });

  describe('Transaction Management', () => {
    it('should successfully commit a transaction', async () => {
      const mockExec = provider['db']!.exec;
      
      const result = await provider.transaction(async (tx) => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(mockExec).toHaveBeenCalledWith('BEGIN;');
      expect(mockExec).toHaveBeenCalledWith('COMMIT;');
      expect(mockExec).not.toHaveBeenCalledWith('ROLLBACK;');
    });

    it('should rollback a transaction if an error is thrown', async () => {
      const mockExec = provider['db']!.exec;
      
      await expect(provider.transaction(async (tx) => {
        throw new Error('Simulated failure');
      })).rejects.toThrow('Simulated failure');

      expect(mockExec).toHaveBeenCalledWith('BEGIN;');
      expect(mockExec).toHaveBeenCalledWith('ROLLBACK;');
      expect(mockExec).not.toHaveBeenCalledWith('COMMIT;');
    });
  });

  describe('Connection Pooling (Queued Execution)', () => {
    it('should execute queued queries sequentially', async () => {
      const executionOrder: number[] = [];
      
      const task1 = provider.executeQueued(async () => {
        await new Promise(r => setTimeout(r, 50));
        executionOrder.push(1);
        return 'task1';
      });
      
      const task2 = provider.executeQueued(async () => {
        executionOrder.push(2);
        return 'task2';
      });

      const results = await Promise.all([task1, task2]);
      
      expect(results).toEqual(['task1', 'task2']);
      expect(executionOrder).toEqual([1, 2]);
    });
  });
});
