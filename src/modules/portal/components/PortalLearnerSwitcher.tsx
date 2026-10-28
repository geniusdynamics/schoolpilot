// ABOUTME: The child switcher a guardian with more than one learner uses. A 44 px control, labelled,
// ABOUTME: so it works on a phone and with a keyboard.

import React from 'react';
import { useTranslation } from 'react-i18next';

import type { PortalLearner } from '../data/portalAccess';

interface PortalLearnerSwitcherProps {
  readonly learners: readonly PortalLearner[];
  readonly selectedId: string;
  readonly onSelect: (learnerId: string) => void;
}

export const PortalLearnerSwitcher: React.FC<PortalLearnerSwitcherProps> = ({
  learners,
  selectedId,
  onSelect,
}) => {
  const { t } = useTranslation('portal');
  const id = 'portal-learner-switcher';

  return (
    <div className="w-full sm:w-64">
      <label
        htmlFor={id}
        className="mb-1 block text-sm font-medium text-surface-foreground"
      >
        {t('shell.switchChild', 'Viewing')}
      </label>
      <select
        id={id}
        value={selectedId}
        onChange={(event) => onSelect(event.target.value)}
        className="min-h-11 w-full rounded-md border border-surface-border bg-surface-card px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {learners.map((learner) => (
          <option key={learner.id} value={learner.id}>
            {learner.name}
          </option>
        ))}
      </select>
    </div>
  );
};
