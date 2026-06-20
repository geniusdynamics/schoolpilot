// ABOUTME: Hub page for marks verification
// ABOUTME: Consolidates cross-check verification and structure-based verification into tabbed interface

import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  ClipboardDocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
} from '@/components/ui/icons';
import { VerifyMarksCrossCheckPageContent } from './VerifyMarksCrossCheckPage';
import { VerifyMarksByStructurePageContent } from './VerifyMarksByStructurePage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const MarksVerificationPage: React.FC = () => {
  const { t } = useTranslation('academics');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'cross-check',
      label: t('verifyMarksCrossCheck.title', 'Cross Check'),
      icon: <ClipboardDocumentCheckIcon className="w-4 h-4" />,
      component: <VerifyMarksCrossCheckPageContent />,
    },
    {
      id: 'by-structure',
      label: t('verifyMarksByStructure.title', 'By Structure'),
      icon: <DocumentMagnifyingGlassIcon className="w-4 h-4" />,
      component: <VerifyMarksByStructurePageContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'cross-check';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'cross-check') {
        navigate('/academics/verification', { replace: true });
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
        title={t('verification.title', 'Marks Verification')}
        subtitle={t(
          'verification.subtitle',
          'Verify and validate entered marks through cross-checks and structure analysis'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="amber"
      />
      <div className="mt-4">{activeTabData.component}</div>
    </div>
  );
};

export default MarksVerificationPage;
