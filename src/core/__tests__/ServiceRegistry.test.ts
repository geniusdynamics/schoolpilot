import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceRegistry } from '@/core/ServiceRegistry';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  describe('register', () => {
    it('should register a service factory', () => {
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => ({ value: 42 })
      });

      expect(registry.has('test', 'TestService')).toBe(true);
    });

    it('should throw if service already registered', () => {
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => ({})
      });

      expect(() => {
        registry.register({
          name: 'TestService',
          moduleId: 'test',
          factory: () => ({})
        });
      }).toThrow('Service "TestService" from module "test" is already registered');
    });

    it('should emit registered event', () => {
      const listener = vi.fn();
      registry.on(ServiceRegistry.SERVICE_REGISTERED, listener);

      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => ({})
      });

      expect(listener).toHaveBeenCalledWith({ name: 'TestService', moduleId: 'test' });
    });
  });

  describe('get', () => {
    it('should create and return service instance', async () => {
      const factory = vi.fn().mockReturnValue({ value: 42 });
      
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory
      });

      const service = await registry.get('test', 'TestService');

      expect(factory).toHaveBeenCalled();
      expect(service).toEqual({ value: 42 });
    });

    it('should return cached singleton instance', async () => {
      const factory = vi.fn().mockReturnValue({ instance: Math.random() });
      
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory,
        singleton: true
      });

      const service1 = await registry.get('test', 'TestService');
      const service2 = await registry.get('test', 'TestService');

      expect(factory).toHaveBeenCalledTimes(1);
      expect(service1).toBe(service2);
    });

    it('should create new instances for non-singletons', async () => {
      let counter = 0;
      const factory = vi.fn().mockImplementation(() => ({ instance: ++counter }));
      
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory,
        singleton: false
      });

      const service1 = await registry.get('test', 'TestService');
      const service2 = await registry.get('test', 'TestService');

      expect(factory).toHaveBeenCalledTimes(2);
      expect(service1).not.toBe(service2);
      expect(service1.instance).toBe(1);
      expect(service2.instance).toBe(2);
    });

    it('should throw if service not registered', async () => {
      await expect(registry.get('test', 'UnknownService')).rejects.toThrow(
        'Service "UnknownService" from module "test" is not registered'
      );
    });

    it('should emit ready event on successful initialization', async () => {
      const listener = vi.fn();
      registry.on(ServiceRegistry.SERVICE_READY, listener);

      const instance = { test: true };
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => instance
      });

      await registry.get('test', 'TestService');

      expect(listener).toHaveBeenCalledWith({
        name: 'TestService',
        moduleId: 'test',
        instance
      });
    });

    it('should emit error event on initialization failure', async () => {
      const listener = vi.fn();
      registry.on(ServiceRegistry.SERVICE_ERROR, listener);

      const error = new Error('Init failed');
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => { throw error; }
      });

      await expect(registry.get('test', 'TestService')).rejects.toThrow('Init failed');

      expect(listener).toHaveBeenCalledWith({
        name: 'TestService',
        moduleId: 'test',
        error
      });
    });

    it('should initialize dependencies first', async () => {
      const order: string[] = [];

      registry.register({
        name: 'Dependency',
        moduleId: 'test',
        factory: () => {
          order.push('dependency');
          return { type: 'dep' };
        }
      });

      registry.register({
        name: 'Dependent',
        moduleId: 'test',
        factory: () => {
          order.push('dependent');
          return { type: 'main' };
        },
        dependencies: ['Dependency']
      });

      await registry.get('test', 'Dependent');

      expect(order).toEqual(['dependency', 'dependent']);
    });

    it('should support cross-module dependencies', async () => {
      registry.register({
        name: 'BaseService',
        moduleId: 'core',
        factory: () => ({ core: true })
      });

      registry.register({
        name: 'FinanceService',
        moduleId: 'finance',
        factory: () => ({ finance: true }),
        dependencies: ['core.BaseService']
      });

      const service = await registry.get('finance', 'FinanceService');

      expect(service).toEqual({ finance: true });
      expect(registry.getSync('core', 'BaseService')).toEqual({ core: true });
    });
  });

  describe('getSync', () => {
    it('should return cached instance synchronously', async () => {
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => ({ value: 42 })
      });

      await registry.get('test', 'TestService');

      const sync = registry.getSync('test', 'TestService');
      expect(sync).toEqual({ value: 42 });
    });

    it('should return undefined if not initialized', () => {
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => ({ value: 42 })
      });

      const sync = registry.getSync('test', 'TestService');
      expect(sync).toBeUndefined();
    });
  });

  describe('isReady', () => {
    it('should return true for initialized services', async () => {
      registry.register({
        name: 'TestService',
        moduleId: 'test',
        factory: () => ({})
      });

      expect(registry.isReady('test', 'TestService')).toBe(false);

      await registry.get('test', 'TestService');

      expect(registry.isReady('test', 'TestService')).toBe(true);
    });
  });

  describe('find', () => {
    it('should find services by pattern', () => {
      registry.register({ name: 'PaymentService', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'InvoiceService', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'UserService', moduleId: 'admin', factory: () => ({}) });

      const matches = registry.find('Service');

      expect(matches).toHaveLength(3);
    });

    it('should support regex patterns', () => {
      registry.register({ name: 'PaymentService', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'PaymentGateway', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'InvoiceService', moduleId: 'finance', factory: () => ({}) });

      const matches = registry.find(/^Payment/);

      expect(matches).toHaveLength(2);
    });
  });

  describe('findByModule', () => {
    it('should return services for a specific module', () => {
      registry.register({ name: 'ServiceA', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'ServiceB', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'ServiceC', moduleId: 'admin', factory: () => ({}) });

      const financeServices = registry.findByModule('finance');

      expect(financeServices).toHaveLength(2);
      expect(financeServices).toContain('ServiceA');
      expect(financeServices).toContain('ServiceB');
    });
  });

  describe('getState', () => {
    it('should return registered state for uninitalized service', () => {
      registry.register({ name: 'TestService', moduleId: 'test', factory: () => ({}) });

      const state = registry.getState('test', 'TestService');

      expect(state.status).toBe('registered');
    });

    it('should return ready state for initialized service', async () => {
      registry.register({ name: 'TestService', moduleId: 'test', factory: () => ({}) });
      await registry.get('test', 'TestService');

      const state = registry.getState('test', 'TestService');

      expect(state.status).toBe('ready');
    });

    it('should return error state for non-existent service', () => {
      const state = registry.getState('test', 'Unknown');

      expect(state.status).toBe('error');
    });
  });

  describe('initializeAll', () => {
    it('should initialize all registered services', async () => {
      registry.register({ name: 'ServiceA', moduleId: 'test', factory: () => ({}) });
      registry.register({ name: 'ServiceB', moduleId: 'test', factory: () => ({}) });

      await registry.initializeAll();

      expect(registry.isReady('test', 'ServiceA')).toBe(true);
      expect(registry.isReady('test', 'ServiceB')).toBe(true);
    });

    it('should emit all-ready event', async () => {
      const listener = vi.fn();
      registry.on(ServiceRegistry.ALL_READY, listener);

      registry.register({ name: 'ServiceA', moduleId: 'test', factory: () => ({}) });
      await registry.initializeAll();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
    it('should remove a service', () => {
      registry.register({ name: 'TestService', moduleId: 'test', factory: () => ({}) });
      expect(registry.has('test', 'TestService')).toBe(true);

      registry.unregister('test', 'TestService');

      expect(registry.has('test', 'TestService')).toBe(false);
    });
  });

  describe('unregisterModule', () => {
    it('should remove all services from a module', async () => {
      registry.register({ name: 'ServiceA', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'ServiceB', moduleId: 'finance', factory: () => ({}) });
      registry.register({ name: 'ServiceC', moduleId: 'admin', factory: () => ({}) });

      registry.unregisterModule('finance');

      expect(registry.has('finance', 'ServiceA')).toBe(false);
      expect(registry.has('finance', 'ServiceB')).toBe(false);
      expect(registry.has('admin', 'ServiceC')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all services', () => {
      registry.register({ name: 'ServiceA', moduleId: 'test', factory: () => ({}) });
      registry.register({ name: 'ServiceB', moduleId: 'test', factory: () => ({}) });

      registry.clear();

      expect(registry.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return number of registered services', () => {
      expect(registry.size).toBe(0);

      registry.register({ name: 'ServiceA', moduleId: 'test', factory: () => ({}) });
      expect(registry.size).toBe(1);

      registry.register({ name: 'ServiceB', moduleId: 'test', factory: () => ({}) });
      expect(registry.size).toBe(2);
    });
  });

  describe('initializedCount', () => {
    it('should return number of initialized services', async () => {
      registry.register({ name: 'ServiceA', moduleId: 'test', factory: () => ({}) });
      registry.register({ name: 'ServiceB', moduleId: 'test', factory: () => ({}) });

      expect(registry.initializedCount).toBe(0);

      await registry.get('test', 'ServiceA');
      expect(registry.initializedCount).toBe(1);

      await registry.get('test', 'ServiceB');
      expect(registry.initializedCount).toBe(2);
    });
  });
});
