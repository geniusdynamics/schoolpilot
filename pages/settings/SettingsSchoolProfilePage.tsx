
import React, { useState, useEffect } from 'react';
import Card from '../../components/ui/Card';
import { IdentificationIcon } from '../../components/ui/icons';
import { useAppData } from '../../contexts/AppDataContext'; 
import { SchoolDetails } from '../../types';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';

const SettingsSchoolProfilePage: React.FC = () => {
  const { schoolDetails: initialSchoolDetails, updateSchoolDetails, loading } = useAppData();
  
  const [schoolDetails, setSchoolDetails] = useState<Partial<SchoolDetails>>(initialSchoolDetails || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialSchoolDetails) {
      setSchoolDetails(initialSchoolDetails);
    }
  }, [initialSchoolDetails]);

  const handleSchoolDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSchoolDetails({ ...schoolDetails, [e.target.name]: e.target.value });
  };

  const handleSaveSchoolDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSchoolDetails(schoolDetails);
      alert('School details saved successfully!');
    } catch (error) {
      console.error("Failed to save school details:", error);
      alert('Failed to save school details.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const pageIsLoading = loading.schoolDetails || (loading.all && !initialSchoolDetails);


  return (
    <div className="space-y-6">
      <Card title="School Profile Management">
        <div className="text-center py-8 border-b mb-6">
          <IdentificationIcon className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Update School Information</h2>
          <p className="text-gray-500">Manage the core details of your school.</p>
        </div>

        {pageIsLoading ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">Loading school details...</span></div>
        ) : (
        <form className="space-y-4" onSubmit={handleSaveSchoolDetails}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="School Name" name="name" value={schoolDetails.name || ''} onChange={handleSchoolDetailsChange} required />
            <Input label="School Code (System)" name="school_code" value={schoolDetails.school_code || ''} onChange={handleSchoolDetailsChange} placeholder="e.g. GHI001"/>
            <Input label="Email Address" name="email" type="email" value={schoolDetails.email || ''} onChange={handleSchoolDetailsChange} />
            <Input label="Telephone" name="telephone" value={schoolDetails.telephone || ''} onChange={handleSchoolDetailsChange} />
            <Input label="Postal Address" name="postal_address" value={schoolDetails.postal_address || ''} onChange={handleSchoolDetailsChange} />
            <Input label="Town/City" name="town" value={schoolDetails.town || ''} onChange={handleSchoolDetailsChange} />
            <Input label="Head Teacher Name" name="head_teacher_name" value={schoolDetails.head_teacher_name || ''} onChange={handleSchoolDetailsChange} />
            <Select label="School Gender" name="school_gender" value={schoolDetails.school_gender || ''} onChange={handleSchoolDetailsChange}>
              <option value="">Select Gender Type</option>
              <option value="Mixed">Mixed</option>
              <option value="Boys Only">Boys Only</option>
              <option value="Girls Only">Girls Only</option>
            </Select>
            <Select label="School Type" name="school_type" value={schoolDetails.school_type || ''} onChange={handleSchoolDetailsChange}>
               <option value="">Select Classification</option>
              <option value="Public">Public</option>
              <option value="Private">Private</option>
              <option value="International">International</option>
              <option value="Religious">Religious</option>
              <option value="Community">Community</option>
            </Select>
            <Input label="School Motto" name="motto" value={schoolDetails.motto || ''} onChange={handleSchoolDetailsChange} className="md:col-span-2"/>
            {/* logo_path would be a file upload in a real app */}
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isSaving || pageIsLoading}>
              {isSaving ? <Spinner size="sm" /> : 'Save School Details'}
            </Button>
          </div>
        </form>
        )}
      </Card>
    </div>
  );
};

export default SettingsSchoolProfilePage;