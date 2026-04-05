import React, { useState, useMemo, useEffect } from 'react';
import { FinFeeTemplateType as FeeTemplate, FinFeeTemplateItemType as FeeTemplateItem, SchoolPeriod, StudentCategory, FinChartOfAccountType as ChartOfAccount, FinExpenseCategoryType as ExpenseCategory, FinAccountTypeEnum } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "../../../components/ui/forms/DialogForm";
import FormSection from "../../../components/ui/forms/FormSection";
import FormField from "../../../components/ui/forms/FormField";
import FormActions from "../../../components/ui/forms/FormActions";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, TicketIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; 
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type FeeTemplateFormData = Omit<Partial<FeeTemplate>, 'id' | 'created_at' | 'updated_at' | 'school_period_name' | 'student_category_name' | 'items'>;
type FeeItemFormData = Omit<Partial<FeeTemplateItem>, 'id' | 'fee_template_id' | 'revenue_account_name' | 'linked_expense_category_name'>;

const FeeTemplatesPage: React.FC = () => {
  const { 
    feeTemplates, 
    schoolPeriods,
    studentCategories,
    chartOfAccounts,
    expenseCategories,
    loading, 
    addFeeTemplate, 
    updateFeeTemplate, 
    deleteFeeTemplate 
  } = useAppData(); 
  
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  const [editingTemplate, setEditingTemplate] = useState<FeeTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<FeeTemplateItem | null>(null);
  const [currentTemplateForItems, setCurrentTemplateForItems] = useState<FeeTemplate | null>(null);

  const initialTemplateFormData: FeeTemplateFormData = { name: '', school_period_id: undefined, student_category_id: undefined };
  const initialItemFormData: FeeItemFormData = { description: '', amount: 0, revenue_account_id: undefined, linked_expense_category_id: undefined };

  const [templateFormData, setTemplateFormData] = useState<FeeTemplateFormData>(initialTemplateFormData);
  const [itemFormData, setItemFormData] = useState<FeeItemFormData>(initialItemFormData);

  const revenueAccounts = useMemo(() => (chartOfAccounts || []).filter(coa => coa.type === FinAccountTypeEnum.REVENUE && coa.is_active), [chartOfAccounts]);

  // Template Modal
  const openTemplateModal = (template?: FeeTemplate) => {
    setEditingTemplate(template || null);
    setTemplateFormData(template ? 
      { name: template.name, school_period_id: template.school_period_id, student_category_id: template.student_category_id } : 
      initialTemplateFormData
    );
    setIsTemplateModalOpen(true);
  };
  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateFormData(initialTemplateFormData);
  };

  // Item Modal
  const openItemModal = (template: FeeTemplate, item?: FeeTemplateItem) => {
    setCurrentTemplateForItems(template);
    setEditingItem(item || null);
    setItemFormData(item ? 
      { description: item.description, amount: item.amount, revenue_account_id: item.revenue_account_id, linked_expense_category_id: item.linked_expense_category_id } : 
      initialItemFormData
    );
    setIsItemModalOpen(true);
  };
  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
    // setCurrentTemplateForItems(null); // Keep context if modal is just for adding more items
    setItemFormData(initialItemFormData);
  };

  const handleTemplateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTemplateFormData(prev => ({ ...prev, [name]: value ? (name.endsWith('_id') ? parseInt(value) : value) : undefined }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setItemFormData(prev => ({ ...prev, [name]: name.endsWith('_id') ? (value ? parseInt(value) : undefined) : (name === 'amount' ? parseFloat(value) : value) }));
  };
  
  const handleTemplateSubmit = async () => {
    if (!templateFormData.name || !templateFormData.school_period_id) {
      alert("Template name and school period are required.");
      return;
    }
    const payload: Omit<FeeTemplate, 'id' | 'created_at' | 'updated_at' | 'items' | 'school_period_name' | 'student_category_name'> = {
      name: templateFormData.name!,
      school_period_id: Number(templateFormData.school_period_id!),
      student_category_id: templateFormData.student_category_id ? Number(templateFormData.student_category_id) : undefined,
    };

    if (editingTemplate) {
      await updateFeeTemplate({ ...editingTemplate, ...payload, items: editingTemplate.items || [] });
    } else {
      await addFeeTemplate({ ...payload, items: [] });
    }
    closeTemplateModal();
  };

  const handleItemSubmit = async () => {
    if (!currentTemplateForItems || !itemFormData.description || itemFormData.amount === undefined || !itemFormData.revenue_account_id) {
      alert("Description, Amount, and Revenue Account are required for an item.");
      return;
    }

    let updatedItems: FeeTemplateItem[];
    const now = new Date().toISOString(); 

    if (editingItem) {
      updatedItems = (currentTemplateForItems.items || []).map(i => 
        i.id === editingItem.id ? 
        { 
            ...editingItem, 
            description: itemFormData.description!, 
            amount: Number(itemFormData.amount!), 
            revenue_account_id: Number(itemFormData.revenue_account_id!),
            linked_expense_category_id: itemFormData.linked_expense_category_id ? Number(itemFormData.linked_expense_category_id) : undefined,
            revenue_account_name: revenueAccounts.find(ra => ra.id === Number(itemFormData.revenue_account_id!))?.name,
            linked_expense_category_name: expenseCategories.find(ec => ec.id === Number(itemFormData.linked_expense_category_id))?.name,
        } : i
      );
    } else {
      const newItem: FeeTemplateItem = { 
        id: `FTI_${Date.now()}`, 
        fee_template_id: currentTemplateForItems.id,
        description: itemFormData.description!,
        amount: Number(itemFormData.amount!),
        revenue_account_id: Number(itemFormData.revenue_account_id!),
        linked_expense_category_id: itemFormData.linked_expense_category_id ? Number(itemFormData.linked_expense_category_id) : undefined,
        revenue_account_name: revenueAccounts.find(ra => ra.id === Number(itemFormData.revenue_account_id!))?.name,
        linked_expense_category_name: expenseCategories.find(ec => ec.id === Number(itemFormData.linked_expense_category_id))?.name,
      };
      updatedItems = [...(currentTemplateForItems.items || []), newItem];
    }
    
    const updatedTemplate = { ...currentTemplateForItems, items: updatedItems, updated_at: now };
    await updateFeeTemplate(updatedTemplate);
    
    setCurrentTemplateForItems(updatedTemplate); 
    
    setEditingItem(null); 
    setItemFormData(initialItemFormData); 
  };
  
  const handleDeleteTemplate = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this fee template? All its items will also be deleted.')) {
      await deleteFeeTemplate(id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!currentTemplateForItems) return;
    if (window.confirm('Are you sure you want to delete this fee template item?')) {
      const updatedItems = (currentTemplateForItems.items || []).filter(i => i.id !== itemId);
      const updatedTemplate = { ...currentTemplateForItems, items: updatedItems, updated_at: new Date().toISOString() };
      await updateFeeTemplate(updatedTemplate);
      setCurrentTemplateForItems(updatedTemplate); 
    }
  };

  const templateColumns: DataGridColumn<FeeTemplate>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value, row) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'name', 
      header: 'Template Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'school_period_name', 
      header: 'School Period', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="text-blue-600">{value}</span>
    },
    { 
      key: 'student_category_name', 
      header: 'Student Category', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="text-purple-600">{value || 'All Categories'}</span>
    },
    { 
      key: 'items_count', 
      header: 'Items', 
      sortable: true, 
      filterable: false, 
      width: 80,
      render: (value, row) => <span className="text-center font-semibold">{row.items?.length || 0}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 200,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openTemplateModal(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => openItemModal(row)} leftIcon={<ListBulletIcon className="w-4 h-4" />}>Items</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteTemplate(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const itemColumns: DataGridColumn<FeeTemplateItem>[] = [
    { 
      key: 'description', 
      header: 'Description', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value, row) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'amount', 
      header: 'Amount', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => <span className="font-mono text-green-600">{row.amount.toFixed(2)}</span>
    },
    { 
      key: 'revenue_account_name', 
      header: 'Revenue Account', 
      sortable: true, 
      filterable: true, 
      width: 180,
      render: (value, row) => <span className="text-blue-600">{value}</span>
    },
    { 
      key: 'linked_expense_category_name', 
      header: 'Expense Category', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => <span className="text-purple-600">{value || 'None'}</span>
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 120,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openItemModal(currentTemplateForItems!, row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteItem(row.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Del</Button>
        </div>
      ),
    },
  ];
  
  const isLoadingData = loading.feeTemplates || loading.schoolPeriods || loading.studentCategories || loading.chartOfAccounts || loading.expenseCategories;

  if (isLoadingData && !isTemplateModalOpen && !isItemModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Fee Templates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Fee Templates Management" actions={
        <Button onClick={() => openTemplateModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          Add Fee Template
        </Button>
      }>
        <p className="text-sm text-gray-600 mb-4">
          Create and manage fee templates for different school periods and student categories. Define template items (voteheads) and amounts.
        </p>
        <DataGrid 
          columns={templateColumns} 
          data={(feeTemplates || [])} 
          isLoading={loading.feeTemplates && (isTemplateModalOpen || isItemModalOpen)}
          sortable
          filterable
          emptyState={{
            icon: <TicketIcon className="w-12 h-12 text-gray-400" />,
            title: "No Fee Templates Found",
            description: "Create your first fee template to define fees for different school periods and student categories.",
            action: {
              label: "Add Fee Template",
              onClick: () => openTemplateModal()
            }
          }}
        />
      </Card>

      <DialogForm isOpen={isTemplateModalOpen} onClose={closeTemplateModal} title={editingTemplate ? 'Edit Fee Template' : 'Add New Fee Template'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeTemplateModal}>Cancel</Button>
            <Button onClick={handleTemplateSubmit} disabled={loading.feeTemplates}>
              {loading.feeTemplates ? <Spinner size="sm"/> : (editingTemplate ? 'Save Changes' : 'Add Template')}
            </Button>
          </>
        }
      >
        <Input 
          name="name" 
          label="Template Name" 
          value={templateFormData.name || ''} 
          onChange={handleTemplateInputChange} 
          required 
        />
        <Select 
          name="school_period_id" 
          label="School Period" 
          value={templateFormData.school_period_id || ''} 
          onChange={handleTemplateInputChange}
          required
        >
          <option value="">Select School Period</option>
          {(schoolPeriods || []).map((period: SchoolPeriod) => (
            <option key={period.id} value={period.id}>{period.name}</option>
          ))}
        </Select>
        <Select 
          name="student_category_id" 
          label="Student Category (Optional)" 
          value={templateFormData.student_category_id || ''} 
          onChange={handleTemplateInputChange}
        >
          <option value="">All Categories</option>
          {(studentCategories || []).map((category: StudentCategory) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </Select>
      </DialogForm>

      <DialogForm 
        isOpen={isItemModalOpen} 
        onClose={closeItemModal} 
        title={`Manage Items for: ${currentTemplateForItems?.name || ''}`} 
        size="xl"
        footer={<Button variant="secondary" onClick={closeItemModal}>Done</Button>}
      >
        {currentTemplateForItems && (
          <div className="space-y-4">
            <Card title="Add/Edit Fee Template Item">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input name="description" label="Description (Votehead)" value={itemFormData.description || ''} onChange={handleItemInputChange} required />
                <Input name="amount" label="Amount" type="number" step="0.01" value={itemFormData.amount ?? ''} onChange={handleItemInputChange} required />
                <Select name="revenue_account_id" label="Revenue GL Account" value={itemFormData.revenue_account_id || ''} onChange={handleItemInputChange} required>
                    <option value="">Select Revenue Account</option>
                    {(revenueAccounts || []).map(coa => <option key={coa.id} value={coa.id}>{coa.account_code} - {coa.name}</option>)}
                </Select>
                <Select name="linked_expense_category_id" label="Linked Expense Category (Optional)" value={itemFormData.linked_expense_category_id || ''} onChange={handleItemInputChange}>
                    <option value="">None</option>
                    {(expenseCategories || []).map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
                </Select>
              </div>
              <div className="text-right mt-4">
                <Button onClick={handleItemSubmit} size="sm" disabled={loading.feeTemplates}>
                  {loading.feeTemplates ? <Spinner size="sm"/> : (editingItem ? 'Update Item' : 'Add Item')}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Existing Items for this Template</h4>
            <DataGrid 
              columns={itemColumns} 
              data={(currentTemplateForItems.items || [])} 
              isLoading={loading.feeTemplates && isItemModalOpen}
              sortable
              filterable
              emptyState={{
                icon: <ListBulletIcon className="w-12 h-12 text-gray-400" />,
                title: "No Items Defined",
                description: "No items have been defined for this fee template yet. Add items to specify the fee components."
              }}
            />
          </div>
        )}
      </DialogForm>
    </div>
  );
};

export default FeeTemplatesPage;
