// ABOUTME: Administration's Entry Marks route is an alias of the one canonical marks-entry workspace.
// ABOUTME: The old mock Pre-NA grid is gone; the real page supports class, stream, learner search and profile links.

import React from 'react';
import { Navigate } from 'react-router-dom';

const EntryMarksPage: React.FC = () => (
  <Navigate to="/academics/marks-entry?tab=student-results" replace />
);

export default EntryMarksPage;
