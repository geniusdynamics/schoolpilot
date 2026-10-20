// ABOUTME: First-run setup wizard: school profile (school_details), education system, academic year with per-term
// ABOUTME: dates and its financial year, classes & streams, subjects, and the first administrator. Every step writes
// ABOUTME: through idempotent writers (steps/writers.ts), so Back/Next or re-opening never duplicates records.
// ABOUTME: Progress (values and created ids, never passwords) is kept in localStorage so the wizard is resumable;
// ABOUTME: finishing records school_details.setup_completed_at.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import WizardForm, { type WizardStep } from '@/components/ui/forms/WizardForm';
import FormField from '@/components/ui/forms/FormField';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Checkbox from '@/components/ui/Checkbox';
import { useToast } from '@/hooks/useToast';
import { useDatabaseDocument } from '@/hooks/useDatabaseDocument';
import type { SchoolProfile } from '@/hooks/useSchoolProfile';
import { logger } from '@/utils/logging';
import {
  KENYAN_CURRICULUM_PRESETS,
  type KenyanSubjectSeed,
} from '@/modules/academics/data/templates/kenyan-subject-sets';
import {
  clearWizardDraft,
  financialYearFor,
  loadDraft,
  saveDraft,
  termsForYearStart,
  type CreatedRecords,
  type TermDraft,
  type WizardDraft,
} from './steps/wizardDraft';
import {
  hasAnyUser,
  markSetupCompleted,
  openWizardStore,
  saveAcademicYear,
  saveClassesAndStreams,
  saveEducationSystem,
  saveSchoolProfile,
  saveSubjects,
} from './steps/writers';
import { saveCanonicalSchool } from './steps/canonicalSetup';

export { clearWizardDraft };

const CURRICULUM_OPTIONS = Object.values(KENYAN_CURRICULUM_PRESETS).map(p => ({
  key: p.key,
  label: p.label,
  subjectCount: p.subjects.length,
}));

interface AdminForm {
  username: string;
  displayName: string;
  password: string;
  confirm: string;
}

const EMPTY_ADMIN: AdminForm = { username: '', displayName: '', password: '', confirm: '' };

export interface SetupWizardProps {
  onComplete: () => void;
  /** Shown as a Cancel button, e.g. when the wizard is re-opened from Settings. */
  onCancel?: () => void;
}

/**
 * Multi-step school setup. Each completed step is committed to the database immediately, so partial
 * progress survives a reload; the wizard can be re-run at any time without creating duplicates.
 */
export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation('common');
  const toast = useToast();
  const [draft, setDraft] = useState<WizardDraft>(loadDraft);
  // The step to resume at is fixed on mount; later progress must not reset the wizard's own navigation.
  const [initialStep] = useState(() => draft.stepIndex);
  // The administrator's credentials live only in memory, never in the persisted draft.
  const [admin, setAdmin] = useState<AdminForm>(EMPTY_ADMIN);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);

  // Loaded so a re-opened wizard starts from the stored profile.
  const schoolDetailsDoc = useDatabaseDocument<SchoolProfile>('school_details');

  const update = useCallback((patch: Partial<WizardDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);
  const recordCreated = useCallback((patch: Partial<CreatedRecords>) => {
    setDraft(prev => ({ ...prev, created: { ...prev.created, ...patch } }));
  }, []);

  // Once setup is finished the draft is gone for good; late state updates must not write it back.
  const completedRef = useRef(false);
  useEffect(() => {
    if (!completedRef.current) saveDraft(draft);
  }, [draft]);

  useEffect(() => {
    const stored = schoolDetailsDoc.data;
    if (!stored?.name) return;
    setDraft(prev => (prev.school.name ? prev : {
      ...prev,
      school: {
        name: stored.name ?? '',
        motto: stored.motto ?? '',
        address: stored.postal_address ?? '',
        phone: stored.telephone ?? '',
        email: stored.email ?? '',
      },
    }));
  }, [schoolDetailsDoc.data]);

  useEffect(() => {
    let active = true;
    openWizardStore()
      .then(hasAnyUser)
      .then(exists => { if (active) setAdminExists(exists); })
      .catch(error => {
        logger.warn('[SetupWizard] could not check for existing accounts:', error);
        if (active) setAdminExists(false);
      });
    return () => { active = false; };
  }, []);

  const presetSubjects: KenyanSubjectSeed[] = useMemo(
    () => (draft.curriculum ? KENYAN_CURRICULUM_PRESETS[draft.curriculum].subjects : []),
    [draft.curriculum]
  );

  const setTerm = (index: number, patch: Partial<TermDraft>) => {
    update({ terms: draft.terms.map((term, i) => (i === index ? { ...term, ...patch } : term)) });
  };

  // ── Step writers ────────────────────────────────────────────────

  const saveAdministrator = useCallback(async () => {
    const store = await openWizardStore();
    if (await hasAnyUser(store)) {
      setAdminExists(true);
      return;
    }
    const { authService, MIN_ADMIN_PASSWORD_LENGTH } = await import('@/services/auth/authService');
    if (admin.username.trim().length < 3 || !admin.displayName.trim()) {
      throw new Error(t('setupWizard.admin.detailsRequired', 'Enter a username (at least 3 characters) and a display name.'));
    }
    if (admin.password.length < MIN_ADMIN_PASSWORD_LENGTH) {
      throw new Error(t('setupWizard.admin.passwordTooShort', 'The password must be at least 10 characters.'));
    }
    if (admin.password !== admin.confirm) {
      throw new Error(t('setupWizard.admin.passwordMismatch', 'The passwords do not match.'));
    }
    const result = await authService.createInitialAdministrator({
      username: admin.username,
      displayName: admin.displayName,
      password: admin.password,
    });
    if (!result.success) throw new Error(result.message);
    setAdmin(EMPTY_ADMIN);
    setAdminExists(true);
  }, [admin, t]);

  const STEP_WRITERS: Record<string, () => Promise<void>> = useMemo(() => ({
    school: async () => saveSchoolProfile(await openWizardStore(), draft.school),
    system: async () => recordCreated(await saveEducationSystem(await openWizardStore(), draft)),
    year: async () => recordCreated(await saveAcademicYear(await openWizardStore(), draft)),
    classes: async () => {
      const { classes, created } = await saveClassesAndStreams(await openWizardStore(), draft);
      setDraft(prev => ({ ...prev, classes, created: { ...prev.created, ...created } }));
    },
    subjects: async () => {
      const chosen = presetSubjects.filter(s => draft.selectedSubjects[s.subject_code] !== false);
      recordCreated(await saveSubjects(await openWizardStore(), chosen, draft.created.subjectIds));
    },
    sample: async () => {
      // The canonical school the pages read: institution, calendar, year, terms, levels, classes.
      await saveCanonicalSchool(draft);
    },
    admin: saveAdministrator,
  }), [draft, presetSubjects, recordCreated, saveAdministrator]);

  const handleWizardComplete = useCallback(async () => {
    try {
      // The canonical school is what the migrated pages read; the step above already wrote it,
      // so this run is a cheap idempotent safety net for a wizard resumed on its last step.
      await saveCanonicalSchool(draft);
    } catch (error) {
      logger.error('[SetupWizard] could not save the canonical school:', error);
      toast.showError(error instanceof Error ? error.message : t('setupWizard.canonicalError', 'The school structure could not be saved.'));
    }
    try {
      // The completion time lives on the school profile, so every device sees that setup is done.
      await markSetupCompleted(await openWizardStore());
    } catch (error) {
      logger.error('[SetupWizard] could not record setup completion:', error);
      toast.showError(error instanceof Error ? error.message : t('setupWizard.completeError', 'Could not finish setup.'));
      return;
    }
    completedRef.current = true;
    clearWizardDraft();
    toast.showSuccess('Setup complete. Welcome aboard!');
    onComplete();
  }, [draft, toast, onComplete, t]);

  // ── Step definitions ────────────────────────────────────────────

  const financialYear = financialYearFor(draft);

  const steps: WizardStep[] = [
    {
      id: 'school',
      title: 'School Profile',
      description: 'Basic details about your school',
      content: (
        <div className="space-y-4">
          <FormField label="School name" required>
            <Input value={draft.school.name} onChange={e => update({ school: { ...draft.school, name: e.target.value } })} placeholder="e.g. Greenfields Academy" />
          </FormField>
          <FormField label="Motto">
            <Input value={draft.school.motto} onChange={e => update({ school: { ...draft.school, motto: e.target.value } })} placeholder="Knowledge is light" />
          </FormField>
          <FormField label="Address">
            <Input value={draft.school.address} onChange={e => update({ school: { ...draft.school, address: e.target.value } })} placeholder="P.O. Box 1234, Nairobi" />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Phone">
              <Input value={draft.school.phone} onChange={e => update({ school: { ...draft.school, phone: e.target.value } })} placeholder="+254 700 000 000" />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={draft.school.email} onChange={e => update({ school: { ...draft.school, email: e.target.value } })} placeholder="info@school.ac.ke" />
            </FormField>
          </div>
        </div>
      ),
      validate: () => Boolean(draft.school.name.trim()),
    },
    {
      id: 'system',
      title: 'Education System',
      description: 'Pick the curriculum your school follows',
      content: (
        <div className="space-y-3">
          {CURRICULUM_OPTIONS.map(opt => (
            <label
              key={opt.key}
              className={`flex items-center justify-between border rounded-lg p-4 cursor-pointer transition-colors ${
                draft.curriculum === opt.key ? 'border-indigo-500 bg-indigo-50' : 'border-surface-border hover:bg-surface-muted'
              }`}
            >
              <div>
                <p className="font-medium text-surface-foreground">{opt.label}</p>
                <p className="text-sm text-surface-muted-fg">{opt.subjectCount} subjects pre-loaded</p>
              </div>
              <input
                type="radio"
                name="curriculum"
                checked={draft.curriculum === opt.key}
                onChange={() => update({ curriculum: opt.key })}
                className="h-4 w-4 text-indigo-600"
              />
            </label>
          ))}
          <p className="text-xs text-surface-muted-fg">You can customise subjects in the next steps.</p>
        </div>
      ),
      validate: () => draft.curriculum !== null,
    },
    {
      id: 'year',
      title: 'Academic Year',
      description: t('setupWizard.year.description', 'The year, the dates of each term, and its financial year'),
      content: (
        <div className="space-y-4">
          <FormField label="Year name" required>
            <Input aria-label="Year name" value={draft.yearName} onChange={e => update({ yearName: e.target.value })} placeholder="2026" />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Start date" required>
              <Input
                type="date"
                aria-label="Academic year start"
                value={draft.yearStart}
                onChange={e => update({ yearStart: e.target.value, terms: termsForYearStart(draft.terms, draft.yearStart, e.target.value) })}
              />
            </FormField>
            <FormField label="End date" required>
              <Input type="date" aria-label="Academic year end" value={draft.yearEnd} onChange={e => update({ yearEnd: e.target.value })} />
            </FormField>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-surface-foreground">{t('setupWizard.year.termDates', 'Term dates')}</p>
            {draft.terms.map((term, index) => (
              <div key={term.name} className="grid grid-cols-[6rem_1fr_1fr] gap-2 items-center">
                <span className="text-sm text-surface-foreground">{term.name}</span>
                <Input type="date" aria-label={`${term.name} start`} value={term.start} onChange={e => setTerm(index, { start: e.target.value })} />
                <Input type="date" aria-label={`${term.name} end`} value={term.end} onChange={e => setTerm(index, { end: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-surface-border pt-3">
            <p className="text-sm font-medium text-surface-foreground">{t('setupWizard.year.financialYear', 'Financial year')}</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="financial-year-mode" checked={draft.financialYearMode === 'calendar'} onChange={() => update({ financialYearMode: 'calendar' })} />
              {t('setupWizard.year.financialYearCalendar', 'Calendar year')} ({financialYearFor({ ...draft, financialYearMode: 'calendar' }).name})
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="financial-year-mode" checked={draft.financialYearMode === 'custom'} onChange={() => update({
                financialYearMode: 'custom',
                financialYearName: financialYear.name,
                financialYearStart: financialYear.start_date,
                financialYearEnd: financialYear.end_date,
              })} />
              {t('setupWizard.year.financialYearCustom', 'Other dates')}
            </label>
            {draft.financialYearMode === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input aria-label="Financial year name" value={draft.financialYearName} onChange={e => update({ financialYearName: e.target.value })} />
                <Input type="date" aria-label="Financial year start" value={draft.financialYearStart} onChange={e => update({ financialYearStart: e.target.value })} />
                <Input type="date" aria-label="Financial year end" value={draft.financialYearEnd} onChange={e => update({ financialYearEnd: e.target.value })} />
              </div>
            )}
            <p className="text-xs text-surface-muted-fg">
              {t('setupWizard.year.financialYearHint', 'Terms are linked to {{name}}. An existing financial year covering these dates is reused.', { name: financialYear.name })}
            </p>
          </div>
        </div>
      ),
      validate: () => Boolean(draft.yearName.trim() && draft.yearStart && draft.yearEnd && draft.terms.every(term => term.start && term.end)),
    },
    {
      id: 'classes',
      title: 'Classes & Streams',
      description: 'Add the classes in your school',
      content: (
        <div className="space-y-3">
          {draft.classes.map((row, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="w-40 shrink-0">
                <Input
                  value={row.name}
                  onChange={e => {
                    const classes = [...draft.classes];
                    classes[idx] = { ...classes[idx], name: e.target.value };
                    update({ classes });
                  }}
                  placeholder={`Class ${idx + 1}`}
                />
              </div>
              <div className="flex-1">
                <Input
                  value={row.streams}
                  onChange={e => {
                    const classes = [...draft.classes];
                    classes[idx] = { ...classes[idx], streams: e.target.value };
                    update({ classes });
                  }}
                  placeholder="Streams, comma-separated (e.g. North, South)"
                />
              </div>
              {draft.classes.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => update({ classes: draft.classes.filter((_, i) => i !== idx) })}>
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => update({ classes: [...draft.classes, { name: '', streams: '' }] })}>
            Add class
          </Button>
        </div>
      ),
    },
    {
      id: 'subjects',
      title: 'Subjects',
      description: 'Un-tick any subject you do not offer',
      optional: true,
      content: (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {presetSubjects.length === 0 && (
            <p className="text-sm text-surface-muted-fg">Choose an education system first.</p>
          )}
          {presetSubjects.map(s => (
            <label key={s.subject_code} className="flex items-center gap-3 border border-gray-100 rounded-md px-3 py-2 hover:bg-surface-muted cursor-pointer">
              <Checkbox
                checked={draft.selectedSubjects[s.subject_code] !== false}
                onChange={checked => update({ selectedSubjects: { ...draft.selectedSubjects, [s.subject_code]: checked } })}
              />
              <span className="flex-1 text-sm text-surface-foreground">{s.name}</span>
              {s.is_compulsory && <Badge variant="secondary">Compulsory</Badge>}
              <Badge>{s.grouping.replace(/\(.*\)/, '').trim()}</Badge>
            </label>
          ))}
        </div>
      ),
    },
    {
      id: 'sample',
      title: t('setupWizard.sample.title', 'Sample data'),
      description: t('setupWizard.sample.description', 'Start with a school that already has something in it'),
      content: (
        <div className="space-y-3">
          <p className="text-sm text-surface-muted-fg">
            {t(
              'setupWizard.sample.intro',
              'The classes you entered are saved as the school structure. You can also load sample learners, staff, fees and a register to explore the app.'
            )}
          </p>
          <label className="flex items-start gap-3 rounded-lg border border-surface-border p-4 cursor-pointer hover:bg-surface-muted">
            <Checkbox
              checked={draft.includeDemoData}
              onChange={checked => update({ includeDemoData: checked })}
            />
            <span>
              <span className="block text-sm font-medium text-surface-foreground">
                {t('setupWizard.sample.demoLabel', 'Create sample data')}
              </span>
              <span className="block text-xs text-surface-muted-fg">
                {t(
                  'setupWizard.sample.demoHint',
                  'Adds demo learners, guardians, staff, teaching groups, marks, fee invoices and a morning register. It is written the same way the app writes real records, and you can add your own next to it.'
                )}
              </span>
            </span>
          </label>
        </div>
      ),
    },
    {
      id: 'admin',
      title: t('setupWizard.admin.title', 'Administrator'),
      description: t('setupWizard.admin.description', 'The account that manages this school'),
      content: adminExists ? (
        <p className="text-sm text-surface-foreground">
          {t('setupWizard.admin.exists', 'An administrator account already exists. Sign in with it after setup.')}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-surface-muted-fg">
            {t('setupWizard.admin.intro', 'Create the administrator who will sign in and manage this school. The password needs at least 10 characters.')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={t('setupWizard.admin.username', 'Username')} required>
              <Input id="setup-admin-username" aria-label="Administrator username" autoComplete="username" value={admin.username} onChange={e => setAdmin(prev => ({ ...prev, username: e.target.value }))} />
            </FormField>
            <FormField label={t('setupWizard.admin.displayName', 'Display name')} required>
              <Input id="setup-admin-display-name" aria-label="Display name" value={admin.displayName} onChange={e => setAdmin(prev => ({ ...prev, displayName: e.target.value }))} />
            </FormField>
            <FormField label={t('setupWizard.admin.password', 'Password')} required>
              <Input id="setup-admin-password" type="password" aria-label="Password" autoComplete="new-password" value={admin.password} onChange={e => setAdmin(prev => ({ ...prev, password: e.target.value }))} />
            </FormField>
            <FormField label={t('setupWizard.admin.confirm', 'Confirm password')} required>
              <Input id="setup-admin-confirm" type="password" aria-label="Confirm password" autoComplete="new-password" value={admin.confirm} onChange={e => setAdmin(prev => ({ ...prev, confirm: e.target.value }))} />
            </FormField>
          </div>
        </div>
      ),
    },
  ];

  // Run the step's writer when the user advances past it: each completed step is committed immediately.
  const wrappedSteps = steps.map((s, idx) => ({
    ...s,
    validate: async () => {
      const valid = s.validate ? await s.validate() : true;
      if (!valid) return false;
      const writer = STEP_WRITERS[s.id];
      if (writer) {
        try {
          await writer();
        } catch (error) {
          logger.error(`[SetupWizard] step '${s.id}' failed to save:`, error);
          toast.showError(error instanceof Error ? error.message : `Could not save ${s.title.toLowerCase()}.`);
          return false;
        }
      }
      update({ stepIndex: Math.min(idx + 1, steps.length - 1) });
      return true;
    },
  }));

  return (
    <Card
      title="Set up your school"
      subtitle={draft.stepIndex > 0 ? 'Progress is saved, so you can continue later' : undefined}
      className="max-w-3xl mx-auto"
    >
      <WizardForm
        steps={wrappedSteps}
        initialStep={Math.min(initialStep, steps.length - 1)}
        showProgress
        completeButtonText="Finish setup"
        onComplete={handleWizardComplete}
        onCancel={onCancel}
      />
    </Card>
  );
};

export default SetupWizard;
