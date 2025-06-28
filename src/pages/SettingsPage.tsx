import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import { CogIcon } from '../components/ui/icons'; 
import { useAppData } from '@/contexts/AppDataContext'; 
import { SchoolDetails, User } from '../types'; 
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Select from '../components/ui/Select'; 
import Spinner from '../components/ui/Spinner';
import { Link } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const { 
    users, 
    loading: usersLoading, 
    schoolDetails: initialSchoolDetails, 
    updateSchoolDetails, 
    loading: appLoading, 
    isRxDBModeActive // Get the flag from context
  } = useAppData(); 
  
  const [schoolDetails, setSchoolDetails] = useState<Partial<SchoolDetails>>(initialSchoolDetails || {});
  const [isSavingSchoolDetails, setIsSavingSchoolDetails] = useState(false);

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
    setIsSavingSchoolDetails(true);
    try {
      await updateSchoolDetails(schoolDetails);
      alert('School details saved successfully!');
    } catch (error) {
      console.error("Failed to save school details:", error);
      alert('Failed to save school details.');
    } finally {
      setIsSavingSchoolDetails(false);
    }
  };
  
  const userColumns = [
    { header: 'Username', accessor: 'username' as keyof User },
    { header: 'Email', accessor: 'email' as keyof User },
    { header: 'User Type', accessor: 'user_type' as keyof User},
    { header: 'Role', accessor: 'role' as keyof User }, 
    { header: 'Status', accessor: 'is_active' as keyof User }
  ];

  const pageIsLoadingSchoolDetails = appLoading.schoolDetails || (appLoading.all && !initialSchoolDetails);


  return (
    <div className="space-y-6">
      <Card title="General Settings">
        <div className="text-center py-8">
          <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Application Settings</h2>
          <p className="text-gray-500">Manage school details, academic years, user roles, and system preferences.</p>
        </div>
      </Card>

      <Card title="School Profile">
        {pageIsLoadingSchoolDetails ? (
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
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isSavingSchoolDetails || pageIsLoadingSchoolDetails}>
              {isSavingSchoolDetails ? <Spinner size="sm" /> : 'Save School Details'}
            </Button>
          </div>
        </form>
        )}
      </Card>
      
      <Card title="User Accounts Overview">
        <p className="text-gray-600 mb-4">A brief overview of system users. Full user management is available under <Link to="/settings/users" className="text-indigo-600 hover:underline">User Management</Link>.</p>
        <Table columns={userColumns} data={users} isLoading={usersLoading.users} />
      </Card>

      <Card title="Academic Calendar Setup">
         <p className="text-gray-500">
            Define Financial Years, Academic Year Structures (e.g., 3-Term System), Academic Years, and School Periods (Terms/Semesters). 
            Detailed management available under the Administration module:
            <ul className="list-disc list-inside mt-2">
                <li><Link to="/administration/academic-structures" className="text-indigo-600 hover:underline">Academic Structures</Link></li>
                <li><Link to="/administration/academic-period-definitions" className="text-indigo-600 hover:underline">Academic Period Definitions</Link></li>
                <li><Link to="/administration/academic-years" className="text-indigo-600 hover:underline">Academic Years</Link></li>
                <li><Link to="/administration/school-periods" className="text-indigo-600 hover:underline">School Periods</Link></li>
            </ul>
          </p>
      </Card>

      <Card title="Roles & Permissions">
         <p className="text-gray-500">
            Define system roles (e.g., Teacher, Accountant, Admin) and manage user assignments. 
            Full management available at <Link to="/settings/users" className="text-indigo-600 hover:underline">User Management</Link> and <Link to="/settings/workflows" className="text-indigo-600 hover:underline">Workflows</Link> for approval processes.
          </p>
      </Card>

      {isRxDBModeActive && (
        <Card title="Database Management">
            <p className="text-gray-500">
                Manage RxDB data settings, import mock data for testing in production, or clear data.
                <br />
                <Link to="/settings/database" className="text-indigo-600 hover:underline">Go to Database Settings</Link>
            </p>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;