import React, { useState, useMemo } from 'react';

import Card from '@/components/ui/Card';
import { DataGrid, DataGridColumn } from '@/components/ui';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import { ClipboardDocumentListIcon } from '@/components/ui/icons';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { asId } from '@/domain/ids';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useNutrition } from '../hooks/useNutrition';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useCanonicalLearners } from '../data/useCanonicalLearners';
import Spinner from '@/components/ui/Spinner';
import { MealType } from '@/core/types';
import type { MealConsumptionLog } from '@/core/types';

export const MealConsumptionLogPageContent: React.FC = () => {
  // The learner a meal is logged for is canonical; the menu and the log are not modelled yet.
  const { learners, learnersLookup } = useCanonicalLearners();
  // GAP(P1-E05): the canonical registry models no menu and no meal consumption log, so
  // the meal log keeps reading the legacy collections.
  const { menus, addMealConsumptionLog } = useNutrition();
  const logsCollection = useDatabaseCollection<MealConsumptionLog>('meal_consumption_logs');
  const mealConsumptionLogs = logsCollection.data;
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<MealType | undefined>(MealType.LUNCH);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  
  const [logging, setLogging] = useState(false);
  const [logMessage, setLogMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const selectedMenu = useMemo(() => {
    if (!selectedDate || !selectedMealType) return null;
    return menus.find(m => m.menu_date === selectedDate && m.meal_type === selectedMealType);
  }, [menus, selectedDate, selectedMealType]);

  const handleLogConsumption = async () => {
    if (!selectedMenu || !selectedStudentId) {
      setLogMessage({type: 'error', text: "Please select a student and ensure a menu is available for the selected date and meal type."});
      return;
    }
    setLogging(true);
    setLogMessage(null);
    try {
      // The addMealConsumptionLog mock function needs to handle the logic for checking plans/wallet
      const student = learners.find(s => s.id === selectedStudentId);
      // The module hook stamps consumption_time and works out the charge from the meal plan / wallet.
      const result = await addMealConsumptionLog({
        student_id: selectedStudentId,
        menu_id: String(selectedMenu.id),
        student_name: student ? [student.first_name, student.last_name].filter(Boolean).join(' ') : undefined,
      } as Omit<MealConsumptionLog, 'id'>);
      await logsCollection.refresh();
      const charged = (result as MealConsumptionLog | null)?.charged_amount;
      setLogMessage({type: 'success', text: `Meal logged successfully for ${student?.first_name}.` + (charged ? ` Amount charged: KES ${charged.toFixed(2)}.` : ' Included in meal plan.') });
      setSelectedStudentId(undefined); // Clear student selection after logging
    } catch (error: any) {
      setLogMessage({type: 'error', text: error.message || "Failed to log meal consumption."});
    } finally {
      setLogging(false);
    }
  };

  const recentLogs = useMemo(() => 
    [...(mealConsumptionLogs || [])]
      .sort((a, b) => new Date(b.consumption_time).getTime() - new Date(a.consumption_time).getTime())
      .slice(0, 20), // Show latest 20 logs
  [mealConsumptionLogs]);

  const logColumns: DataGridColumn<MealConsumptionLog>[] = [
    { 
      key: 'student_name', 
      header: 'Student Name', 
      sortable: true, 
      filterable: true, 
      width: 200
    },
    { 
      key: 'menu_description', 
      header: 'Menu', 
      sortable: true, 
      filterable: true, 
      width: 300,
      render: (value, row) => `${row.menu_description} (${row.menu_meal_type} - ${new Date(row.menu_date!).toLocaleDateString()})`
    },
    { 
      key: 'consumption_time', 
      header: 'Time', 
      sortable: true, 
      filterable: true, 
      width: 120,
      render: (value, row) => new Date(row.consumption_time).toLocaleTimeString()
    },
    { 
      key: 'charged_amount', 
      header: 'Amount Charged (KES)', 
      sortable: true, 
      filterable: true, 
      width: 150,
      render: (value, row) => row.charged_amount?.toFixed(2) || '0.00 (Plan)'
    },
  ];

  return (
    <div className="space-y-3">
      <Card title="Log Meal Consumption" info="Select a student and the meal they are consuming. The system will check their meal plan or deduct from their wallet if applicable.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-md bg-surface-muted">
            <Input 
                name="consumption_date" 
                label="Consumption Date" 
                type="date"
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)} 
                required 
            />
            <Select 
                name="meal_type" 
                label="Meal Type" 
                value={selectedMealType || ''} 
                onChange={e => setSelectedMealType(e.target.value as MealType || undefined)}
                required
            >
                <option value="">Select Meal Type</option>
                {Object.values(MealType).map((type) => (
                    <option key={type} value={type}>{type}</option>
                ))}
            </Select>
            <EntityPicker
              value={selectedStudentId ? asId<'learner'>(selectedStudentId) : null}
              onChange={(id) => setSelectedStudentId(id ?? undefined)}
              lookup={learnersLookup}
              label="Select Student"
              placeholder="-- Select Student --"
              disabled={!selectedMenu}
              data-testid="meal-log-student-picker"
            />
        </div>
        
        {selectedMenu ? (
            <p className="text-sm text-center text-indigo-600 mb-4 p-2 bg-indigo-50 rounded-md">
                Selected Menu: <strong>{selectedMenu.description}</strong> for {selectedMenu.meal_type} on {new Date(selectedMenu.menu_date).toLocaleDateString()}.
            </p>
        ) : (
            <p className="text-sm text-center text-red-600 mb-4 p-2 bg-red-50 rounded-md">No menu found for the selected date and meal type. Please define it first.</p>
        )}

        <div className="text-center">
             <Button 
                onClick={handleLogConsumption} 
                disabled={logging || !selectedMenu || !selectedStudentId}
                leftIcon={logging ? <Spinner size="sm"/> : <ClipboardDocumentListIcon className="w-5 h-5"/>}
            >
                {logging ? 'Logging...' : 'Log Consumption'}
            </Button>
        </div>

        {logMessage && (
            <div className={`mt-4 p-3 rounded-md text-sm text-center ${logMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {logMessage.text}
            </div>
        )}
      </Card>

      <Card title="Recent Meal Consumption Logs">
        <DataGrid 
          columns={logColumns} 
          data={recentLogs || []} 
          isLoading={logsCollection.loading}
          sortable
          filterable
          emptyState={{
            icon: <ClipboardDocumentListIcon className="w-12 h-12 text-surface-muted-fg" />,
            title: "No meal consumption logs",
            description: "No meal consumption logs recorded yet. Start logging student meals to track consumption.",
            action: undefined
          }}
        />
      </Card>
    </div>
  );
};
const MealConsumptionLogPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <MealConsumptionLogPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default MealConsumptionLogPage;
