// ABOUTME: Public API of the printable report surface: the page frame, the block dispatcher, the print
// ABOUTME: entry point and the body portal that keeps the document outside the app shell.

export { ReportDocument, type ReportDocumentProps } from './ReportDocument';
export { ReportBlock } from './ReportBlock';
export { ReportPrintSurface } from './ReportPrintSurface';
export { ReportToolbar } from './ReportToolbar';
export { beginPrint, endPrint, isPrinting, printReport, PRINTING_ATTRIBUTE, type PrintEnvironment } from './print';
