import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { IdentificationIcon } from '@/components/ui/icons';
import { useAppData } from '@/hooks/useAppData'; 
import { SchoolDetails } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';

export const SettingsSchoolProfileContent: React.FC = () => {
  const { schoolDetails: initialSchoolDetails, updateSchoolDetails, loading } = useAppData();
  const { t } = useTranslation('settings');
  
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
      alert(t('schoolProfile.saveSuccess'));
    } catch (error) {
      console.error("Failed to save school details:", error);
      alert(t('schoolProfile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };
  
  const pageIsLoading = loading.schoolDetails || (loading.all && !initialSchoolDetails);


  return (
    <div className="space-y-6">
      <Card title={t('schoolProfile.title')}>
        <div className="text-center py-8 border-b mb-6">
          <IdentificationIcon className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">{t('schoolProfile.header')}</h2>
          <p className="text-gray-500">{t('schoolProfile.description')}</p>
        </div>

        {pageIsLoading ? (
          <div className="flex justify-center items-center py-10"><Spinner /><span className="ml-2">{t('schoolProfile.loadingDetails')}</span></div>
        ) : (
        <form className="space-y-4" onSubmit={handleSaveSchoolDetails}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label={t('schoolProfile.nameLabel')} name="name" value={schoolDetails.name || ''} onChange={handleSchoolDetailsChange} required />
            <Input label={t('schoolProfile.codeLabel')} name="school_code" value={schoolDetails.school_code || ''} onChange={handleSchoolDetailsChange} placeholder={t('schoolProfile.codePlaceholder')} />
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
            {/* logo_path would be a file upload in a real app */}
          </div>
          <div className="pt-2">
            <Button type="submit" disabled={isSaving || pageIsLoading}>
              {isSaving ? <Spinner size="sm" /> : t('schoolProfile.saveButton')}
            </Button>
          </div>
        </form>
        )}
      </Card>
    </div>
  );
};

const SettingsSchoolProfilePage: React.FC = () => {
  return <SettingsSchoolProfileContent />;
};

export default SettingsSchoolProfilePage;