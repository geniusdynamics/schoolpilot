import React, { useState, useMemo, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { CogIcon, ShoppingCartIcon, ArchiveIcon, CurrencyDollarIcon, BellIcon, UserCircleIcon, ChevronDownIcon, EditIcon, DeleteIcon } from '@/components/ui/icons';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { DataGrid, DataGridColumn } from '@/components/ui';
import DonutChart from '@/components/ui/DonutChart';
import HorizontalBarChart from '@/components/ui/BarChart';
import { KanbanBoard, KanbanCard, KanbanColumn } from '@/components/ui/data/KanbanBoard';
import { useAppData } from '@/contexts/AppDataContext'; 
import { PurchaseOrder, Requisition, RequisitionStatus, PurchaseOrderStatus, Supplier, ChartData } from '@/types';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

const SchoolProcurementDashboardPage: React.FC = () => {
  const { requisitions, purchaseOrders, suppliers, loading, updateRequisitionStatus } = useAppData(); 
  const { t } = useTranslation('inventory');
  
  // Filter states
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState('All');

  const openRequisitions = requisitions.filter(r => r.status === RequisitionStatus.PENDING_APPROVAL || r.status === RequisitionStatus.APPROVED);
  const pendingApprovalRequisitions = requisitions.filter(r => r.status === RequisitionStatus.PENDING_APPROVAL);
  const awaitingQuoteCount = 0; 
  const budgetUtilData: ChartData[] = [{ name: 'Actual Spend', value: 1200000 }, { name: 'Remaining Budget', value: 600000 }];
  const savingsAchieved = 85000;

  const poStatusRaised = purchaseOrders.filter(po => po.status === PurchaseOrderStatus.DRAFT || po.status === PurchaseOrderStatus.PENDING_APPROVAL);
  const poStatusDispatched = purchaseOrders.filter(po => po.status === PurchaseOrderStatus.SENT_TO_SUPPLIER);
  const poStatusReceived = purchaseOrders.filter(po => po.status === PurchaseOrderStatus.PARTIALLY_RECEIVED || po.status === PurchaseOrderStatus.FULLY_RECEIVED);
  const poStatusInvoiced = purchaseOrders.filter(po => po.status === PurchaseOrderStatus.INVOICED);

  const topSpendingCategoriesData = [
    { name: 'Textbooks', value: 450000 },
    { name: 'IT Equipment', value: 300000 },
    { name: 'Stationery', value: 150000 },
    { name: 'Maintenance', value: 120000 },
    { name: 'Furniture', value: 80000 },
  ];

  const contractRenewalData = useMemo(() => {
    const today = new Date();
    const ninetyDaysFromNow = new Date(new Date().setDate(today.getDate() + 90)); 
    return suppliers
      .filter(s => {
          if (!s.contract_expiry_date) return false;
          const expiryDate = new Date(s.contract_expiry_date);
          return expiryDate <= ninetyDaysFromNow && expiryDate >= today; 
      })
      .map(s => ({
        id: String(s.id), 
        vendorName: s.name,
        contractTitle: `Contract with ${s.name}`, 
        renewsIn: Math.ceil((new Date(s.contract_expiry_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a,b) => a.renewsIn - b.renewsIn);
  }, [suppliers]);


  const handleApproveRequisition = async (requisitionId: string) => {
    if(window.confirm("Are you sure you want to approve this requisition?")){
      await updateRequisitionStatus(requisitionId, RequisitionStatus.APPROVED);
    }
  };

  const handleRejectRequisition = async (requisitionId: string) => {
     if(window.confirm("Are you sure you want to reject this requisition?")){
      await updateRequisitionStatus(requisitionId, RequisitionStatus.REJECTED);
    }
  };

  const approvalColumns: DataGridColumn<Requisition>[] = [
    { 
      key: 'requesting_staff_name', 
      header: 'Requester', 
      sortable: true, 
      filterable: true, 
      width: 150
    },
    { 
      key: 'department_name', 
      header: 'Department', 
      sortable: true, 
      filterable: true, 
      width: 120
    },
    { 
      key: 'total_requested_value', 
      header: 'Amount', 
      sortable: true, 
      filterable: false, 
      width: 120,
      render: (value, row) => `Ksh ${row.total_requested_value?.toFixed(2) || '0.00'}`
    },
    { 
      key: 'request_date', 
      header: 'Date', 
      sortable: true, 
      filterable: false, 
      width: 100,
      render: (value, row) => new Date(row.request_date).toLocaleDateString()
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      filterable: false,
      width: 180,
      sticky: 'right',
      render: (value, row) => (
        <div className="space-x-1">
          <Button size="sm" variant="primary" className="bg-green-500 hover:bg-green-600" onClick={() => handleApproveRequisition(row.id)}>Approve</Button>
          <Button size="sm" variant="secondary" className="border-red-500 text-red-500 hover:bg-red-50" onClick={() => handleRejectRequisition(row.id)}>Reject</Button>
        </div>
      ),
    },
  ];

  if (loading.requisitions || loading.purchaseOrders || loading.suppliers) {
    return <div className="flex justify-center items-center h-screen"><Spinner size="lg" /></div>;
  }

  const renderPurchaseOrderCard = (po: PurchaseOrder) => (
    <div key={po.id} className="bg-white p-3 rounded-md shadow hover:shadow-lg transition-shadow border border-gray-200 mb-2">
      <div className="flex justify-between items-start">
        <span className="font-semibold text-sm text-indigo-600">{po.id}</span>
      </div>
      <p className="text-sm text-gray-700 mt-1">{po.supplier_name}</p>
      <p className="text-xs text-gray-500">Amount: Ksh {po.total_value?.toFixed(2)}</p>
      <p className="text-xs text-gray-500">Order Date: {new Date(po.order_date).toLocaleDateString()}</p>
    </div>
  );

  // Transform PO data for Kanban board
  const transformPOToKanbanCard = (po: PurchaseOrder): KanbanCard => ({
    id: po.id,
    title: po.id,
    description: `${po.supplier_name} - Ksh ${po.total_value?.toFixed(2)}`,
    tags: [new Date(po.order_date).toLocaleDateString()],
    priority: po.total_value && po.total_value > 100000 ? 'high' : 'medium',
  });

  // Kanban columns configuration
  const kanbanColumns: KanbanColumn[] = [
    {
      id: 'raised',
      title: `Raised (${poStatusRaised.length})`,
      cards: poStatusRaised.map(transformPOToKanbanCard),
      color: '#3B82F6',
    },
    {
      id: 'dispatched',
      title: `Dispatched (${poStatusDispatched.length})`,
      cards: poStatusDispatched.map(transformPOToKanbanCard),
      color: '#F59E0B',
    },
    {
      id: 'received',
      title: `Received (${poStatusReceived.length})`,
      cards: poStatusReceived.map(transformPOToKanbanCard),
      color: '#10B981',
    },
    {
      id: 'invoiced',
      title: `Invoiced (${poStatusInvoiced.length})`,
      cards: poStatusInvoiced.map(transformPOToKanbanCard),
      color: '#8B5CF6',
    },
  ];

  // Handle PO status change via drag and drop
  const handlePOStatusChange = (cardId: string, fromColumn: string, toColumn: string) => {
    console.log(`Moving PO ${cardId} from ${fromColumn} to ${toColumn}`);
    // Here you would typically update the PO status in your backend
    // For now, we'll just log the action
  };

  // Handle PO card click
  const handlePOCardClick = (card: KanbanCard) => {
    console.log(`Clicked on PO: ${card.id}`);
    // Here you would typically open a modal or navigate to PO details
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 font-inter">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Procurement Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor and manage your procurement activities</p>
          </div>
          <div className="flex flex-wrap gap-2">
             <Select 
               label="Date Range" 
               containerClassName="min-w-32 mb-0" 
               value={dateRange}
               onChange={(e) => setDateRange(e.target.value)}
             >
               <option value="Last 7 Days">Last 7 Days</option>
               <option value="Last 30 Days">Last 30 Days</option>
               <option value="Last 90 Days">Last 90 Days</option>
               <option value="This Year">This Year</option>
             </Select>
             <Select 
               label="Department" 
               containerClassName="min-w-32 mb-0"
               value={selectedDepartment}
               onChange={(e) => setSelectedDepartment(e.target.value)}
             >
               <option value="All">All Departments</option>
               <option value="IT">IT Department</option>
               <option value="Finance">Finance</option>
               <option value="Operations">Operations</option>
               <option value="Academics">Academics</option>
             </Select>
             <Select 
               label="Vendor" 
               containerClassName="min-w-32 mb-0"
               value={selectedVendor}
               onChange={(e) => setSelectedVendor(e.target.value)}
             >
               <option value="All">All Vendors</option>
               {suppliers.slice(0, 5).map(supplier => (
                 <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
               ))}
             </Select>
             <Button 
               variant="secondary" 
               size="sm"
               onClick={() => {
                 setDateRange('Last 30 Days');
                 setSelectedDepartment('All');
                 setSelectedVendor('All');
               }}
             >
               Reset
             </Button>
           </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Requisitions</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{openRequisitions.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <ShoppingCartIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex justify-between text-xs text-gray-500">
                <span>Pending: {pendingApprovalRequisitions.length}</span>
                <span>Awaiting Quote: {awaitingQuoteCount}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Budget Utilization</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {((budgetUtilData[0].value / (budgetUtilData[0].value + budgetUtilData[1].value)) * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <CurrencyDollarIcon className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Ksh {budgetUtilData[0].value.toLocaleString()} of Ksh {(budgetUtilData[0].value + budgetUtilData[1].value).toLocaleString()}
              </p>
            </div>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">YTD Savings</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">Ksh {savingsAchieved.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <ArchiveIcon className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Cost optimization achieved</p>
            </div>
          </Card>

          <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contract Renewals</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">{contractRenewalData.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <BellIcon className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Due within 90 days</p>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Budget vs. Actual Spend */}
          <div className="lg:col-span-1">
            <Card title="Budget vs. Actual Spend" className="bg-white shadow-sm h-full">
              <div className="p-6">
                <DonutChart 
                  data={budgetUtilData} 
                  colors={['#F59E0B', '#E5E7EB']} 
                  innerRadius="60%" 
                  outerRadius="85%"
                  centerText={() => `${((budgetUtilData[0].value / (budgetUtilData[0].value + budgetUtilData[1].value)) * 100).toFixed(0)}%`}
                />
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">Spent</span>
                    </div>
                    <span className="text-sm font-medium">Ksh {budgetUtilData[0].value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                      <span className="text-sm text-gray-600">Remaining</span>
                    </div>
                    <span className="text-sm font-medium">Ksh {budgetUtilData[1].value.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Top Spending Categories */}
          <div className="lg:col-span-1">
            <Card title="Top Spending Categories" className="bg-white shadow-sm h-full">
              <div className="p-6">
                <HorizontalBarChart data={topSpendingCategoriesData} barDataKey="value" />
              </div>
            </Card>
          </div>

          {/* Contract Renewal Alerts - Takes remaining space */}
          <div className="lg:col-span-1 xl:col-span-2">
            <Card title="Contract Renewal Alerts" className="bg-white shadow-sm h-full">
              <div className="p-6">
                {contractRenewalData.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {contractRenewalData.map(contract => (
                      <div key={contract.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{contract.vendorName}</p>
                            <p className="text-sm text-gray-600 mt-1">{contract.contractTitle}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              contract.renewsIn < 30 
                                ? 'bg-red-100 text-red-800' 
                                : contract.renewsIn < 60 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}>
                              {contract.renewsIn} days
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              ) : (
                <div className="text-center py-8">
                  <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No contracts due for renewal soon.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

        {/* Pending Approvals */}
        <div className="mb-6">
          <Card title="Pending Approvals" className="bg-white shadow-sm">
            <div className="p-6">
              <div className="max-h-96 overflow-y-auto">
                <DataGrid 
                  columns={approvalColumns} 
                  data={pendingApprovalRequisitions || []} 
                  isLoading={loading.requisitions}
                  sortable
                  filterable
                  emptyState={{
                    icon: <BellIcon className="w-8 h-8 text-gray-400" />,
                    title: "No pending approvals",
                    description: "All requisitions have been processed."
                  }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Purchase Order Status - Full Width */}
        <div>
          <Card title="Purchase Order Status" className="bg-white shadow-sm">
            <div className="p-6">
              <KanbanBoard
                columns={kanbanColumns}
                onCardMove={handlePOStatusChange}
                onCardClick={handlePOCardClick}
                className="min-h-[500px]"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchoolProcurementDashboardPage;
