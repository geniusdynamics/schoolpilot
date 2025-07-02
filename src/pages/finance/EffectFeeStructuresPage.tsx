import React, { useState, useMemo } from 'react';
import Card from '../../components/ui/Card';
import { CogIcon, CheckCircleIcon } from '../../components/ui/icons';
import { useAppData } from '@/contexts/AppDataContext';
import Spinner from '../../components/ui/Spinner';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { FinFeeTemplateType as FeeTemplate, SchoolPeriod, StudentCategory, ClassStream, FinStudentInvoiceType as StudentInvoice } from '../../types';
import { useTranslation } from 'react-i18next';

const EffectFeeStructuresPage: React.FC = () => {
  const { 
    feeTemplates, 
    schoolPeriods,
    studentCategories,
    classStreams,
    loading,
    generateStudentInvoices
  } = useAppData();

  const [selectedFeeTemplateId, setSelectedFeeTemplateId] = useState<number | undefined>();
  const [selectedSchoolPeriodId, setSelectedSchoolPeriodId] = useState<number | undefined>();
  const [selectedStudentCategoryId, setSelectedStudentCategoryId] = useState<number | undefined>();
  const [selectedClassStreamId, setSelectedClassStreamId] = useState<number | undefined>();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<{ count: number; totalBilled: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const activeSchoolPeriods = useMemo(() => schoolPeriods.filter(sp => sp.is_active), [schoolPeriods]);

  const handleGenerateInvoices = async () => {
    if (!selectedFeeTemplateId || !selectedSchoolPeriodId) {
      alert("Please select a Fee Template and a School Period.");
      return;
    }
    if (!selectedStudentCategoryId && !selectedClassStreamId) {
        alert("Please select either a Student Category or a Class/Stream to target students.");
        return;
    }

    setIsGenerating(true);
    setGenerationResult(null);
    setError(null);
    try {
      const studentCriteria = {
        categoryId: selectedStudentCategoryId,
        classStreamId: selectedClassStreamId,
      };
      const generatedInvoices = await generateStudentInvoices(selectedFeeTemplateId, selectedSchoolPeriodId, studentCriteria);
      const totalBilled = generatedInvoices.reduce((sum, inv) => sum + inv.total_amount_billed, 0);
      setGenerationResult({ count: generatedInvoices.length, totalBilled });
    } catch (err) {
      setError("Failed to generate invoices. Please check console for details.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };


  if (loading.all || loading.feeTemplates || loading.schoolPeriods || loading.studentCategories || loading.classStreams) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
        <span className="ml-2">Loading Fee Structures Data...</span>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <Card title="Effect Fee Structures (Generate Student Invoices)">
        <div className="p-6 space-y-6">
            <p className="text-sm text-gray-600">
                Select a fee template, school period, and student criteria to generate invoices. 
                Ensure the fee template has items and the school period is correctly set up.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select 
                    label="Select Fee Template" 
                    value={selectedFeeTemplateId || ''} 
                    onChange={e => setSelectedFeeTemplateId(Number(e.target.value) || undefined)}
                    required
                >
                    <option value="">-- Choose Fee Template --</option>
                    {feeTemplates.map(ft => <option key={ft.id} value={ft.id}>{ft.name} ({ft.school_period_name})</option>)}
                </Select>
                <Select 
                    label="Select School Period for Invoicing" 
                    value={selectedSchoolPeriodId || ''} 
                    onChange={e => setSelectedSchoolPeriodId(Number(e.target.value) || undefined)}
                    required
                >
                    <option value="">-- Choose School Period --</option>
                    {activeSchoolPeriods.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                </Select>
                <Select 
                    label="Target Student Category (Optional)" 
                    value={selectedStudentCategoryId || ''} 
                    onChange={e => setSelectedStudentCategoryId(Number(e.target.value) || undefined)}
                >
                    <option value="">All Categories / Use Class Filter</option>
                    {studentCategories.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                </Select>
                <Select 
                    label="Target Class/Stream (Optional)" 
                    value={selectedClassStreamId || ''} 
                    onChange={e => setSelectedClassStreamId(Number(e.target.value) || undefined)}
                >
                    <option value="">All Class/Streams / Use Category Filter</option>
                    {classStreams.map(cs => <option key={cs.id} value={cs.id}>{cs.class_name} - {cs.name}</option>)}
                </Select>
            </div>
            <div className="mt-6 text-center">
                <Button 
                    onClick={handleGenerateInvoices} 
                    disabled={isGenerating || !selectedFeeTemplateId || !selectedSchoolPeriodId || (!selectedStudentCategoryId && !selectedClassStreamId)}
                    leftIcon={isGenerating ? <Spinner size="sm"/> : <CogIcon className="w-5 h-5"/>}
                >
                    {isGenerating ? 'Generating Invoices...' : 'Generate Student Invoices'}
                </Button>
            </div>

            {generationResult && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md text-center">
                    <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2"/>
                    <h3 className="text-lg font-semibold text-green-700">Invoices Generated Successfully!</h3>
                    <p className="text-green-600">{generationResult.count} invoice(s) created.</p>
                    <p className="text-green-600">Total Amount Billed: KES {generationResult.totalBilled.toFixed(2)}</p>
                </div>
            )}
            {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-center">
                    <p className="text-red-600">{error}</p>
                </div>
            )}
        </div>
      </Card>
    </div>
  );
};

export default EffectFeeStructuresPage;
