// ABOUTME: Settings › School Profile — edits the single school_details record (name, code, contacts, motto)
// ABOUTME: Reads and saves through useDatabaseDocument so the profile persists and refreshes live (SO-17);
// ABOUTME: also (re-)opens the setup wizard, labelled as a re-run once school_details.setup_completed_at is set.

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import { IdentificationIcon } from '@/components/ui/icons';
import { useDatabaseDocument } from '@/hooks/useDatabaseDocument';
import { SchoolDetails } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/utils/logging';
import { useToast } from '@/hooks/useToast';
import { SetupWizard } from '@/components/setup/SetupWizard';


// school_details rows are keyed by string ids in the database layer
type SchoolProfile = Omit<SchoolDetails, 'id'> & { id?: string; setup_completed_at?: string | null };

export const SettingsSchoolProfileContent: React.FC = () => {
  const {
    data: initialSchoolDetails,
    save: saveSchoolDetails,
    loading,
    refresh,
  } = useDatabaseDocument<SchoolProfile>('school_details');
  const [wizardOpen, setWizardOpen] = useState(false);
  // Only block the form on the first load; refreshes after a save keep it on screen
  const pageIsLoading = loading && !initialSchoolDetails;
  const { t } = useTranslation('settings');

  const [schoolDetails, setSchoolDetails] = useState<Partial<SchoolProfile>>(initialSchoolDetails || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialSchoolDetails) {
      setSchoolDetails(initialSchoolDetails);
    }
  }, [initialSchoolDetails]);

  const handleSchoolDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSchoolDetails({ ...schoolDetails, [e.target.name]: e.target.value });
  };

  const toast = useToast();
  const handleSaveSchoolDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      await saveSchoolDetails({
        ...schoolDetails,
        ...(schoolDetails.id ? {} : { created_at: now }),
        updated_at: now,
      });
      toast.showSuccess(t('schoolProfile.saveSuccess'));
    } catch (error) {
      logger.error("Failed to save school details:", error);
      toast.showError(t('schoolProfile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };
  


  const setupCompleted = Boolean(initialSchoolDetails?.setup_completed_at);
  const closeWizard = () => {
    setWizardOpen(false);
    void refresh();
  };

  if (wizardOpen) {
    return <SetupWizard onComplete={closeWizard} onCancel={closeWizard} />;
  }

  return (
    <div className="space-y-6">
      <Card title={t('schoolProfile.setupWizard.title', 'Setup wizard')}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-surface-muted-fg">
            {setupCompleted
              ? t('schoolProfile.setupWizard.rerunDescription', 'Setup is complete. Run the wizard again to review the school profile, year, classes and subjects; existing records are updated, never duplicated.')
              : t('schoolProfile.setupWizard.description', 'Set up the school profile, academic year, classes, subjects and administrator step by step.')}
          </p>
          <Button type="button" variant="secondary" onClick={() => setWizardOpen(true)}>
            {setupCompleted
              ? t('schoolProfile.setupWizard.rerunButton', 'Re-run setup wizard')
              : t('schoolProfile.setupWizard.runButton', 'Run setup wizard')}
          </Button>
        </div>
      </Card>
      <Card title={t('schoolProfile.title')}>
        <div className="text-center py-8 border-b mb-6">
          <IdentificationIcon className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-foreground">{t('schoolProfile.header')}</h2>
          <p className="text-surface-muted-fg">{t('schoolProfile.description')}</p>
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