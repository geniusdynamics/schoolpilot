
import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { SchoolIcon, HomeIcon, DocumentReportIcon as DocumentTextIcon, ShoppingCartIcon, ReceiptRefundIcon, UserCircleIcon, BellIcon, PlusIcon } from '../../components/ui/icons'; 
import { InvPurchaseOrderType as PurchaseOrder, InvPurchaseOrderStatusEnum as PurchaseOrderStatus, InvRFQType as RFQ, InvRFQStatusEnum as RFQStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import { useAppData } from '@/contexts/AppDataContext'; 

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
  
  const { purchaseOrders, rfqs, loading } = useAppData(); 

  // Mock Data - In a real app, this would come from context or API based on logged-in vendor
  const vendorName = "ABC School Supplies Ltd."; 
  const newRfqCount = rfqs.filter(r => r.status === RFQStatus.OPEN).length;
  const activePoCount = purchaseOrders.filter(po => po.supplier_name === vendorName && (po.status === PurchaseOrderStatus.APPROVED || po.status === PurchaseOrderStatus.SENT_TO_SUPPLIER || po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED)).length;
  const pendingInvoiceCount = 3; 
  const overduePaymentCount = 1; 

  const [profileFormData, setProfileFormData] = useState<ProfileFormData>({
    companyName: vendorName, // Pre-fill
    contactPerson: 'Mr. John Doe', // Mock
    email: 'sales@abcschoolsupplies.com', // Mock
    phone: '020-1234567', // Mock
    address: '123 Supply Street, Industrial Area, Nairobi', // Mock
  });

  const initialInvoiceFormData: InvoiceFormData = {
    invoice_number: '',
    po_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    amount: '',
    // file: null,
  };
  const [invoiceFormData, setInvoiceFormData] = useState<InvoiceFormData>(initialInvoiceFormData);


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
        alert("Please fill in all required invoice details.");
        return;
    }
    // const fileInfo = invoiceFormData.file ? `with file: ${invoiceFormData.file.name}` : 'no file attached';
    alert(`Invoice ${invoiceFormData.invoice_number} submitted for PO ${invoiceFormData.po_number}, Amount: KES ${invoiceFormData.amount}. (Mock Submission)`);
    setIsInvoiceModalOpen(false);
    setInvoiceFormData(initialInvoiceFormData); // Reset form
  };


  const mockRecentActivity = [
    { id: 1, text: "New RFQ #RFQ-078 posted for Stationery.", time: "2 hours ago" },
    { id: 2, text: "Invoice #INV-2024-034 status changed to Paid.", time: "1 day ago" },
    { id: 3, text: "Purchase Order #PO-2024-055 acknowledged.", time: "2 days ago" },
  ];

  const vendorPOs: PurchaseOrder[] = purchaseOrders.filter(po => po.supplier_name === vendorName);
  
  const poColumns = [
    { header: 'PO Number', accessor: 'id' as keyof PurchaseOrder },
    { header: 'Issue Date', accessor: 'order_date' as keyof PurchaseOrder, render: (item: PurchaseOrder) => new Date(item.order_date).toLocaleDateString() },
    { header: 'Amount', accessor: 'total_value' as keyof PurchaseOrder, render: (item: PurchaseOrder) => `Ksh ${item.total_value?.toFixed(2)}` },
    { header: 'Status', accessor: 'status' as keyof PurchaseOrder, 
      render: (item: PurchaseOrder) => <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
        item.status === PurchaseOrderStatus.APPROVED ? 'bg-blue-100 text-blue-800' :
        item.status === PurchaseOrderStatus.SENT_TO_SUPPLIER ? 'bg-yellow-100 text-yellow-800' :
        item.status === PurchaseOrderStatus.FULLY_RECEIVED || item.status === PurchaseOrderStatus.PARTIALLY_RECEIVED ? 'bg-green-100 text-green-800' :
        'bg-gray-100 text-gray-800'
      }`}>{item.status}</span>
    },
    { header: 'Action', accessor: 'id' as keyof PurchaseOrder, render: (item: PurchaseOrder) => <Button size="sm" variant="ghost">View Details</Button> }
  ];

  const rfqColumns = [
    { header: 'RFQ ID', accessor: 'id' as keyof RFQ },
    { header: 'Title', accessor: 'title' as keyof RFQ },
    { header: 'Issue Date', accessor: 'issue_date' as keyof RFQ, render: (item: RFQ) => new Date(item.issue_date).toLocaleDateString() },
    { header: 'Closing Date', accessor: 'closing_date' as keyof RFQ, render: (item: RFQ) => new Date(item.closing_date).toLocaleDateString() },
    { header: 'Status', accessor: 'status' as keyof RFQ,
        render: (item: RFQ) => <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
            item.status === RFQStatus.OPEN ? 'bg-green-100 text-green-800' : 
            item.status === RFQStatus.CLOSED ? 'bg-gray-100 text-gray-700' :
            item.status === RFQStatus.AWARDED ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-700' // Cancelled
        }`}>{item.status}</span>
    },
    { header: 'Action', accessor: 'id' as keyof RFQ, render: (item: RFQ) => (
        <div className="space-x-1">
            <Button size="sm" variant="ghost">View Details</Button>
            {item.status === RFQStatus.OPEN && <Button size="sm" variant="primary">Submit Bid</Button>}
        </div>
    )}
  ];


  const mockInvoices = [ 
    { id: 'INV-2024-030', poNumber: 'PO-2024-045', amount: 12000, dueDate: '2024-07-20', status: 'Paid' },
    { id: 'INV-2024-034', poNumber: 'PO-2024-050', amount: 8500, dueDate: '2024-08-05', status: 'Approved' },
    { id: 'INV-2024-038', poNumber: 'PO-2024-058', amount: 16200, dueDate: '2024-08-15', status: 'Submitted' },
  ];

  type MockInvoice = typeof mockInvoices[0];

  const invoiceColumns = [
    { header: 'Invoice #', accessor: 'id' as keyof MockInvoice },
    { header: 'PO #', accessor: 'poNumber' as keyof MockInvoice },
    { header: 'Amount', accessor: 'amount' as keyof MockInvoice, render: (item: MockInvoice) => `Ksh ${item.amount.toFixed(2)}` },
    { header: 'Due Date', accessor: 'dueDate' as keyof MockInvoice },
    { header: 'Status', accessor: 'status' as keyof MockInvoice,
       render: (item: MockInvoice) => <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
        item.status === 'Paid' ? 'bg-green-100 text-green-800' :
        item.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
        item.status === 'Submitted' ? 'bg-yellow-100 text-yellow-800' :
        'bg-gray-100 text-gray-800'
      }`}>{item.status}</span>
    },
    { header: 'Action', accessor: 'id' as keyof MockInvoice, render: (item: MockInvoice) => <Button size="sm" variant="ghost">View/Upload PDF</Button> }
  ];

  const NavItem: React.FC<{ label: string; view: VendorView; icon: React.ReactNode }> = ({ label, view, icon }) => (
    <li>
      <button
        onClick={() => setActiveView(view)}
        className={`w-full flex items-center space-x-3 p-3 rounded-md text-sm hover:bg-indigo-700 hover:text-white transition-colors duration-200
                    ${activeView === view ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-300'}`}
      >
        {icon}
        <span>{label}</span>
      </button>
    </li>
  );

  if (loading.purchaseOrders || loading.rfqs) { 
      return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>
  }

  return (
    <div className="flex h-screen bg-gray-100 font-inter">
      {/* Left Sidebar */}
      <div className="w-1/6 (15%) bg-gray-800 text-white flex flex-col min-h-screen p-4 space-y-2 fixed top-0 left-0 bottom-0">
        <div className="flex items-center justify-center h-16 border-b border-gray-700 mb-4">
          <SchoolIcon className="w-8 h-8 mr-2 text-indigo-400" />
          <h1 className="text-lg font-bold text-indigo-400 truncate">School Portal</h1>
        </div>
        <nav>
          <ul className="space-y-1">
            <NavItem label="Dashboard" view="dashboard" icon={<HomeIcon className="w-5 h-5" />} />
            <NavItem label="New Opportunities" view="rfqs" icon={<DocumentTextIcon className="w-5 h-5" />} />
            <NavItem label="Purchase Orders" view="pos" icon={<ShoppingCartIcon className="w-5 h-5" />} />
            <NavItem label="Invoices" view="invoices" icon={<ReceiptRefundIcon className="w-5 h-5" />} />
            <NavItem label="My Profile" view="profile" icon={<UserCircleIcon className="w-5 h-5" />} />
          </ul>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="w-5/6 (85%) ml-[16.666667%] p-6 space-y-6 overflow-y-auto"> 
        <header className="bg-white shadow-sm p-4 flex justify-between items-center rounded-md">
            <h2 className="text-xl font-semibold text-gray-700">Welcome, {vendorName}!</h2>
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
                            <p className="text-xs text-gray-500">{activity.time}</p>
                        </li>
                    ))}
                </ul>
            </Card>
          </div>
        )}

        {activeView === 'rfqs' && (
          <Card title="New Opportunities (RFQs)">
            {loading.rfqs ? <div className="flex justify-center p-4"><Spinner /></div> : rfqs.length > 0 ? (
                 <Table columns={rfqColumns} data={rfqs} isLoading={loading.rfqs} />
            ) : (
                <p className="text-gray-600 text-center py-4">No new RFQs available at the moment.</p>
            )}
          </Card>
        )}

        {activeView === 'pos' && (
          <Card title="Your Purchase Orders">
             {loading.purchaseOrders ? <div className="flex justify-center p-4"><Spinner /></div> : vendorPOs.length > 0 ? (
                <Table columns={poColumns} data={vendorPOs} isLoading={loading.purchaseOrders} />
            ) : (
                 <p className="text-gray-600 text-center py-4">No purchase orders found for your company.</p>
            )}
          </Card>
        )}

        {activeView === 'invoices' && (
          <Card title="Your Invoices" actions={
            <Button onClick={() => setIsInvoiceModalOpen(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>Submit New Invoice</Button>
          }>
             {mockInvoices.length > 0 ? (
                <Table columns={invoiceColumns} data={mockInvoices} />
            ) : (
                <p className="text-gray-600 text-center py-4">No invoices submitted yet.</p>
            )}
          </Card>
        )}
        
        {activeView === 'profile' && (
          <Card title="Your Company Profile">
            <form onSubmit={handleProfileSave} className="space-y-4 p-4">
                <Input 
                    label="Company Name" 
                    name="companyName" 
                    value={profileFormData.companyName} 
                    onChange={handleProfileInputChange} 
                    readOnly 
                    className="bg-gray-100"
                />
                <Input 
                    label="Contact Person" 
                    name="contactPerson" 
                    value={profileFormData.contactPerson} 
                    onChange={handleProfileInputChange} 
                />
                <Input 
                    label="Email Address" 
                    name="email" 
                    type="email" 
                    value={profileFormData.email} 
                    onChange={handleProfileInputChange} 
                />
                <Input 
                    label="Phone Number" 
                    name="phone" 
                    value={profileFormData.phone} 
                    onChange={handleProfileInputChange} 
                />
                <Textarea 
                    label="Company Address" 
                    name="address" 
                    value={profileFormData.address} 
                    onChange={handleProfileInputChange} 
                    rows={3}
                />
                 <div className="text-right">
                    <Button type="submit">Save Profile Changes</Button>
                </div>
            </form>
            <p className="text-xs text-gray-500 p-4">Manage your company information, contacts, and certifications here. (Functionality is mock for now).</p>
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
                {vendorPOs.filter(po => po.status !== PurchaseOrderStatus.INVOICED && po.status !== PurchaseOrderStatus.CANCELLED && po.status !== PurchaseOrderStatus.DRAFT && po.status !== PurchaseOrderStatus.PENDING_APPROVAL).map(po => (
                    <option key={po.id} value={po.id}>{po.id} - Ksh {po.total_value?.toFixed(2)}</option>
                ))}
            </Select>
            <Input name="invoice_date" label="Invoice Date" type="date" value={invoiceFormData.invoice_date} onChange={handleInvoiceFormChange} required />
            <Input name="amount" label="Invoice Amount (KES)" type="number" step="0.01" value={invoiceFormData.amount} onChange={handleInvoiceFormChange} required />
            <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Invoice PDF</label>
                <input type="file" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                <p className="text-xs text-gray-500 mt-1">Placeholder for file upload logic.</p>
            </div>
        </Modal>

      </div>
    </div>
  );
};

export default VendorPortalDashboardPage;
