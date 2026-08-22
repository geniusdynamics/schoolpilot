import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { PlusIcon } from '@/components/ui/icons';
import Table from '@/components/ui/Table';

interface Application {
  id: string;
  name: string;
  type: string;
  status: string;
  description?: string;
  createdAt: string;
}

const ApplicationsPage: React.FC = () => {

  const [applications] = useState<Application[]>([
    { id: '1', name: 'Student Portal', type: 'Web', status: 'active', description: 'Main student portal application', createdAt: '2024-01-15' },
    { id: '2', name: 'Teacher Dashboard', type: 'Web', status: 'active', description: 'Teacher management dashboard', createdAt: '2024-01-20' },
    { id: '3', name: 'Finance Module', type: 'Web', status: 'pending', description: 'Finance and billing module', createdAt: '2024-02-01' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const columns = [
    { header: 'ID', key: 'id' as keyof Application },
    { header: 'Name', key: 'name' as keyof Application },
    { header: 'Type', key: 'type' as keyof Application },
    { header: 'Status', key: 'status' as keyof Application },
    { header: 'Description', key: 'description' as keyof Application },
    { header: 'Created', key: 'createdAt' as keyof Application },
  ];
  
  return (
    <div className="p-6">
      <Card 
        title="Applications"
        actions={
          <Button onClick={() => setIsModalOpen(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Application
          </Button>
        }
      >
        <Table 
          columns={columns} 
          data={applications} 
          emptyStateMessage="No applications found"
        />
      </Card>
    </div>
  );
};

export default ApplicationsPage;
