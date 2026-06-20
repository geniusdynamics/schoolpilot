import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Badge from '@/components/ui/Badge';
import { DataGrid, DataGridColumn } from '@/components/ui/data';
import { PaperAirplaneIcon, UsersIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';

interface SMSRecipientCategory {
  id: string;
  name: string;
  type: 'Class' | 'Stream' | 'All Parents' | 'All Staff' | 'All Students' | 'Custom';
  recipientCount: number;
}

const categoryOptions = [
  { label: 'All Parents', value: 'all-parents' },
  { label: 'All Staff', value: 'all-staff' },
  { label: 'All Students', value: 'all-students' },
  { label: 'Specific Class', value: 'class' },
  { label: 'Specific Stream', value: 'stream' },
  { label: 'Custom Selection', value: 'custom' },
];

const SMSCategoriesPage: React.FC = () => {
  const { classes = [], students = [] } = useAppData();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<Array<{ category: string; count: number; time: string }>>([]);

  const getRecipientCount = (): number => {
    switch (selectedCategory) {
      case 'all-parents': return 245;
      case 'all-staff': return 48;
      case 'all-students': return students.length || 520;
      case 'class': return 45;
      case 'stream': return 25;
      case 'custom': return 12;
      default: return 0;
    }
  };

  const handleSend = () => {
    if (!selectedCategory || !messageText) return;
    setIsSending(true);
    setTimeout(() => {
      const catLabel = categoryOptions.find(o => o.value === selectedCategory)?.label || selectedCategory;
      setSentMessages(prev => [{
        category: catLabel,
        count: getRecipientCount(),
        time: new Date().toLocaleString(),
      }, ...prev]);
      setMessageText('');
      setIsSending(false);
    }, 1500);
  };

  const messageColumns: DataGridColumn<{ category: string; count: number; time: string }>[] = [
    { key: 'category', header: 'Category', width: 150, sortable: true },
    { key: 'count', header: 'Recipients', width: 100, sortable: true },
    { key: 'time', header: 'Sent At', width: 180, sortable: true },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Send SMS by Category */}
      <Card title="Send SMS by Category" description="Quickly send SMS messages to predefined recipient groups">
        <div className="space-y-4">
          <Select
            label="Recipient Category"
            placeholder="Select recipient group..."
            value={selectedCategory}
            onChange={(value) => setSelectedCategory(value)}
            options={categoryOptions}
          />

          {selectedCategory === 'class' && (
            <Select
              label="Select Class"
              placeholder="Choose a class..."
              value={selectedClass}
              onChange={(value) => setSelectedClass(value)}
              options={classes.map((c: any) => ({ label: c.name || c.class_name || '', value: c.id || '' }))}
            />
          )}

          {selectedCategory === 'stream' && (
            <Select
              label="Select Stream"
              placeholder="Choose a stream..."
              value=""
              onChange={() => {}}
              options={[
                { label: 'Form 1 - East', value: '1e' },
                { label: 'Form 1 - West', value: '1w' },
                { label: 'Form 2 - East', value: '2e' },
                { label: 'Form 2 - West', value: '2w' },
                { label: 'Form 3 - East', value: '3e' },
                { label: 'Form 3 - West', value: '3w' },
              ]}
            />
          )}

          {selectedCategory && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Will send to <strong>{getRecipientCount()}</strong> recipients
                </span>
              </div>
              <Badge variant="info">{getRecipientCount()} contacts</Badge>
            </div>
          )}

          <Textarea
            label="Message"
            placeholder="Type your SMS message here... (max 160 characters per SMS)"
            value={messageText}
            onChange={(value) => setMessageText(value)}
            rows={4}
            helperText={`${messageText.length} / 160 characters`}
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={!selectedCategory || !messageText || isSending}
              leftIcon={<PaperAirplaneIcon className="w-5 h-5" />}
            >
              {isSending ? 'Sending...' : `Send to ${getRecipientCount()} Recipients`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Sent Messages History */}
      {sentMessages.length > 0 && (
        <Card title="Recent Messages" description="Recently sent SMS messages">
          <DataGrid
            data={sentMessages}
            columns={messageColumns}
            sortable={true}
            loading={false}
          />
        </Card>
      )}
    </div>
  );
};

export default SMSCategoriesPage;
export const SMSCategoriesContent = SMSCategoriesPage;
