import React, { useState, useMemo, useEffect } from 'react';
import { Requisition, RequisitionItem, RequisitionStatus, Staff, ItemInv } from '@/types';
import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, QueueListIcon, ListBulletIcon, ClipboardDocumentListIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type RequisitionFormData = Omit<Partial<Requisition>, 'id' | 'created_at' | 'updated_at' | 'items' | 'requesting_staff_name' | 'department_name' | 'total_requested_value' | 'status'> & {
    status: RequisitionStatus;
};
type RequisitionItemFormData = Omit<Partial<RequisitionItem>, 'id' | 'requisition_id' | 'item_name' | 'line_total' | 'unit_price'> & {
    unit_price?: number; // Made optional for form, will be derived if not set
};

const RequisitionsPage: React.FC = () => {
  const { 
    requisitions, 
    staff,
    itemsInv,
    loading, 
    addRequisition, 
    updateRequisition, 
    deleteRequisition: mockDeleteRequisition 
  } = useAppData(); // Updated
  
  const [isRequisitionModalOpen, setIsRequisitionModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  const [editingRequisition, setEditingRequisition] = useState<Requisition | null>(null);
  const [currentRequisitionForItems, setCurrentRequisitionForItems] = useState<Requisition | null>(null); // For managing items of a specific req
  const [editingReqItem, setEditingReqItem] = useState<RequisitionItem | null>(null);
  
  const initialReqFormData: RequisitionFormData = { 
    requesting_staff_id: undefined, 
    request_date: new Date().toISOString().split('T')[0], 
    status: RequisitionStatus.PENDING_APPROVAL, 
    notes: '' 
  };
  const [reqFormData, setReqFormData] = useState<RequisitionFormData>(initialReqFormData);

  const initialItemFormData: RequisitionItemFormData = { item_id: undefined, quantity_requested: 1, unit_price: undefined };
  const [itemFormData, setItemFormData] = useState<RequisitionItemFormData>(initialItemFormData);

  // For Requisition Modal
  const openRequisitionModal = (req?: Requisition) => {
    setEditingRequisition(req || null);
    setReqFormData(req ? 
      { requesting_staff_id: req.requesting_staff_id, request_date: req.request_date, status: req.status, notes: req.notes } : 
      initialReqFormData
    );
    setIsRequisitionModalOpen(true);
  };
  const closeRequisitionModal = () => {
    setIsRequisitionModalOpen(false);
    setEditingRequisition(null);
    setReqFormData(initialReqFormData);
  };

  // For Item Modal (within context of a Requisition)
  const openItemModal = (req: Requisition, item?: RequisitionItem) => {
    setCurrentRequisitionForItems(req);
    setEditingReqItem(item || null);
    setItemFormData(item ? 
      { item_id: item.item_id, quantity_requested: item.quantity_requested, unit_price: item.unit_price } : 
      {...initialItemFormData, unit_price: itemsInv.find(i => i.id === initialItemFormData.item_id)?.current_price } // Set initial price if item selected
    );
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingReqItem(null);
    setItemFormData(initialItemFormData);
    // Don't clear currentRequisitionForItems here if modal is for adding multiple items to the same req
  };

  const handleReqInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReqFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let val: string | number | undefined = value;
    if (name === 'quantity_requested' || name === 'unit_price') {
        val = parseFloat(value) || 0;
    } else if (name === 'item_id' && value === '') {
        val = undefined;
    }
    
    setItemFormData(prev => {
        const newState = { ...prev, [name]: val };
        if (name === 'item_id' && val) { // If item changes, update unit price from inventory
            const selectedItem = itemsInv.find(i => i.id === String(val));
            newState.unit_price = selectedItem?.current_price;
        }
        return newState;
    });
  };

  const handleReqSubmit = async () => {
    if (!reqFormData.requesting_staff_id || !reqFormData.request_date || !reqFormData.status) {
      alert(t('validation.requestingStaffRequestDateAndStatusAreRequired'));
      return;
    }
    const payloadBase = {
      requesting_staff_id: reqFormData.requesting_staff_id!,
      request_date: reqFormData.request_date!,
      status: reqFormData.status!,
      notes: reqFormData.notes || undefined,
    };

    if (editingRequisition) {
      await updateRequisition({ ...editingRequisition, ...payloadBase }, editingRequisition.items || []);
    } else {
      await addRequisition(payloadBase, []); // New requisitions start with no items
    }
    closeRequisitionModal();
  };

  const handleItemSubmit = async () => {
    if (!currentRequisitionForItems || !itemFormData.item_id || itemFormData.quantity_requested <= 0) {
      alert(t('validation.pleaseSelectAnItemAndSpecifyAValidQuantity'));
      return;
    }
    
    const existingItems = currentRequisitionForItems.items || [];
    let newItemsList: RequisitionItem[];

    const inventoryItem = itemsInv.find(i => i.id === itemFormData.item_id);
    const unitPrice = itemFormData.unit_price ?? inventoryItem?.current_price ?? 0;

    if (editingReqItem) {
      newItemsList = existingItems.map(item => 
        item.id === editingReqItem.id ? 
        { 
            ...editingReqItem, 
            item_id: itemFormData.item_id!, 
            quantity_requested: Number(itemFormData.quantity_requested),
            unit_price: unitPrice,
            item_name: inventoryItem?.name, // Keep denormalized field updated
            line_total: Number(itemFormData.quantity_requested) * unitPrice,
        } : item
      );
    } else {
      // For new items, requisition_id must be set. id will be handled by mock.
      const newItem: RequisitionItem = {
        id: `tempRQI-${Date.now()}`, // Mock ID, actual DB would generate
        requisition_id: currentRequisitionForItems.id,
        item_id: itemFormData.item_id!,
        quantity_requested: Number(itemFormData.quantity_requested),
        unit_price: unitPrice,
        quantity_issued: 0, // Default
        item_name: inventoryItem?.name, 
        line_total: Number(itemFormData.quantity_requested) * unitPrice
      };
      newItemsList = [...existingItems, newItem];
    }
    
    await updateRequisition(currentRequisitionForItems, newItemsList);
    
    const updatedReq = requisitions.find(r => r.id === currentRequisitionForItems.id);
    if (updatedReq) {
        setCurrentRequisitionForItems(updatedReq);
    }

    setEditingReqItem(null);
    setItemFormData(initialItemFormData); 
  };
  
  const handleDeleteReq = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this requisition? This will also delete all its items.')) {
      await mockDeleteRequisition(id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
      if (!currentRequisitionForItems) return;
      if (window.confirm('Are you sure you want to delete this item from the requisition?')) {
          const updatedItems = (currentRequisitionForItems.items || []).filter(i => i.id !== itemId);
          await updateRequisition(currentRequisitionForItems, updatedItems);
           const updatedReq = requisitions.find(r => r.id === currentRequisitionForItems.id);
            if (updatedReq) {
                setCurrentRequisitionForItems(updatedReq);
            }
      }
  };

  const requisitionColumns: DataGridColumn<Requisition>[] = [
    {
      key: 'id',
      header: 'Req ID',
      sortable: true,
      width: 100,
      sticky: true
    },
    {
      key: 'requesting_staff_name',
      header: 'Requesting Staff',
      sortable: true,
      filterable: true,
      width: 180
    },
    {
      key: 'department_name',
      header: 'Department',
      sortable: true,
      filterable: true,
      width: 150
    },
    {
      key: 'request_date',
      header: 'Request Date',
      sortable: true,
      width: 120,
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      filterable: true,
      width: 150,
      render: (value) => {
        let colorClass = 'bg-gray-200 text-gray-800';
        if (value === RequisitionStatus.PENDING_APPROVAL) colorClass = 'bg-yellow-100 text-yellow-800';
        else if (value === RequisitionStatus.APPROVED) colorClass = 'bg-green-100 text-green-800';
        else if (value === RequisitionStatus.REJECTED) colorClass = 'bg-red-100 text-red-800';
        else if (value === RequisitionStatus.ORDERED) colorClass = 'bg-blue-100 text-blue-800';
        else if (value === RequisitionStatus.FULFILLED) colorClass = 'bg-purple-100 text-purple-800';
        return (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>
            {value}
          </span>
        );
      }
    },
    {
      key: 'items',
      header: 'Items',
      sortable: true,
      width: 80,
      render: (_, row) => (
        <span className="text-center font-medium">
          {row.items?.length || 0}
        </span>
      )
    },
    {
      key: 'total_requested_value',
      header: 'Total Value',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="font-mono">
          KES {value?.toFixed(2) || '0.00'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 220,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openRequisitionModal(row)} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={() => openItemModal(row)} 
            leftIcon={<ListBulletIcon className="w-4 h-4" />}
          >
            Items
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDeleteReq(row.id)} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  const reqItemColumns: DataGridColumn<RequisitionItem>[] = [
    {
      key: 'item_name',
      header: 'Item Name',
      sortable: true,
      filterable: true,
      width: 200
    },
    {
      key: 'quantity_requested',
      header: 'Qty Requested',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="text-center font-medium">
          {value || 0}
        </span>
      )
    },
    {
      key: 'unit_price',
      header: 'Unit Price',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="font-mono">
          KES {value?.toFixed(2) || 'N/A'}
        </span>
      )
    },
    {
      key: 'line_total',
      header: 'Line Total',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="font-mono font-semibold">
          KES {value?.toFixed(2) || 'N/A'}
        </span>
      )
    },
    {
      key: 'quantity_issued',
      header: 'Qty Issued',
      sortable: true,
      width: 120,
      render: (value) => (
        <span className="text-center font-medium">
          {value || 0}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: 180,
      render: (_, row) => (
        <div className="flex space-x-1">
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => openItemModal(currentRequisitionForItems!, row)} 
            leftIcon={<EditIcon className="w-4 h-4" />}
          >
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="danger" 
            onClick={() => handleDeleteItem(row.id)} 
            leftIcon={<DeleteIcon className="w-4 h-4" />}
          >
            Del
          </Button>
        </div>
      )
    }
  ];
  
  const isLoadingPage = loading.requisitions || loading.staff || loading.itemsInv;

  if (isLoadingPage && !isRequisitionModalOpen && !isItemModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Requisitions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Stock Requisitions Management" actions={
        <Button onClick={() => openRequisitionModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          New Requisition
        </Button>
      }>
        <DataGrid 
          columns={requisitionColumns} 
          data={requisitions} 
          sortable 
          filterable 
          emptyState={
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requisitions found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new requisition.</p>
              <div className="mt-6">
                <Button onClick={() => openRequisitionModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
                  New Requisition
                </Button>
              </div>
            </div>
          }
        />
      </Card>

      {/* Requisition Modal */}
      <Modal isOpen={isRequisitionModalOpen} onClose={closeRequisitionModal} title={editingRequisition ? 'Edit Requisition' : 'Add New Requisition'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeRequisitionModal}>Cancel</Button>
            <Button onClick={handleReqSubmit} disabled={loading.requisitions}>
              {loading.requisitions ? <Spinner size="sm"/> : (editingRequisition ? 'Save Changes' : 'Add Requisition')}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="requesting_staff_id" label="Requesting Staff" value={reqFormData.requesting_staff_id || ''} onChange={handleReqInputChange} required>
                <option value="">Select Staff</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.department_name})</option>)}
            </Select>
            <Input name="request_date" label="Request Date" type="date" value={reqFormData.request_date || ''} onChange={handleReqInputChange} required />
            <Select name="status" label="Status" value={reqFormData.status || ''} onChange={handleReqInputChange} required className="md:col-span-2">
                {Object.values(RequisitionStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Textarea name="notes" label="Notes/Justification" value={reqFormData.notes || ''} onChange={handleReqInputChange} rows={3} className="md:col-span-2" />
        </div>
      </Modal>

      {/* Item Management Modal */}
      <Modal 
        isOpen={isItemModalOpen} 
        onClose={closeItemModal} 
        title={`Manage Items for Requisition: ${currentRequisitionForItems?.id || ''}`} 
        size="xl"
        footer={<Button variant="secondary" onClick={closeItemModal}>Done</Button>}
      >
        {currentRequisitionForItems && (
          <div className="space-y-4">
            <Card title="Add/Edit Requisition Item">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select name="item_id" label="Inventory Item" value={itemFormData.item_id || ''} onChange={handleItemInputChange} required>
                    <option value="">Select Item</option>
                    {itemsInv.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit_of_measure})</option>)}
                </Select>
                <Input name="quantity_requested" label="Quantity Requested" type="number" min="1" value={itemFormData.quantity_requested || ''} onChange={handleItemInputChange} required />
                <Input name="unit_price" label="Unit Price (KES)" type="number" step="0.01" value={itemFormData.unit_price ?? ''} onChange={handleItemInputChange} placeholder="Auto from item, or override"/>
              </div>
              <div className="text-right mt-4">
                <Button onClick={handleItemSubmit} size="sm" disabled={loading.requisitions}>
                  {loading.requisitions ? <Spinner size="sm"/> : (editingReqItem ? 'Update Item' : 'Add Item')}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Items in this Requisition</h4>
            <DataGrid 
              columns={reqItemColumns} 
              data={currentRequisitionForItems.items || []} 
              sortable 
              filterable 
              emptyState={
                <div className="text-center py-8">
                  <ListBulletIcon className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No items added</h3>
                  <p className="mt-1 text-sm text-gray-500">Add items to this requisition using the form above.</p>
                </div>
              }
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RequisitionsPage;
