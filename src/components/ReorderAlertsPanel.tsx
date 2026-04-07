import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/forms/FormField';
import Select, { SelectOption } from '@/components/ui/Select';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import {
  AlertTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  MinusCircleIcon,
} from '@/components/ui/icons';

interface ReorderAlert {
  id: string;
  itemName: string;
  currentStock: number;
  reorderLevel: number;
  category: string;
  supplier: string;
  status: 'critical' | 'warning' | 'normal' | 'out_of_stock';
  lastRestockDate?: string;
  daysUntilReorder: number;
}

interface ReorderAlertsPanelProps {
  alerts: ReorderAlert[];
  onDismiss: (alertId: string) => void;
  onRestock: (alertId: string) => void;
  onIgnore: (alertId: string) => void;
  loading?: boolean;
}

export const ReorderAlertsPanel: React.FC<ReorderAlertsPanelProps> = ({
  alerts,
  onDismiss,
  onRestock,
  onIgnore,
  loading = false,
}) => {
  const [selectedAlert, setSelectedAlert] = useState<ReorderAlert | null>(null);

  const handleSelectAlert = (alert: ReorderAlert) => {
    setSelectedAlert(alert);
  };

  const handleDismiss = (alertId: string) => {
    onDismiss(alertId);
    setSelectedAlert(null);
  };

  const handleRestock = (alertId: string) => {
    onRestock(alertId);
    setSelectedAlert(null);
  };

  const handleIgnore = (alertId: string) => {
    onIgnore(alertId);
    setSelectedAlert(null);
  };

  const statusOptions: SelectOption[] = [
    { label: 'Critical', value: 'critical' },
    { label: 'Warning', value: 'warning' },
    { label: 'Normal', value: 'normal' },
    { label: 'Out of Stock', value: 'out_of_stock' },
  ];

  const columns: DataGridColumn<ReorderAlert>[] = [
    {
      key: 'itemName',
      header: 'Item Name',
      sortable: true,
      render: (value, item) => (
        <div>
          <span className="font-medium text-gray-900">{value}</span>
          <p className="text-xs text-gray-500">{item.category}</p>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Current Stock',
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${value <= item.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'reorderLevel',
      header: 'Reorder Level',
      sortable: true,
    },
    {
      key: 'daysUntilReorder',
      header: 'Days Until Reorder',
      sortable: true,
      render: (value) => (
        <span className={value <= 3 ? 'text-red-600' : value <= 7 ? 'text-yellow-600' : 'text-gray-900'}>
          {value}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          value === 'critical' ? 'bg-red-100 text-red-800' :
          value === 'warning' ? 'bg-yellow-100 text-yellow-800' :
          value === 'out_of_stock' ? 'bg-gray-100 text-gray-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value}
        </span>
      ),
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <AlertTriangleIcon className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <ExclamationCircleIcon className="w-5 h-5 text-yellow-600" />;
      case 'normal':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'out_of_stock':
        return <XCircleIcon className="w-5 h-5 text-gray-800" />;
      default:
        return <MinusCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Critical';
      case 'warning':
        return 'Warning';
      case 'normal':
        return 'Normal';
      case 'out_of_stock':
        return 'Out of Stock';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reorder Alerts</h2>
        <p className="text-sm text-gray-500 mt-1">Monitor inventory levels and reorder alerts</p>
      </div>

      <Card>
        <DataGrid
          columns={columns}
          data={alerts}
          sortable
          filterable
          loading={loading}
          actions={[
            {
              label: 'Restock',
              onClick: (item) => handleRestock(item.id),
              variant: 'primary' as const,
            },
            {
              label: 'Ignore',
              onClick: (item) => handleIgnore(item.id),
              variant: 'secondary' as const,
            },
            {
              label: 'Dismiss',
              onClick: (item) => handleDismiss(item.id),
              variant: 'danger' as const,
            },
          ]}
          onEdit={(item) => {
            handleSelectAlert(item);
          }}
        />
      </Card>

      {selectedAlert && (
        <Card title="Alert Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Item Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Item Name:</span>
                  <span className="font-medium">{selectedAlert.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category:</span>
                  <span className="font-medium">{selectedAlert.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Supplier:</span>
                  <span className="font-medium">{selectedAlert.supplier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className="font-medium">{getStatusLabel(selectedAlert.status)}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Stock Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Current Stock:</span>
                  <span className={`font-medium ${selectedAlert.currentStock <= selectedAlert.reorderLevel ? 'text-red-600' : 'text-gray-900'}`}>
                    {selectedAlert.currentStock}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reorder Level:</span>
                  <span className="font-medium">{selectedAlert.reorderLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Days Until Reorder:</span>
                  <span className={`font-medium ${selectedAlert.daysUntilReorder <= 3 ? 'text-red-600' : selectedAlert.daysUntilReorder <= 7 ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {selectedAlert.daysUntilReorder}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Restock:</span>
                  <span className="font-medium">{selectedAlert.lastRestockDate ? new Date(selectedAlert.lastRestockDate).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="secondary" onClick={() => setSelectedAlert(null)}>
              Close
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReorderAlertsPanel;