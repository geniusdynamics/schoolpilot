


import React, { useState, useMemo } from 'react';
import { FinTransportRouteType as TransportRoute, FinChartOfAccountType as ChartOfAccount, FinAccountTypeEnum as AccountType } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, TruckIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';

type TransportRouteFormData = Omit<Partial<TransportRoute>, 'id' | 'created_at' | 'updated_at' | 'gl_revenue_account_name'>;

const TransportRoutesPage: React.FC = () => {
  const { 
    transportRoutes, 
    chartOfAccounts,
    loading, 
    addTransportRoute, 
    updateTransportRoute, 
    deleteTransportRoute 
  } = useAppData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TransportRoute | null>(null);
  
  const initialFormData: TransportRouteFormData = { 
    name: '', 
    cost_per_period: 0, 
    gl_revenue_account_id: undefined 
  };
  const [formData, setFormData] = useState<TransportRouteFormData>(initialFormData);

  const revenueAccounts = useMemo(() => chartOfAccounts.filter(coa => coa.type === AccountType.REVENUE && coa.is_active), [chartOfAccounts]);

  const openModal = (route?: TransportRoute) => {
    setEditingRoute(route || null);
    setFormData(route ? 
      { 
        name: route.name, 
        cost_per_period: route.cost_per_period, 
        gl_revenue_account_id: route.gl_revenue_account_id 
      } : 
      initialFormData
    );
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoute(null);
    setFormData(initialFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'cost_per_period' || name === 'gl_revenue_account_id') ? (value ? Number(value) : undefined) : value }));
  };
  
  const handleSubmit = async () => {
    if (!formData.name || formData.cost_per_period === undefined || formData.cost_per_period <= 0 || !formData.gl_revenue_account_id) {
      alert("Route Name, valid Cost per Period, and GL Revenue Account are required.");
      return;
    }
    const payload: Omit<TransportRoute, 'id'|'created_at'|'updated_at'|'gl_revenue_account_name'> = {
      name: formData.name!,
      cost_per_period: Number(formData.cost_per_period),
      gl_revenue_account_id: Number(formData.gl_revenue_account_id!),
    };

    if (editingRoute) {
      await updateTransportRoute({ ...editingRoute, ...payload });
    } else {
      await addTransportRoute(payload);
    }
    closeModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this transport route?')) {
      await deleteTransportRoute(id);
    }
  };

  const columns = [
    { header: 'Route Name', accessor: 'name' as keyof TransportRoute },
    { header: 'Cost per Period (KES)', accessor: 'cost_per_period' as keyof TransportRoute, render: (item: TransportRoute) => item.cost_per_period.toFixed(2) },
    { header: 'GL Revenue Account', accessor: 'gl_revenue_account_name' as keyof TransportRoute },
    {
      header: 'Actions',
      accessor: 'id' as keyof TransportRoute,
      render: (item: TransportRoute) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];
  
  const isLoadingData = loading.transportRoutes || loading.chartOfAccounts;

  if (isLoadingData && !isModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Transport Routes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Transport Routes & Fees" actions={
        <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Transport Route
        </Button>
      }>
        <Table columns={columns} data={transportRoutes} isLoading={loading.transportRoutes && isModalOpen} />
      </Card>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingRoute ? 'Edit Transport Route' : 'Add New Transport Route'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading.transportRoutes}>
              {loading.transportRoutes ? <Spinner size="sm"/> : (editingRoute ? 'Save Changes' : 'Add Route')}
            </Button>
          </>
        }
      >
        <Input name="name" label="Route Name" value={formData.name || ''} onChange={handleInputChange} required />
        <Input name="cost_per_period" label="Cost per Period (KES)" type="number" step="0.01" value={formData.cost_per_period || ''} onChange={handleInputChange} required />
        <Select name="gl_revenue_account_id" label="GL Revenue Account" value={formData.gl_revenue_account_id || ''} onChange={handleInputChange} required>
            <option value="">Select Revenue Account</option>
            {revenueAccounts.map((coa: ChartOfAccount) => (<option key={coa.id} value={coa.id}>{coa.account_code} - {coa.name}</option>))}
        </Select>
      </Modal>
    </div>
  );
};

export default TransportRoutesPage;
