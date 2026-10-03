import React, { useState } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import DialogForm from '@/components/ui/forms/DialogForm';
import FormActions from '@/components/ui/forms/FormActions';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, ShoppingCartIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { PurchaseOrderStatus } from '@/core/types';
import type { PurchaseOrder, PurchaseOrderItem } from '@/core/types';

type PurchaseOrderFormData = Omit<Partial<PurchaseOrder>, 'id' | 'created_at' | 'updated_at' | 'items' | 'supplier_name' | 'total_value' | 'status'> & {
    status: PurchaseOrderStatus;
};
type PurchaseOrderItemFormData = Omit<Partial<PurchaseOrderItem>, 'id' | 'purchase_order_id' | 'item_name' | 'line_total'>;

export const PurchaseOrdersPageContent: React.FC = () => {
  const { 
    purchaseOrders, 
    suppliers,
    itemsInv,
    loading, 
    addPurchaseOrder, 
    updatePurchaseOrder, 
    deletePurchaseOrder 
  } = useAppData(); // Updated
  const confirm = useConfirm();
  
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [currentPOForItems, setCurrentPOForItems] = useState<PurchaseOrder | null>(null);
  const [editingPOItem, setEditingPOItem] = useState<PurchaseOrderItem | null>(null);
  
  const initialPOFormData: PurchaseOrderFormData = { 
    supplier_id: undefined, 
    order_date: new Date().toISOString().split('T')[0], 
    status: PurchaseOrderStatus.DRAFT, 
    notes: '' 
  };
  const [poFormData, setPoFormData] = useState<PurchaseOrderFormData>(initialPOFormData);

  const initialItemFormData: PurchaseOrderItemFormData = { item_id: undefined, quantity_ordered: 1, unit_price: 0 };
  const [itemFormData, setItemFormData] = useState<PurchaseOrderItemFormData>(initialItemFormData);

  const openPOModal = (po?: PurchaseOrder) => {
    setEditingPO(po || null);
    setPoFormData(po ? 
      { supplier_id: po.supplier_id, order_date: po.order_date, status: po.status, notes: po.notes } : 
      initialPOFormData
    );
    setIsPOModalOpen(true);
  };
  const closePOModal = () => {
    setIsPOModalOpen(false);
    setEditingPO(null);
    setPoFormData(initialPOFormData);
  };

  const openItemModal = (po: PurchaseOrder, item?: PurchaseOrderItem) => {
    setCurrentPOForItems(po);
    setEditingPOItem(item || null);
    setItemFormData(item ? 
      { item_id: item.item_id, quantity_ordered: item.quantity_ordered, unit_price: item.unit_price } : 
      {...initialItemFormData, unit_price: itemsInv.find(i => i.id === initialItemFormData.item_id)?.current_price || 0 }
    );
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingPOItem(null);
    setItemFormData(initialItemFormData);
  };

  const handlePOInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPoFormData(prev => ({ ...prev, [name]: name === 'supplier_id' ? (value ? parseInt(value) : undefined) : value }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let val: string | number | undefined = value;
    if (name === 'quantity_ordered' || name === 'unit_price') {
        val = parseFloat(value) || 0;
    } else if (name === 'item_id' && value === '') {
        val = undefined;
    }
    
    setItemFormData(prev => {
        const newState = { ...prev, [name]: val };
        if (name === 'item_id' && val) {
            const selectedItem = itemsInv.find(i => i.id === String(val));
            newState.unit_price = selectedItem?.current_price || 0;
        }
        return newState;
    });
  };

  const handlePOSubmit = async () => {
    if (!poFormData.supplier_id || !poFormData.order_date || !poFormData.status) {
      alert(t('validation.supplierOrderDateStatusRequired'));
      return;
    }
    const payloadBase = {
      supplier_id: poFormData.supplier_id!,
      order_date: poFormData.order_date!,
      status: poFormData.status!,
      notes: poFormData.notes || undefined,
    };

    if (editingPO) {
      await updatePurchaseOrder({ ...editingPO, ...payloadBase }, editingPO.items || []);
    } else {
      await addPurchaseOrder(payloadBase, []);
    }
    closePOModal();
  };

  const handleItemSubmit = async () => {
    if (!currentPOForItems || !itemFormData.item_id || itemFormData.quantity_ordered <= 0 || itemFormData.unit_price === undefined || itemFormData.unit_price < 0) {
      alert(t('validation.pleaseSelectAnItemSpecifyAValidQuantityAndUnitPrice'));
      return;
    }
    
    const existingItems = currentPOForItems.items || [];
    let newItemsList: PurchaseOrderItem[];

    const inventoryItem = itemsInv.find(i => i.id === itemFormData.item_id);

    if (editingPOItem) {
      newItemsList = existingItems.map(item => 
        item.id === editingPOItem.id ? 
        { 
            ...editingPOItem, 
            item_id: itemFormData.item_id!, 
            quantity_ordered: Number(itemFormData.quantity_ordered),
            unit_price: Number(itemFormData.unit_price),
            item_name: inventoryItem?.name,
            line_total: Number(itemFormData.quantity_ordered) * Number(itemFormData.unit_price),
        } : item
      );
    } else {
      const newItem: PurchaseOrderItem = {
        id: `tempPOI-${Date.now()}`,
        purchase_order_id: currentPOForItems.id,
        item_id: itemFormData.item_id!,
        quantity_ordered: Number(itemFormData.quantity_ordered),
        unit_price: Number(itemFormData.unit_price),
        quantity_received: 0,
        item_name: inventoryItem?.name, 
        line_total: Number(itemFormData.quantity_ordered) * Number(itemFormData.unit_price)
      };
      newItemsList = [...existingItems, newItem];
    }
    
    await updatePurchaseOrder(currentPOForItems, newItemsList);
    
    const updatedPO = purchaseOrders.find(r => r.id === currentPOForItems.id);
    if (updatedPO) setCurrentPOForItems(updatedPO);

    setEditingPOItem(null);
    setItemFormData(initialItemFormData); 
  };
  
  const handleDeletePO = async (id: string) => {
    if (await confirm({ title: 'Delete purchase order', message: 'Are you sure you want to delete this purchase order?', variant: 'danger' })) {
      await deletePurchaseOrder(id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
      if (!currentPOForItems) return;
      if (await confirm({ title: 'Remove item', message: 'Are you sure you want to delete this item from the purchase order?', variant: 'danger' })) {
          const updatedItems = (currentPOForItems.items || []).filter(i => i.id !== itemId);
          await updatePurchaseOrder(currentPOForItems, updatedItems);
          const updatedPO = purchaseOrders.find(r => r.id === currentPOForItems.id);
          if (updatedPO) setCurrentPOForItems(updatedPO);
      }
  };

  const poColumns: DataGridColumn<PurchaseOrder>[] = [
    { 
      key: 'id', 
      header: 'PO ID', 
      sortable: true,
      filterable: true,
      width: '120px'
    },
    { 
      key: 'supplier_name', 
      header: 'Supplier', 
      sortable: true,
      filterable: true,
      width: '200px'
    },
    { 
      key: 'order_date', 
      header: 'Order Date', 
      render: (value: any, item: PurchaseOrder) => item.order_date ? new Date(item.order_date).toLocaleDateString() : 'N/A',
      sortable: true,
      filterable: true,
      width: '120px'
    },
    { 
      key: 'status', 
      header: 'Status', 
      render: (value: any, item: PurchaseOrder) => {
        let colorClass = 'bg-gray-200 text-surface-foreground';
        if (item.status === PurchaseOrderStatus.DRAFT) colorClass = 'bg-yellow-100 text-yellow-800';
        else if (item.status === PurchaseOrderStatus.APPROVED || item.status === PurchaseOrderStatus.SENT_TO_SUPPLIER) colorClass = 'bg-primary-100 text-primary-800';
        else if (item.status === PurchaseOrderStatus.FULLY_RECEIVED || item.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) colorClass = 'bg-green-100 text-green-800';
        else if (item.status === PurchaseOrderStatus.CANCELLED) colorClass = 'bg-red-100 text-red-800';
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
      },
      sortable: true,
      filterable: true,
      width: '140px'
    },
    { 
      key: 'items_count', 
      header: 'Items', 
      render: (value: any, item: PurchaseOrder) => item?.items?.length || 0,
      sortable: true,
      width: '80px'
    },
    { 
      key: 'total_value', 
      header: 'Total Value', 
      render: (value: any, item: PurchaseOrder) => `Ksh ${item.total_value?.toFixed(2) || '0.00'}`,
      sortable: true,
      width: '120px'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, item: PurchaseOrder) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openPOModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => openItemModal(item)} leftIcon={<ListBulletIcon className="w-4 h-4" />}>Items</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeletePO(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
      sticky: 'right',
      width: '200px'
    },
  ];

  const poItemColumns: DataGridColumn<PurchaseOrderItem>[] = [
    { 
      key: 'item_name', 
      header: 'Item Name', 
      sortable: true,
      filterable: true,
      width: '200px'
    },
    { 
      key: 'quantity_ordered', 
      header: 'Qty Ordered', 
      sortable: true,
      width: '120px'
    },
    { 
      key: 'unit_price', 
      header: 'Unit Price', 
      render: (value: any, item: PurchaseOrderItem) => `Ksh ${item.unit_price.toFixed(2)}`,
      sortable: true,
      width: '120px'
    },
    { 
      key: 'line_total', 
      header: 'Line Total', 
      render: (value: any, item: PurchaseOrderItem) => `Ksh ${item.line_total?.toFixed(2) || '0.00'}`,
      sortable: true,
      width: '120px'
    },
    { 
      key: 'quantity_received', 
      header: 'Qty Received', 
      sortable: true,
      width: '120px'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, item: PurchaseOrderItem) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openItemModal(currentPOForItems!, item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteItem(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Del</Button>
        </div>
      ),
      sticky: 'right',
      width: '140px'
    },
  ];
  
  const isLoadingPage = loading.purchaseOrders || loading.suppliers || loading.itemsInv;

  if (isLoadingPage && !isPOModalOpen && !isItemModalOpen) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Purchase Orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Purchase Orders (LPOs)" actions={
        <Button onClick={() => openPOModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
          New Purchase Order
        </Button>
      }>
        <DataGrid 
          columns={poColumns} 
          data={purchaseOrders} 
          sortable
          filterable
          emptyState={{
            icon: <ShoppingCartIcon className="w-8 h-8 text-surface-muted-fg" />,
            title: "No purchase orders found",
            description: "Get started by creating your first purchase order."
          }}
        />
      </Card>

      <Modal isOpen={isPOModalOpen} onClose={closePOModal} title={editingPO ? 'Edit Purchase Order' : 'Add New Purchase Order'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closePOModal}>Cancel</Button>
            <Button onClick={handlePOSubmit} loading={loading.purchaseOrders}>
              {editingPO ? 'Save Changes' : 'Add Purchase Order'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="supplier_id" label="Supplier" value={poFormData.supplier_id || ''} onChange={handlePOInputChange} required>
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input name="order_date" label="Order Date" type="date" value={poFormData.order_date || ''} onChange={handlePOInputChange} required />
            <Select name="status" label="Status" value={poFormData.status || ''} onChange={handlePOInputChange} required className="md:col-span-2">
                {Object.values(PurchaseOrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Textarea name="notes" label="Notes" value={poFormData.notes || ''} onChange={handlePOInputChange} rows={3} className="md:col-span-2" />
        </div>
      </Modal>

      <DialogForm 
        open={isItemModalOpen} 
        onClose={closeItemModal} 
        title={`Manage Items for PO: ${currentPOForItems?.id || ''}`} 
        size="xl"
        actions={<FormActions><Button variant="secondary" onClick={closeItemModal}>Done</Button></FormActions>}
      >
        {currentPOForItems && (
          <div className="space-y-4">
            <Card title="Add/Edit PO Item">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select name="item_id" label="Inventory Item" value={itemFormData.item_id || ''} onChange={handleItemInputChange} required>
                    <option value="">Select Item</option>
                    {itemsInv.map(item => <option key={item.id} value={item.id}>{item.name} ({item.unit_of_measure})</option>)}
                </Select>
                <Input name="quantity_ordered" label="Quantity Ordered" type="number" min="1" value={itemFormData.quantity_ordered || ''} onChange={handleItemInputChange} required />
                <Input name="unit_price" label="Unit Price (KES)" type="number" step="0.01" value={itemFormData.unit_price ?? ''} onChange={handleItemInputChange} required/>
              </div>
              <div className="text-right mt-4">
                <Button onClick={handleItemSubmit} size="sm" loading={loading.purchaseOrders}>
                  {editingPOItem ? 'Update Item' : 'Add Item'}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-surface-foreground mt-6">Items in this Purchase Order</h4>
            <DataGrid 
              columns={poItemColumns} 
              data={currentPOForItems.items || []} 
              sortable
              filterable
              emptyState={{
                icon: <ListBulletIcon className="w-8 h-8 text-surface-muted-fg" />,
                title: "No items added",
                description: "No items added to this purchase order yet."
              }}
            />
          </div>
        )}
      </DialogForm>
    </div>
  );
};
const PurchaseOrdersPage: React.FC = () => (
  <div className="space-y-6">
    <PurchaseOrdersPageContent />
  </div>
);

export default PurchaseOrdersPage;
