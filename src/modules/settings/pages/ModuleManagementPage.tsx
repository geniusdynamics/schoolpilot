import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import { CogIcon, CheckIcon, XMarkIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '../../../components/ui/icons';
import Button from '@/components/ui/Button';
import DataGrid from '@/components/ui/data/DataGrid';
import type { DataGridColumn } from '@/components/ui/data/DataGrid';
import { FormSection, FormField, FormActions } from '@/components/ui/forms';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useRBAC } from '@/hooks/useRBAC';
import { moduleConfigService } from '@/services/module/moduleConfigService';
import { moduleRegistry } from '@/core/moduleRegistry';
import { ModuleDefinition } from '@/core/types';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

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

export const ModuleManagementContent: React.FC = () => {
  const { t } = useTranslation(['settings', 'common', 'navigation']);
  const { hasPermission, userRoles, isSuperAdmin } = useRBAC();
  const confirm = useConfirm();
  
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
  logger.info('[ModuleManagement DEBUG] Permission checks:', {
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
      
      // Get all available modules from registry with safe access
      const availableModules = moduleRegistry?.getEnabledModules?.() || [];
      const enabledModuleIds = moduleConfigService?.getEnabledModules?.() || [];
      
      // Filter out any undefined or invalid modules with comprehensive checks
      const validModules = availableModules.filter((module: ModuleDefinition) => 
        module && 
        typeof module === 'object' &&
        module.id && 
        module.name && 
        typeof module.id === 'string' &&
        typeof module.name === 'string'
      );
      
      const moduleStatuses: ModuleStatus[] = validModules.map((module: ModuleDefinition) => {
        // Safe access to all nested properties
        const rbacPermissions = Array.isArray(module.rbacPermissions) 
          ? module.rbacPermissions.filter(p => p && typeof p === 'object' && p.id).map(p => p.id)
          : [];
        
        // Handle translation keys - if module.name looks like a translation key, translate it
        let translatedName = module.name;
        let translatedDescription = module.description || 'No description available';
        
        // Check if the name is a translation key (e.g. 'navigation:academics.title')
        if (module.name && module.name.includes(':')) {
          const translationKey = module.name.replace('navigation:', '');
          translatedName = t(`navigation:${translationKey}`) || module.name;
          translatedDescription = t(`navigation:${translationKey.replace('.title', '.description')}`) || translatedDescription;
        } else {
          // Try to get translation from module id
          translatedName = t(`navigation:${module.id}.title`) || module.name;
          translatedDescription = t(`navigation:${module.id}.description`) || translatedDescription;
        }
        
        return {
          id: module.id,
          name: translatedName,
          description: translatedDescription,
          version: module.version || '1.0.0',
          isEnabled: Array.isArray(enabledModuleIds) ? enabledModuleIds.includes(module.id) : false,
          isActive: moduleRegistry?.isModuleEnabled?.(module.id) || false,
          features: Array.isArray(module.features) ? module.features : [],
          dependencies: Array.isArray(module.dependencies) ? module.dependencies : [],
          requiredPermissions: rbacPermissions,
          category: module.settings?.category || 'general',
          lastModified: new Date()
        };
      });

      setModules(moduleStatuses);
    } catch (error) {
      logger.error('Failed to load modules:', error);
      setModules([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleToggleModule = async (moduleId: string, enable: boolean) => {
    if (!canManageModules) {
      toast.showError(t('common:errors.insufficientPermissions'));
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
            toast.showError(t('moduleManagement.dependencyError', { 
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
          const confirmed = await confirm({
            title: 'Disable module',
            message: t('moduleManagement.disableDependencyWarning', {
              dependents: dependentModules.map(m => m.name).join(', ')
            }),
            variant: 'warning'
          });
          
          if (!confirmed) return;
        }
        
        moduleConfigService.disableModule(moduleId);
      }
      
      // Reload modules to reflect changes
      await loadModules();
      
    } catch (error) {
      logger.error('Failed to toggle module:', error);
      toast.showError(t('moduleManagement.toggleError'));
    } finally {
      setProcessingModule(null);
    }
  };

  const handleConfigureModule = (module: ModuleStatus) => {
    if (!canConfigureModules) {
      toast.showError(t('common:errors.insufficientPermissions'));
      return;
    }
    
    setSelectedModule(module);
    setShowConfigModal(true);
  };

  const toast = useToast();
  const handleViewPermissions = (module: ModuleStatus) => {
    if (!canViewPermissions) {
      toast.showError(t('common:errors.insufficientPermissions'));
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
    const matchesSearch = (module.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
                         (module.description?.toLowerCase() ?? '').includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(modules.map(m => m.category)))];

  const moduleColumns: DataGridColumn<ModuleStatus>[] = [
    {
      key: 'name',
      header: t('moduleManagement.columns.name'),
      sortable: true,
      filterable: true,
      render: (value: any, row: ModuleStatus) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.description}</div>
        </div>
      )
    },
    {
      key: 'version',
      header: t('moduleManagement.columns.version'),
      sortable: true,
      width: 100,
      render: (value: any, row: ModuleStatus) => (
        <span>{row.version}</span>
      )
    },
    {
      key: 'category',
      header: t('moduleManagement.columns.category'),
      sortable: true,
      filterable: true,
      width: 120,
      render: (value: any, row: ModuleStatus) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {row.category}
        </span>
      )
    },
    {
      key: 'isEnabled',
      header: t('moduleManagement.columns.status'),
      sortable: true,
      width: 180,
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
      key: 'features',
      header: t('moduleManagement.columns.features'),
      sortable: true,
      width: 120,
      align: 'center',
      render: (value: any, row: ModuleStatus) => (
        <div className="text-sm text-gray-600">
          {Array.isArray(row.features) ? row.features.length : 0} {t('moduleManagement.featuresCount')}
        </div>
      )
    },
    {
      key: 'actions',
      header: t('common:actions'),
      width: 300,
      render: (value: any, row: ModuleStatus) => (
        <div className="flex items-center space-x-2">
          {canManageModules && (
            <Button
              size="sm"
              variant={row.isEnabled ? "outline" : "primary"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleModule(row.id, !row.isEnabled);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                handleConfigureModule(row);
              }}
            >
              {t('common:configure')}
            </Button>
          )}
          
          {canViewPermissions && row.requiredPermissions && row.requiredPermissions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleViewPermissions(row);
              }}
            >
              <ShieldCheckIcon className="w-4 h-4" />
            </Button>
          )}
          
          {row.dependencies && row.dependencies.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDependencies(row);
              }}
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
        <DataGrid
          columns={moduleColumns}
          data={filteredModules}
          loading={loading}
          sortable={true}
          filterable={true}
          emptyState={
            <div className="text-center py-12">
              <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No modules found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('moduleManagement.noModulesFound')}
              </p>
            </div>
          }
          className="mt-4"
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

const ModuleManagementPage: React.FC = () => {
  return <ModuleManagementContent />;
};

export default ModuleManagementPage;