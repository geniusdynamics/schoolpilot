import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleExportsManager } from '@/core/ModuleExports';
import type { LoadedModule } from '@/core/types/module';

function createMockModule(id: string): LoadedModule {
  return {
    id,
    metadata: {
      id,
      name: id,
      version: '1.0.0',
      dependencies: [],
      provides: {
        services: ['TestService'],
        entities: ['TestEntity'],
        hooks: ['useTestHook']
      }
    },
    definition: null
  };
}

describe('ModuleExportsManager', () => {
  let manager: ModuleExportsManager;

  beforeEach(() => {
    manager = new ModuleExportsManager();
  });

  describe('registerModule', () => {
    it('should register a module with empty exports', () => {
      manager.registerModule(createMockModule('test'));
      
      expect(manager.size).toBe(1);
      const exports = manager.getModuleExports('test');
      expect(exports).toBeDefined();
      expect(exports?.moduleId).toBe('test');
    });

    it('should register a module with exports', () => {
      const module = createMockModule('test');
      const services = new Map([['MyService', { test: true }]]);
      
      manager.registerModule(module, { services });
      
      const exports = manager.getModuleExports('test');
      expect(exports?.services.get('MyService')).toEqual({ test: true });
    });
  });

  describe('registerService', () => {
    it('should register a service', () => {
      manager.registerModule(createMockModule('test'));
      const service = { doSomething: () => 'done' };
      
      manager.registerService('test', 'MyService', service);
      
      expect(manager.getService('test', 'MyService')).toBe(service);
    });

    it('should throw if module not registered', () => {
      expect(() => {
        manager.registerService('unknown', 'Service', {});
      }).toThrow('Module "unknown" is not registered for exports');
    });
  });

  describe('registerEntity', () => {
    it('should register an entity', () => {
      manager.registerModule(createMockModule('test'));
      const entity = { name: 'Student' };
      
      manager.registerEntity('test', 'StudentEntity', entity);
      
      expect(manager.getEntity('test', 'StudentEntity')).toBe(entity);
    });
  });

  describe('registerHook', () => {
    it('should register a hook', () => {
      manager.registerModule(createMockModule('test'));
      const hook = () => 'hook result';
      
      manager.registerHook('test', 'useCustomHook', hook);
      
      expect(manager.getHook('test', 'useCustomHook')).toBe(hook);
    });
  });

  describe('registerComponent', () => {
    it('should register a component', () => {
      manager.registerModule(createMockModule('test'));
      const component = () => null; // React component
      
      manager.registerComponent('test', 'Button', component);
      
      expect(manager.getComponent('test', 'Button')).toBe(component);
    });
  });

  describe('registerUtil', () => {
    it('should register a utility', () => {
      manager.registerModule(createMockModule('test'));
      const util = { formatDate: (d: Date) => d.toISOString() };
      
      manager.registerUtil('test', 'dateUtils', util);
      
      expect(manager.getUtil('test', 'dateUtils')).toBe(util);
    });
  });

  describe('findService', () => {
    it('should find service across modules', () => {
      manager.registerModule(createMockModule('mod1'));
      manager.registerModule(createMockModule('mod2'));
      const service = { name: 'Target' };
      
      manager.registerService('mod2', 'TargetService', service);
      
      const found = manager.findService('TargetService');
      expect(found).toBeDefined();
      expect(found?.moduleId).toBe('mod2');
      expect(found?.service).toBe(service);
    });

    it('should return undefined for non-existent service', () => {
      const found = manager.findService('NonExistent');
      expect(found).toBeUndefined();
    });
  });

  describe('findServices', () => {
    it('should find services matching pattern', () => {
      manager.registerModule(createMockModule('test'));
      manager.registerService('test', 'PaymentService', { type: 'payment' });
      manager.registerService('test', 'PaymentGateway', { type: 'gateway' });
      manager.registerService('test', 'InvoiceService', { type: 'invoice' });
      
      const matches = manager.findServices(/Payment/);
      
      expect(matches).toHaveLength(2);
      expect(matches.map(m => m.name)).toContain('PaymentService');
      expect(matches.map(m => m.name)).toContain('PaymentGateway');
    });

    it('should search case-insensitively with string pattern', () => {
      manager.registerModule(createMockModule('test'));
      manager.registerService('test', 'PaymentService', {});
      
      const matches = manager.findServices('payment');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].name).toBe('PaymentService');
    });
  });

  describe('listServices', () => {
    it('should list all services', () => {
      manager.registerModule(createMockModule('mod1'));
      manager.registerModule(createMockModule('mod2'));
      
      manager.registerService('mod1', 'ServiceA', {});
      manager.registerService('mod2', 'ServiceB', {});
      
      const list = manager.listServices();
      
      expect(list).toHaveLength(2);
      expect(list.map(s => s.name)).toContain('ServiceA');
      expect(list.map(s => s.name)).toContain('ServiceB');
    });
  });

  describe('listEntities', () => {
    it('should list all entities', () => {
      manager.registerModule(createMockModule('mod1'));
      manager.registerModule(createMockModule('mod2'));
      
      manager.registerEntity('mod1', 'EntityA', {});
      manager.registerEntity('mod2', 'EntityB', {});
      
      const list = manager.listEntities();
      
      expect(list).toHaveLength(2);
      expect(list.map(e => e.name)).toContain('EntityA');
      expect(list.map(e => e.name)).toContain('EntityB');
    });
  });

  describe('validateExports', () => {
    it('should validate declared services are exported', () => {
      const module = createMockModule('test');
      manager.registerModule(module);
      
      // Don't register the declared TestService
      
      const result = manager.validateExports('test');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Service "TestService" is declared in module.json but not exported'
      );
    });

    it('should validate declared entities are exported', () => {
      const module = createMockModule('test');
      manager.registerModule(module);
      
      // Don't register the declared TestEntity
      
      const result = manager.validateExports('test');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Entity "TestEntity" is declared in module.json but not exported'
      );
    });

    it('should warn about undeclared exports', () => {
      const module = createMockModule('test');
      manager.registerModule(module);
      
      // Export something not declared
      manager.registerService('test', 'ExtraService', {});
      
      const result = manager.validateExports('test');
      
      expect(result.warnings).toContain(
        'Service "ExtraService" is exported but not declared in module.json'
      );
    });

    it('should pass validation when all declared exports exist', () => {
      const module = createMockModule('test');
      manager.registerModule(module);
      
      manager.registerService('test', 'TestService', {});
      manager.registerEntity('test', 'TestEntity', {});
      manager.registerHook('test', 'useTestHook', () => {});
      
      const result = manager.validateExports('test');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error if module not registered', () => {
      const result = manager.validateExports('unknown');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Module "unknown" metadata not found');
    });
  });

  describe('validateAll', () => {
    it('should validate all registered modules', () => {
      manager.registerModule(createMockModule('mod1'));
      manager.registerModule(createMockModule('mod2'));
      
      const results = manager.validateAll();
      
      expect(results.size).toBe(2);
      expect(results.has('mod1')).toBe(true);
      expect(results.has('mod2')).toBe(true);
    });
  });

  describe('unregisterModule', () => {
    it('should remove module exports', () => {
      manager.registerModule(createMockModule('test'));
      expect(manager.size).toBe(1);
      
      manager.unregisterModule('test');
      
      expect(manager.size).toBe(0);
      expect(manager.getModuleExports('test')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all exports', () => {
      manager.registerModule(createMockModule('mod1'));
      manager.registerModule(createMockModule('mod2'));
      
      manager.clear();
      
      expect(manager.size).toBe(0);
    });
  });
});
