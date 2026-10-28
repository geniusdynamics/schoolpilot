// ABOUTME: The KNEC pages and documents the KNEC plug-in's rules were read from, each with the day it
// ABOUTME: was fetched, so an export can say where its rules come from and what is still unsourced.

/** One page or document a rule was read from. */
export interface KnecSource {
  readonly title: string;
  readonly issuer: string;
  readonly url: string;
  /** The day this file's rules were read, in ISO form. */
  readonly retrieved: string;
  readonly edition?: string;
  readonly sections?: readonly string[];
}

/**
 * The KCSE examination management user guide: the candidate entry rule (§2.8.1, Table 2) and the
 * index-number allocation rules (§2.3.22 to §2.3.24) are read from it.
 */
export const KNEC_KCSE_USER_GUIDE: KnecSource = {
  title: 'User Guide for Management of the Kenya Certificate of Secondary Education (KCSE) Examination',
  issuer: 'Kenya National Examinations Council (KNEC)',
  url: 'https://www.knec.ac.ke/wp-content/uploads/2024/10/USER-GUIDE-FOR-KCSE-EXAMINATION-2024-EDITION-23rd-Oct_2.pdf',
  edition: '2nd Edition 2024',
  sections: ['2.3.22', '2.3.23', '2.3.24', '2.8.1'],
  retrieved: '2026-10-28',
};

/**
 * KNEC's own description of candidate registration: candidates are keyed on the portal and the
 * candidate list is downloaded for signing. It publishes no file layout to import.
 */
export const KNEC_REGISTRATION_SERVICE_PAGE: KnecSource = {
  title: 'Registration of Candidates',
  issuer: 'Kenya National Examinations Council (KNEC)',
  url: 'https://www.knec.ac.ke/services/registration-of-candidates/index.html',
  sections: ['Registration of Candidates'],
  retrieved: '2026-10-28',
};

/** The portal whose KCSE section carries the candidate registration form. */
export const KNEC_EXAMINATION_PORTAL: KnecSource = {
  title: 'KNEC Examination Portal',
  issuer: 'Kenya National Examinations Council (KNEC)',
  url: 'https://knec-portal.ac.ke/',
  sections: ['Secondary Schools (KCSE) - Candidate Registration', 'Primary and Junior Schools - CBA Portal'],
  retrieved: '2026-10-28',
};
