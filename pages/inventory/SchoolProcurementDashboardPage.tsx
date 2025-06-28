import React, { useState, useMemo, useEffect } from 'react';
import Card from '../../components/ui/Card';
import { CogIcon, ShoppingCartIcon, ArchiveIcon, CurrencyDollarIcon, BellIcon, UserCircleIcon, ChevronDownIcon, EditIcon, DeleteIcon } from '../../components/ui/icons';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import DonutChart from '../../components/ui/DonutChart';
import HorizontalBarChart from '../../components/ui/BarChart';
import { useAppData } from '../../contexts/AppDataContext'; 
import { PurchaseOrder, Requisition, RequisitionStatus, PurchaseOrderStatus, Supplier, ChartData } from '../../types';
import Spinner from '../../components/ui/Spinner';

const SchoolProcurementDashboardPage: React.FC = () => {
  const { requisitions, purchaseOrders, suppliers, loading, updateRequisitionStatus } = useAppData(); 

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

  const approvalColumns = [
    { header: 'Requester', accessor: 'requesting_staff_name' as keyof Requisition },
    { header: 'Department', accessor: 'department_name' as keyof Requisition },
    { header: 'Amount', accessor: 'total_requested_value' as keyof Requisition, render: (item: Requisition) => `Ksh ${item.total_requested_value?.toFixed(2) || '0.00'}` },
    { header: 'Date', accessor: 'request_date' as keyof Requisition, render: (item: Requisition) => new Date(item.request_date).toLocaleDateString() },
    {
      header: 'Actions',
      accessor: 'id' as keyof Requisition,
      render: (item: Requisition) => (
        <div className="space-x-1">
          <Button size="sm" variant="primary" className="bg-green-500 hover:bg-green-600" onClick={() => handleApproveRequisition(item.id)}>Approve</Button>
          <Button size="sm" variant="secondary" className="border-red-500 text-red-500 hover:bg-red-50" onClick={() => handleRejectRequisition(item.id)}>Reject</Button>
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


  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-inter">
      <div className="pt-6 grid grid-cols-12 gap-6 p-6"> 
        <div className="col-span-12 md:col-span-3 space-y-6">
          <Card title="Open Requisitions" className="bg-white">
            <div className="text-center p-4">
              <p className="text-5xl font-bold text-gray-800">{openRequisitions.length}</p>
              <p className="text-sm text-gray-500 mt-2">Pending Approval: {pendingApprovalRequisitions.length}</p>
              <p className="text-sm text-gray-500">Awaiting Quote: {awaitingQuoteCount}</p>
            </div>
          </Card>
          <Card title="Budget vs. Actual Spend" className="bg-white">
             <DonutChart 
                data={budgetUtilData} 
                colors={['#4A90E2', '#E0E0E0']} 
                innerRadius="70%" 
                outerRadius="90%"
                centerText={() => `${((budgetUtilData[0].value / (budgetUtilData[0].value + budgetUtilData[1].value)) * 100).toFixed(0)}%`}
            />
            <p className="text-center text-sm text-gray-600 mt-2">
                Ksh {budgetUtilData[0].value.toLocaleString()} of Ksh {(budgetUtilData[0].value + budgetUtilData[1].value).toLocaleString()}
            </p>
          </Card>
          <Card title="YTD Savings" className="bg-white">
            <div className="text-center p-4">
              <p className="text-4xl font-bold text-green-600">Ksh {savingsAchieved.toLocaleString()}</p>
            </div>
          </Card>
        </div>

        <div className="col-span-12 md:col-span-6 space-y-6">
          <Card className="bg-white">
            <div className="p-4 flex space-x-2 border-b">
              <Select label="Date Range" containerClassName="flex-1 mb-0"><option>Last 30 Days</option></Select>
              <Select label="Department" containerClassName="flex-1 mb-0"><option>All</option></Select>
              <Select label="Vendor" containerClassName="flex-1 mb-0"><option>All</option></Select>
              <Button variant="secondary" className="self-end h-10">Reset</Button>
            </div>
          </Card>

          <Card title="Purchase Order Status" className="bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 p-2 bg-gray-100 rounded-t-md">Raised ({poStatusRaised.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto p-1">
                  {poStatusRaised.map(renderPurchaseOrderCard)}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 p-2 bg-gray-100 rounded-t-md">Dispatched ({poStatusDispatched.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto p-1">
                  {poStatusDispatched.map(renderPurchaseOrderCard)}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 p-2 bg-gray-100 rounded-t-md">Received ({poStatusReceived.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto p-1">
                  {poStatusReceived.map(renderPurchaseOrderCard)}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 p-2 bg-gray-100 rounded-t-md">Invoiced ({poStatusInvoiced.length})</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto p-1">
                  {poStatusInvoiced.map(renderPurchaseOrderCard)}
                </div>
              </div>
            </div>
          </Card>
          
          <Card title="Top Spending Categories" className="bg-white">
            <HorizontalBarChart data={topSpendingCategoriesData} barDataKey="value" />
          </Card>
        </div>

        <div className="col-span-12 md:col-span-3 space-y-6">
          <Card title="Pending Approvals" className="bg-white">
            <div className="max-h-96 overflow-y-auto">
             <Table columns={approvalColumns} data={pendingApprovalRequisitions} isLoading={loading.requisitions} emptyStateMessage="No pending approvals."/>
            </div>
          </Card>
          <Card title="Contract Renewal Alerts" className="bg-white">
            {contractRenewalData.length > 0 ? (
                <ul className="space-y-3 p-4 max-h-96 overflow-y-auto">
                {contractRenewalData.map(contract => (
                    <li key={contract.id} className="text-sm border-b pb-2">
                    <p className="font-semibold text-gray-700">{contract.vendorName} - {contract.contractTitle}</p>
                    <p className={`text-xs ${contract.renewsIn < 30 ? 'text-red-600 font-medium' : 'text-yellow-600'}`}>
                        Renews in {contract.renewsIn} days
                    </p>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500 p-4 text-center">No contracts due for renewal soon.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SchoolProcurementDashboardPage;
