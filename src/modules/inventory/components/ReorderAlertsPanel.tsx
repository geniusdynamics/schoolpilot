import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Alert, AlertDescription, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Label } from '@/components/ui';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  ShoppingCart,
  X,
  Bell,
  TrendingDown,
  Package
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logging';

interface ReorderAlertsPanelProps {
  className?: string;
  showSettings?: boolean;
  autoRefreshInterval?: number;
}

export const ReorderAlertsPanel: React.FC<ReorderAlertsPanelProps> = ({
  className = '',
  showSettings = true,
  autoRefreshInterval = 60
}) => {
  const { t } = useTranslation('inventory');
  const [selectedAlert, setSelectedAlert] = useState<ReorderAlert | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const {
    alerts,
    monitoringResult,
    isLoading,
    error,
    checkReorderRequirements,
    dismissAlert,
    refreshAlerts,
    highPriorityAlerts,
    mediumPriorityAlerts,
    lowPriorityAlerts,
    totalAlertsCount,
    isAutoMonitoringEnabled,
    lastAutoCheck,
    enableAutoMonitoring,
    disableAutoMonitoring
  } = usePeriodicReorderMonitoring(autoRefreshInterval);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4" />;
      case 'MEDIUM':
        return <Clock className="h-4 w-4" />;
      case 'LOW':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const handleDismissAlert = async (itemId: string) => {
    try {
      await dismissAlert(itemId);
      setSelectedAlert(null);
    } catch (error) {
      logger.error('Failed to dismiss alert:', error);
    }
  };

  const alertColumns: DataGridColumn<ReorderAlert>[] = [
    {
      key: 'priority',
      header: t('reorderAlerts.table.priority'),
      width: 120,
      render: (_v, alert) => (
        <div className="flex items-center gap-2">
          {getPriorityIcon(alert.priority)}
          <Badge variant={getPriorityColor(alert.priority) as any}>
            {alert.priority}
          </Badge>
        </div>
      )
    },
    {
      key: 'item_name',
      header: t('reorderAlerts.table.item'),
      render: (_v, alert) => <span className="font-medium">{alert.item_name}</span>
    },
    {
      key: 'current_stock',
      header: t('reorderAlerts.table.currentStock'),
      align: 'right',
      render: (_v, alert) => (
        <div className="text-right">
          <div className="font-medium">{alert.current_stock}</div>
          <div className="text-sm text-muted-foreground">
            {t('reorderAlerts.reorderPoint')}: {alert.reorder_point}
          </div>
        </div>
      )
    },
    {
      key: 'suggested_order_quantity',
      header: t('reorderAlerts.table.suggestedOrder'),
      align: 'right',
      render: (_v, alert) => (
        <div className="text-right">
          <div className="font-medium text-blue-600">
            {alert.suggested_order_quantity}
          </div>
          <div className="text-sm text-muted-foreground">
            {alert.reorder_quantity > 0 && `(${t('reorderAlerts.standard')}: ${alert.reorder_quantity})`}
          </div>
        </div>
      )
    },
    {
      key: 'alert_type',
      header: t('reorderAlerts.table.alertType'),
      render: (_v, alert) => (
        <Badge variant={alert.alert_type === 'REORDER_REQUIRED' ? 'destructive' : 'warning'}>
          {alert.alert_type === 'REORDER_REQUIRED' ? t('reorderAlerts.reorderRequired') : t('reorderAlerts.lowStock')}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: t('reorderAlerts.table.actions'),
      width: 80,
      sortable: false,
      filterable: false,
      render: (_v, alert) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleDismissAlert(alert.item_id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )
    }
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{t('reorderAlerts.title')}</h2>
          {totalAlertsCount > 0 && (
            <Badge variant="destructive">{totalAlertsCount}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAlerts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={checkReorderRequirements}
            disabled={isLoading}
          >
            <Package className="h-4 w-4" />
            {t('reorderAlerts.checkAll')}
          </Button>
          {showSettings && (
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('reorderAlerts.settings.title')}</DialogTitle>
                  <DialogDescription>
                    {t('reorderAlerts.settings.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t('reorderAlerts.settings.autoMonitoring')}</Label>
                    <Button
                      variant={isAutoMonitoringEnabled ? 'default' : 'outline'}
                      size="sm"
                      onClick={isAutoMonitoringEnabled ? disableAutoMonitoring : enableAutoMonitoring}
                    >
                      {isAutoMonitoringEnabled ? t('common.enabled') : t('common.disabled')}
                    </Button>
                  </div>
                  {lastAutoCheck && (
                    <div className="text-sm text-muted-foreground">
                      {t('reorderAlerts.settings.lastCheck')}: {lastAutoCheck.toLocaleString()}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsSettingsOpen(false)}>
                    {t('common.close')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Monitoring Summary */}
      {monitoringResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{monitoringResult.items_below_reorder_point}</div>
                  <div className="text-sm text-muted-foreground">{t('reorderAlerts.summary.itemsBelowReorder')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{monitoringResult.total_items_monitored}</div>
                  <div className="text-sm text-muted-foreground">{t('reorderAlerts.summary.totalMonitored')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{totalAlertsCount}</div>
                  <div className="text-sm text-muted-foreground">{t('reorderAlerts.summary.activeAlerts')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium">{t('reorderAlerts.summary.lastCheck')}</div>
                  <div className="text-sm text-muted-foreground">
                    {monitoringResult.last_check.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reorderAlerts.activeAlerts')}</CardTitle>
        </CardHeader>
        <CardContent>
          {totalAlertsCount === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium">{t('reorderAlerts.noAlerts.title')}</h3>
              <p className="text-muted-foreground">{t('reorderAlerts.noAlerts.description')}</p>
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">
                  {t('reorderAlerts.tabs.all')} ({totalAlertsCount})
                </TabsTrigger>
                <TabsTrigger value="high">
                  {t('reorderAlerts.tabs.high')} ({highPriorityAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="medium">
                  {t('reorderAlerts.tabs.medium')} ({mediumPriorityAlerts.length})
                </TabsTrigger>
                <TabsTrigger value="low">
                  {t('reorderAlerts.tabs.low')} ({lowPriorityAlerts.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <DataGrid
                  columns={alertColumns}
                  data={alerts}
                  keyField="item_id"
                  onRowClick={(alert) => setSelectedAlert(alert)}
                />
              </TabsContent>

              <TabsContent value="high">
                <DataGrid
                  columns={alertColumns}
                  data={highPriorityAlerts}
                  keyField="item_id"
                  onRowClick={(alert) => setSelectedAlert(alert)}
                />
              </TabsContent>

              <TabsContent value="medium">
                <DataGrid
                  columns={alertColumns}
                  data={mediumPriorityAlerts}
                  keyField="item_id"
                  onRowClick={(alert) => setSelectedAlert(alert)}
                />
              </TabsContent>

              <TabsContent value="low">
                <DataGrid
                  columns={alertColumns}
                  data={lowPriorityAlerts}
                  keyField="item_id"
                  onRowClick={(alert) => setSelectedAlert(alert)}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getPriorityIcon(selectedAlert.priority)}
                {selectedAlert.item_name}
              </DialogTitle>
              <DialogDescription>
                {t('reorderAlerts.detail.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('reorderAlerts.detail.currentStock')}</Label>
                  <div className="text-2xl font-bold">{selectedAlert.current_stock}</div>
                </div>
                <div>
                  <Label>{t('reorderAlerts.detail.reorderPoint')}</Label>
                  <div className="text-2xl font-bold">{selectedAlert.reorder_point}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('reorderAlerts.detail.suggestedOrder')}</Label>
                  <div className="text-2xl font-bold text-blue-600">{selectedAlert.suggested_order_quantity}</div>
                </div>
                <div>
                  <Label>{t('reorderAlerts.detail.priority')}</Label>
                  <Badge variant={getPriorityColor(selectedAlert.priority) as any}>
                    {selectedAlert.priority}
                  </Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                {t('common.close')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDismissAlert(selectedAlert.item_id)}
              >
                <X className="h-4 w-4 mr-2" />
                {t('reorderAlerts.dismissAlert')}
              </Button>
              <Button>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t('reorderAlerts.createOrder')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReorderAlertsPanel;