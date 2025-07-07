import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Supplier, ItemInv } from '@/types';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { PlusIcon, EditIcon, DeleteIcon, ShoppingCartIcon, ListBulletIcon } from '@/components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext'; // Updated
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

type PurchaseOrderFormData = Omit<Partial<PurchaseOrder>, 'id' | 'created_at' | 'updated_at' | 'items' | 'supplier_name' | 'total_value' | 'status'> & {
    status: PurchaseOrderStatus;
};
type PurchaseOrderItemFormData = Omit<Partial<PurchaseOrderItem>, 'id' | 'purchase_order_id' | 'item_name' | 'line_total'>;

const PurchaseOrdersPage: React.FC = () => {
  const { 
    purchaseOrders, 
    suppliers,
    itemsInv,
    loading, 
    addPurchaseOrder, 
    updatePurchaseOrder, 
    deletePurchaseOrder 
  } = useAppData(); // Updated
  
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
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      await deletePurchaseOrder(id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
      if (!currentPOForItems) return;
      if (window.confirm('Are you sure you want to delete this item from the purchase order?')) {
          const updatedItems = (currentPOForItems.items || []).filter(i => i.id !== itemId);
          await updatePurchaseOrder(currentPOForItems, updatedItems);
          const updatedPO = purchaseOrders.find(r => r.id === currentPOForItems.id);
          if (updatedPO) setCurrentPOForItems(updatedPO);
      }
  };

  const poColumns = [
    { header: 'PO ID', accessor: 'id' as keyof PurchaseOrder },
    { header: 'Supplier', accessor: 'supplier_name' as keyof PurchaseOrder },
    { header: 'Order Date', accessor: 'order_date' as keyof PurchaseOrder, render: (item: PurchaseOrder) => new Date(item.order_date).toLocaleDateString() },
    { header: 'Status', accessor: 'status' as keyof PurchaseOrder, 
        render: (item: PurchaseOrder) => {
            let colorClass = 'bg-gray-200 text-gray-800';
            if (item.status === PurchaseOrderStatus.DRAFT) colorClass = 'bg-yellow-100 text-yellow-800';
            else if (item.status === PurchaseOrderStatus.APPROVED || item.status === PurchaseOrderStatus.SENT_TO_SUPPLIER) colorClass = 'bg-blue-100 text-blue-800';
            else if (item.status === PurchaseOrderStatus.FULLY_RECEIVED || item.status === PurchaseOrderStatus.PARTIALLY_RECEIVED) colorClass = 'bg-green-100 text-green-800';
            else if (item.status === PurchaseOrderStatus.CANCELLED) colorClass = 'bg-red-100 text-red-800';
            return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}>{item.status}</span>;
        }
    },
    { header: 'Items', accessor: 'id' as keyof PurchaseOrder, render: (item: PurchaseOrder) => item.items?.length || 0 },
    { header: 'Total Value', accessor: 'total_value' as keyof PurchaseOrder, render: (item: PurchaseOrder) => `Ksh ${item.total_value?.toFixed(2) || '0.00'}`},
    {
      header: 'Actions',
      accessor: 'id' as keyof PurchaseOrder,
      render: (item: PurchaseOrder) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openPOModal(item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="secondary" onClick={() => openItemModal(item)} leftIcon={<ListBulletIcon className="w-4 h-4" />}>Items</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeletePO(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Delete</Button>
        </div>
      ),
    },
  ];

  const poItemColumns = [
    { header: 'Item Name', accessor: 'item_name' as keyof PurchaseOrderItem },
    { header: 'Qty Ordered', accessor: 'quantity_ordered' as keyof PurchaseOrderItem },
    { header: 'Unit Price', accessor: 'unit_price' as keyof PurchaseOrderItem, render: (item: PurchaseOrderItem) => `Ksh ${item.unit_price.toFixed(2)}` },
    { header: 'Line Total', accessor: 'line_total' as keyof PurchaseOrderItem, render: (item: PurchaseOrderItem) => `Ksh ${item.line_total?.toFixed(2) || '0.00'}` },
    { header: 'Qty Received', accessor: 'quantity_received' as keyof PurchaseOrderItem },
    {
      header: 'Actions',
      accessor: 'id' as keyof PurchaseOrderItem,
      render: (item: PurchaseOrderItem) => (
        <div className="space-x-1">
          <Button size="sm" variant="ghost" onClick={() => openItemModal(currentPOForItems!, item)} leftIcon={<EditIcon className="w-4 h-4" />}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDeleteItem(item.id)} leftIcon={<DeleteIcon className="w-4 h-4" />}>Del</Button>
        </div>
      ),
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
        <Table columns={poColumns} data={purchaseOrders} isLoading={loading.purchaseOrders && (isPOModalOpen || isItemModalOpen)} />
      </Card>

      <Modal isOpen={isPOModalOpen} onClose={closePOModal} title={editingPO ? 'Edit Purchase Order' : 'Add New Purchase Order'} size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closePOModal}>Cancel</Button>
            <Button onClick={handlePOSubmit} disabled={loading.purchaseOrders}>
              {loading.purchaseOrders ? <Spinner size="sm"/> : (editingPO ? 'Save Changes' : 'Add Purchase Order')}
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

      <Modal 
        isOpen={isItemModalOpen} 
        onClose={closeItemModal} 
        title={`Manage Items for PO: ${currentPOForItems?.id || ''}`} 
        size="xl"
        footer={<Button variant="secondary" onClick={closeItemModal}>Done</Button>}
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
                <Button onClick={handleItemSubmit} size="sm" disabled={loading.purchaseOrders}>
                  {loading.purchaseOrders ? <Spinner size="sm"/> : (editingPOItem ? 'Update Item' : 'Add Item')}
                </Button>
              </div>
            </Card>
            
            <h4 className="text-md font-semibold text-gray-700 mt-6">Items in this Purchase Order</h4>
            <Table 
              columns={poItemColumns} 
              data={currentPOForItems.items || []} 
              isLoading={loading.purchaseOrders && isItemModalOpen}
              emptyStateMessage="No items added to this purchase order yet."
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;
