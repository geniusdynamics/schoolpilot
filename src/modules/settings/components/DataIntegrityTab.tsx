// ABOUTME: The Data integrity tab: opens the canonical database and runs the integrity checks against it, as the
// ABOUTME: signed-in user. The page itself only reads the adapter it is given; nothing used to give it one.

import React from 'react';

import Card from '@/components/ui/Card';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/contexts/AuthContext';

import { useCanonicalAdapter } from '../hooks/useCanonicalAdapter';
import { DataIntegrityContent } from '../pages/DataIntegrityPage';

/** The integrity checks, wired to the school's canonical database. */
export const DataIntegrityTab: React.FC = () => {
  const { adapter, error } = useCanonicalAdapter();
  const { user } = useAuth();

  if (error) {
    return (
      <Card>
        <p role="alert" className="text-sm text-red-700">
          The integrity checks need the school database, and it could not be opened: {error}
        </p>
      </Card>
    );
  }

  if (!adapter) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return <DataIntegrityContent adapter={adapter} actor={user?.username} />;
};

export default DataIntegrityTab;
