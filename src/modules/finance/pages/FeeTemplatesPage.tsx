// ABOUTME: Fee templates page: manage templates per school period/category and their fee items (voteheads).
// ABOUTME: Persists through updateFeeTemplate(id, patch); fee items carry stable UUIDs and string foreign keys.

import React, { useState, useMemo } from 'react';

import { SchoolPeriod, StudentCategory } from '@/core/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import DialogForm from "@/components/ui/forms/DialogForm";
import EntityForm from "@/components/ui/forms/EntityForm";
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PlusIcon, EditIcon, DeleteIcon, TicketIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; 
import Spinner from '@/components/ui/Spinner';
import { AccountType } from '@/core/types';
import type { FeeTemplate, FeeTemplateItem } from '@/core/types';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

/** A fee item as stored on a template: ids are opaque strings matching the fee_templates schema. */
type StoredFeeItem = Omit<FeeTemplateItem, 'fee_template_id' | 'revenue_account_id' | 'linked_expense_category_id'> & {
  fee_template_id: string;
  revenue_account_id: string;
  linked_expense_category_id?: string;
};

interface FeeItemFormData {
  description: string;
  amount?: number;
  revenue_account_id?: string;
  linked_expense_category_id?: string;
}

interface TemplateItemsContext {
  id: string;
  name: string;
  items: StoredFeeItem[];
}

const optionalId = (value: unknown): string | undefined =>
  value === undefined || value === null || value === '' ? undefined : String(value);

/** Normalises a template's items to string ids, giving any item without an id a stable UUID. */
const toStoredItems = (template: FeeTemplate): StoredFeeItem[] =>
  (template.items || []).map((item) => ({
    ...item,
    id: item.id ? String(item.id) : crypto.randomUUID(),
    fee_template_id: String(template.id),
    revenue_account_id: optionalId(item.revenue_account_id) ?? '',
    linked_expense_category_id: optionalId(item.linked_expense_category_id),
  }));

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const FeeTemplatesContent: React.FC = () => {
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
  const [editingItem, setEditingItem] = useState<StoredFeeItem | null>(null);
  const [currentTemplateForItems, setCurrentTemplateForItems] = useState<TemplateItemsContext | null>(null);

  const initialItemFormData: FeeItemFormData = { description: '', amount: 0, revenue_account_id: undefined, linked_expense_category_id: undefined };
  const [itemFormData, setItemFormData] = useState<FeeItemFormData>(initialItemFormData);
  const [templateInitialValues, setTemplateInitialValues] = useState<Record<string, any>>({ name: '', school_period_id: undefined, student_category_id: undefined });

  const revenueAccounts = useMemo(() => (chartOfAccounts || []).filter(coa => coa.type === AccountType.REVENUE && coa.is_active), [chartOfAccounts]);

  // Template Modal
  const openTemplateModal = (template?: FeeTemplate) => {
    setEditingTemplate(template || null);
    setTemplateInitialValues(template ?
      { name: template.name, school_period_id: optionalId(template.school_period_id), student_category_id: optionalId(template.student_category_id) } :
      { name: '', school_period_id: undefined, student_category_id: undefined }
    );
    setIsTemplateModalOpen(true);
  };
  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
  };

  // Item Modal
  const openItemModal = (template: FeeTemplate) => {
    setCurrentTemplateForItems({ id: String(template.id), name: template.name, items: toStoredItems(template) });
    setEditingItem(null);
    setItemFormData(initialItemFormData);
    setIsItemModalOpen(true);
  };
  const startEditingItem = (item: StoredFeeItem) => {
    setEditingItem(item);
    setItemFormData({ description: item.description, amount: item.amount, revenue_account_id: item.revenue_account_id, linked_expense_category_id: item.linked_expense_category_id });
  };
  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
    // setCurrentTemplateForItems(null); // Keep context if modal is just for adding more items
    setItemFormData(initialItemFormData);
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setItemFormData(prev => ({ ...prev, [name]: name.endsWith('_id') ? (value || undefined) : (name === 'amount' ? parseFloat(value) : value) }));
  };

  const toast = useToast();
  const handleItemSubmit = async () => {
    if (!currentTemplateForItems || !itemFormData.description || itemFormData.amount === undefined || !itemFormData.revenue_account_id) {
      toast.showWarning("Description, Amount, and Revenue Account are required for an item.");
      return;
    }

    const revenueAccountId = itemFormData.revenue_account_id;
    const expenseCategoryId = itemFormData.linked_expense_category_id;
    const itemFields = {
      description: itemFormData.description,
      amount: Number(itemFormData.amount),
      revenue_account_id: revenueAccountId,
      linked_expense_category_id: expenseCategoryId,
      revenue_account_name: revenueAccounts.find(ra => String(ra.id) === revenueAccountId)?.name,
      linked_expense_category_name: expenseCategoryId ? expenseCategories.find(ec => String(ec.id) === expenseCategoryId)?.name : undefined,
    };

    const updatedItems: StoredFeeItem[] = editingItem
      ? currentTemplateForItems.items.map(i => (i.id === editingItem.id ? { ...i, ...itemFields } : i))
      : [...currentTemplateForItems.items, { ...itemFields, id: crypto.randomUUID(), fee_template_id: currentTemplateForItems.id }];

    try {
      await updateFeeTemplate(currentTemplateForItems.id, { items: updatedItems });
    } catch (error) {
      toast.showError(`Failed to save fee item: ${errorMessage(error)}`);
      return;
    }

    setCurrentTemplateForItems({ ...currentTemplateForItems, items: updatedItems });
    setEditingItem(null);
    setItemFormData(initialItemFormData);
  };

  const confirm = useConfirm();
  const handleDeleteTemplate = async (id: number) => {
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this fee template? All its items will also be deleted.' }))) {
      await deleteFeeTemplate(id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!currentTemplateForItems) return;
    if ((await confirm({ variant: 'danger', message: 'Are you sure you want to delete this fee template item?' }))) {
      const updatedItems = currentTemplateForItems.items.filter(i => i.id !== itemId);
      try {
        await updateFeeTemplate(currentTemplateForItems.id, { items: updatedItems });
      } catch (error) {
        toast.showError(`Failed to delete fee item: ${errorMessage(error)}`);
        return;
      }
      setCurrentTemplateForItems({ ...currentTemplateForItems, items: updatedItems });
      if (editingItem?.id === itemId) {
        setEditingItem(null);
        setItemFormData(initialItemFormData);
      }
    }
  };

  const templateColumns: DataGridColumn<FeeTemplate>[] = [
    { 
      key: 'id', 
      header: 'ID', 
      sortable: true, 
      filterable: true, 
      width: 80,
      render: (value) => <span className="font-mono text-sm">{value}</span>
    },
    { 
      key: 'name', 
      header: 'Template Name', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
    },
    { 
      key: 'school_period_name', 
      header: 'School Period', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value) => <span className="text-primary-600">{value}</span>
    },
    { 
      key: 'student_category_name', 
      header: 'Student Category', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value) => <span className="text-purple-600">{value || 'All Categories'}</span>
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

  const itemColumns: DataGridColumn<StoredFeeItem>[] = [
    { 
      key: 'description', 
      header: 'Description', 
      sortable: true, 
      filterable: true, 
      width: 200,
      render: (value) => <span className="font-medium">{value}</span>
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
      render: (value) => <span className="text-primary-600">{value}</span>
    },
    { 
      key: 'linked_expense_category_name', 
      header: 'Expense Category', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value) => <span className="text-purple-600">{value || 'None'}</span>
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
          <Button size="sm" variant="ghost" onClick={() => startEditingItem(row)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
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
        <p className="text-sm text-surface-muted-fg mb-4">
          Create and manage fee templates for different school periods and student categories. Define template items (voteheads) and amounts.
        </p>
        <DataGrid 
          columns={templateColumns} 
          data={(feeTemplates || [])} 
          isLoading={loading.feeTemplates && (isTemplateModalOpen || isItemModalOpen)}
          sortable
          filterable
          emptyState={{
            icon: <TicketIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No Fee Templates Found",
            description: "Create your first fee template to define fees for different school periods and student categories.",
            action: {
              label: "Add Fee Template",
              onClick: () => openTemplateModal()
            }
          }}
        />
      </Card>

      <EntityForm
        isOpen={isTemplateModalOpen}
        onClose={closeTemplateModal}
        title={editingTemplate ? 'Edit Fee Template' : 'Add New Fee Template'}
        initialData={templateInitialValues}
        submitLabel={editingTemplate ? 'Save Changes' : 'Add Template'}
        cancelLabel="Cancel"
        onSubmit={async (values) => {
          const schoolPeriodId = optionalId(values.school_period_id);
          const studentCategoryId = optionalId(values.student_category_id);
          const payload = {
            name: String(values.name ?? ''),
            school_period_id: schoolPeriodId,
            student_category_id: studentCategoryId ?? null,
            school_period_name: (schoolPeriods || []).find((period: SchoolPeriod) => String(period.id) === schoolPeriodId)?.name ?? null,
            student_category_name: studentCategoryId ? (studentCategories || []).find((category: StudentCategory) => String(category.id) === studentCategoryId)?.name ?? null : null,
          };

          if (editingTemplate) {
            await updateFeeTemplate(String(editingTemplate.id), payload);
          } else {
            await addFeeTemplate({ ...payload, items: [] });
          }
        }}
        fields={[
          { name: 'name', label: 'Template Name', required: true },
          { name: 'school_period_id', label: 'School Period', type: 'select', required: true, placeholder: 'Select School Period', options: (schoolPeriods || []).map((period: SchoolPeriod) => ({ value: period.id, label: period.name })) },
          { name: 'student_category_id', label: 'Student Category (Optional)', type: 'select', placeholder: 'All Categories', options: (studentCategories || []).map((category: StudentCategory) => ({ value: category.id, label: String(category.name ?? '') })) },
        ]}
      />

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
                <Button onClick={handleItemSubmit} size="sm" loading={loading.feeTemplates}>
                  {editingItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-surface-foreground mt-6">Existing Items for this Template</h4>
            <DataGrid 
              columns={itemColumns} 
              data={(currentTemplateForItems.items || [])} 
              isLoading={loading.feeTemplates && isItemModalOpen}
              sortable
              filterable
              emptyState={{
                icon: <ListBulletIcon className="w-12 h-12 text-surface-muted-fg" />,
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

const FeeTemplatesPage: React.FC = () => (
  <div className="space-y-6">
    <FeeTemplatesContent />
  </div>
);

export default FeeTemplatesPage;
