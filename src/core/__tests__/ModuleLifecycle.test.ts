import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModuleLifecycle, type LifecycleHooks } from '@/core/ModuleLifecycle';
import type { LoadedModule } from '@/core/types/module';

function createMockModule(id: string): LoadedModule {
  return {
    id,
    metadata: {
      id,
      name: id,
      version: '1.0.0',
      dependencies: []
    },
    definition: null
  };
}

describe('ModuleLifecycle', () => {
  let lifecycle: ModuleLifecycle;

  beforeEach(() => {
    lifecycle = new ModuleLifecycle();
  });

  describe('register', () => {
    it('should register a module', async () => {
      const module = createMockModule('test');
      await lifecycle.register(module);

      expect(lifecycle.isRegistered('test')).toBe(true);
      expect(lifecycle.getState('test')?.status).toBe('registered');
    });

    it('should throw if module already registered', async () => {
      const module = createMockModule('test');
      await lifecycle.register(module);

      await expect(lifecycle.register(module)).rejects.toThrow(
        'Module "test" is already registered'
      );
    });

    it('should call onRegister hook', async () => {
      const onRegister = vi.fn();
      const hooks: LifecycleHooks = { onRegister };
      
      lifecycle.registerHooks('test', hooks);
      await lifecycle.register(createMockModule('test'));

      expect(onRegister).toHaveBeenCalled();
      expect(onRegister.mock.calls[0][0].moduleId).toBe('test');
    });

    it('should set error state if onRegister fails', async () => {
      const onRegister = vi.fn().mockRejectedValue(new Error('Registration failed'));
      const hooks: LifecycleHooks = { onRegister };
      
      lifecycle.registerHooks('test', hooks);
      
      await expect(lifecycle.register(createMockModule('test'))).rejects.toThrow(
        'Registration failed'
      );

      expect(lifecycle.getState('test')?.status).toBe('error');
    });

    it('should emit registered event', async () => {
      const listener = vi.fn();
      lifecycle.on(ModuleLifecycle.REGISTERED, listener);

      await lifecycle.register(createMockModule('test'));

      expect(listener).toHaveBeenCalledWith({ moduleId: 'test', state: expect.any(Object) });
    });
  });

  describe('enable', () => {
    it('should enable a registered module', async () => {
      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');

      expect(lifecycle.isEnabled('test')).toBe(true);
      expect(lifecycle.getState('test')?.status).toBe('enabled');
    });

    it('should throw if module not registered', async () => {
      await expect(lifecycle.enable('test')).rejects.toThrow(
        'Module "test" is not registered'
      );
    });

    it('should not throw if already enabled', async () => {
      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');
      await lifecycle.enable('test'); // Should not throw

      expect(lifecycle.isEnabled('test')).toBe(true);
    });

    it('should throw if module is in error state', async () => {
      const onRegister = vi.fn().mockRejectedValue(new Error('Failed'));
      lifecycle.registerHooks('test', { onRegister });
      
      try {
        await lifecycle.register(createMockModule('test'));
      } catch {
        // Expected
      }

      await expect(lifecycle.enable('test')).rejects.toThrow(
        'Module "test" is in error state'
      );
    });

    it('should call onEnable hook', async () => {
      const onEnable = vi.fn();
      lifecycle.registerHooks('test', { onEnable });

      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');

      expect(onEnable).toHaveBeenCalled();
      expect(onEnable.mock.calls[0][0].moduleId).toBe('test');
    });

    it('should emit enabled event', async () => {
      const listener = vi.fn();
      lifecycle.on(ModuleLifecycle.ENABLED, listener);

      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');

      expect(listener).toHaveBeenCalled();
    });

    it('should set enabledAt timestamp', async () => {
      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');

      const state = lifecycle.getState('test');
      expect(state?.enabledAt).toBeInstanceOf(Date);
    });
  });

  describe('disable', () => {
    it('should disable an enabled module', async () => {
      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');
      await lifecycle.disable('test');

      expect(lifecycle.isEnabled('test')).toBe(false);
      expect(lifecycle.getState('test')?.status).toBe('disabled');
    });

    it('should throw if module not registered', async () => {
      await expect(lifecycle.disable('test')).rejects.toThrow(
        'Module "test" is not registered'
      );
    });

    it('should not throw if already disabled', async () => {
      await lifecycle.register(createMockModule('test'));
      await lifecycle.disable('test'); // Not enabled yet

      expect(lifecycle.getState('test')?.status).toBe('registered');
    });

    it('should call onDisable hook', async () => {
      const onDisable = vi.fn();
      lifecycle.registerHooks('test', { onDisable });

      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');
      await lifecycle.disable('test');

      expect(onDisable).toHaveBeenCalled();
    });

    it('should emit disabled event', async () => {
      const listener = vi.fn();
      lifecycle.on(ModuleLifecycle.DISABLED, listener);

      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');
      await lifecycle.disable('test');

      expect(listener).toHaveBeenCalled();
    });

    it('should set disabledAt timestamp', async () => {
      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');
      await lifecycle.disable('test');

      const state = lifecycle.getState('test');
      expect(state?.disabledAt).toBeInstanceOf(Date);
    });
  });

  describe('unregister', () => {
    it('should unregister a module', async () => {
      await lifecycle.register(createMockModule('test'));
      await lifecycle.unregister('test');

      expect(lifecycle.isRegistered('test')).toBe(false);
    });

    it('should disable before unregistering if enabled', async () => {
      const onDisable = vi.fn();
      const onUnregister = vi.fn();
      
      lifecycle.registerHooks('test', { onDisable, onUnregister });
      await lifecycle.register(createMockModule('test'));
      await lifecycle.enable('test');
      await lifecycle.unregister('test');

      expect(onDisable).toHaveBeenCalled();
      expect(onUnregister).toHaveBeenCalled();
    });

    it('should throw if module not registered', async () => {
      await expect(lifecycle.unregister('test')).rejects.toThrow(
        'Module "test" is not registered'
      );
    });

    it('should emit unregistered event', async () => {
      const listener = vi.fn();
      lifecycle.on(ModuleLifecycle.UNREGISTERED, listener);

      await lifecycle.register(createMockModule('test'));
      await lifecycle.unregister('test');

      expect(listener).toHaveBeenCalledWith({ moduleId: 'test' });
    });
  });

  describe('enableBatch', () => {
    it('should enable multiple modules in order', async () => {
      await lifecycle.register(createMockModule('a'));
      await lifecycle.register(createMockModule('b'));
      await lifecycle.register(createMockModule('c'));

      await lifecycle.enableBatch(['a', 'b', 'c']);

      expect(lifecycle.isEnabled('a')).toBe(true);
      expect(lifecycle.isEnabled('b')).toBe(true);
      expect(lifecycle.isEnabled('c')).toBe(true);
    });

    it('should skip already enabled modules', async () => {
      await lifecycle.register(createMockModule('a'));
      await lifecycle.register(createMockModule('b'));
      await lifecycle.enable('a');

      await lifecycle.enableBatch(['a', 'b']);

      expect(lifecycle.isEnabled('a')).toBe(true);
      expect(lifecycle.isEnabled('b')).toBe(true);
    });
  });

  describe('disableBatch', () => {
    it('should disable multiple modules in reverse order', async () => {
      await lifecycle.register(createMockModule('a'));
      await lifecycle.register(createMockModule('b'));
      await lifecycle.register(createMockModule('c'));
      await lifecycle.enable('a');
      await lifecycle.enable('b');
      await lifecycle.enable('c');

      await lifecycle.disableBatch(['a', 'b', 'c']);

      expect(lifecycle.isEnabled('a')).toBe(false);
      expect(lifecycle.isEnabled('b')).toBe(false);
      expect(lifecycle.isEnabled('c')).toBe(false);
    });
  });

  describe('getAllStates', () => {
    it('should return all module states', async () => {
      await lifecycle.register(createMockModule('a'));
      await lifecycle.register(createMockModule('b'));

      const states = lifecycle.getAllStates();
      expect(states).toHaveLength(2);
      expect(states.map(s => s.id)).toContain('a');
      expect(states.map(s => s.id)).toContain('b');
    });
  });

  describe('getByStatus', () => {
    it('should return modules filtered by status', async () => {
      await lifecycle.register(createMockModule('a'));
      await lifecycle.register(createMockModule('b'));
      await lifecycle.enable('a');

      const enabled = lifecycle.getByStatus('enabled');
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('a');

      const registered = lifecycle.getByStatus('registered');
      expect(registered).toHaveLength(1);
      expect(registered[0].id).toBe('b');
    });
  });

  describe('clear', () => {
    it('should unregister all modules', async () => {
      await lifecycle.register(createMockModule('a'));
      await lifecycle.register(createMockModule('b'));
      await lifecycle.enable('a');
      await lifecycle.enable('b');

      await lifecycle.clear();

      expect(lifecycle.isRegistered('a')).toBe(false);
      expect(lifecycle.isRegistered('b')).toBe(false);
    });
  });
});
