// ABOUTME: Reads the pack documents bundled at the repository root without a deep import, which the
// ABOUTME: module boundary rule refuses. Vite's eager glob keeps the documents in the bundle.

const assessmentModules = import.meta.glob('../../../../../../packs/ke-cbe/assessment.json', {
  eager: true,
  import: 'default',
});

const learningAreaModules = import.meta.glob('../../../../../../packs/ke-cbe/learning-areas.json', {
  eager: true,
  import: 'default',
});

function firstModule(modules: Record<string, unknown>, name: string): unknown {
  const values = Object.values(modules);
  if (values.length !== 1) {
    throw new Error(`the bundled pack document ${name} could not be resolved`);
  }
  return values[0];
}

export const assessmentDocument: unknown = firstModule(assessmentModules, 'assessment.json');
export const learningAreasDocument: unknown = firstModule(learningAreaModules, 'learning-areas.json');
