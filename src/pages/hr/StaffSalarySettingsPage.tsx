
import React, { useState, useMemo, useEffect } from 'react';
import { Staff, StaffSalarySetting, StaffRecurringItem, PayrollItemType, PayrollItemCategory } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { CogIcon, EditIcon, DeleteIcon, PlusIcon, WalletIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '../../components/ui/Spinner';

type SalarySettingFormData = Omit<Partial<StaffSalarySetting>, 'id' | 'staff_id' | 'created_at' | 'updated_at' | 'staff_name' | 'recurring_items'>;
type RecurringItemFormData = Omit<Partial<StaffRecurringItem>, 'id' | 'staff_salary_setting_id' | 'created_at' | 'item_type_name' | 'item_category'>;

const StaffSalarySettingsPage: React.FC = () => {
  const { 
    staff, 
    staffSalarySettings, 
    payrollItemTypes,
    loading, 
    updateStaffSalarySetting 
  } = useAppData(); // Updated
  
  const [isSettingModalOpen, setIsSettingModalOpen] = useState(false);
  const [isRecurringItemModalOpen, setIsRecurringItemModalOpen] = useState(false);
  
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [currentSalarySetting, setCurrentSalarySetting] = useState<StaffSalarySetting | null>(null);
  const [editingRecurringItem, setEditingRecurringItem] = useState<StaffRecurringItem | null>(null);
  
  const initialSettingFormData: SalarySettingFormData = { basic_salary: 0, payment_bank: '', bank_account_no: '', max_advance_amount: 0 };
  const [settingFormData, setSettingFormData] = useState<SalarySettingFormData>(initialSettingFormData);

  const initialRecurringItemFormData: RecurringItemFormData = { item_type_id: undefined, amount: 0 };
  const [recurringItemFormData, setRecurringItemFormData] = useState<RecurringItemFormData>(initialRecurringItemFormData);
  
  // Local state for recurring items within the main salary setting modal
  const [modalRecurringItems, setModalRecurringItems] = useState<StaffRecurringItem[]>([]);


  const openSettingModal = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    const setting = staffSalarySettings.find(s => s.staff_id === staffMember.id);
    setCurrentSalarySetting(setting || null);
    setSettingFormData(setting ? 
      { basic_salary: setting.basic_salary, payment_bank: setting.payment_bank, bank_account_no: setting.bank_account_no, max_advance_amount: setting.max_advance_amount } : 
      initialSettingFormData
    );
    setModalRecurringItems(setting?.recurring_items || []);
    setIsSettingModalOpen(true);
  };

  const closeSettingModal = () => {
    setIsSettingModalOpen(false);
    setSelectedStaff(null);
    setCurrentSalarySetting(null);
    setSettingFormData(initialSettingFormData);
    setModalRecurringItems([]);
  };
  
  const openRecurringItemModal = (item?: StaffRecurringItem) => {
    setEditingRecurringItem(item || null);
    setRecurringItemFormData(item ? 
        { item_type_id: item.item_type_id, amount: item.amount } : 
        initialRecurringItemFormData
    );
    setIsRecurringItemModalOpen(true);
  };

  const closeRecurringItemModal = () => {
    setIsRecurringItemModalOpen(false);
    setEditingRecurringItem(null);
    setRecurringItemFormData(initialRecurringItemFormData);
  };

  const handleSettingInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSettingFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleRecurringItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setRecurringItemFormData(prev => ({ ...prev, [name]: type === 'number' || name === 'item_type_id' ? parseFloat(value) || 0 : value }));
  };

  const handleMainSubmit = async () => {
    if (!selectedStaff || settingFormData.basic_salary === undefined) {
      alert("Basic salary is required.");
      return;
    }
    
    const salaryDataToSave: Omit<StaffSalarySetting, 'id' | 'staff_id' | 'created_at' | 'updated_at' | 'staff_name' | 'recurring_items'> = {
        basic_salary: Number(settingFormData.basic_salary),
        payment_bank: settingFormData.payment_bank,
        bank_account_no: settingFormData.bank_account_no,
        max_advance_amount: Number(settingFormData.max_advance_amount) || undefined,
    };

    // Prepare recurring items without denormalized fields, as useMockData will resolve them
    const recurringItemsToSave = modalRecurringItems.map(ri => ({
        item_type_id: ri.item_type_id,
        amount: ri.amount,
        // id, staff_salary_setting_id, created_at are handled by mock or not needed for this payload part
    }));
    
    await updateStaffSalarySetting(selectedStaff.id, salaryDataToSave, recurringItemsToSave);
    closeSettingModal();
  };
  
  const handleAddOrUpdateRecurringItem = () => {
    if (!recurringItemFormData.item_type_id || recurringItemFormData.amount === undefined) {
        alert("Item type and amount are required for a recurring item.");
        return;
    }
    const itemTypeDetails = payrollItemTypes.find(pit => pit.id === Number(recurringItemFormData.item_type_id));

    if (editingRecurringItem) {
        setModalRecurringItems(prevItems => prevItems.map(item => 
            item.id === editingRecurringItem.id ? 
            { 
                ...editingRecurringItem, 
                item_type_id: Number(recurringItemFormData.item_type_id!), 
                amount: Number(recurringItemFormData.amount!),
                item_type_name: itemTypeDetails?.name,
                item_category: itemTypeDetails?.category,
            } : item
        ));
    } else {
        const newItem: StaffRecurringItem = {
            id: `tempRI-${Date.now()}`, // Temporary ID for UI list
            staff_salary_setting_id: selectedStaff!.id, // Context
            item_type_id: Number(recurringItemFormData.item_type_id!),
            amount: Number(recurringItemFormData.amount!),
            item_type_name: itemTypeDetails?.name,
            item_category: itemTypeDetails?.category,
            created_at: new Date().toISOString(),
        };
        setModalRecurringItems(prevItems => [...prevItems, newItem]);
    }
    closeRecurringItemModal();
  };

  const handleDeleteRecurringItem = (itemId: string) => {
    if (window.confirm("Are you sure you want to remove this recurring item?")) {
        setModalRecurringItems(prevItems => prevItems.filter(item => item.id !== itemId));
    }
  };

  const staffListColumns = [
    { header: 'Staff No.', accessor: 'staff_no' as keyof Staff },
    { header: 'Name', accessor: 'display_name' as keyof Staff },
    { header: 'Department', accessor: 'department_name' as keyof Staff },
    { header: 'Designation', accessor: 'designation_title' as keyof Staff },
    { header: 'Basic Salary', 
      accessor: 'id' as keyof Staff, 
      render: (staffMember: Staff) => {
        const setting = staffSalarySettings.find(s => s.staff_id === staffMember.id);
        return setting ? `Ksh ${setting.basic_salary.toFixed(2)}` : 'Not Set';
      } 
    },
    {
      header: 'Actions',
      accessor: 'id' as keyof Staff,
      render: (staffMember: Staff) => (
        <Button size="sm" variant="ghost" onClick={() => openSettingModal(staffMember)} leftIcon={<CogIcon className="w-4 h-4" />}>
          Manage Salary
        </Button>
      ),
    },
  ];

  const recurringItemColumns = [
    { header: 'Item Type', accessor: 'item_type_name' as keyof StaffRecurringItem },
    { header: 'Category', accessor: 'item_category' as keyof StaffRecurringItem },
    { header: 'Amount (KES)', accessor: 'amount' as keyof StaffRecurringItem, render: (item: StaffRecurringItem) => item.amount.toFixed(2) },
    {
      header: 'Actions',
      accessor: 'id' as keyof StaffRecurringItem,
      render: (item: StaffRecurringItem) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openRecurringItemModal(item)} leftIcon={<EditIcon className="w-3 h-3"/>}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteRecurringItem(item.id)} leftIcon={<DeleteIcon className="w-3 h-3"/>}>Del</Button>
        </div>
      ),
    },
  ];

  if ((loading.staff || loading.staffSalarySettings || loading.payrollItemTypes) && !isSettingModalOpen && !isRecurringItemModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Staff Salary Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Staff Salary Settings">
        <p className="text-sm text-gray-600 mb-4">
          Manage salary configurations for each staff member, including basic pay and recurring allowances or deductions.
        </p>
        <Table columns={staffListColumns} data={staff} isLoading={loading.staff && !isSettingModalOpen} />
      </Card>

      {/* Main Salary Setting Modal */}
      <Modal 
        isOpen={isSettingModalOpen} 
        onClose={closeSettingModal} 
        title={`Salary Settings for ${selectedStaff?.display_name || ''}`} 
        size="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={closeSettingModal}>Cancel</Button>
            <Button onClick={handleMainSubmit} disabled={loading.staffSalarySettings}>
              {loading.staffSalarySettings ? <Spinner size="sm"/> : 'Save Settings'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input name="basic_salary" label="Basic Salary (KES)" type="number" step="0.01" value={settingFormData.basic_salary || ''} onChange={handleSettingInputChange} required />
            <Input name="payment_bank" label="Payment Bank" value={settingFormData.payment_bank || ''} onChange={handleSettingInputChange} />
            <Input name="bank_account_no" label="Bank Account No." value={settingFormData.bank_account_no || ''} onChange={handleSettingInputChange} />
            <Input name="max_advance_amount" label="Max Advance Amount (KES)" type="number" step="0.01" value={settingFormData.max_advance_amount || ''} onChange={handleSettingInputChange} />
        </div>
        
        <Card 
            title="Recurring Payroll Items" 
            actions={<Button size="sm" onClick={() => openRecurringItemModal()} leftIcon={<PlusIcon className="w-4 h-4"/>}>Add Item</Button>}
            className="mt-4"
            bodyClassName="p-0"
        >
            {modalRecurringItems.length > 0 ? (
                 <Table columns={recurringItemColumns} data={modalRecurringItems} />
            ): (
                <p className="text-sm text-gray-500 p-4 text-center">No recurring items added for this staff member yet.</p>
            )}
        </Card>
      </Modal>

      {/* Recurring Item Add/Edit Modal */}
      <Modal 
        isOpen={isRecurringItemModalOpen} 
        onClose={closeRecurringItemModal} 
        title={editingRecurringItem ? 'Edit Recurring Item' : 'Add Recurring Item'}
        size="lg"
        footer={
            <>
                <Button variant="secondary" onClick={closeRecurringItemModal}>Cancel</Button>
                <Button onClick={handleAddOrUpdateRecurringItem}>
                    {editingRecurringItem ? 'Update Item' : 'Add Item'}
                </Button>
            </>
        }
        >
            <Select 
                name="item_type_id" 
                label="Payroll Item Type" 
                value={recurringItemFormData.item_type_id || ''} 
                onChange={handleRecurringItemInputChange}
                required
                >
                <option value="">Select Item Type</option>
                {payrollItemTypes.map(pit => <option key={pit.id} value={pit.id}>{pit.name} ({pit.category})</option>)}
            </Select>
            <Input name="amount" label="Amount (KES)" type="number" step="0.01" value={recurringItemFormData.amount || ''} onChange={handleRecurringItemInputChange} required/>
      </Modal>
    </div>
  );
};

export default StaffSalarySettingsPage;
