import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
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
import DialogForm from '@/components/ui/forms/DialogForm';
import FormSection from '@/components/ui/forms/FormSection';
import FormField from '@/components/ui/forms/FormField';
import FormActions from '@/components/ui/forms/FormActions';

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

  const handleSubmit = async () => {
    if (!formData.visitor_name || !formData.phone || !formData.purpose) {
      alert('Please fill in all required fields');
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
      console.error('Error checking in visitor:', error);
      alert('Failed to check in visitor');
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
      console.error('Error checking out visitor:', error);
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
      console.error('Error loading visitors:', error);
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
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
          <div className="text-sm text-blue-600">Total Visitors</div>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <div className="text-2xl font-bold text-green-700">{stats.checkedIn}</div>
          <div className="text-sm text-green-600">Currently In</div>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <div className="text-2xl font-bold text-gray-700">{stats.checkedOut}</div>
          <div className="text-sm text-gray-600">Checked Out</div>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <div className="text-2xl font-bold text-purple-700">{stats.today}</div>
          <div className="text-sm text-purple-600">Today</div>
        </Card>
      </div>

      <Card
        title={t('visitors.title')}
        description={t('visitors.description')}
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
              <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No visitor logs found.</p>
            </div>
          }
        />
      </Card>

      {selectedVisitor && (
        <DialogForm
          isOpen={!!selectedVisitor}
          onClose={() => setSelectedVisitor(null)}
          title="Visitor Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1">{selectedVisitor.visitor_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <div className="mt-1"><Badge variant="neutral">{selectedVisitor.visitor_type}</Badge></div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1">{selectedVisitor.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1">{selectedVisitor.email || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">ID Type</label>
                <p className="mt-1">{selectedVisitor.id_type || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">ID Number</label>
                <p className="mt-1">{selectedVisitor.id_number || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedVisitor.status)}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Person to Meet</label>
                <p className="mt-1">{selectedVisitor.person_to_meet || '-'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Purpose</label>
              <p className="mt-1">{selectedVisitor.purpose}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Check In</label>
                <p className="mt-1">{new Date(selectedVisitor.check_in_time).toLocaleString()}</p>
              </div>
              {selectedVisitor.check_out_time && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Check Out</label>
                  <p className="mt-1">{new Date(selectedVisitor.check_out_time).toLocaleString()}</p>
                </div>
              )}
            </div>

            {selectedVisitor.remarks && (
              <div>
                <label className="text-sm font-medium text-gray-700">Remarks</label>
                <p className="mt-1">{selectedVisitor.remarks}</p>
              </div>
            )}
          </div>
        </DialogForm>
      )}

      <DialogForm
        isOpen={isModalOpen}
        onClose={closeModal}
        title={t('visitors.checkIn')}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection title="Visitor Information">
          <FormField label="Visitor Name" required>
            <Input
              value={formData.visitor_name}
              onChange={(value) => handleInputChange('visitor_name', value)}
              required
            />
          </FormField>
          <FormField label="Visitor Type" required>
            <Select
              value={formData.visitor_type}
              onChange={(value) => handleInputChange('visitor_type', value)}
              options={Object.values(VisitorType).map(t => ({ label: t, value: t }))}
              required
            />
          </FormField>
        </FormSection>

        <FormSection title="Contact Details" columns={2}>
          <FormField label="Phone" required>
            <Input
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
              required
            />
          </FormField>
          <FormField label="Email">
            <Input
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
            />
          </FormField>
          <FormField label="ID Type">
            <Input
              value={formData.id_type}
              onChange={(value) => handleInputChange('id_type', value)}
            />
          </FormField>
          <FormField label="ID Number">
            <Input
              value={formData.id_number}
              onChange={(value) => handleInputChange('id_number', value)}
            />
          </FormField>
        </FormSection>

        <FormSection title="Visit Details">
          <FormField label="Purpose of Visit" required>
            <Textarea
              value={formData.purpose}
              onChange={(value) => handleInputChange('purpose', value)}
              required
              rows={3}
            />
          </FormField>
          <FormField label="Person to Meet">
            <Input
              value={formData.person_to_meet}
              onChange={(value) => handleInputChange('person_to_meet', value)}
            />
          </FormField>
          <FormField label="Remarks">
            <Textarea
              value={formData.remarks}
              onChange={(value) => handleInputChange('remarks', value)}
              rows={2}
            />
          </FormField>
        </FormSection>

        <FormActions>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button type="submit">Check In Visitor</Button>
        </FormActions>
      </DialogForm>
    </div>
  );
};

export default VisitorsManagementPage;
