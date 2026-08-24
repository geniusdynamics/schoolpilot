import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { PlusIcon, EyeIcon, CheckCircleIcon, XCircleIcon } from '@/components/ui/icons';
import { databaseService } from '@/services/database/databaseService';
import { useTranslation } from 'react-i18next';
import { CertificateType, CertificateStatus } from '../data/types';
import type { CertificateRequest } from '../data/types';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

const CertificatesManagementPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const [certificates, setCertificates] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateRequest | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    admission_number: '',
    class_name: '',
    certificate_type: 'Bonafide Certificate' as CertificateType,
    purpose: '',
    remarks: ''
  });

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = () => {
    setFormData({
      student_id: '',
      student_name: '',
      admission_number: '',
      class_name: '',
      certificate_type: 'Bonafide Certificate',
      purpose: '',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.student_id || !formData.certificate_type) {
      toast.showWarning('Please fill in all required fields');
      return;
    }

    try {
      const db = await databaseService.getDatabase();
      const newCert: CertificateRequest = {
        id: databaseService.generateId(),
        certificate_number: `CERT-${Date.now()}`,
        ...formData,
        status: 'Requested',
        requested_by: 'current-user',
        requested_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.certificate_requests?.insert(newCert);
      closeModal();
      loadData();
    } catch (error) {
      logger.error('Error creating certificate request:', error);
      toast.showError('Failed to create certificate request');
    }
  };

  const handleApprove = async (cert: CertificateRequest) => {
    try {
      const db = await databaseService.getDatabase();
      await db.certificate_requests?.update(cert.id, {
        ...cert,
        status: 'Approved',
        approved_by: 'current-user',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      logger.error('Error approving certificate:', error);
    }
  };

  const handleIssue = async (cert: CertificateRequest) => {
    try {
      const db = await databaseService.getDatabase();
      await db.certificate_requests?.update(cert.id, {
        ...cert,
        status: 'Issued',
        issued_by: 'current-user',
        issued_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      logger.error('Error issuing certificate:', error);
    }
  };

  const handleReject = async (cert: CertificateRequest, reason: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.certificate_requests?.update(cert.id, {
        ...cert,
        status: 'Rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      logger.error('Error rejecting certificate:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const result = await db.certificate_requests?.find({
        sort: [{ requested_at: 'desc' }]
      });
      setCertificates((result?.docs || []) as CertificateRequest[]);
    } catch (error) {
      logger.error('Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: CertificateStatus) => {
    const variants: Record<CertificateStatus, any> = {
      Requested: 'info',
      'In Progress': 'warning',
      Approved: 'success',
      Rejected: 'danger',
      Issued: 'success',
      Cancelled: 'neutral'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const columns: DataGridColumn<CertificateRequest>[] = [
    { key: 'certificate_number', header: 'Certificate #', width: 130, sortable: true, filterable: true },
    { key: 'student_name', header: 'Student', width: 160, sortable: true, filterable: true },
    { key: 'admission_number', header: 'Adm No', width: 100, sortable: true },
    {
      key: 'certificate_type',
      header: 'Type',
      width: 150,
      sortable: true,
      filterable: true,
      render: (value) => <Badge variant="neutral">{value}</Badge>
    },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      sortable: true,
      filterable: true,
      render: (value, item) => getStatusBadge(item.status)
    },
    {
      key: 'requested_at',
      header: 'Requested',
      width: 110,
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'id',
      header: 'Actions',
      width: 180,
      sortable: false,
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedCertificate(item)} leftIcon={<EyeIcon className="w-4 h-4" />} />
          {item.status === 'Requested' && (
            <>
              <Button size="sm" variant="success" onClick={() => handleApprove(item)} leftIcon={<CheckCircleIcon className="w-4 h-4" />}>Approve</Button>
              <Button size="sm" variant="danger" onClick={() => handleReject(item, 'Not approved')} leftIcon={<XCircleIcon className="w-4 h-4" />} />
            </>
          )}
          {item.status === 'Approved' && (
            <Button size="sm" variant="primary" onClick={() => handleIssue(item)}>Issue</Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('certificates.title')}
        description={t('certificates.description')}
        actions={
          <Button onClick={openModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('certificates.newRequest')}
          </Button>
        }
      >
        <DataGrid
          data={certificates}
          columns={columns}
          sortable={true}
          filterable={true}
          loading={loading}
          emptyState={
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No certificate requests found.</p>
            </div>
          }
        />
      </Card>

      {selectedCertificate && (
        <Modal
          isOpen={!!selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
          title={`Certificate Details: ${selectedCertificate.certificate_number}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Student</label>
                <p className="mt-1">{selectedCertificate.student_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Admission No</label>
                <p className="mt-1">{selectedCertificate.admission_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <div className="mt-1"><Badge variant="neutral">{selectedCertificate.certificate_type}</Badge></div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedCertificate.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Requested At</label>
                <p className="mt-1">{new Date(selectedCertificate.requested_at).toLocaleDateString()}</p>
              </div>
              {selectedCertificate.approved_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Approved At</label>
                  <p className="mt-1">{new Date(selectedCertificate.approved_at).toLocaleDateString()}</p>
                </div>
              )}
              {selectedCertificate.issued_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Issued At</label>
                  <p className="mt-1">{new Date(selectedCertificate.issued_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {selectedCertificate.purpose && (
              <div>
                <label className="text-sm font-medium text-gray-700">Purpose</label>
                <p className="mt-1">{selectedCertificate.purpose}</p>
              </div>
            )}

            {selectedCertificate.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <label className="text-sm font-medium text-red-800">Rejection Reason</label>
                <p className="mt-1 text-red-700">{selectedCertificate.rejection_reason}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={t('certificates.newRequest')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>Submit Request</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Student Name"
            value={formData.student_name}
            onChange={(value) => handleInputChange('student_name', value)}
            required
          />
          <Input
            label="Admission Number"
            value={formData.admission_number}
            onChange={(value) => handleInputChange('admission_number', value)}
          />
          <Input
            label="Class"
            value={formData.class_name}
            onChange={(value) => handleInputChange('class_name', value)}
          />
          <Select
            label="Certificate Type"
            value={formData.certificate_type}
            onChange={(value) => handleInputChange('certificate_type', value)}
            options={Object.values(CertificateType).map(t => ({ label: t, value: t }))}
            required
          />
          <Textarea
            label="Purpose"
            value={formData.purpose}
            onChange={(value) => handleInputChange('purpose', value)}
            rows={3}
          />
          <Textarea
            label="Remarks"
            value={formData.remarks}
            onChange={(value) => handleInputChange('remarks', value)}
            rows={2}
          />
        </div>
      </Modal>
    </div>
  );
};

export default CertificatesManagementPage;

export const CertificatesManagementContent = CertificatesManagementPage;
