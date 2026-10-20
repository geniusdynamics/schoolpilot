// ABOUTME: Printable report header showing the saved school name, address and contacts from school_details.
// ABOUTME: Renders nothing until a school profile with a name has been saved.

import React from 'react';
import { useSchoolProfile, formatSchoolAddress, formatSchoolContact } from '@/hooks/useSchoolProfile';

interface SchoolLetterheadProps {
  /** Report title printed under the school details. */
  title?: string;
  className?: string;
}

const SchoolLetterhead: React.FC<SchoolLetterheadProps> = ({ title, className = '' }) => {
  const { profile, schoolName } = useSchoolProfile();
  if (!schoolName) return null;
  const address = formatSchoolAddress(profile);
  const contact = formatSchoolContact(profile);

  return (
    <div data-testid="school-letterhead" className={`text-center mb-4 ${className}`}>
      <h2 className="text-xl font-bold text-surface-foreground">{schoolName}</h2>
      {address && <p className="text-sm text-surface-muted-fg">{address}</p>}
      {contact && <p className="text-sm text-surface-muted-fg">{contact}</p>}
      {title && <p className="mt-1 text-sm font-semibold text-surface-foreground">{title}</p>}
    </div>
  );
};

export default SchoolLetterhead;
