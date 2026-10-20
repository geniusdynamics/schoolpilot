// ABOUTME: Hub page for certificate management
// ABOUTME: Consolidates certificate requests, birth, character, and transfer certificates into tabbed interface

import React, { useState, useCallback } from 'react';
import { withCanonicalRepository } from '../data/withCanonicalRepository';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeaderWithTabs } from '@/components/ui/PageHeaderWithTabs';
import {
  DocumentTextIcon,
  CheckBadgeIcon,
  UserIcon,
  ArrowPathIcon,
} from '@/components/ui/icons';
import { CertificatesManagementContent } from './CertificatesManagementPage';
import { BirthCertificateContent } from './BirthCertificatePage';
import { CharacterCertificateContent } from './CharacterCertificatePage';
import { TransferCertificateContent } from './TransferCertificatePage';

interface HubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

const CertificatesPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs: HubTab[] = [
    {
      id: 'requests',
      label: t('certificates.requests', 'Requests'),
      icon: <DocumentTextIcon className="w-4 h-4" />,
      component: <CertificatesManagementContent />,
    },
    {
      id: 'birth',
      label: t('certificates.birth.title', 'Birth'),
      icon: <UserIcon className="w-4 h-4" />,
      component: <BirthCertificateContent />,
    },
    {
      id: 'character',
      label: t('certificates.character.title', 'Character'),
      icon: <CheckBadgeIcon className="w-4 h-4" />,
      component: <CharacterCertificateContent />,
    },
    {
      id: 'transfer',
      label: t('certificates.transfer.title', 'Transfer'),
      icon: <ArrowPathIcon className="w-4 h-4" />,
      component: <TransferCertificateContent />,
    },
  ];

  const activeTabFromUrl = searchParams.get('tab') || 'requests';
  const [activeTab, setActiveTab] = useState(activeTabFromUrl);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      if (tabId === 'requests') {
        navigate('/administration/certificates', { replace: true });
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
        title={t('certificatesHub.title', 'Certificates')}
        subtitle={t(
          'certificatesHub.subtitle',
          'Manage certificate requests and generate birth, character, and transfer certificates'
        )}
        tabs={tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
        }))}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="compact"
        colorScheme="violet"
      >
        {activeTabData.component}
      </PageHeaderWithTabs>
    </div>
  );
};

const CertificatesPageWithRepository = withCanonicalRepository(CertificatesPage);
export default CertificatesPageWithRepository;
