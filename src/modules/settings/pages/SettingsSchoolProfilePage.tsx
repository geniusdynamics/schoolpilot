// ABOUTME: Settings › School Profile — edits the single school_details record (name, code, contacts, motto)
// ABOUTME: Reads and saves through useDatabaseDocument so the profile persists and refreshes live (SO-17);
// ABOUTME: also (re-)opens the setup wizard, labelled as a re-run once school_details.setup_completed_at is set.

import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/ui/Card';
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

  const admissionSections = useMemo(() => {
    try {
      const parsed = JSON.parse(schoolDetails.admission_number_sections ?? '[]');
      return Array.isArray(parsed)
        ? (parsed as Array<{ name: string; prefix?: string | null; suffix?: string | null }>)
        : [];
    } catch {
      return [];
    }
  }, [schoolDetails.admission_number_sections]);

  const writeAdmissionSections = (
    rows: Array<{ name: string; prefix?: string | null; suffix?: string | null }>
  ) => {
    setSchoolDetails((current) => ({
      ...current,
      admission_number_sections: JSON.stringify(rows),
    }));
  };

  const addAdmissionSection = () => {
    writeAdmissionSections([...admissionSections, { name: '', prefix: '', suffix: '' }]);
  };

  const updateAdmissionSection = (
    index: number,
    field: 'name' | 'prefix' | 'suffix',
    value: string
  ) => {
    const rows = [...admissionSections];
    rows[index] = { ...rows[index], [field]: value };
    writeAdmissionSections(rows);
  };

  const removeAdmissionSection = (index: number) => {
    writeAdmissionSections(admissionSections.filter((_, row) => row !== index));
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
    <div className="space-y-3">
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
      <Card
        title={t('schoolProfile.title')}
        info={t('schoolProfile.description')}
      >
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

          <div className="mt-6 border-t border-surface-border pt-5">
            <h3 className="text-base font-semibold text-surface-foreground">Admission numbers</h3>
            <p className="mt-1 text-sm text-surface-muted-fg">
              The number the admissions page assigns. Leave the prefix or suffix empty for a bare
              number. A section override wins when its name matches the learner&apos;s level first,
              then their programme.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Prefix"
                name="admission_number_prefix"
                value={schoolDetails.admission_number_prefix ?? 'ADM'}
                onChange={handleSchoolDetailsChange}
                placeholder="ADM"
              />
              <Input
                label="Suffix"
                name="admission_number_suffix"
                value={schoolDetails.admission_number_suffix ?? ''}
                onChange={handleSchoolDetailsChange}
                placeholder="e.g. JSS"
              />
              <Input
                label="Separator"
                name="admission_number_separator"
                value={schoolDetails.admission_number_separator ?? '/'}
                onChange={handleSchoolDetailsChange}
                placeholder="/"
              />
              <Input
                label="Sequence width"
                name="admission_number_width"
                type="number"
                value={schoolDetails.admission_number_width ?? '3'}
                onChange={handleSchoolDetailsChange}
              />
              <Select
                label="Include the year"
                name="admission_number_include_year"
                value={schoolDetails.admission_number_include_year ?? 'true'}
                onChange={handleSchoolDetailsChange}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>

            <div className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-surface-foreground">
                    Section overrides
                  </h4>
                  <p className="text-xs text-surface-muted-fg">
                    For a school whose primary and junior secondary sections use different
                    sequences. The name must match the level or programme name.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={addAdmissionSection}>
                  Add section
                </Button>
              </div>
              {admissionSections.length === 0 ? (
                <p className="mt-3 text-sm text-surface-muted-fg">
                  One format for the whole school.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {admissionSections.map((section, index) => (
                    <div
                      key={`${section.name}-${index}`}
                      className="grid grid-cols-1 items-end gap-3 rounded-lg border border-surface-border p-3 md:grid-cols-[1.4fr_1fr_1fr_auto]"
                    >
                      <Input
                        label="Level or programme"
                        value={section.name}
                        onChange={(event) =>
                          updateAdmissionSection(index, 'name', event.target.value)
                        }
                        placeholder="e.g. Junior Secondary"
                      />
                      <Input
                        label="Prefix"
                        value={section.prefix ?? ''}
                        onChange={(event) =>
                          updateAdmissionSection(index, 'prefix', event.target.value)
                        }
                        placeholder="Inherit"
                      />
                      <Input
                        label="Suffix"
                        value={section.suffix ?? ''}
                        onChange={(event) =>
                          updateAdmissionSection(index, 'suffix', event.target.value)
                        }
                        placeholder="Inherit"
                      />
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => removeAdmissionSection(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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