import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { CogIcon } from '@/components/ui/icons';

const InventorySettingsPage: React.FC = () => {

  const [settings, setSettings] = useState({
    lowStockThreshold: '10',
    defaultWarehouse: 'main',
    autoReorderEnabled: true,
    currency: 'KES',
    decimalPlaces: '2',
    defaultSupplier: '',
    expiryDateTracking: true,
    batchTracking: false,
    serialNumberTracking: false,
    defaultReorderQuantity: '50',
  });

  const handleChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    alert('Inventory settings saved successfully.');
  };

  return (
    <div className="space-y-3">
      <Card title="Inventory Settings" info="Configure inventory module preferences and defaults">
        <div className="space-y-6">
          {/* Stock Thresholds */}
          <div>
            <h3 className="text-sm font-semibold text-surface-foreground mb-3 border-b pb-2">Stock Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Low Stock Alert Threshold"
                type="number"
                value={settings.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', e.target.value)}
                helperText="Minimum quantity before item is flagged as low stock"
              />
              <Input
                label="Default Reorder Quantity"
                type="number"
                value={settings.defaultReorderQuantity}
                onChange={(e) => handleChange('defaultReorderQuantity', e.target.value)}
                helperText="Default quantity to reorder when stock runs low"
              />
            </div>
          </div>

          {/* Warehouse Defaults */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-surface-foreground mb-3 border-b pb-2">Warehouse Defaults</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Default Warehouse"
                value={settings.defaultWarehouse}
                onChange={(value) => handleChange('defaultWarehouse', value)}
                options={[
                  { label: 'Main Warehouse', value: 'main' },
                  { label: 'Secondary Warehouse', value: 'secondary' },
                  { label: 'Bookstore', value: 'bookstore' },
                  { label: 'Kitchen Stores', value: 'kitchen' },
                ]}
              />
              <Select
                label="Default Supplier"
                value={settings.defaultSupplier}
                onChange={(value) => handleChange('defaultSupplier', value)}
                options={[
                  { label: 'None (select on order)', value: '' },
                  { label: 'Stationery Masters Ltd', value: 'sup-001' },
                  { label: 'Edu Supplies Co.', value: 'sup-002' },
                  { label: 'Food Distributors Inc.', value: 'sup-003' },
                ]}
              />
            </div>
          </div>

          {/* Currency & Formatting */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-surface-foreground mb-3 border-b pb-2">Currency & Formatting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Currency"
                value={settings.currency}
                onChange={(value) => handleChange('currency', value)}
                options={[
                  { label: 'KES - Kenyan Shilling', value: 'KES' },
                  { label: 'USD - US Dollar', value: 'USD' },
                  { label: 'EUR - Euro', value: 'EUR' },
                  { label: 'GBP - British Pound', value: 'GBP' },
                  { label: 'UGX - Ugandan Shilling', value: 'UGX' },
                  { label: 'TZS - Tanzanian Shilling', value: 'TZS' },
                ]}
              />
              <Select
                label="Decimal Places"
                value={settings.decimalPlaces}
                onChange={(value) => handleChange('decimalPlaces', value)}
                options={[
                  { label: '0 (Whole numbers)', value: '0' },
                  { label: '2 (Standard)', value: '2' },
                  { label: '4 (Precision)', value: '4' },
                ]}
              />
            </div>
          </div>

          {/* Tracking Options */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-surface-foreground mb-3 border-b pb-2">Tracking Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.expiryDateTracking}
                  onChange={(e) => handleChange('expiryDateTracking', e.target.checked)}
                  className="rounded border-surface-border text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-surface-foreground">Enable Expiry Date Tracking</span>
                  <p className="text-xs text-surface-muted-fg">Track expiry dates for perishable and consumable items</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.batchTracking}
                  onChange={(e) => handleChange('batchTracking', e.target.checked)}
                  className="rounded border-surface-border text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-surface-foreground">Enable Batch/Lot Tracking</span>
                  <p className="text-xs text-surface-muted-fg">Track items by batch or lot numbers for traceability</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.serialNumberTracking}
                  onChange={(e) => handleChange('serialNumberTracking', e.target.checked)}
                  className="rounded border-surface-border text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-surface-foreground">Enable Serial Number Tracking</span>
                  <p className="text-xs text-surface-muted-fg">Track individual items by unique serial numbers</p>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoReorderEnabled}
                  onChange={(e) => handleChange('autoReorderEnabled', e.target.checked)}
                  className="rounded border-surface-border text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="text-sm font-medium text-surface-foreground">Enable Auto-Reorder Alerts</span>
                  <p className="text-xs text-surface-muted-fg">Automatically generate reorder recommendations when stock is low</p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-6 pt-4 border-t flex justify-end">
            <Button onClick={handleSave} leftIcon={<CogIcon className="w-5 h-5" />}>
              Save Inventory Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InventorySettingsPage;

export const InventorySettingsContent = InventorySettingsPage;
