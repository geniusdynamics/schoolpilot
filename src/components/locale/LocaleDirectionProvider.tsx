// ABOUTME: Publishes a locale's reading direction on a subtree and, by default, on the document, so
// ABOUTME: Tailwind's logical utilities (ms/me/ps/pe/start/end/border-s/border-e/text-start) mirror
// ABOUTME: the layout. Use it around a subtree rendered in a locale other than the app's.

import { useEffect, useMemo, type ReactNode } from 'react';

import { applyLocaleDirection, localeAttributes } from '@/utils/locale';

export interface LocaleDirectionProviderProps {
  /** The BCP-47 tag of the locale the subtree is rendered in. */
  readonly locale: string;
  readonly children: ReactNode;
  /** Also publish `lang`/`dir` on `<html>`, which is what logical CSS outside this subtree reads. */
  readonly applyToDocument?: boolean;
  readonly className?: string;
}

/**
 * Wraps a subtree in a `dir`-carrying element.
 *
 * The `dir` attribute is what Tailwind's `rtl:`/`ltr:` variants and the logical utilities key off,
 * so an Arabic subtree mirrors without any component asking for a side.
 */
export function LocaleDirectionProvider({
  locale,
  children,
  applyToDocument = true,
  className = '',
}: LocaleDirectionProviderProps) {
  const attributes = useMemo(() => localeAttributes(locale), [locale]);

  useEffect(() => {
    if (applyToDocument) applyLocaleDirection(locale);
  }, [locale, applyToDocument]);

  return (
    <div {...attributes} data-locale-root="" className={className}>
      {children}
    </div>
  );
}

export default LocaleDirectionProvider;
