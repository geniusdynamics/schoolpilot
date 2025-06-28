
import React, { useState, useMemo, useEffect } from 'react';
import { MealConsumptionLog, Menu, Student, MealType, StudentStatus } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import { ClipboardDocumentListIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';

const MealConsumptionLogPage: React.FC = () => {
  const { 
    mealConsumptionLogs, 
    menus,
    students,
    loading, 
    addMealConsumptionLog 
  } = useAppData();
  
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMealType, setSelectedMealType] = useState<MealType | undefined>(MealType.LUNCH);
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  
  const [logging, setLogging] = useState(false);
  const [logMessage, setLogMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const activeStudents = useMemo(() => students.filter(s => s.status === StudentStatus.ACTIVE), [students]);

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
      const result = await addMealConsumptionLog({
        student_id: selectedStudentId,
        menu_id: selectedMenu.id,
        // consumption_time is set by the mock fn
        // charged_amount is determined by mock fn
      });
      // The actual result might have more details (e.g., amount charged)
      setLogMessage({type: 'success', text: `Meal logged successfully for ${students.find(s=>s.id === selectedStudentId)?.first_name}.` + (result.charged_amount ? ` Amount charged: KES ${result.charged_amount.toFixed(2)}.` : ' Included in meal plan.') });
      setSelectedStudentId(undefined); // Clear student selection after logging
    } catch (error: any) {
      setLogMessage({type: 'error', text: error.message || "Failed to log meal consumption."});
    } finally {
      setLogging(false);
    }
  };

  const recentLogs = useMemo(() => 
    [...mealConsumptionLogs]
      .sort((a, b) => new Date(b.consumption_time).getTime() - new Date(a.consumption_time).getTime())
      .slice(0, 20), // Show latest 20 logs
  [mealConsumptionLogs]);


  const logColumns = [
    { header: 'Student Name', accessor: 'student_name' as keyof MealConsumptionLog },
    { header: 'Menu', accessor: (item: MealConsumptionLog) => `${item.menu_description} (${item.menu_meal_type} - ${new Date(item.menu_date!).toLocaleDateString()})` },
    { header: 'Time', accessor: 'consumption_time' as keyof MealConsumptionLog, render: (item: MealConsumptionLog) => new Date(item.consumption_time).toLocaleTimeString() },
    { header: 'Amount Charged (KES)', accessor: 'charged_amount' as keyof MealConsumptionLog, render: (item: MealConsumptionLog) => item.charged_amount?.toFixed(2) || '0.00 (Plan)' },
  ];

  if ((loading.mealConsumptionLogs || loading.menus || loading.students)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" /> <span className="ml-2">Loading Meal Consumption Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Log Meal Consumption">
        <p className="text-sm text-gray-600 mb-4">
          Select a student and the meal they are consuming. The system will check their meal plan or deduct from their wallet if applicable.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-md bg-gray-50">
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
            <Select 
                name="student_id" 
                label="Select Student" 
                value={selectedStudentId || ''} 
                onChange={e => setSelectedStudentId(e.target.value || undefined)}
                required
                disabled={!selectedMenu}
            >
                <option value="">-- Select Student --</option>
                {activeStudents.map(student => <option key={student.id} value={student.id}>{student.first_name} {student.last_name} ({student.admission_no})</option>)}
            </Select>
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
        <Table columns={logColumns} data={recentLogs} isLoading={loading.mealConsumptionLogs} emptyStateMessage="No meal consumption logs recorded yet."/>
      </Card>
    </div>
  );
};

export default MealConsumptionLogPage;
