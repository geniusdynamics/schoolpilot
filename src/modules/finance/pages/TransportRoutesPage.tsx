// ABOUTME: Transport Routes page - lists transport routes with their per-period cost and GL revenue account.
// ABOUTME: CRUD goes through useFinance() with update(id, patch); ids stay strings and save errors show in the dialog.

import React, { useState, useMemo } from 'react';
import { AccountType } from '@/modules/finance';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { PlusIcon, EditIcon, DeleteIcon, TruckIcon } from '@/components/ui/icons';
import { useFinance } from '@/modules/finance/hooks/useFinance';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useTranslation } from 'react-i18next';

/** A route as shown in the grid; ids are strings and the account name is resolved at read time. */
interface RouteRow {
  id: string;
  name: string;
  cost_per_period: number;
  gl_revenue_account_id: string | null;
  gl_revenue_account_name: string | null;
}

interface TransportRouteFormData {
  name: string;
  cost_per_period?: number;
  gl_revenue_account_id: string;
}

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const TransportRoutesPageContent: React.FC = () => {
  const { t } = useTranslation('finance');
  const {
    transportRoutes,
    chartOfAccounts,
    addTransportRoute,
    updateTransportRoute,
    deleteTransportRoute
  } = useFinance();
  const { showSuccess, showError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialFormData: TransportRouteFormData = { name: '', cost_per_period: 0, gl_revenue_account_id: '' };
  const [formData, setFormData] = useState<TransportRouteFormData>(initialFormData);

  const revenueAccounts = useMemo(() => chartOfAccounts.filter(coa => coa.type === AccountType.REVENUE && coa.is_active), [chartOfAccounts]);

  const rows = useMemo<RouteRow[]>(() => transportRoutes.map(route => {
    const accountId = route.gl_revenue_account_id == null ? null : String(route.gl_revenue_account_id);
    const account = chartOfAccounts.find(coa => String(coa.id) === accountId);
    return {
      id: String(route.id),
      name: route.name,
      cost_per_period: route.cost_per_period,
      gl_revenue_account_id: accountId,
      gl_revenue_account_name: account ? `${account.account_code} - ${account.name}` : route.gl_revenue_account_name ?? null,
    };
  }), [transportRoutes, chartOfAccounts]);

  const openModal = (route?: RouteRow) => {
    setEditingRoute(route || null);
    setFormError(null);
    setFormData(route ?
      {
        name: route.name,
        cost_per_period: route.cost_per_period,
        gl_revenue_account_id: route.gl_revenue_account_id ?? ''
      } :
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoute(null);
    setFormError(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null);
    setFormData(prev => ({ ...prev, [name]: name === 'cost_per_period' ? (value === '' ? undefined : parseFloat(value)) : value }));
  };

  const handleSubmit = async () => {
    if (saving) return;
    const cost = Number(formData.cost_per_period);
    if (!formData.name.trim() || !Number.isFinite(cost) || cost <= 0 || !formData.gl_revenue_account_id) {
      setFormError(t('transportRoutes.validation', 'Route Name, valid Cost per Period, and GL Revenue Account are required.'));
      return;
    }
    const payload = {
      name: formData.name.trim(),
      cost_per_period: cost,
      gl_revenue_account_id: formData.gl_revenue_account_id,
    };

    setSaving(true);
    try {
      // The finance record types still declare numeric foreign keys (SO-22); stored ids are strings.
      if (editingRoute) {
        await updateTransportRoute(editingRoute.id, payload as unknown as Parameters<typeof updateTransportRoute>[1]);
      } else {
        await addTransportRoute(payload as unknown as Parameters<typeof addTransportRoute>[0]);
      }
      showSuccess(t('transportRoutes.saved', 'Transport route saved.'));
      closeModal();
    } catch (error) {
      setFormError(`${t('transportRoutes.saveFailed', 'Failed to save transport route:')} ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const confirm = useConfirm();
  const handleDelete = async (id: string) => {
    if (!(await confirm({ variant: 'danger', message: 'Are you sure you want to delete this transport route?' }))) return;
    try {
      await deleteTransportRoute(id);
      showSuccess(t('transportRoutes.deleted', 'Transport route deleted.'));
    } catch (error) {
      showError(`${t('transportRoutes.deleteFailed', 'Failed to delete transport route:')} ${errorMessage(error)}`);
    }
  };

  const columns: DataGridColumn<RouteRow>[] = [
    {
      key: 'name',
      header: 'Route Name',
      sortable: true,
      filterable: true,
      width: 250,
      render: (value) => <span className="font-medium">{value}</span>
    },
    {
      key: 'cost_per_period',
      header: 'Cost per Period (KES)',
      sortable: true,
      filterable: true,
      width: 180,
      render: (value) => <span className="font-mono text-green-600">{Number(value ?? 0).toFixed(2)}</span>
    },
    {
      key: 'gl_revenue_account_name',
      header: 'GL Revenue Account',
      sortable: true,
      filterable: true,
      width: 250,
      render: (value) => <span className="text-primary-600">{value}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      sticky: 'right',
      render: (_value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card title="Transport Routes & Fees" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Transport Route
        </Button>
      }>
        <DataGrid
          columns={columns}
          data={rows}
          sortable
          filterable
          emptyState={{
            icon: <TruckIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No transport routes found",
            description: "Set up transport routes and their associated fees to manage student transportation services effectively.",
            action: {
              label: "Add Transport Route",
              onClick: () => openModal()
            }
          }}
        />
      </Card>

      <DialogForm isOpen={isModalOpen} onClose={closeModal} title={editingRoute ? 'Edit Transport Route' : 'Add New Transport Route'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving}>
              {editingRoute ? 'Save Changes' : 'Add Route'}
            </Button>
          </>
        }
      >
        {formError && <Alert variant="destructive" className="mb-4">{formError}</Alert>}
        <Input name="name" label="Route Name" value={formData.name} onChange={handleInputChange} required />
        <Input name="cost_per_period" label="Cost per Period (KES)" type="number" step="0.01" value={formData.cost_per_period ?? ''} onChange={handleInputChange} required />
        <Select name="gl_revenue_account_id" label="GL Revenue Account" value={formData.gl_revenue_account_id} onChange={handleInputChange} required>
            <option value="">Select Revenue Account</option>
            {revenueAccounts.map(coa => (<option key={coa.id} value={String(coa.id)}>{coa.account_code} - {coa.name}</option>))}
        </Select>
      </DialogForm>
    </div>
  );
};
const TransportRoutesPage: React.FC = () => (
  <div className="space-y-6">
    <TransportRoutesPageContent />
  </div>
);

export default TransportRoutesPage;
