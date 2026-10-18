// ABOUTME: Type declarations for the zero-dependency vitest summary helper.
// ABOUTME: Lets typechecked scripts import the .mjs module without an implicit-any error.

export function summariseVitestRun(
  output: string,
  options: { ok: boolean; status?: number | null; signal?: string | null },
): string;
