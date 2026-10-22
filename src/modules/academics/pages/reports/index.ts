// ABOUTME: Public surface of report publishing: the page, the batch generation, the review and the
// ABOUTME: publisher, the print/PDF distribution and the snapshot primitives a test drives directly.

export { ReportsPageContent, default as ReportsPage } from './ReportsPage';
export { ReviewPanel } from './ReviewPanel';
export { DistributionPanel } from './DistributionPanel';

export { assembleCard, generateBatch, ReportAssemblyError, type GenerateOptions } from './assembly';

export {
  createMemoryPublicationStore,
  createRepositoryPublicationStore,
  createStoragePublicationStore,
  ReportPublisher,
  reviewBatch,
  type PublicationStore,
  type PublisherOptions,
  type ReviewOptions,
} from './publish';

export {
  buildPortalLink,
  buildPrintQueue,
  buildSmsLink,
  buildSmsNotice,
  createHubPdfExecutor,
  createUnavailablePdfExecutor,
  documentPrintUrl,
  orderPrintEntries,
  printBatchInBrowser,
  PrintQueue,
  renderQueuePdf,
  runPrintQueue,
  smsToken,
  type PdfRenderRequest,
  type PrintQueueSource,
  type ReportPdfExecutor,
} from './distribution';

export {
  documentIdFor,
  documentModel,
  freezeDocument,
  hashSnapshotContent,
  keyedSignature,
  signSnapshot,
  snapshotContentJson,
  type FrozenLabelSource,
} from './snapshot';

export {
  useReportPublishing,
  type ReportHosts,
  type ReportPublishingOptions,
  type ReportPublishingState,
} from './useReportPublishing';

export {
  findTemplate,
  PACK_DEFAULT_LOCALE,
  PACK_LOCALES,
  PACK_REPORT_TEMPLATES,
  PACK_VERSION,
} from './data/packReports';

export * from './types';
