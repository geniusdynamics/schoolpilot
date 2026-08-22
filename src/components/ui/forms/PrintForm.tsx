// ABOUTME: PrintForm component for print-optimized forms
// ABOUTME: Provides print-specific styling, page breaks, and print controls

import { ReactNode, forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import FormContainer, { FormContainerProps } from './FormContainer';
import { useTransition } from '../../../utils/animations';

export interface PrintFormField {
  /** Field label */
  label: string;
  /** Field value */
  value: ReactNode;
  /** Span multiple columns */
  colSpan?: 1 | 2 | 3 | 4;
}

export interface PrintFormProps extends Omit<FormContainerProps, 'type'> {
  /** Form content */
  children: ReactNode;
  /** Document title for print header */
  documentTitle?: string;
  /** Subtitle for print header */
  subtitle?: string;
  /** Organization/school name for header */
  organization?: string;
  /** Logo URL for print header */
  logoUrl?: string;
  /** Fields to display in print header on each page */
  headerFields?: PrintFormField[];
  /** Show print button */
  showPrintButton?: boolean;
  /** Custom print button text */
  printButtonText?: string;
  /** Custom close button text */
  closeButtonText?: string;
  /** Close handler */
  onClose?: () => void;
  /** Additional footer content for print */
  printFooter?: ReactNode;
  /** Page size for printing */
  pageSize?: 'a4' | 'letter' | 'legal';
  /** Include timestamp in print footer */
  includeTimestamp?: boolean;
  /** Include page numbers */
  includePageNumbers?: boolean;
}

export interface PrintFormRef {
  /** Reference to the form element */
  form: HTMLFormElement | null;
  /** Trigger browser print dialog */
  print: () => void;
  /** Submit the form */
  submit: () => void;
}

/**
 * PrintForm - Form component optimized for printing
 *
 * Provides print-specific styling with page breaks, headers on each page,
 * and hidden interactive elements when printing. Ideal for enrollment forms,
 * reports, and documents that need to be printed.
 *
 * @example
 * <PrintForm
 *   documentTitle="Student Enrollment Form"
 *   organization="Springfield Academy"
 *   headerFields={[
 *     { label: 'Student Name', value: 'John Doe' },
 *     { label: 'Grade', value: '10th' },
 *   ]}
 *   showPrintButton
 *   onClose={handleClose}
 * >
 *   <FormSection title="Personal Information">
 *     {/* Form fields *\/}
 *   </FormSection>
 * </PrintForm>
 */
const PrintForm = forwardRef<PrintFormRef, PrintFormProps>(({
  children,
  documentTitle,
  subtitle,
  organization,
  logoUrl,
  headerFields = [],
  showPrintButton = true,
  printButtonText = 'Print',
  closeButtonText = 'Close',
  onClose,
  printFooter,
  pageSize = 'a4',
  includeTimestamp = true,
  includePageNumbers = true,
  onSubmit,
  className = '',
  ...formProps
}, ref) => {
  const formRef = useRef<HTMLFormElement>(null);
  const transitionStyles = useTransition(['all']);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    form: formRef.current,
    print: () => {
      window.print();
    },
    submit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    },
  }));

  // Print handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Page size classes (used in print styles)
  const pageSizeClasses = {
    a4: 'print:w-[210mm]',
    letter: 'print:w-[8.5in]',
    legal: 'print:w-[8.5in]',
  };

  // Current timestamp
  const currentTimestamp = new Date().toLocaleString();

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: ${pageSize === 'a4' ? 'A4' : pageSize === 'letter' ? 'letter' : 'legal'};
            margin: 1in;
          }

          .print-form-header {
            display: table-header-group !important;
          }

          .print-form-footer {
            display: table-footer-group !important;
          }

          .print-form-no-break {
            break-inside: avoid;
          }

          .print-form-page-break {
            break-before: page;
          }

          .print-form-actions {
            display: none !important;
          }

          .print-form-field {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
          }

          .print-only {
            display: block !important;
          }

          .screen-only {
            display: none !important;
          }
        }

        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      <div className={`print-form-container ${pageSizeClasses[pageSize]}`}>
        {/* Print header (appears on each page) */}
        <div className="print-form-header print-only">
          <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4 mb-4">
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={organization || 'Logo'}
                  className="h-12 w-auto"
                />
              )}
              <div>
                {organization && (
                  <p className="text-sm font-medium text-gray-600">
                    {organization}
                  </p>
                )}
                {documentTitle && (
                  <h1 className="text-lg font-bold text-gray-900">
                    {documentTitle}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Header fields */}
            {headerFields.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {headerFields.map((field, index) => (
                  <div key={index} className={field.colSpan ? `col-span-${field.colSpan}` : ''}>
                    <span className="text-gray-500">{field.label}: </span>
                    <span className="font-medium">{field.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Screen-only form */}
        <FormContainer
          ref={formRef}
          type="print"
          onSubmit={onSubmit}
          className={`${className}`}
          style={{ ...transitionStyles, ...formProps.style }}
          {...formProps}
        >
          {/* Document title on screen */}
          {(documentTitle || subtitle) && (
            <div className="screen-only mb-6">
              {documentTitle && (
                <h1 className="text-2xl font-bold text-gray-900">
                  {documentTitle}
                </h1>
              )}
              {subtitle && (
                <p className="text-gray-600 mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Form content */}
          <div className="space-y-6">
            {children}
          </div>

          {/* Screen-only actions */}
          <div className="print-form-actions screen-only flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                {closeButtonText}
              </button>
            )}
            {showPrintButton && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                {printButtonText}
              </button>
            )}
          </div>
        </FormContainer>

        {/* Print footer (appears on each page) */}
        <div className="print-form-footer print-only">
          <div className="border-t border-gray-300 pt-4 mt-4 flex justify-between text-xs text-gray-500">
            <div>
              {printFooter}
            </div>
            <div className="flex gap-4">
              {includeTimestamp && (
                <span>Printed: {currentTimestamp}</span>
              )}
              {includePageNumbers && (
                <span>Page <span className="page-number" /> of <span className="page-count" /></span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

PrintForm.displayName = 'PrintForm';

export default PrintForm;
