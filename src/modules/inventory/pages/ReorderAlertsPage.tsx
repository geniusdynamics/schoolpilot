import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger, Badge, Alert, AlertDescription } from '@/components/ui';
import {
  ArchiveBoxIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { ReorderAlertsPanel } from '@/components/ReorderAlertsPanel';
import { useReorderMonitoring } from '@/hooks/useReorderMonitoring';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';

/**
 * Reorder Alerts Page - Main dashboard for automated reorder management
 */
export const ReorderAlertsContent: React.FC = () => {
  const { t } = useTranslation('inventory');
  const [activeTab, setActiveTab] = useState('alerts');
  
  const {
    alerts,
    monitoringResult,
    isLoading,
    error,
    totalAlertsCount,
    highPriorityAlerts = [],
    mediumPriorityAlerts = [],
    lowPriorityAlerts = []
  } = useReorderMonitoring();

  const getAlertSummaryCards = () => {
    return [
      {
        title: t('reorderAlerts.summary.activeAlerts'),
        value: totalAlertsCount,
        icon: <BellIcon className="h-4 w-4" />,
        color: totalAlertsCount > 0 ? 'text-red-600' : 'text-green-600',
        bgColor: totalAlertsCount > 0 ? 'bg-red-50' : 'bg-green-50'
      },
      {
        title: t('reorderAlerts.tabs.high'),
        value: highPriorityAlerts.length,
        icon: <ExclamationTriangleIcon className="h-4 w-4" />,
        color: highPriorityAlerts.length > 0 ? 'text-red-600' : 'text-surface-muted-fg',
        bgColor: highPriorityAlerts.length > 0 ? 'bg-red-50' : 'bg-surface-muted'
      },
      {
        title: t('reorderAlerts.tabs.medium'),
        value: mediumPriorityAlerts.length,
        icon: <ClockIcon className="h-4 w-4" />,
        color: mediumPriorityAlerts.length > 0 ? 'text-orange-600' : 'text-surface-muted-fg',
        bgColor: mediumPriorityAlerts.length > 0 ? 'bg-orange-50' : 'bg-surface-muted'
      },
      {
        title: t('reorderAlerts.summary.totalMonitored'),
        value: monitoringResult?.total_items_monitored || 0,
        icon: <ArchiveBoxIcon className="h-4 w-4" />,
        color: 'text-primary-600',
        bgColor: 'bg-primary-50'
      }
    ];
  };

  return (
    <PageContainer>
      <PageHeader
        title={t('reorderAlerts.title')}
        description={t('reorderAlerts.description', 'Monitor and manage automated reorder alerts for inventory items')}
        icon={<BellIcon className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            {totalAlertsCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {totalAlertsCount} {t('reorderAlerts.activeAlerts')}
              </Badge>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getAlertSummaryCards().map((card, index) => (
            <Card key={index} className={card.bgColor}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    <p className={`text-2xl font-bold ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`${card.color}`}>
                    {card.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <BellIcon className="h-4 w-4" />
              {t('reorderAlerts.activeAlerts')}
              {totalAlertsCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {totalAlertsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4" />
              {t('common.analytics', 'Analytics')}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Cog6ToothIcon className="h-4 w-4" />
              {t('common.settings', 'Cog6ToothIcon')}
            </TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <ReorderAlertsPanel 
              className="w-full"
              showSettings={false}
              autoRefreshInterval={60}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                    {t('reorderAlerts.analytics.trends', 'Reorder Trends')}
                  </CardTitle>
                  <CardDescription>
                    {t('reorderAlerts.analytics.trendsDescription', 'Track reorder patterns and frequency over time')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    {t('common.comingSoon', 'Coming Soon')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ChartBarIcon className="h-5 w-5" />
                    {t('reorderAlerts.analytics.performance', 'Alert Performance')}
                  </CardTitle>
                  <CardDescription>
                    {t('reorderAlerts.analytics.performanceDescription', 'Monitor alert accuracy and response times')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    {t('common.comingSoon', 'Coming Soon')}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>{t('reorderAlerts.analytics.summary', 'Monthly Summary')}</CardTitle>
                  <CardDescription>
                    {t('reorderAlerts.analytics.summaryDescription', 'Overview of reorder activities and cost savings')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-primary-50 rounded-lg">
                      <div className="text-2xl font-bold text-primary-600">0</div>
                      <div className="text-sm text-muted-foreground">
                        {t('reorderAlerts.analytics.alertsGenerated', 'Alerts Generated')}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">0</div>
                      <div className="text-sm text-muted-foreground">
                        {t('reorderAlerts.analytics.ordersCreated', 'Orders Created')}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">$0</div>
                      <div className="text-sm text-muted-foreground">
                        {t('reorderAlerts.analytics.costSavings', 'Estimated Savings')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cog6ToothIcon Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('reorderAlerts.settings.title')}</CardTitle>
                <CardDescription>
                  {t('reorderAlerts.settings.description')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReorderAlertsPanel 
                  className="w-full"
                  showSettings={true}
                  autoRefreshInterval={60}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reorderAlerts.settings.globalSettings', 'Global Cog6ToothIcon')}</CardTitle>
                <CardDescription>
                  {t('reorderAlerts.settings.globalDescription', 'Configure system-wide reorder alert preferences')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    {t('common.comingSoon', 'Coming Soon')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
};

const ReorderAlertsPage: React.FC = () => {
  return <ReorderAlertsContent />;
};

export default ReorderAlertsPage;