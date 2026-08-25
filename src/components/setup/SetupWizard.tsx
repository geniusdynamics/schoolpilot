import { logger } from '@/utils/logging';

// ABOUTME: First-run setup wizard (Phase 2.1) â€” school profile, education system,
// ABOUTME academic year + terms, classes & streams, subjects (Kenyan presets), and an
// ABOUTME optional fee structure. Rendered by FirstRunOnboarding for the production
// ABOUTME pathway. Progress is persisted to localStorage so it is skippable/resumable.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import WizardForm, { type WizardFormRef, type WizardStep } from '@/components/ui/forms/WizardForm';
import FormField from '@/components/ui/forms/FormField';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Checkbox from '@/components/ui/Checkbox';
import { useToast } from '@/hooks/useToast';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import {
  KENYAN_CURRICULUM_PRESETS,
  type KenyanSubjectSeed,
} from '@/modules/academics/data/templates/kenyan-subject-sets';
import { EDUCATION_SYSTEM_TEMPLATES } from '@/modules/academics/data/templates/education-system-templates';

const WIZARD_DRAFT_KEY = 'schoolpilot_setup_wizard_draft';

interface SchoolProfileDraft {
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
}

interface ClassRowDraft {
  name: string;
  streams: string; // comma-separated
}

interface FeeItemDraft {
  name: string;
  amount: string;
}

interface WizardDraft {
  stepIndex: number;
  school: SchoolProfileDraft;
  curriculum: 'CBC_PRIMARY' | 'KCSE_SECONDARY' | null;
  yearName: string;
  yearStart: string;
  yearEnd: string;
  classes: ClassRowDraft[];
  selectedSubjects: Record<string, boolean>;
  feeTemplateName: string;
  feeItems: FeeItemDraft[];
}

function defaultDraft(): WizardDraft {
  const year = new Date().getFullYear();
  return {
    stepIndex: 0,
    school: { name: '', motto: '', address: '', phone: '', email: '' },
    curriculum: null,
    yearName: `${year}`,
    yearStart: `${year}-01-06`,
    yearEnd: `${year}-10-31`,
    classes: [{ name: '', streams: 'North, South' }],
    selectedSubjects: {},
    feeTemplateName: '',
    feeItems: [
      { name: 'Tuition', amount: '8000' },
      { name: 'Lunch', amount: '2500' },
    ],
  };
}

function loadDraft(): WizardDraft {
  try {
    const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
    if (raw) return { ...defaultDraft(), ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return defaultDraft();
}

function saveDraft(draft: WizardDraft): void {
  localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
}

export function clearWizardDraft(): void {
  localStorage.removeItem(WIZARD_DRAFT_KEY);
}

const CURRICULUM_OPTIONS = Object.values(KENYAN_CURRICULUM_PRESETS).map(p => ({
  key: p.key,
  label: p.label,
  subjectCount: p.subjects.length,
}));

/**
 * Multi-step first-run setup. Every completed step writes straight to the
 * database so partial progress is never lost even if the user abandons the
 * wizard mid-way.
 */
export const SetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const toast = useToast();
  const [draft, setDraft] = useState<WizardDraft>(loadDraft);
  const wizardRef = useRef<WizardFormRef | null>(null);

  const schoolSettingsCol = useDatabaseCollection<any>('settings');
  const eduSystemCol = useDatabaseCollection<any>('education_system_configurations');
  const yearsCol = useDatabaseCollection<any>('academic_years');
  const periodDefsCol = useDatabaseCollection<any>('period_definitions');
  const periodsCol = useDatabaseCollection<any>('school_periods');
  const classesCol = useDatabaseCollection<any>('classes');
  const streamsCol = useDatabaseCollection<any>('class_streams');
  const subjectsCol = useDatabaseCollection<any>('subjects');
  const feeTemplatesCol = useDatabaseCollection<any>('fee_templates');

  const update = useCallback((patch: Partial<WizardDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  // Persist whenever the committed draft changes (never inside the updater)
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const presetSubjects: KenyanSubjectSeed[] = useMemo(
    () => (draft.curriculum ? KENYAN_CURRICULUM_PRESETS[draft.curriculum].subjects : []),
    [draft.curriculum]
  );

  // â”€â”€ Step writers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const saveSchoolProfile = useCallback(async () => {
    if (!draft.school.name.trim()) throw new Error('School name is required.');
    const existing = schoolSettingsCol.data.find(d => d.key === 'school_profile');
    const value = JSON.stringify(draft.school);
    if (existing) {
      await schoolSettingsCol.update(existing.id, { value });
    } else {
      await schoolSettingsCol.insert({ key: 'school_profile', value });
    }
  }, [draft.school, schoolSettingsCol]);

  const saveEducationSystem = useCallback(async () => {
    if (!draft.curriculum) return; // optional choice â€” keep going without one
    const preset = KENYAN_CURRICULUM_PRESETS[draft.curriculum];
    const template = EDUCATION_SYSTEM_TEMPLATES[preset.templateKey] ?? {};
    await eduSystemCol.insert({
      ...template,
      name: template.name ?? preset.label,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [draft.curriculum, eduSystemCol]);

  const saveAcademicYear = useCallback(async () => {
    if (!draft.yearName.trim()) return;
    const now = new Date().toISOString();
    const year = await yearsCol.insert({
      name: draft.yearName.trim(),
      structure_id: '',
      start_date: draft.yearStart,
      end_date: draft.yearEnd,
      created_at: now,
      updated_at: now,
    });

    // Ensure Term 1â€“3 period definitions exist, then create this year's periods.
    const termNames = ['Term 1', 'Term 2', 'Term 3'];
    const existingDefs = periodDefsCol.data;
    const defIds: string[] = [];
    for (const term of termNames) {
      const found = existingDefs.find((d: any) => d.name === term);
      if (found) {
        defIds.push(String(found.id));
      } else {
        const created = await periodDefsCol.insert({ name: term, order: termNames.indexOf(term) + 1 });
        defIds.push(String(created.id));
      }
    }

    // Split the year into three roughly equal terms for period date ranges
    const start = new Date(draft.yearStart).getTime();
    const end = new Date(draft.yearEnd).getTime();
    const span = Math.max(0, end - start);
    for (let t = 0; t < 3; t++) {
      await periodsCol.insert({
        academic_year_id: Number(year.id),
        period_definition_id: defIds[t],
        financial_year_id: 0,
        start_date: new Date(start + (span / 3) * t).toISOString().slice(0, 10),
        end_date: new Date(start + (span / 3) * (t + 1)).toISOString().slice(0, 10),
        is_active: t === 0,
        created_at: now,
        updated_at: now,
        name: termNames[t],
      });
    }
  }, [draft.yearName, draft.yearStart, draft.yearEnd, yearsCol, periodDefsCol, periodsCol]);

  const saveClassesAndStreams = useCallback(async () => {
    for (const row of draft.classes) {
      const className = row.name.trim();
      if (!className) continue;
      const createdClass = await classesCol.insert({ name: className });
      const streamNames = row.streams.split(',').map(s => s.trim()).filter(Boolean);
      for (const streamName of streamNames) {
        await streamsCol.insert({
          class_id: Number(createdClass.id),
          name: streamName,
          class_name: className,
        });
      }
    }
  }, [draft.classes, classesCol, streamsCol]);

  const saveSubjects = useCallback(async () => {
    const chosen = presetSubjects.filter(s => draft.selectedSubjects[s.subject_code] !== false);
    for (const s of chosen) {
      await subjectsCol.insert({
        subject_code: s.subject_code,
        name: s.name,
        abbreviation: s.abbreviation,
        grouping: s.grouping,
        is_compulsory: s.is_compulsory,
      });
    }
  }, [presetSubjects, draft.selectedSubjects, subjectsCol]);

  const saveFeeTemplate = useCallback(async () => {
    if (!draft.feeTemplateName.trim()) return; // optional step
    const items = draft.feeItems
      .filter(i => i.name.trim())
      .map(i => ({ description: i.name.trim(), amount: Number(i.amount) || 0 }));
    const total = items.reduce((sum, i) => sum + i.amount, 0);
    const now = new Date().toISOString();
    await feeTemplatesCol.insert({
      name: draft.feeTemplateName.trim(),
      items,
      total_amount: total,
      currency: 'KES',
      is_default: false,
      created_at: now,
      updated_at: now,
    });
  }, [draft.feeTemplateName, draft.feeItems, feeTemplatesCol]);

  const handleWizardComplete = useCallback(async () => {
    try {
      clearWizardDraft();
      toast.showSuccess('Setup complete. Welcome aboard!');
      onComplete();
    } catch (error) {
      logger.error('[SetupWizard] final step failed:', error);
      toast.showError('Something went wrong on the last step. You can retry â€” earlier steps are already saved.');
    }
  }, [toast, onComplete]);

  // Which database writer runs when the user advances past each step
  const STEP_WRITERS: Record<string, () => Promise<void>> = useMemo(() => ({
    school: saveSchoolProfile,
    system: saveEducationSystem,
    year: saveAcademicYear,
    classes: saveClassesAndStreams,
    subjects: saveSubjects,
    fees: saveFeeTemplate,
  }), [saveSchoolProfile, saveEducationSystem, saveAcademicYear, saveClassesAndStreams, saveSubjects, saveFeeTemplate]);

  // â”€â”€ Step definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const steps: WizardStep[] = useMemo(() => [
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
                draft.curriculum === opt.key ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">{opt.label}</p>
                <p className="text-sm text-gray-500">{opt.subjectCount} subjects pre-loaded</p>
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
          <p className="text-xs text-gray-400">You can customise subjects in the next steps.</p>
        </div>
      ),
      validate: () => draft.curriculum !== null,
    },
    {
      id: 'year',
      title: 'Academic Year',
      description: 'The year and its three terms',
      content: (
        <div className="space-y-4">
          <FormField label="Year name" required>
            <Input value={draft.yearName} onChange={e => update({ yearName: e.target.value })} placeholder="2026" />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Start date" required>
              <Input type="date" value={draft.yearStart} onChange={e => update({ yearStart: e.target.value })} />
            </FormField>
            <FormField label="End date" required>
              <Input type="date" value={draft.yearEnd} onChange={e => update({ yearEnd: e.target.value })} />
            </FormField>
          </div>
          <p className="text-xs text-gray-500">Three terms will be created and split evenly across these dates.</p>
        </div>
      ),
      validate: () => Boolean(draft.yearName.trim() && draft.yearStart && draft.yearEnd),
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
            <p className="text-sm text-gray-500">Choose an education system first.</p>
          )}
          {presetSubjects.map(s => (
            <label key={s.subject_code} className="flex items-center gap-3 border border-gray-100 rounded-md px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <Checkbox
                checked={draft.selectedSubjects[s.subject_code] !== false}
                onChange={checked => update({ selectedSubjects: { ...draft.selectedSubjects, [s.subject_code]: checked } })}
              />
              <span className="flex-1 text-sm text-gray-800">{s.name}</span>
              {s.is_compulsory && <Badge variant="secondary">Compulsory</Badge>}
              <Badge>{s.grouping.replace(/\(.*\)/, '').trim()}</Badge>
            </label>
          ))}
        </div>
      ),
    },
    {
      id: 'fees',
      title: 'Fee Structure',
      description: 'Optional â€” you can set this up later',
      optional: true,
      content: (
        <div className="space-y-4">
          <FormField label="Template name">
            <Input value={draft.feeTemplateName} onChange={e => update({ feeTemplateName: e.target.value })} placeholder="e.g. 2026 Term Fees" />
          </FormField>
          {draft.feeItems.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={item.name}
                  onChange={e => {
                    const feeItems = [...draft.feeItems];
                    feeItems[idx] = { ...feeItems[idx], name: e.target.value };
                    update({ feeItems });
                  }}
                  placeholder="Item (e.g. Tuition)"
                />
              </div>
              <div className="w-36">
                <Input
                  type="number"
                  value={item.amount}
                  onChange={e => {
                    const feeItems = [...draft.feeItems];
                    feeItems[idx] = { ...feeItems[idx], amount: e.target.value };
                    update({ feeItems });
                  }}
                  placeholder="KES"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => update({ feeItems: draft.feeItems.filter((_, i) => i !== idx) })}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => update({ feeItems: [...draft.feeItems, { name: '', amount: '' }] })}>
            Add fee item
          </Button>
        </div>
      ),
    },
    {
      id: 'admin',
      title: 'Administrator',
      description: 'How you sign in',
      content: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>Your app ships with a built-in administrator account:</p>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 font-mono text-xs">
            <p>username: <strong>admin</strong></p>
            <p>password: <strong>admin123</strong></p>
          </div>
          <p>
            Sign in with these after setup completes, then change the password from
            <strong> Settings â†’ Users</strong>. We recommend doing that before inviting other staff.
          </p>
        </div>
      ),
    },
  ], [draft, update, presetSubjects]);

  // Persist resume point and RUN THE STEP'S WRITER when the user advances past
  // it â€” each completed step is committed to the database immediately.
  const wrappedSteps = useMemo(() => steps.map((s, idx) => ({
    ...s,
    content: s.content,
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
      update({ stepIndex: idx + 1 });
      return true;
    },
  })), [steps, update, toast, STEP_WRITERS]);

  const resumeFrom = Math.min(draft.stepIndex, steps.length - 1);

  return (
    <Card
      title="Set up your school"
      subtitle={`Step ${resumeFrom + 1} of ${steps.length}${draft.stepIndex > 0 ? ' â€” progress saved, feel free to continue later' : ''}`}
      className="max-w-3xl mx-auto"
    >
      <WizardForm
        ref={wizardRef}
        steps={wrappedSteps}
        initialStep={resumeFrom}
        showProgress
        completeButtonText="Finish setup"
        onComplete={handleWizardComplete}
      />
    </Card>
  );
};

export default SetupWizard;
