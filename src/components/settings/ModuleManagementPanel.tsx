// ABOUTME: Module management panel for settings page
// ABOUTME: Allows enabling/disabling modules with dependency validation and visual feedback

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  CheckIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '../ui/icons';
import { moduleManagementService, ModuleInfo } from '../../services/module/moduleManagementService';

interface ModuleManagementPanelProps {
  className?: string;
}

const ModuleManagementPanel: React.FC<ModuleManagementPanelProps> = ({ className = '' }) => {
  const { t } = useTranslation(['navigation', 'common']);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = () => {
    const moduleInfo = moduleManagementService.getAllModuleInfo();
    setModules(moduleInfo);
  };

  const handleToggleModule = async (moduleId: string, enable: boolean) => {
    setLoading(true);
    setMessage(null);

    try {
      const result = enable 
        ? await moduleManagementService.enableModule(moduleId)
        : await moduleManagementService.disableModule(moduleId);

      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        loadModules(); // Refresh the list
      } else {
        setMessage({ 
          type: 'error', 
          text: `${result.message}: ${result.errors?.join(', ')}` 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Failed to ${enable ? 'enable' : 'disable'} module: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReloadModule = async (moduleId: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await moduleManagementService.reloadModule(moduleId);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        loadModules();
      } else {
        setMessage({ 
          type: 'error', 
          text: `${result.message}: ${result.errors?.join(', ')}` 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Failed to reload module: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (module: ModuleInfo) => {
    if (module.enabled) {
      return <CheckIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <XMarkIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const getDependencyStatus = (module: ModuleInfo) => {
    if (module.dependencies.length === 0) {
      return <span className="text-gray-500 text-sm">No dependencies</span>;
    }
    
    if (module.dependencySatisfied) {
      return (
        <span className="text-green-600 text-sm flex items-center gap-1">
          <CheckIcon className="w-4 h-4" />
          Dependencies satisfied
        </span>
      );
    } else {
      return (
        <span className="text-red-600 text-sm flex items-center gap-1">
          <ExclamationTriangleIcon className="w-4 h-4" />
          Missing: {module.missingDependencies.join(', ')}
        </span>
      );
    }
  };

  const canToggleModule = (module: ModuleInfo) => {
    if (module.required) return false;
    if (module.enabled && !module.dependencySatisfied) return false;
    return true;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Module Management</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enable or disable system modules. Required modules cannot be disabled.
        </p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`px-6 py-3 border-b ${
          message.type === 'success' ? 'bg-green-50 border-green-200' :
          message.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className={`flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.type === 'success' && <CheckIcon className="w-4 h-4" />}
            {message.type === 'error' && <ExclamationTriangleIcon className="w-4 h-4" />}
            {message.type === 'info' && <InformationCircleIcon className="w-4 h-4" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="p-6">
        <div className="space-y-4">
          {modules.map((module) => (
            <div key={module.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(module)}
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {t(`navigation:${module.id}.title`, { defaultValue: module.id.replace(/([A-Z])/g, ' $1').trim() })}
                    </h4>
                    <p className="text-sm text-gray-600">{module.description ? t(module.description) : null}</p>
                    {getDependencyStatus(module)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Reload Button */}
                  <button
                    onClick={() => handleReloadModule(module.id)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    title="Reload module"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>

                  {/* Toggle Button */}
                  {!module.required && (
                    <button
                      onClick={() => handleToggleModule(module.id, !module.enabled)}
                      disabled={loading || !canToggleModule(module)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        module.enabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400'
                      }`}
                    >
                      {module.enabled ? 'Disable' : 'Enable'}
                    </button>
                  )}

                  {/* Required Badge */}
                  {module.required && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                      Required
                    </span>
                  )}
                </div>
              </div>

              {/* Dependencies */}
              {module.dependencies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    <strong>Dependencies:</strong> {module.dependencies.join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-gray-600">
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              Processing...
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {modules.filter(m => m.enabled).length}
              </div>
              <div className="text-sm text-gray-600">Enabled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {modules.filter(m => !m.enabled).length}
              </div>
              <div className="text-sm text-gray-600">Disabled</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {modules.filter(m => m.required).length}
              </div>
              <div className="text-sm text-gray-600">Required</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleManagementPanel;
