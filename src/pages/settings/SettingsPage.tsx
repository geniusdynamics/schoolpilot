// ABOUTME: This component renders the main settings page, offering navigation to various configuration sections.
// ABOUTME: It also includes a form for editing basic school profile details.

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../../components/ui/Card';
import { CogIcon, IdentificationIcon } from '../../components/ui/icons'; 
import { useAppData } from '@/contexts/AppDataContext'; 
import { SchoolDetails, User } from '../../types'; 
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select'; 
import Spinner from '../../components/ui/Spinner';
import { Link } from 'react-router-dom';
import ModuleManagementPanel from '../../components/settings/ModuleManagementPanel';
import UserPermissionsPanel from '../../components/settings/UserPermissionsPanel';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation(['settings', 'common', 'navigation']);
  const { 
    users, 
    loading: usersLoading, 
    schoolDetails: initialSchoolDetails, 
    updateSchoolDetails, 
    loading: appLoading, 
    isRxDBModeActive 
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
      alert(t('schoolProfile.saveSuccess'));
    } catch (error) {
      console.error("Failed to save school details:", error);
      alert(t('schoolProfile.saveError'));
    } finally {
      setIsSavingSchoolDetails(false);
    }
  };
  
  const userColumns = [
    { header: t('tableHeaders.username'), accessor: 'username' as keyof User },
    { header: t('tableHeaders.email'), accessor: 'email' as keyof User },
    { header: t('tableHeaders.userType'), accessor: 'userType' as keyof User},
    { header: t('tableHeaders.role'), accessor: 'role' as keyof User }, 
    { header: t('tableHeaders.status'), accessor: 'isActive' as keyof User }
  ];

  const pageIsLoadingSchoolDetails = appLoading.schoolDetails || (appLoading.all && !initialSchoolDetails);


  return (
    <div className="space-y-6">
      <Card title={t('general.title')}>
        <div className="text-center py-8">
          <CogIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">{t('general.appSettingsHeader')}</h2>
          <p className="text-gray-500">{t('general.appSettingsDescription')}</p>
        </div>
      </Card>

      {/* Module Management Panel */}
      <ModuleManagementPanel />

      {/* User Permissions Panel */}
      <UserPermissionsPanel />

      <Card title={t('navigation:settings.schoolProfile')}>
        {pageIsLoadingSchoolDetails ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">{t('schoolProfile.loadingDetails')}</span></div>
        ) : (
        <form className="space-y-4" onSubmit={handleSaveSchoolDetails}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label={t('schoolProfile.nameLabel')} name="name" value={schoolDetails.name || ''} onChange={handleSchoolDetailsChange} required />
            <Input label={t('schoolProfile.codeLabel')} name="school_code" value={schoolDetails.school_code || ''} onChange={handleSchoolDetailsChange} placeholder={t('schoolProfile.codePlaceholder')}/>
            <Input label={t('schoolProfile.emailLabel')} name="email" type="email" value={schoolDetails.email || ''} onChange={handleSchoolDetailsChange} />
            <Input label={t('schoolProfile.telephoneLabel')} name="telephone" value={schoolDetails.telephone || ''} onChange={handleSchoolDetailsChange} />
            <Input label={t('schoolProfile.postalAddressLabel')} name="postal_address" value={schoolDetails.postal_address || ''} onChange={handleSchoolDetailsChange} />
            <Input label={t('schoolProfile.townCityLabel')} name="town" value={schoolDetails.town || ''} onChange={handleSchoolDetailsChange} />
            <Input label={t('schoolProfile.headTeacherLabel')} name="head_teacher_name" value={schoolDetails.head_teacher_name || ''} onChange={handleSchoolDetailsChange} />
            <Select label={t('schoolProfile.genderLabel')} name="school_gender" value={schoolDetails.school_gender || ''} onChange={handleSchoolDetailsChange}>
              <option value="">{t('schoolProfile.selectGenderOption')}</option>
              <option value="Mixed">{t('schoolProfile.genderMixed')}</option>
              <option value="Boys Only">{t('schoolProfile.genderBoys')}</option>
              <option value="Girls Only">{t('schoolProfile.genderGirls')}</option>
            </Select>
            <Select label={t('schoolProfile.typeLabel')} name="school_type" value={schoolDetails.school_type || ''} onChange={handleSchoolDetailsChange}>
               <option value="">{t('schoolProfile.selectClassificationOption')}</option>
              <option value="Public">{t('schoolProfile.typePublic')}</option>
              <option value="Private">{t('schoolProfile.typePrivate')}</option>
              <option value="International">{t('schoolProfile.typeInternational')}</option>
              <option value="Religious">{t('schoolProfile.typeReligious')}</option>
              <option value="Community">{t('schoolProfile.typeCommunity')}</option>
            </Select>
            <Input label={t('schoolProfile.mottoLabel')} name="motto" value={schoolDetails.motto || ''} onChange={handleSchoolDetailsChange} className="md:col-span-2"/>
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isSavingSchoolDetails || pageIsLoadingSchoolDetails}>
              {isSavingSchoolDetails ? <Spinner size="sm" /> : t('schoolProfile.saveButton')}
            </Button>
          </div>
        </form>
        )}
      </Card>
      
      <Card title={t('navigation:settings.userManagement')}>
        <p className="text-gray-600 mb-4">{t('userManagement.description', { userManagementLink: t('navigation:settings.userManagement') })}</p>
        <Table columns={userColumns} data={users} isLoading={usersLoading.users} />
      </Card>

      <Card title={t('academicCalendar.setupTitle')}>
         <p className="text-gray-500">
            {t('academicCalendar.description')}
            <ul className="list-disc list-inside mt-2">
                <li><Link to="/administration/academic-structures" className="text-indigo-600 hover:underline">{t('academicCalendar.linkAcademicStructures')}</Link></li>
                <li><Link to="/administration/academic-period-definitions" className="text-indigo-600 hover:underline">{t('academicCalendar.linkAcademicPeriodDefinitions')}</Link></li>
                <li><Link to="/administration/academic-years" className="text-indigo-600 hover:underline">{t('academicCalendar.linkAcademicYears')}</Link></li>
                <li><Link to="/administration/school-periods" className="text-indigo-600 hover:underline">{t('academicCalendar.linkSchoolPeriods')}</Link></li>
            </ul>
          </p>
      </Card>

      <Card title={t('rolesPermissions.title')}>
         <p className="text-gray-500">
            {t('rolesPermissions.description', { userManagementLink: t('navigation:settings.userManagement'), workflowsLink: t('navigation:settings.workflows') })}
          </p>
      </Card>

      {isRxDBModeActive && (
        <Card title={t('navigation:settings.database')}>
            <p className="text-gray-500">
                {t('database.description')}
                <br />
                <Link to="/settings/database" className="text-indigo-600 hover:underline">{t('database.linkToSettings')}</Link>
            </p>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
