import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { PlusIcon, XMarkIcon, CheckCircleIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData';

const BulkStreamCreationPage: React.FC = () => {
  const { classes = [] } = useAppData();
  const [selectedClassId, setSelectedClassId] = useState('');
  const [streamNames, setStreamNames] = useState<string[]>(['']);
  const [createdStreams, setCreatedStreams] = useState<string[]>([]);

  const handleAddStreamField = () => {
    setStreamNames(prev => [...prev, '']);
  };

  const handleRemoveStream = (index: number) => {
    setStreamNames(prev => prev.filter((_, i) => i !== index));
  };

  const handleStreamNameChange = (index: number, value: string) => {
    setStreamNames(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleCreateAll = () => {
    const validStreams = streamNames.filter(name => name.trim().length > 0);
    if (!selectedClassId || validStreams.length === 0) return;

    // Simulate creation
    setCreatedStreams(validStreams);
    setStreamNames(['']);
    setSelectedClassId('');

    setTimeout(() => {
      setCreatedStreams([]);
    }, 5000);
  };

  const selectedClass = classes.find((c: any) => c.id === selectedClassId || c.name === selectedClassId);

  return (
    <div className="space-y-6">
      <Card
        title="Bulk Stream Creation"
        description="Add multiple streams to a class at once"
        actions={
          <Button onClick={handleAddStreamField} leftIcon={<PlusIcon className="w-5 h-5" />}>
            Add Stream Field
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Class Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">-- Select a class --</option>
              {classes.map((c: any) => (
                <option key={c.id || c.name} value={c.id || c.name}>
                  {c.name || c.class_name || ''}
                </option>
              ))}
              <option value="form1">Form 1</option>
              <option value="form2">Form 2</option>
              <option value="form3">Form 3</option>
              <option value="form4">Form 4</option>
            </select>
          </div>

          {/* Stream Name Inputs */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Stream Names</label>
            {streamNames.map((name, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Stream ${index + 1} name (e.g., East, West, North)`}
                  value={name}
                  onChange={(e) => handleStreamNameChange(index, e.target.value)}
                  className="flex-1"
                />
                {streamNames.length > 1 && (
                  <button
                    onClick={() => handleRemoveStream(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {selectedClassId
                    ? `Will create ${streamNames.filter(n => n.trim()).length} stream(s) for "${selectedClass?.name || selectedClassId}"`
                    : 'Select a class and enter stream names above'}
                </p>
              </div>
              <Badge variant="info">
                {streamNames.filter(n => n.trim()).length} streams
              </Badge>
            </div>
          </div>

          {/* Create Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleCreateAll}
              disabled={!selectedClassId || streamNames.filter(n => n.trim()).length === 0}
              leftIcon={<PlusIcon className="w-5 h-5" />}
            >
              Create {streamNames.filter(n => n.trim()).length} Stream(s)
            </Button>
          </div>
        </div>
      </Card>

      {/* Success Message */}
      {createdStreams.length > 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-green-800">Streams Created Successfully!</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {createdStreams.map((name, i) => (
                  <Badge key={i} variant="success">{name}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BulkStreamCreationPage;
export const BulkStreamCreationContent = BulkStreamCreationPage;
