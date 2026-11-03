// ABOUTME: Renders an assessment scheme definition's readable lines inside the schemes grid.
// ABOUTME: The reading of the free-form definition lives in definitionLines.ts.

import React from 'react';

import { definitionLines } from './definitionLines';

export const SchemeDefinitionSummary: React.FC<{ readonly definition: unknown }> = ({
  definition,
}) => {
  const lines = definitionLines(definition);
  if (lines.length === 1 && lines[0] === 'The scheme definition is not a readable object.') {
    return <p className="text-xs text-surface-muted-fg">{lines[0]}</p>;
  }
  return (
    <ul className="space-y-0.5 text-xs text-surface-foreground">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
};
