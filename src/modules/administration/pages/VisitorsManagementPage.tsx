import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { PlusIcon, EyeIcon, CheckCircleIcon, LogOutIcon } from '@/components/ui/icons';
import { databaseService } from '@/services/database/databaseService';
import { useTranslation } from 'react-i18next';
import { VisitorType, VisitorStatus } from '../data/types';
import type { VisitorLog } from '../data/types';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';

const VisitorsManagementPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorLog | null>(null);
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_type: 'Parent' as VisitorType,
    phone: '',
    email: '',
    id_type: '',
    id_number: '',
    purpose: '',
    person_to_meet: '',
    remarks: ''
  });

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = () => {
    setFormData({
      visitor_name: '',
      visitor_type: 'Parent',
      phone: '',
      email: '',
      id_type: '',
      id_number: '',
      purpose: '',
      person_to_meet: '',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const toast = useToast();
  const handleSubmit = async () => {
    if (!formData.visitor_name || !formData.phone || !formData.purpose) {
      toast.showWarning('Please fill in all required fields');
      return;
    }

    try {
      const db = await databaseService.getDatabase();
      const newVisitor: VisitorLog = {
        id: databaseService.generateId(),
        ...formData,
        status: 'Checked In',
        check_in_time: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.visitor_logs?.insert(newVisitor);
      closeModal();
      loadData();
    } catch (error) {
      logger.error('Error checking in visitor:', error);
      toast.showError('Failed to check in visitor');
    }
  };

  const handleCheckOut = async (visitor: VisitorLog) => {
    try {
      const db = await databaseService.getDatabase();
      await db.visitor_logs?.update(visitor.id, {
        ...visitor,
        status: 'Checked Out',
        check_out_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      logger.error('Error checking out visitor:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const result = await db.visitor_logs?.find({
        sort: [{ check_in_time: 'desc' }]
      });
      setVisitors((result?.docs || []) as VisitorLog[]);
    } catch (error) {
      logger.error('Error loading visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: VisitorStatus) => {
    const variants: Record<VisitorStatus, any> = {
      'Checked In': 'success',
      'Checked Out': 'neutral',
      Expected: 'info',
      'No Show': 'danger'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const columns: DataGridColumn<VisitorLog>[] = [
    { key: 'visitor_name', header: 'Visitor Name', width: 160, sortable: true, filterable: true },
    {
      key: 'visitor_type',
      header: 'Type',
      width: 110,
      sortable: true,
      filterable: true,
      render: (value) => <Badge variant="neutral">{value}</Badge>
    },
    { key: 'phone', header: 'Phone', width: 130, sortable: false },
    { key: 'purpose', header: 'Purpose', width: 200, sortable: false },
    { key: 'person_to_meet', header: 'Person to Meet', width: 140, sortable: true, filterable: true },
    {
      key: 'status',
      header: 'Status',
      width: 110,
      sortable: true,
      filterable: true,
      render: (value, item) => getStatusBadge(item.status)
    },
    {
      key: 'check_in_time',
      header: 'Check In',
      width: 130,
      sortable: true,
      render: (value) => new Date(value).toLocaleString()
    },
    {
      key: 'id',
      header: 'Actions',
      width: 120,
      sortable: false,
      render: (value, item) => (
        <div className="space-x-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedVisitor(item)} leftIcon={<EyeIcon className="w-4 h-4" />} />
          {item.status === 'Checked In' && (
            <Button size="sm" variant="primary" onClick={() => handleCheckOut(item)} leftIcon={<LogOutIcon className="w-4 h-4" />}>Check Out</Button>
          )}
        </div>
      )
    }
  ];

  const stats = {
    total: visitors.length,
    checkedIn: visitors.filter(v => v.status === 'Checked In').length,
    checkedOut: visitors.filter(v => v.status === 'Checked Out').length,
    today: visitors.filter(v => new Date(v.check_in_time).toDateString() === new Date().toDateString()).length
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary-50 border-primary-200">
          <div className="text-2xl font-bold text-primary-700">{stats.total}</div>
          <div className="text-sm text-primary-600">Total Visitors</div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="text-2xl font-bold text-green-700">{stats.checkedIn}</div>
          <div className="text-sm text-green-600">Currently In</div>
        </Card>
        <Card className="bg-surface-muted border-surface-border">
          <div className="text-2xl font-bold text-surface-foreground">{stats.checkedOut}</div>
          <div className="text-sm text-surface-muted-fg">Checked Out</div>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <div className="text-2xl font-bold text-purple-700">{stats.today}</div>
          <div className="text-sm text-purple-600">Today</div>
        </Card>
      </div>

      <Card
        title={t('visitors.title')}
        info={t('visitors.description')}
        actions={
          <Button onClick={openModal} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('visitors.checkIn')}
          </Button>
        }
      >
        <DataGrid
          data={visitors}
          columns={columns}
          sortable={true}
          filterable={true}
          loading={loading}
          emptyState={
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-surface-muted-fg mx-auto mb-4" />
              <p className="text-surface-muted-fg">No visitor logs found.</p>
            </div>
          }
        />
      </Card>

      {selectedVisitor && (
        <Modal
          isOpen={!!selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
          title="Visitor Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-foreground">Name</label>
                <p className="mt-1">{selectedVisitor.visitor_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Type</label>
                <div className="mt-1"><Badge variant="neutral">{selectedVisitor.visitor_type}</Badge></div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Phone</label>
                <p className="mt-1">{selectedVisitor.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Email</label>
                <p className="mt-1">{selectedVisitor.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">ID Type</label>
                <p className="mt-1">{selectedVisitor.id_type || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">ID Number</label>
                <p className="mt-1">{selectedVisitor.id_number || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Status</label>
                <div className="mt-1">{getStatusBadge(selectedVisitor.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-foreground">Person to Meet</label>
                <p className="mt-1">{selectedVisitor.person_to_meet || '-'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-surface-foreground">Purpose</label>
              <p className="mt-1">{selectedVisitor.purpose}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-surface-foreground">Check In</label>
                <p className="mt-1">{new Date(selectedVisitor.check_in_time).toLocaleString()}</p>
              </div>
              {selectedVisitor.check_out_time && (
                <div>
                  <label className="text-sm font-medium text-surface-foreground">Check Out</label>
                  <p className="mt-1">{new Date(selectedVisitor.check_out_time).toLocaleString()}</p>
                </div>
              )}
            </div>

            {selectedVisitor.remarks && (
              <div>
                <label className="text-sm font-medium text-surface-foreground">Remarks</label>
                <p className="mt-1">{selectedVisitor.remarks}</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={t('visitors.checkIn')}
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit}>Check In Visitor</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Visitor Name"
            value={formData.visitor_name}
            onChange={(value) => handleInputChange('visitor_name', value)}
            required
          />
          <Select
            label="Visitor Type"
            value={formData.visitor_type}
            onChange={(value) => handleInputChange('visitor_type', value)}
            options={Object.values(VisitorType).map(t => ({ label: t, value: t }))}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              required
            />
            <Input
              label="Email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="ID Type"
              value={formData.id_type}
              onChange={(value) => handleInputChange('id_type', value)}
            />
            <Input
              label="ID Number"
              value={formData.id_number}
              onChange={(value) => handleInputChange('id_number', value)}
            />
          </div>
          <Textarea
            label="Purpose of Visit"
            value={formData.purpose}
            onChange={(value) => handleInputChange('purpose', value)}
            required
            rows={3}
          />
          <Input
            label="Person to Meet"
            value={formData.person_to_meet}
            onChange={(value) => handleInputChange('person_to_meet', value)}
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

export default VisitorsManagementPage;

export const VisitorsManagementContent = VisitorsManagementPage;
