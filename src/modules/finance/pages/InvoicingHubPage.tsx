// ABOUTME: Hub page for invoicing
// ABOUTME: Consolidates invoice generation, customer invoices, and supplier invoices into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentDuplicateIcon,
  DocumentTextIcon,
} from '@/components/ui/icons';
import { InvoiceGenerationPageContent } from './InvoiceGenerationPage';
import { CustomerInvoicesPageContent } from './CustomerInvoicesPage';
import { SupplierInvoicesPageContent } from './SupplierInvoicesPage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const InvoicingHubPage: React.FC = () => {
  const { t } = useTranslation('finance');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'invoice-generation',
      label: t('invoiceGeneration.title', 'Invoice Generation'),
      icon: <DocumentDuplicateIcon className="w-4 h-4" />,
      component: <InvoiceGenerationPageContent />,
    },
    {
      id: 'customer-invoices',
      label: t('customerInvoices.title', 'Customer Invoices'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <CustomerInvoicesPageContent />,
    },
    {
      id: 'supplier-invoices',
      label: t('supplierInvoices.title', 'Supplier Invoices'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <SupplierInvoicesPageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'invoice-generation';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'invoice-generation') {
        navigate('/finance/invoicing', { replace: true });
      } else {
        setSearchParams({ tab: tabId }, { replace: true });
      }
    },
    [navigate, setSearchParams]
  );

  const activeTabData = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4">
      <PageHeaderWithTabs
        title={t('invoicing.title', 'Invoicing')}
        subtitle={t(
          'invoicing.subtitle',
          'Generate and manage customer and supplier invoices'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="teal"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default InvoicingHubPage;

