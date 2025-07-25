import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CogIcon, CheckIcon, XMarkIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@/components/ui/icons';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useRBAC } from '@/hooks/useRBAC';
import { moduleConfigService } from '@/services/moduleConfigService';
import { moduleRegistry } from '@/core/moduleRegistry';
import { ModuleDefinition } from '@/core/types';

interface ModuleStatus {
  id: string;
  name: string;
  description: string;
  version: string;
  isEnabled: boolean;
  isActive: boolean;
  features: string[];
  dependencies?: string[];
  requiredPermissions?: string[];
  category: string;
  lastModified?: Date;
}

const ModuleManagementPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common']);
  const { hasPermission, userRoles, isSuperAdmin } = useRBAC();
  
  // State management
  const [modules, setModules] = useState<ModuleStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<ModuleStatus | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDependenciesModal, setShowDependenciesModal] = useState(false);
  const [processingModule, setProcessingModule] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // RBAC permissions
  const canViewModules = hasPermission('settings.view') || hasPermission('modules.view');
  const canManageModules = hasPermission('settings.manage') || hasPermission('modules.manage');
  const canConfigureModules = hasPermission('settings.configure') || hasPermission('modules.configure');
  const canViewPermissions = hasPermission('permissions.view') || isSuperAdmin;

  // Debug logging
  console.log('[ModuleManagement DEBUG] Permission checks:', {
    canViewModules,
    canManageModules,
    canConfigureModules,
    canViewPermissions,
    userRoles,
    isSuperAdmin,
    hasSettingsView: hasPermission('settings.view'),
    hasModulesView: hasPermission('modules.view')
  });

  useEffect(() => {
    if (canViewModules) {
      loadModules();
    }
  }, [canViewModules]);

  const loadModules = async () => {
    try {
      setLoading(true);
      
      // Get all available modules from registry
      const availableModules = moduleRegistry.getEnabledModules();
      const enabledModuleIds = moduleConfigService.getEnabledModules();
      
      const moduleStatuses: ModuleStatus[] = availableModules.map((module: ModuleDefinition) => ({
        id: module.id,
        name: module.name,
        description: module.description || 'No description available',
        version: module.version,
        isEnabled: enabledModuleIds.includes(module.id),
        isActive: moduleRegistry.isModuleEnabled(module.id),
        features: module.features || [],
        dependencies: module.dependencies || [],
        requiredPermissions: module.rbacPermissions?.map(p => p.id) || [],
        category: module.settings?.category || 'general',
        lastModified: new Date()
      }));

      setModules(moduleStatuses);
    } catch (error) {
      console.error('Failed to load modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (moduleId: string, enable: boolean) => {
    if (!canManageModules) {
      alert(t('common:errors.insufficientPermissions'));
      return;
    }

    try {
      setProcessingModule(moduleId);
      
      if (enable) {
        // Check dependencies before enabling
        const module = modules.find(m => m.id === moduleId);
        if (module?.dependencies?.length) {
          const missingDeps = module.dependencies.filter(dep => 
            !modules.find(m => m.id === dep && m.isEnabled)
          );
          
          if (missingDeps.length > 0) {
            alert(t('moduleManagement.dependencyError', { 
              dependencies: missingDeps.join(', ') 
            }));
            return;
          }
        }
        
        moduleConfigService.enableModule(moduleId);
      } else {
        // Check if other modules depend on this one
        const dependentModules = modules.filter(m => 
          m.dependencies?.includes(moduleId) && m.isEnabled
        );
        
        if (dependentModules.length > 0) {
          const confirm = window.confirm(t('moduleManagement.disableDependencyWarning', {
            dependents: dependentModules.map(m => m.name).join(', ')
          }));
          
          if (!confirm) return;
        }
        
        moduleConfigService.disableModule(moduleId);
      }
      
      // Reload modules to reflect changes
      await loadModules();
      
    } catch (error) {
      console.error('Failed to toggle module:', error);
      alert(t('moduleManagement.toggleError'));
    } finally {
      setProcessingModule(null);
    }
  };

  const handleConfigureModule = (module: ModuleStatus) => {
    if (!canConfigureModules) {
      alert(t('common:errors.insufficientPermissions'));
      return;
    }
    
    setSelectedModule(module);
    setShowConfigModal(true);
  };

  const handleViewPermissions = (module: ModuleStatus) => {
    if (!canViewPermissions) {
      alert(t('common:errors.insufficientPermissions'));
      return;
    }
    
    setSelectedModule(module);
    setShowPermissionsModal(true);
  };

  const handleViewDependencies = (module: ModuleStatus) => {
    setSelectedModule(module);
    setShowDependenciesModal(true);
  };

  // Filter and search modules
  const filteredModules = modules.filter(module => {
    const matchesCategory = filterCategory === 'all' || module.category === filterCategory;
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(modules.map(m => m.category)))];

  const moduleColumns = [
    {
      header: t('moduleManagement.columns.name'),
      key: 'name' as keyof ModuleStatus,
      render: (value: any, row: ModuleStatus) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.description}</div>
        </div>
      )
    },
    {
      header: t('moduleManagement.columns.version'),
      key: 'version' as keyof ModuleStatus
    },
    {
      header: t('moduleManagement.columns.category'),
      key: 'category' as keyof ModuleStatus,
      render: (value: any, row: ModuleStatus) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {row.category}
        </span>
      )
    },
    {
      header: t('moduleManagement.columns.status'),
      key: 'isEnabled' as keyof ModuleStatus,
      render: (value: any, row: ModuleStatus) => (
        <div className="flex items-center space-x-2">
          {row.isEnabled ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckIcon className="w-3 h-3 mr-1" />
              {t('moduleManagement.status.enabled')}
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              <XMarkIcon className="w-3 h-3 mr-1" />
              {t('moduleManagement.status.disabled')}
            </span>
          )}
          {row.isActive && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {t('moduleManagement.status.active')}
            </span>
          )}
        </div>
      )
    },
    {
      header: t('moduleManagement.columns.features'),
      key: 'features' as keyof ModuleStatus,
      render: (value: any, row: ModuleStatus) => (
        <div className="text-sm text-gray-600">
          {Array.isArray(row.features) ? row.features.length : 0} {t('moduleManagement.featuresCount')}
        </div>
      )
    },
    {
      header: t('common:actions'),
      key: 'id' as keyof ModuleStatus,
      render: (value: any, row: ModuleStatus) => (
        <div className="flex items-center space-x-2">
          {canManageModules && (
            <Button
              size="sm"
              variant={row.isEnabled ? "outline" : "primary"}
              onClick={() => handleToggleModule(row.id, !row.isEnabled)}
              disabled={processingModule === row.id}
            >
              {processingModule === row.id ? (
                <Spinner size="sm" />
              ) : row.isEnabled ? (
                t('common:disable')
              ) : (
                t('common:enable')
              )}
            </Button>
          )}
          
          {canConfigureModules && row.isEnabled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleConfigureModule(row)}
            >
              {t('common:configure')}
            </Button>
          )}
          
          {canViewPermissions && row.requiredPermissions && row.requiredPermissions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewPermissions(row)}
            >
              <ShieldCheckIcon className="w-4 h-4" />
            </Button>
          )}
          
          {row.dependencies && row.dependencies.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewDependencies(row)}
            >
              {t('moduleManagement.viewDependencies')}
            </Button>
          )}
        </div>
      )
    }
  ];

  if (!canViewModules) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">{t('common:errors.accessDenied')}</h2>
        <p className="text-gray-500">{t('common:errors.insufficientPermissions')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card title={t('moduleManagement.title')}>
        <div className="text-center py-8">
          <CogIcon className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">{t('moduleManagement.header')}</h2>
          <p className="text-gray-500">{t('moduleManagement.description')}</p>
        </div>
      </Card>

      {/* Filters and Search */}
      <Card title={t('moduleManagement.filtersTitle')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('moduleManagement.searchLabel')}
            </label>
            <Input
              type="text"
              placeholder={t('moduleManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('moduleManagement.categoryLabel')}
            </label>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? t('common:all') : category}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {/* Module Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card title={t('moduleManagement.stats.total')}>
          <div className="text-3xl font-bold text-gray-900">{modules.length}</div>
        </Card>
        <Card title={t('moduleManagement.stats.enabled')}>
          <div className="text-3xl font-bold text-green-600">
            {modules.filter(m => m.isEnabled).length}
          </div>
        </Card>
        <Card title={t('moduleManagement.stats.active')}>
          <div className="text-3xl font-bold text-blue-600">
            {modules.filter(m => m.isActive).length}
          </div>
        </Card>
        <Card title={t('moduleManagement.stats.categories')}>
          <div className="text-3xl font-bold text-purple-600">
            {new Set(modules.map(m => m.category)).size}
          </div>
        </Card>
      </div>

      {/* Modules Table */}
      <Card title={t('moduleManagement.modulesListTitle')}>
        <Table
          columns={moduleColumns}
          data={filteredModules}
          isLoading={loading}
          emptyStateMessage={t('moduleManagement.noModulesFound')}
        />
      </Card>

      {/* Configuration Modal */}
      {showConfigModal && selectedModule && (
        <Modal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          title={t('moduleManagement.configureModule', { name: selectedModule.name })}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('moduleManagement.moduleId')}
              </label>
              <Input type="text" value={selectedModule.id} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('moduleManagement.moduleVersion')}
              </label>
              <Input type="text" value={selectedModule.version} disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('moduleManagement.moduleFeatures')}
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedModule.features.map(feature => (
                  <span 
                    key={feature}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowConfigModal(false)}>
                {t('common:close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedModule && (
        <Modal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          title={t('moduleManagement.modulePermissions', { name: selectedModule.name })}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('moduleManagement.permissionsDescription')}
            </p>
            <div className="space-y-2">
              {selectedModule.requiredPermissions?.map(permission => (
                <div 
                  key={permission}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{permission}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {t('moduleManagement.required')}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
                {t('common:close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dependencies Modal */}
      {showDependenciesModal && selectedModule && (
        <Modal
          isOpen={showDependenciesModal}
          onClose={() => setShowDependenciesModal(false)}
          title={t('moduleManagement.moduleDependencies', { name: selectedModule.name })}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t('moduleManagement.dependenciesDescription')}
            </p>
            <div className="space-y-2">
              {selectedModule.dependencies?.map(dependency => {
                const depModule = modules.find(m => m.id === dependency);
                return (
                  <div 
                    key={dependency}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{dependency}</span>
                      {depModule && (
                        <div className="text-sm text-gray-500">{depModule.name}</div>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      depModule?.isEnabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {depModule?.isEnabled ? t('moduleManagement.status.enabled') : t('moduleManagement.status.disabled')}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowDependenciesModal(false)}>
                {t('common:close')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ModuleManagementPage;