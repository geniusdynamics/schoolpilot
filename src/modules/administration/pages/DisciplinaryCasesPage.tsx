import React, { useState, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { PlusIcon, EyeIcon, EditIcon, CheckCircleIcon } from '@/components/ui/icons';
import { databaseService } from '@/services/database/databaseService';
import { useTranslation } from 'react-i18next';
import { DisciplinaryCategory, DisciplinarySeverity, DisciplinaryStatus, DisciplinaryAction } from '../data/types';
import type { DisciplinaryCase } from '../data/types';

const DisciplinaryCasesPage: React.FC = () => {
  const { t } = useTranslation('administration');
  const [cases, setCases] = useState<DisciplinaryCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<DisciplinaryCase | null>(null);
  const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(null);
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    admission_number: '',
    class_name: '',
    category: '' as DisciplinaryCategory,
    severity: '' as DisciplinarySeverity,
    title: '',
    description: '',
    incident_date: '',
    incident_time: '',
    incident_location: '',
    witnesses: '',
    follow_up_required: false,
    parent_notified: false
  });

  const severityColors: Record<DisciplinarySeverity, string> = {
    Minor: 'bg-green-100 text-green-800',
    Moderate: 'bg-yellow-100 text-yellow-800',
    Serious: 'bg-orange-100 text-orange-800',
    Critical: 'bg-red-100 text-red-800'
  };

  const statusColors: Record<DisciplinaryStatus, string> = {
    Reported: 'bg-gray-100 text-gray-800',
    'Under Investigation': 'bg-blue-100 text-blue-800',
    'Pending Review': 'bg-yellow-100 text-yellow-800',
    Resolved: 'bg-green-100 text-green-800',
    Dismissed: 'bg-purple-100 text-purple-800',
    Appealed: 'bg-orange-100 text-orange-800'
  };

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (caseItem?: DisciplinaryCase) => {
    if (caseItem) {
      setEditingCase(caseItem);
      setFormData({
        student_id: caseItem.student_id,
        student_name: caseItem.student_name || '',
        admission_number: caseItem.admission_number || '',
        class_name: caseItem.class_name || '',
        category: caseItem.category,
        severity: caseItem.severity,
        title: caseItem.title,
        description: caseItem.description,
        incident_date: caseItem.incident_date,
        incident_time: caseItem.incident_time || '',
        incident_location: caseItem.incident_location || '',
        witnesses: caseItem.witnesses || '',
        follow_up_required: caseItem.follow_up_required,
        parent_notified: caseItem.parent_notified
      });
    } else {
      setEditingCase(null);
      setFormData({
        student_id: '',
        student_name: '',
        admission_number: '',
        class_name: '',
        category: 'Behavior' as DisciplinaryCategory,
        severity: 'Minor' as DisciplinarySeverity,
        title: '',
        description: '',
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: '',
        incident_location: '',
        witnesses: '',
        follow_up_required: false,
        parent_notified: false
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCase(null);
  };

  const handleSubmit = async () => {
    if (!formData.student_id || !formData.title || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const db = await databaseService.getDatabase();
      
      if (editingCase) {
        await db.disciplinary_cases?.update(editingCase.id, {
          ...editingCase,
          ...formData,
          updated_at: new Date().toISOString()
        });
      } else {
        const newCase: DisciplinaryCase = {
          id: databaseService.generateId(),
          case_number: `DIS-${Date.now()}`,
          ...formData,
          status: 'Reported' as DisciplinaryStatus,
          reported_by: 'current-user',
          follow_up_required: formData.follow_up_required,
          parent_notified: formData.parent_notified,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await db.disciplinary_cases?.insert(newCase);
      }

      closeModal();
      loadData();
    } catch (error) {
      console.error('Error saving disciplinary case:', error);
      alert('Failed to save case');
    }
  };

  const handleResolve = async (caseItem: DisciplinaryCase, action: DisciplinaryAction, notes: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.disciplinary_cases?.update(caseItem.id, {
        ...caseItem,
        status: 'Resolved',
        action_taken: action,
        action_details: notes,
        action_date: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
        resolution_notes: notes,
        updated_at: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      console.error('Error resolving case:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const db = await databaseService.getDatabase();
      const result = await db.disciplinary_cases?.find({
        sort: [{ created_at: 'desc' }]
      });
      setCases((result?.docs || []) as DisciplinaryCase[]);
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const columns: DataGridColumn<DisciplinaryCase>[] = [
    { key: 'case_number', header: 'Case #', width: 110, sortable: true, filterable: true },
    { key: 'student_name', header: 'Student', width: 160, sortable: true, filterable: true },
    { key: 'admission_number', header: 'Adm No', width: 100, sortable: true },
    {
      key: 'category',
      header: 'Category',
      width: 130,
      sortable: true,
      filterable: true,
      render: (value) => <Badge variant="neutral">{value}</Badge>
    },
    {
      key: 'severity',
      header: 'Severity',
      width: 100,
      sortable: true,
      filterable: true,
      render: (value, item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${severityColors[item.severity]}`}>
          {item.severity}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      sortable: true,
      filterable: true,
      render: (value, item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[item.status]}`}>
          {item.status}
        </span>
      )
    },
    {
      key: 'incident_date',
      header: 'Incident Date',
      width: 110,
      sortable: true
    },
    {
      key: 'parent_notified',
      header: 'Parent Notified',
      width: 110,
      render: (value) => value ? <Badge variant="success">Yes</Badge> : <Badge variant="warning">No</Badge>
    },
    {
      key: 'id',
      header: 'Actions',
      width: 140,
      sortable: false,
      render: (value, item) => (
        <div className="space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedCase(item)}
            leftIcon={<EyeIcon className="w-4 h-4" />}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openModal(item)}
            leftIcon={<EditIcon className="w-4 h-4" />}
          />
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Card
        title={t('disciplinary.title')}
        description={t('disciplinary.description')}
        actions={
          <Button onClick={() => openModal()} leftIcon={<PlusIcon className="w-5 h-5" />}>
            {t('disciplinary.newCase')}
          </Button>
        }
      >
        <DataGrid
          data={cases}
          columns={columns}
          sortable={true}
          filterable={true}
          loading={loading}
          emptyState={
            <div className="text-center py-8">
              <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No disciplinary cases found.</p>
            </div>
          }
        />
      </Card>

      {/* Case Details Modal */}
      {selectedCase && (
        <Modal
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          title={`Case Details: ${selectedCase.case_number}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Student</label>
                <p className="mt-1">{selectedCase.student_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Admission No</label>
                <p className="mt-1">{selectedCase.admission_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <div className="mt-1"><Badge variant="neutral">{selectedCase.category}</Badge></div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Severity</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${severityColors[selectedCase.severity]}`}>
                    {selectedCase.severity}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[selectedCase.status]}`}>
                    {selectedCase.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Incident Date</label>
                <p className="mt-1">{new Date(selectedCase.incident_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Title</label>
              <p className="mt-1 font-medium">{selectedCase.title}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1">{selectedCase.description}</p>
            </div>

            {selectedCase.action_taken && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Resolution</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Action:</span> {selectedCase.action_taken}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span> {selectedCase.action_date ? new Date(selectedCase.action_date).toLocaleDateString() : '-'}
                  </div>
                </div>
                {selectedCase.action_details && (
                  <p className="mt-2 text-sm">{selectedCase.action_details}</p>
                )}
              </div>
            )}

            {selectedCase.status !== 'Resolved' && selectedCase.status !== 'Dismissed' && (
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedCase(null)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    handleResolve(selectedCase, 'Verbal Warning', 'Case resolved with verbal warning');
                    setSelectedCase(null);
                  }}
                >
                  Resolve with Warning
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* New/Edit Case Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCase ? 'Edit Disciplinary Case' : 'New Disciplinary Case'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingCase ? 'Update Case' : 'Create Case'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <Select
            label="Category"
            value={formData.category}
            onChange={(value) => handleInputChange('category', value)}
            options={Object.values(DisciplinaryCategory).map(c => ({ label: c, value: c }))}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Severity"
              value={formData.severity}
              onChange={(value) => handleInputChange('severity', value)}
              options={Object.values(DisciplinarySeverity).map(s => ({ label: s, value: s }))}
              required
            />
            <Input
              label="Incident Date"
              type="date"
              value={formData.incident_date}
              onChange={(value) => handleInputChange('incident_date', value)}
              required
            />
          </div>

          <Input
            label="Title"
            value={formData.title}
            onChange={(value) => handleInputChange('title', value)}
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(value) => handleInputChange('description', value)}
            required
            rows={4}
          />

          <Input
            label="Incident Location"
            value={formData.incident_location}
            onChange={(value) => handleInputChange('incident_location', value)}
          />

          <Textarea
            label="Witnesses"
            value={formData.witnesses}
            onChange={(value) => handleInputChange('witnesses', value)}
            rows={2}
          />

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.parent_notified}
                onChange={(e) => handleInputChange('parent_notified', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Parent Notified</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.follow_up_required}
                onChange={(e) => handleInputChange('follow_up_required', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Follow-up Required</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DisciplinaryCasesPage;
