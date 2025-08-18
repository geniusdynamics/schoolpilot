// ABOUTME: Module dependency report page
// ABOUTME: Visualizes module dependencies and reports issues

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { RefreshCwIcon } from '@/components/ui/icons';
import { moduleRegistry } from '@/core/moduleRegistry';
import { ModuleDependencyValidator } from '@/core/services/ModuleDependencyValidator';
import { DependencyVisualizer } from '@/core/services/DependencyVisualizer';

const ModuleDependencyReportPage: React.FC = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState<any>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const generateReport = () => {
    setLoading(true);
    try {
      const compatibilityReport = ModuleDependencyValidator.generateCompatibilityReport();
      const graphData = DependencyVisualizer.generateGraphData();
      
      setReport(compatibilityReport);
      setGraphData(graphData);
    } catch (error) {
      console.error('Error generating dependency report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-gray-600">{t('settings.dependencyReport.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('settings.dependencyReport.title')}</h1>
        <Button onClick={generateReport} variant="outline">
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          {t('settings.dependencyReport.refresh')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title={t('settings.dependencyReport.totalModules')}>
          <p className="text-3xl font-bold text-center">{report?.totalModules || 0}</p>
        </Card>
        
        <Card title={t('settings.dependencyReport.modulesWithIssues')}>
          <p className="text-3xl font-bold text-center text-red-600">{report?.modulesWithIssues || 0}</p>
        </Card>
        
        <Card title={t('settings.dependencyReport.totalIssues')}>
          <p className="text-3xl font-bold text-center">{report?.issues?.length || 0}</p>
        </Card>
      </div>

      {/* Issues List */}
      {report?.issues && report.issues.length > 0 && (
        <Card title={t('settings.dependencyReport.issuesFound')}>
          <div className="space-y-4">
            {report.issues.map((issue: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{issue.moduleId}</h3>
                  <Badge variant={issue.type === 'missing' ? 'danger' : issue.type === 'version' ? 'warning' : 'secondary'}>
                    {t(`settings.dependencyReport.issueTypes.${issue.type}`)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-gray-600">{issue.details}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dependency Graph Visualization */}
      {graphData && (
        <Card title={t('settings.dependencyReport.dependencyGraph')}>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Simple text-based dependency visualization */}
              <div className="space-y-4">
                {graphData.nodes.map((node: any) => (
                  <div key={node.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{node.name} ({node.id})</h3>
                      <Badge variant={node.status === 'enabled' ? 'success' : 'secondary'}>
                        {node.status === 'enabled' ? t('settings.dependencyReport.enabled') : t('settings.dependencyReport.disabled')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">v{node.version}</p>
                    
                    {/* Show dependencies */}
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700">{t('settings.dependencyReport.dependencies')}:</h4>
                      <div className="mt-2">
                        {graphData.edges
                          .filter((edge: any) => edge.from === node.id)
                          .map((edge: any, idx: number) => (
                            <div key={idx} className="flex items-center text-sm text-gray-600 ml-4">
                              <span className="mr-2">→</span>
                              <span>{edge.to}</span>
                              <Badge variant="secondary" className="ml-2 text-xs">
                                {edge.type}
                              </Badge>
                            </div>
                          ))}
                        {graphData.edges.filter((edge: any) => edge.from === node.id).length === 0 && (
                          <p className="text-sm text-gray-500 italic ml-4">{t('settings.dependencyReport.noDependencies')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Raw Report Data */}
      <Card title={t('settings.dependencyReport.rawData')}>
        <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
          {JSON.stringify(report, null, 2)}
        </pre>
      </Card>
    </div>
  );
};

export default ModuleDependencyReportPage;