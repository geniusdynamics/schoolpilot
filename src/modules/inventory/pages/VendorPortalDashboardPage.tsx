import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  Table,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Spinner
} from '@/components/ui';
import {
  HomeIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  ReceiptRefundIcon,
  UserCircleIcon,
  BellIcon,
  PlusIcon
} from '@/components/ui/icons';
import { InvPurchaseOrderType, InvPurchaseOrderStatusEnum, InvRFQType, InvRFQStatusEnum } from '../data/types';
import { FinSupplierInvoiceStatusEnum } from '../../finance/data/types';
import { useAppData } from '@/contexts/AppDataContext';
import { useTranslation } from 'react-i18next';
import PortalSidebar, { PortalNavItem } from '@/components/ui/PortalSidebar';

type VendorView = 'dashboard' | 'rfqs' | 'pos' | 'invoices' | 'profile';

interface ProfileFormData {
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
}

interface InvoiceFormData {
    invoice_number: string;
    po_number: string; // PurchaseOrder ID
    invoice_date: string;
    amount: string; // String for input, convert to number
    // file: File | null; // For actual file upload
}

const VendorPortalDashboardPage: React.FC = () => {
  const [activeView, setActiveView] = useState<VendorView>('dashboard');
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { suppliers, purchaseOrders, supplierInvoices, rfqs, loading } = useAppData();
  const { t } = useTranslation('inventory');

  // Simulate logged-in vendor (in real app, get from auth context)
  const vendorId = 1;
  const vendor = suppliers.find(s => s.id === vendorId);
  const vendorPOs = purchaseOrders.filter(po => po.supplier_id === vendorId);
  const vendorInvoices = supplierInvoices.filter(inv => inv.supplier_id === vendorId);

  // Map rfqs to InvRFQType[] (handle description null/undefined)
  const canonicalRfqs: InvRFQType[] = Array.isArray(rfqs)
    ? rfqs.map((rfq: any) => ({ ...rfq, description: rfq.description ?? undefined }))
    : [];
  // Map vendorPOs to InvPurchaseOrderType[] (ensure status is correct enum)
  const canonicalVendorPOs: InvPurchaseOrderType[] = Array.isArray(vendorPOs)
    ? vendorPOs.map((po: any) => ({ ...po, status: po.status as InvPurchaseOrderStatusEnum }))
    : [];

  const newRfqCount = canonicalRfqs.filter(r => r.status === InvRFQStatusEnum.OPEN).length;
  const activePoCount = canonicalVendorPOs.filter(po => po.status === InvPurchaseOrderStatusEnum.APPROVED || po.status === InvPurchaseOrderStatusEnum.SENT_TO_SUPPLIER || po.status === InvPurchaseOrderStatusEnum.PARTIALLY_RECEIVED).length;
  const pendingInvoiceCount = Array.isArray(vendorInvoices) ? vendorInvoices.filter(inv => inv.status !== FinSupplierInvoiceStatusEnum.PAID && inv.status !== FinSupplierInvoiceStatusEnum.UNPAID && inv.status !== FinSupplierInvoiceStatusEnum.PARTIALLY_PAID && inv.status !== FinSupplierInvoiceStatusEnum.VOIDED && inv.status !== 'Paid').length : 0;
  const overduePaymentCount = Array.isArray(vendorInvoices) ? vendorInvoices.filter(inv => String(inv.status) === 'Overdue' || String(inv.status) === 'OVERDUE').length : 0;

  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    companyName: vendor?.name || '',
    contactPerson: '', // Not in Supplier type, could be extended
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || '',
  });

  const initialInvoiceFormData: InvoiceFormData = {
    invoice_number: '',
    po_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    amount: '',
    // file: null,
  };
  const [invoiceFormData, setInvoiceFormData] = useState<InvoiceFormData>(initialInvoiceFormData);

  // Example RBAC permissions for vendor (in real app, fetch from user context)
  const rbacPermissions = [
    'vendor.dashboard', 'vendor.rfqs', 'vendor.pos', 'vendor.invoices', 'vendor.profile'
  ];
  const navItems: PortalNavItem[] = [
    { key: 'dashboard', label: 'navigation:vendor.dashboard', icon: <HomeIcon className="w-5 h-5" />, permission: 'vendor.dashboard' },
    { key: 'rfqs', label: 'navigation:vendor.rfqs', icon: <DocumentTextIcon className="w-5 h-5" />, permission: 'vendor.rfqs' },
    { key: 'pos', label: 'navigation:vendor.pos', icon: <ShoppingCartIcon className="w-5 h-5" />, permission: 'vendor.pos' },
    { key: 'invoices', label: 'navigation:vendor.invoices', icon: <ReceiptRefundIcon className="w-5 h-5" />, permission: 'vendor.invoices' },
    { key: 'profile', label: 'navigation:vendor.profile', icon: <UserCircleIcon className="w-5 h-5" />, permission: 'vendor.profile' },
  ];

  const handleProfileInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Profile (mock) saved for ${profileFormData.companyName}:\nContact: ${profileFormData.contactPerson}\nEmail: ${profileFormData.email}\nPhone: ${profileFormData.phone}\nAddress: ${profileFormData.address}`);
    // In a real app, this would call an API or context function
  };

  const handleInvoiceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInvoiceFormData(prev => ({...prev, [name]: value}));
  };

  // const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setInvoiceFormData(prev => ({...prev, file: e.target.files![0]}));
  //   }
  // };

  const handleInvoiceSubmit = () => {
    if (!invoiceFormData.invoice_number || !invoiceFormData.po_number || !invoiceFormData.invoice_date || !invoiceFormData.amount) {
        alert(t('validation.pleaseFillInAllRequiredInvoiceDetails'));
        return;
    }
    // const fileInfo = invoiceFormData.file ? `with file: ${invoiceFormData.file.name}` : 'no file attached';
    alert(`Invoice ${invoiceFormData.invoice_number} submitted for PO ${invoiceFormData.po_number}, Amount: KES ${invoiceFormData.amount}. (Mock Submission)`);
    setIsInvoiceModalOpen(false);
    setInvoiceFormData(initialInvoiceFormData); // Reset form
  };

  // Example: derive recent activity from POs and invoices
  const mockRecentActivity = [
    ...vendorInvoices.map(inv => ({
      id: `inv-${inv.id}`,
      text: t('vendor.activity.invoice', { invoice: inv.invoice_number || 'N/A', status: inv.status || 'Unknown' }),
      time: inv.updated_at || ''
    })),
    ...vendorPOs.map(po => ({
      id: `po-${po.id}`,
      text: t('vendor.activity.po', { po: po.id || 'N/A', status: po.status || 'Unknown' }),
      time: po.updated_at || ''
    }))
  ].sort((a, b) => (b.time || '').localeCompare(a.time || ''));

  const poColumns = [
    { header: 'PO Number', key: 'id', render: (value: any, item: InvPurchaseOrderType) => value },
    { header: 'Issue Date', key: 'order_date', render: (value: any, item: InvPurchaseOrderType) => item.order_date ? new Date(item.order_date).toLocaleDateString() : 'N/A' },
    { header: 'Amount', key: 'total_value', render: (value: any, item: InvPurchaseOrderType) => `Ksh ${item.total_value?.toFixed(2) || '0.00'}` },
    { header: 'Status', key: 'status', 
      render: (value: any, item: InvPurchaseOrderType) => <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
        item.status === InvPurchaseOrderStatusEnum.APPROVED ? 'bg-blue-100 text-blue-800' :
        item.status === InvPurchaseOrderStatusEnum.SENT_TO_SUPPLIER ? 'bg-yellow-100 text-yellow-800' :
        item.status === InvPurchaseOrderStatusEnum.FULLY_RECEIVED || item.status === InvPurchaseOrderStatusEnum.PARTIALLY_RECEIVED ? 'bg-green-100 text-green-800' :
        'bg-gray-100 text-gray-800'
      }`}>{item.status}</span>
    },
    { header: 'Action', key: 'id', render: (value: any, item: InvPurchaseOrderType) => <Button size="sm" variant="ghost">View Details</Button> }
  ];

  const rfqColumns = [
    { header: 'RFQ ID', key: 'id', render: (value: any, item: InvRFQType) => value },
    { header: 'Title', key: 'title', render: (value: any, item: InvRFQType) => value || 'N/A' },
    { header: 'Issue Date', key: 'issue_date', render: (value: any, item: InvRFQType) => item.issue_date ? new Date(item.issue_date).toLocaleDateString() : 'N/A' },
    { header: 'Closing Date', key: 'closing_date', render: (value: any, item: InvRFQType) => item.closing_date ? new Date(item.closing_date).toLocaleDateString() : 'N/A' },
    { header: 'Status', key: 'status',
        render: (value: any, item: InvRFQType) => <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
            item.status === InvRFQStatusEnum.OPEN ? 'bg-green-100 text-green-800' : 
            item.status === InvRFQStatusEnum.CLOSED ? 'bg-gray-100 text-gray-700' :
            item.status === InvRFQStatusEnum.AWARDED ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-700' // Cancelled
        }`}>{item.status}</span>
    },
    { header: 'Action', key: 'id', render: (value: any, item: InvRFQType) => (
        <div className="space-x-1">
            <Button size="sm" variant="ghost">View Details</Button>
            {item.status === InvRFQStatusEnum.OPEN && <Button size="sm" variant="primary">Submit Bid</Button>}
        </div>
    )}
  ];

  const invoiceColumns = [
    { header: t('vendor.invoice.number'), key: 'invoice_number', render: (value: any, item: typeof vendorInvoices[0]) => value || 'N/A' },
    { header: t('vendor.invoice.po'), key: 'purchase_order_id', render: (value: any, item: typeof vendorInvoices[0]) => value || 'N/A' },
    { header: t('vendor.invoice.amount'), key: 'total_amount', render: (value: any, item: typeof vendorInvoices[0]) => `Ksh ${item.total_amount?.toFixed(2) || '0.00'}` },
    { header: t('vendor.invoice.dueDate'), key: 'due_date', render: (value: any, item: typeof vendorInvoices[0]) => value || 'N/A' },
    { header: t('vendor.invoice.status'), key: 'status',
      render: (value: any, item: typeof vendorInvoices[0]) => <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
        item.status === FinSupplierInvoiceStatusEnum.PAID ? 'bg-green-100 text-green-800' :
        item.status === FinSupplierInvoiceStatusEnum.UNPAID ? 'bg-yellow-100 text-yellow-800' :
        item.status === FinSupplierInvoiceStatusEnum.PARTIALLY_PAID ? 'bg-blue-100 text-blue-800' :
        item.status === FinSupplierInvoiceStatusEnum.VOIDED ? 'bg-gray-100 text-gray-800' :
        (item.status === 'Overdue' || item.status === 'OVERDUE') ? 'bg-red-100 text-red-800' :
        'bg-gray-100 text-gray-800'
      }`}>{item.status}</span>
    },
    { header: t('vendor.invoice.action'), key: 'id', render: (value: any, item: typeof vendorInvoices[0]) => <Button size="sm" variant="ghost" title={t('vendor.invoice.viewUpload')}>{t('vendor.invoice.viewUpload')}</Button> }
  ];

  if (loading.purchaseOrders || loading.rfqs) { 
      return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      {/* Modern, modular, collapsible sidebar */}
      <PortalSidebar
        navItems={navItems}
        activeView={activeView}
        onSelect={(key: string) => {
          if (["dashboard", "rfqs", "pos", "invoices", "profile"].includes(key)) {
            setActiveView(key as VendorView);
          }
        }}
        rbacPermissions={rbacPermissions}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* Main Content Area */}
      <div className="w-5/6 (85%) ml-[16.666667%] p-6 space-y-6 overflow-y-auto"> 
        <header className="bg-white shadow-sm p-4 flex justify-between items-center rounded-md">
            <h2 className="text-xl font-semibold text-gray-700">{t('vendor.welcome', { name: vendor?.name || '' })}</h2>
            <Button variant="ghost" className="p-2">
                <BellIcon className="w-6 h-6 text-gray-500" />
            </Button>
        </header>

        {activeView === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card title="New Opportunities" className="text-center bg-blue-50"><p className="text-3xl font-bold text-blue-600">{newRfqCount}</p></Card>
                <Card title="Active POs" className="text-center bg-green-50"><p className="text-3xl font-bold text-green-600">{activePoCount}</p></Card>
                <Card title="Pending Invoices" className="text-center bg-yellow-50"><p className="text-3xl font-bold text-yellow-600">{pendingInvoiceCount}</p></Card>
                <Card title="Overdue Payments" className="text-center bg-red-50"><p className="text-3xl font-bold text-red-600">{overduePaymentCount}</p></Card>
            </div>
            <Card title="Recent Activity">
                <ul className="space-y-3">
                    {mockRecentActivity.map(activity => (
                        <li key={activity.id} className="text-sm border-b pb-2">
                            <p className="text-gray-700">{activity.text}</p>
                            <p className="text-xs text-gray-500">{activity.time || 'Unknown time'}</p>
                        </li>
                    ))}
                </ul>
            </Card>
          </div>
        )}

        {activeView === 'rfqs' && (
          <Card title="New Opportunities (RFQs)">
            {loading.rfqs ? <div className="flex justify-center p-4"><Spinner /></div> : canonicalRfqs.length > 0 ? (
                 <Table columns={rfqColumns} data={canonicalRfqs} isLoading={loading.rfqs} />
            ) : (
                <p className="text-gray-600 text-center py-4">No new RFQs available at the moment.</p>
            )}
          </Card>
        )}

        {activeView === 'pos' && (
          <Card title="Your Purchase Orders">
             {loading.purchaseOrders ? <div className="flex justify-center p-4"><Spinner /></div> : canonicalVendorPOs.length > 0 ? (
                <Table columns={poColumns} data={canonicalVendorPOs} isLoading={loading.purchaseOrders} />
            ) : (
                 <p className="text-gray-600 text-center py-4">No purchase orders found for your company.</p>
            )}
          </Card>
        )}

        {activeView === 'invoices' && (
          <Card title={t('vendor.invoices')} actions={
            <Button onClick={() => setIsInvoiceModalOpen(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('vendor.invoice.submit')}</Button>
          }>
             {vendorInvoices.length > 0 ? (
                <Table columns={invoiceColumns} data={vendorInvoices} />
            ) : (
                <p className="text-gray-600 text-center py-4">{t('vendor.invoice.none')}</p>
            )}
          </Card>
        )}
        
        {activeView === 'profile' && (
          <Card title={t('vendor.profile')}>
            <form onSubmit={handleProfileSave} className="space-y-4 p-4">
                <Input 
                    label={t('vendor.profile.companyName')} 
                    name="companyName" 
                    value={profileFormData.companyName} 
                    onChange={handleProfileInputChange} 
                    readOnly 
                    className="bg-gray-100"
                    placeholder={t('vendor.profile.companyName')}
                />
                <Input 
                    label={t('vendor.profile.contactPerson')} 
                    name="contactPerson" 
                    value={profileFormData.contactPerson} 
                    onChange={handleProfileInputChange} 
                    className="w-full border rounded p-2"
                    placeholder={t('vendor.profile.contactPerson')}
                />
                <Input 
                    label={t('vendor.profile.email')} 
                    name="email" 
                    type="email"
                    value={profileFormData.email}
                    onChange={handleProfileInputChange}
                    className="w-full border rounded p-2"
                    placeholder={t('vendor.profile.email')}
                />
                <Input 
                    label={t('vendor.profile.phone')} 
                    name="phone" 
                    value={profileFormData.phone} 
                    onChange={handleProfileInputChange}
                    className="w-full border rounded p-2"
                    placeholder={t('vendor.profile.phone')}
                />
                <Textarea 
                    label={t('vendor.profile.address')} 
                    name="address" 
                    value={profileFormData.address} 
                    onChange={handleProfileInputChange} 
                    rows={3}
                    placeholder={t('vendor.profile.address')}
                />
                 <div className="text-right">
                    <Button type="submit">{t('vendor.profile.save')}</Button>
                </div>
            </form>
            <p className="text-xs text-gray-500 p-4">{t('vendor.profile.manageInfo')}</p>
          </Card>
        )}

        <Modal 
            isOpen={isInvoiceModalOpen} 
            onClose={() => setIsInvoiceModalOpen(false)} 
            title="Submit New Invoice"
            footer={<><Button variant="secondary" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</Button><Button onClick={handleInvoiceSubmit}>Submit Invoice</Button></>}
        >
            <Input name="invoice_number" label="Invoice Number" value={invoiceFormData.invoice_number} onChange={handleInvoiceFormChange} required />
            <Select name="po_number" label="Associated PO Number" value={invoiceFormData.po_number} onChange={handleInvoiceFormChange} required>
                <option value="">Select PO</option>
                {canonicalVendorPOs.filter(po => po.status !== InvPurchaseOrderStatusEnum.INVOICED && po.status !== InvPurchaseOrderStatusEnum.CANCELLED && po.status !== InvPurchaseOrderStatusEnum.DRAFT && po.status !== InvPurchaseOrderStatusEnum.PENDING_APPROVAL).map(po => (
                    <option key={po.id} value={po.id}>{po.id || 'N/A'} - Ksh {po.total_value?.toFixed(2) || '0.00'}</option>
                ))}
            </Select>
            <Input name="invoice_date" label="Invoice Date" type="date" value={invoiceFormData.invoice_date} onChange={handleInvoiceFormChange} required />
            <Input name="amount" label="Invoice Amount (KES)" type="number" step="0.01" value={invoiceFormData.amount} onChange={handleInvoiceFormChange} required />
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Invoice PDF</label>
                <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" placeholder="Upload Invoice PDF" title="Upload Invoice PDF" />
                <p className="text-xs text-gray-500 mt-1">Placeholder for file upload logic.</p>
            </div>
        </Modal>

      </div>
    </div>
  );
};

export default VendorPortalDashboardPage;
