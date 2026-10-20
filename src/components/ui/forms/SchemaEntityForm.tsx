// ABOUTME: Schema-bound entity form that validates with the entity's own zod schema.
// ABOUTME: Maps issues to field metadata, tracks dirty state and resets when the record changes.

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type { z } from 'zod/v4';

import Button from '../Button';
import { defaultFieldWidgets, type FieldWidgetProps, type FieldWidgetRegistry } from './fieldRegistry';
import {
  fieldControlId,
  formRecord,
  getValueAtPath,
  groupFields,
  orderFields,
  resolveFieldOptions,
  resolveFieldRequired,
  resolveFieldWidget,
  setValueAtPath,
  stableFormValue,
  type EntityFormFieldMeta,
  type EntityFormLookup,
  type FieldOption,
  type FieldWidget,
} from './fieldTypes';
import { validateEntityForm } from './validation';

export interface SchemaEntityFormProps<S extends z.ZodType> {
  /** The canonical entity schema; the repository validates with the same object. */
  readonly schema: S;
  readonly fields: readonly EntityFormFieldMeta[];
  /** Seed values for the current record. Changing the object identity never resets a dirty form. */
  readonly initialValues?: Partial<z.input<S>>;
  /** Identifies the record; a change resets the form even when the current values are dirty. */
  readonly recordKey?: string | null;
  readonly onSubmit: (values: z.input<S>) => Promise<void> | void;
  readonly onCancel?: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  /** Error returned by a repository or server; rendered at form level. */
  readonly serverError?: string | null;
  /** Parent-controlled submit state, combined with the form's own in-flight state. */
  readonly submitting?: boolean;
  readonly lookups?: Readonly<Record<string, EntityFormLookup>>;
  /** Overrides for the default widget registry. */
  readonly widgets?: Partial<FieldWidgetRegistry>;
  readonly title?: string;
  readonly description?: string;
  readonly submitLabel?: string;
  readonly submittingLabel?: string;
  readonly cancelLabel?: string;
  readonly idPrefix?: string;
  readonly className?: string;
  readonly children?: ReactNode;
}

type FieldErrors = Readonly<Record<string, readonly string[]>>;

function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') return error.message;
  return 'Could not save. Please try again.';
}

function sameMessages(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((message, index) => message === b[index]);
}

export function SchemaEntityForm<S extends z.ZodType>({
  schema,
  fields,
  initialValues,
  recordKey,
  onSubmit,
  onCancel,
  onDirtyChange,
  serverError,
  submitting = false,
  lookups,
  widgets,
  title,
  description,
  submitLabel = 'Save',
  submittingLabel = 'Saving…',
  cancelLabel = 'Cancel',
  idPrefix,
  className = '',
  children,
}: SchemaEntityFormProps<S>) {
  const generatedId = useId();
  const prefix = useMemo(
    () => idPrefix ?? `entity-form-${generatedId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [generatedId, idPrefix]
  );
  const summaryId = `${prefix}-summary`;
  const titleId = `${prefix}-title`;

  const initialRecordRef = useRef<Record<string, unknown> | null>(null);
  if (initialRecordRef.current === null) initialRecordRef.current = formRecord(initialValues);
  const initialJsonRef = useRef<string | null>(null);
  if (initialJsonRef.current === null) {
    initialJsonRef.current = stableFormValue(initialRecordRef.current);
  }

  const [values, setValues] = useState<Record<string, unknown>>(() =>
    formRecord(initialValues)
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [widgetErrors, setWidgetErrors] = useState<Readonly<Record<string, string>>>({});
  const [formErrors, setFormErrors] = useState<readonly string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number } | null>(null);

  const valuesRef = useRef(values);
  valuesRef.current = values;
  const widgetErrorsRef = useRef<Record<string, string>>({});
  const dirtyRef = useRef(false);
  const lastRecordKeyRef = useRef<string | null | undefined>(recordKey);
  const lastReportedDirtyRef = useRef<boolean | null>(null);
  const submitLockRef = useRef(false);
  const focusNonceRef = useRef(0);

  const resetTo = useCallback((next: unknown) => {
    const record = formRecord(next);
    initialRecordRef.current = record;
    initialJsonRef.current = stableFormValue(record);
    valuesRef.current = record;
    widgetErrorsRef.current = {};
    setValues(record);
    setFieldErrors({});
    setWidgetErrors({});
    setFormErrors([]);
    setSubmitError(null);
    setSubmitAttempted(false);
    setFocusRequest(null);
    setResetNonce((current) => current + 1);
  }, []);

  // A new record key always resets. Without one, only pristine forms follow a changed seed,
  // so an async record load cannot overwrite edits the user has started.
  useEffect(() => {
    if (lastRecordKeyRef.current !== recordKey) {
      lastRecordKeyRef.current = recordKey;
      resetTo(initialValues);
      return;
    }
    if (!dirtyRef.current) resetTo(initialValues);
  }, [recordKey, initialValues, resetTo]);

  const dirty = stableFormValue(values) !== initialJsonRef.current;
  dirtyRef.current = dirty;

  useEffect(() => {
    if (lastReportedDirtyRef.current === dirty) return;
    lastReportedDirtyRef.current = dirty;
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!focusRequest) return;
    const element = document.getElementById(focusRequest.id);
    if (element instanceof HTMLElement) element.focus();
  }, [focusRequest]);

  const fieldPaths = useMemo(() => fields.map((field) => field.path), [fields]);
  const groups = useMemo(() => groupFields(fields), [fields]);
  const registry = useMemo(() => ({ ...defaultFieldWidgets, ...widgets }), [widgets]);

  const requestFocus = (id: string) => {
    focusNonceRef.current += 1;
    setFocusRequest({ id, nonce: focusNonceRef.current });
  };

  const lookupFor = (meta: EntityFormFieldMeta): EntityFormLookup | undefined => {
    const key = meta.lookupKey ?? meta.path;
    return lookups?.[key] ?? lookups?.[meta.path];
  };

  const handleChange = (path: string, next: unknown) => {
    setValues((current) => setValueAtPath(current, path, next));
    setFieldErrors((current) => {
      if (!current[path]) return current;
      const copy = { ...current };
      delete copy[path];
      return copy;
    });
    setFormErrors([]);
    setSubmitError(null);
  };

  const handleWidgetValidity = (path: string, valid: boolean, message?: string) => {
    const next = { ...widgetErrorsRef.current };
    if (valid) {
      if (next[path] === undefined) return;
      delete next[path];
    } else {
      next[path] = message ?? 'Invalid value';
    }
    widgetErrorsRef.current = next;
    setWidgetErrors(next);
  };

  const validateFieldOnBlur = (path: string) => {
    const result = validateEntityForm(schema, valuesRef.current, fieldPaths);
    const next = result.fieldErrors[path] ?? [];
    setFieldErrors((current) => {
      const existing = current[path] ?? [];
      if (sameMessages(existing, next)) return current;
      const copy = { ...current };
      if (next.length === 0) delete copy[path];
      else copy[path] = next;
      return copy;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockRef.current || isSubmitting || submitting) return;

    setSubmitAttempted(true);
    const result = validateEntityForm(schema, valuesRef.current, fieldPaths);
    setFieldErrors(result.fieldErrors);
    setFormErrors(result.formErrors);
    setSubmitError(null);

    const currentWidgetErrors = Object.fromEntries(
      Object.entries(widgetErrorsRef.current).filter(([path]) => fieldPaths.includes(path))
    );
    const widgetErrorCount = Object.keys(currentWidgetErrors).length;

    if (!result.success || widgetErrorCount > 0) {
      const firstInvalid = orderFields(fields).find(
        (field) =>
          currentWidgetErrors[field.path] !== undefined ||
          (result.fieldErrors[field.path]?.length ?? 0) > 0
      );
      requestFocus(firstInvalid ? fieldControlId(prefix, firstInvalid.path) : summaryId);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      await onSubmit(result.data);
    } catch (error) {
      setSubmitError(messageFromError(error));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || submitting;
  const fieldErrorCount = Object.keys(fieldErrors).length;
  const widgetErrorCount = Object.keys(widgetErrors).filter((path) =>
    fieldPaths.includes(path)
  ).length;
  const errorMessage = submitError ?? serverError ?? undefined;
  const hasErrors =
    fieldErrorCount > 0 ||
    widgetErrorCount > 0 ||
    formErrors.length > 0 ||
    Boolean(errorMessage);
  const showSummary = hasErrors && (submitAttempted || Boolean(serverError));

  const renderField = (meta: EntityFormFieldMeta) => {
    const widget: FieldWidget = resolveFieldWidget(meta, schema);
    const options: readonly FieldOption[] | undefined = resolveFieldOptions(meta, schema);
    const renderer = registry[widget] ?? defaultFieldWidgets[widget];
    const errorText = fieldErrors[meta.path]?.join(' ') ?? undefined;
    const Renderer = renderer;

    const widgetProps: FieldWidgetProps = {
      meta,
      id: fieldControlId(prefix, meta.path),
      value: getValueAtPath(values, meta.path),
      onChange: (next) => handleChange(meta.path, next),
      disabled: isBusy,
      readOnly: Boolean(meta.readOnly),
      required: resolveFieldRequired(meta, schema),
      error: errorText,
      options,
      lookup: lookupFor(meta),
      onValidityChange: (valid, message) =>
        handleWidgetValidity(meta.path, valid, message),
    };

    return (
      <div
        key={`${meta.path}:${resetNonce}`}
        className={meta.colSpan === 2 ? 'md:col-span-2' : ''}
        onBlur={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          validateFieldOnBlur(meta.path);
        }}
      >
        <Renderer {...widgetProps} />
      </div>
    );
  };

  return (
    <form
      noValidate
      className={`flex flex-col ${className}`}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'Entity form'}
      data-dirty={dirty ? 'true' : 'false'}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      {title ? (
        <h2 id={titleId} className="text-lg font-semibold text-surface-foreground">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="mt-1 text-sm text-surface-muted-fg">{description}</p>
      ) : null}

      {showSummary ? (
        <div
          id={summaryId}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {fieldErrorCount > 0 || widgetErrorCount > 0 || formErrors.length > 0 ? (
            <p className="font-medium">Please fix the highlighted fields before saving.</p>
          ) : null}
          {formErrors.length > 0 ? (
            <ul className="mt-1 list-disc pl-5">
              {formErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
          {errorMessage ? <p className="mt-1">{errorMessage}</p> : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-5">
        {groups.map((group) =>
          group.section ? (
            <fieldset key={group.section} className="min-w-0 border-0 p-0">
              <legend className="mb-3 text-sm font-semibold text-surface-foreground">
                {group.section}
              </legend>
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2">
                {group.fields.map(renderField)}
              </div>
            </fieldset>
          ) : (
            <div
              key="default"
              className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-2"
            >
              {group.fields.map(renderField)}
            </div>
          )
        )}
      </div>

      {children}

      <div className="mt-6 flex flex-col-reverse gap-2 border-t border-surface-border pt-4 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isBusy}>
            {cancelLabel}
          </Button>
        ) : null}
        <Button type="submit" variant="primary" loading={isBusy} disabled={isBusy}>
          {isBusy ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default SchemaEntityForm;
