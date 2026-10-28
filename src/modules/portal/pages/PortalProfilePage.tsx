// ABOUTME: The portal profile: who is signed in, the learner's identifying details, and — for a
// ABOUTME: guardian — the contact and reporting consent the schema records, which can be changed.

import { withPortalRepository } from '../data/withPortalRepository';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { PREFERRED_CHANNELS } from '@/domain/schema';
import { useToast } from '@/hooks/useToast';

import { PortalShell } from '../components/PortalShell';
import { usePortalConsent } from '../data/usePortalSession';
import type { PortalConsent } from '../data/portalConsent';

interface ConsentDraft {
  readonly receivesReports: boolean;
  readonly receivesSms: boolean;
  readonly preferredChannel: string;
  readonly preferredLanguage: string;
}

const draftOf = (consent: PortalConsent): ConsentDraft => ({
  receivesReports: consent.receivesReports,
  receivesSms: consent.receivesSms,
  preferredChannel: consent.preferredChannel,
  preferredLanguage: consent.preferredLanguage ?? '',
});

const ConsentPanel: React.FC<{
  readonly consent: PortalConsent;
  readonly onSave: (consent: PortalConsent, draft: ConsentDraft) => Promise<void>;
}> = ({ consent, onSave }) => {
  const { t } = useTranslation('portal');
  const [draft, setDraft] = useState<ConsentDraft>(() => draftOf(consent));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await onSave(consent, draft);
    } finally {
      setBusy(false);
    }
  };

  const fieldId = `consent-${consent.linkId}`;

  return (
    <fieldset className="space-y-3 border-t border-surface-border pt-3 first:border-0 first:pt-0">
      <legend className="text-sm font-medium text-surface-foreground">{consent.learnerName}</legend>

      <label className="flex min-h-11 items-center gap-3 text-sm text-surface-foreground">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={draft.receivesReports}
          onChange={(event) =>
            setDraft((current) => ({ ...current, receivesReports: event.target.checked }))
          }
        />
        {t('profile.receivesReports', 'Send me this child’s term reports')}
      </label>

      <label className="flex min-h-11 items-center gap-3 text-sm text-surface-foreground">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={draft.receivesSms}
          onChange={(event) =>
            setDraft((current) => ({ ...current, receivesSms: event.target.checked }))
          }
        />
        {t('profile.receivesSms', 'Send me SMS about this child')}
      </label>

      <div>
        <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-surface-foreground">
          {t('profile.preferredChannel', 'Preferred contact channel')}
        </label>
        <select
          id={fieldId}
          value={draft.preferredChannel}
          onChange={(event) =>
            setDraft((current) => ({ ...current, preferredChannel: event.target.value }))
          }
          className="min-h-11 w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-surface-foreground"
        >
          {PREFERRED_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {channel}
            </option>
          ))}
        </select>
      </div>

      <Input
        label={t('profile.preferredLanguage', 'Preferred language')}
        value={draft.preferredLanguage}
        onChange={(event) =>
          setDraft((current) => ({ ...current, preferredLanguage: event.target.value }))
        }
        placeholder="en"
      />

      <Button size="sm" onClick={() => void save()} loading={busy} disabled={busy}>
        {t('common.save', 'Save')}
      </Button>
    </fieldset>
  );
};

export const PortalProfileContent: React.FC = () => {
  const { t } = useTranslation('portal');
  const toast = useToast();
  const { session, consents, loading, error, save } = usePortalConsent();
  const learner = session.selectedLearner;

  const saveConsentFor = async (consent: PortalConsent, draft: ConsentDraft) => {
    try {
      await save({
        consent,
        receivesReports: draft.receivesReports,
        receivesSms: draft.receivesSms,
        preferredChannel: draft.preferredChannel,
        preferredLanguage: draft.preferredLanguage,
      });
      toast.showSuccess(
        t('profile.consentSaved', 'Your consent preferences were saved.')
      );
    } catch (cause) {
      toast.showError(
        cause instanceof Error ? cause.message : t('profile.consentFailed', 'The change was not saved.')
      );
    }
  };

  return (
    <PortalShell session={session} title={t('profile.title', 'My profile')}>
      {error ? (
        <Card className="border-rose-200 bg-rose-50">
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        </Card>
      ) : null}

      {learner ? (
        <Card title={t('profile.academicInfo', 'Learner')} className="border-slate-200 bg-surface-card">
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-surface-muted-fg">{t('profile.name', 'Name')}</dt>
              <dd className="font-medium text-surface-foreground">{learner.name}</dd>
            </div>
            <div>
              <dt className="text-surface-muted-fg">{t('profile.admission', 'Admission number')}</dt>
              <dd className="font-medium text-surface-foreground">{learner.admissionNumber}</dd>
            </div>
            <div>
              <dt className="text-surface-muted-fg">{t('profile.class', 'Class')}</dt>
              <dd className="font-medium text-surface-foreground">{learner.className ?? '—'}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {session.role === 'guardian' ? (
        <Card
          title={t('profile.consent', 'Consent and contact preferences')}
          className="border-slate-200 bg-surface-card"
          info={t(
            'profile.consentInfo',
            'These are the consent choices the school records for each child: whether reports and SMS are sent, and the channel and language to use.'
          )}
        >
          {loading && consents.length === 0 ? (
            <p className="text-sm text-surface-muted-fg">{t('common.loading', 'Loading…')}</p>
          ) : null}

          {consents.length === 0 && !loading ? (
            <p className="text-sm text-surface-muted-fg">
              {t('profile.noConsent', 'The school has not recorded contact preferences for your children yet.')}
            </p>
          ) : null}

          <div className="space-y-4">
            {consents.map((consent) => (
              <ConsentPanel key={consent.linkId} consent={consent} onSave={saveConsentFor} />
            ))}
          </div>

          <p className="mt-4 text-xs text-surface-muted-fg">
            {t(
              'profile.consentScope',
              'The school’s records hold these contact and reporting consents. Marketing, photography and data-sharing consents are not recorded in this system yet, so they cannot be changed here.'
            )}
          </p>
        </Card>
      ) : null}

      <Card title={t('profile.account', 'Account')} className="border-slate-200 bg-surface-card">
        <p className="text-sm text-surface-foreground">
          {session.role === 'guardian'
            ? t('profile.signedInGuardian', 'Signed in as a guardian: {{name}}', {
                name: session.displayName,
              })
            : t('profile.signedInLearner', 'Signed in as a learner.')}
        </p>
        <p className="mt-2 text-xs text-surface-muted-fg">
          {t(
            'profile.accountHelp',
            'Ask the school office to change the details on this account or to link another child.'
          )}
        </p>
      </Card>
    </PortalShell>
  );
};

const PortalProfilePage: React.FC = withPortalRepository(() => <PortalProfileContent />);

export default PortalProfilePage;
