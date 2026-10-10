// ABOUTME: Behaviour tests for recording and editing student payments on StudentPaymentsPage.
// ABOUTME: Covers recordStudentPayment wiring, auto receipt numbers, and error messages shown inside the dialog.

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StudentPaymentsPage from '../pages/StudentPaymentsPage';

const toast = {
  showToast: vi.fn(),
  showSuccess: vi.fn(),
  showError: vi.fn(),
  showWarning: vi.fn(),
  showInfo: vi.fn(),
};
vi.mock('@/hooks/useToast', () => ({ useToast: () => toast }));

const collection = {
  data: [],
  loading: false,
  error: null,
  refresh: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  collection: null,
};
vi.mock('@/hooks/useDatabaseCollection', () => ({ useDatabaseCollection: () => collection }));

const year = new Date().getFullYear();

const appData = {
  studentPayments: [
    {
      id: 'p1',
      student_id: 'student1',
      student_name: 'John Doe',
      receipt_no: `RCT/${year}/000002`,
      total_amount_paid: 5000,
      payment_method: 'Cash',
      transaction_date: `${year}-01-15`,
      reference_no: '',
      created_at: `${year}-01-15T10:00:00Z`,
      updated_at: `${year}-01-15T10:00:00Z`,
    },
    {
      id: 'p0',
      student_id: 'student1',
      student_name: 'John Doe',
      receipt_no: `RCT/${year}/000001`,
      total_amount_paid: 1000,
      payment_method: 'Cash',
      transaction_date: `${year}-01-10`,
      reference_no: '',
      created_at: `${year}-01-10T10:00:00Z`,
      updated_at: `${year}-01-10T10:00:00Z`,
    },
  ],
  students: [
    { id: 'student1', first_name: 'John', last_name: 'Doe', admission_no: 'ADM001' },
    { id: 'student2', first_name: 'Amina', last_name: 'Wanjiru', admission_no: 'ADM002' },
  ],
  loading: { studentPayments: false, students: false },
  recordStudentPayment: vi.fn(),
  refreshData: vi.fn(),
};
vi.mock('@/hooks/useAppData', () => ({ useAppData: () => appData }));

const openRecordDialog = () => {
  fireEvent.click(screen.getAllByRole('button', { name: /Record Payment/i })[0]);
  return screen.getByRole('dialog');
};
const field = (dialog: HTMLElement, name: string) =>
  dialog.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement;
const submit = (dialog: HTMLElement, label: RegExp = /Record Payment/i) =>
  fireEvent.click(within(dialog).getByRole('button', { name: label }));

describe('StudentPaymentsPage — recording a payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appData.recordStudentPayment.mockResolvedValue({ id: 'new' });
    appData.refreshData.mockResolvedValue(undefined);
    collection.update.mockResolvedValue({ id: 'p1' });
    collection.remove.mockResolvedValue(true);
  });

  it('pre-fills the next gap-free receipt number for the current year', () => {
    render(<StudentPaymentsPage />);
    const dialog = openRecordDialog();
    expect(field(dialog, 'receipt_no')).toHaveValue(`RCT/${year}/000003`);
  });

  it('records the payment through recordStudentPayment and closes the dialog', async () => {
    render(<StudentPaymentsPage />);
    const dialog = openRecordDialog();
    fireEvent.change(field(dialog, 'student_id'), { target: { name: 'student_id', value: 'student2' } });
    fireEvent.change(field(dialog, 'total_amount_paid'), { target: { name: 'total_amount_paid', value: '10000' } });
    fireEvent.change(field(dialog, 'payment_method'), { target: { name: 'payment_method', value: 'Mobile Money' } });
    submit(dialog);

    await waitFor(() => expect(appData.recordStudentPayment).toHaveBeenCalledTimes(1));
    expect(appData.recordStudentPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 'student2',
        student_name: 'Amina Wanjiru',
        receipt_no: `RCT/${year}/000003`,
        total_amount_paid: 10000,
        payment_method: 'Mobile Money',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toast.showSuccess).toHaveBeenCalled();
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it('shows the save error inside the dialog and keeps it open', async () => {
    appData.recordStudentPayment.mockRejectedValue(new Error('Database is read-only'));
    render(<StudentPaymentsPage />);
    const dialog = openRecordDialog();
    fireEvent.change(field(dialog, 'student_id'), { target: { name: 'student_id', value: 'student1' } });
    fireEvent.change(field(dialog, 'total_amount_paid'), { target: { name: 'total_amount_paid', value: '500' } });
    submit(dialog);

    const alert = await within(screen.getByRole('dialog')).findByRole('alert');
    expect(alert).toHaveTextContent(/Failed to save student payment/i);
    expect(alert).toHaveTextContent(/Database is read-only/);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a validation message in the dialog when required fields are missing', async () => {
    render(<StudentPaymentsPage />);
    const dialog = openRecordDialog();
    submit(dialog);

    const alert = await within(screen.getByRole('dialog')).findByRole('alert');
    expect(alert).toHaveTextContent(/student/i);
    expect(appData.recordStudentPayment).not.toHaveBeenCalled();
  });

  it('shows a message in the dialog when the amount is not a positive number', async () => {
    render(<StudentPaymentsPage />);
    const dialog = openRecordDialog();
    fireEvent.change(field(dialog, 'student_id'), { target: { name: 'student_id', value: 'student1' } });
    fireEvent.change(field(dialog, 'total_amount_paid'), { target: { name: 'total_amount_paid', value: '-5' } });
    submit(dialog);

    const alert = await within(screen.getByRole('dialog')).findByRole('alert');
    expect(alert).toHaveTextContent(/amount/i);
    expect(appData.recordStudentPayment).not.toHaveBeenCalled();
  });

  it('rejects a receipt number that is already in use', async () => {
    render(<StudentPaymentsPage />);
    const dialog = openRecordDialog();
    fireEvent.change(field(dialog, 'student_id'), { target: { name: 'student_id', value: 'student1' } });
    fireEvent.change(field(dialog, 'receipt_no'), { target: { name: 'receipt_no', value: `RCT/${year}/000001` } });
    fireEvent.change(field(dialog, 'total_amount_paid'), { target: { name: 'total_amount_paid', value: '500' } });
    submit(dialog);

    const alert = await within(screen.getByRole('dialog')).findByRole('alert');
    expect(alert).toHaveTextContent(`RCT/${year}/000001`);
    expect(appData.recordStudentPayment).not.toHaveBeenCalled();
  });

  it('uses the year of the transaction date for the auto receipt number', () => {
    render(<StudentPaymentsPage />);
    const dialog = openRecordDialog();
    fireEvent.change(field(dialog, 'transaction_date'), { target: { name: 'transaction_date', value: `${year + 1}-01-05` } });
    expect(field(dialog, 'receipt_no')).toHaveValue(`RCT/${year + 1}/000001`);
  });
});

describe('StudentPaymentsPage — editing a payment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appData.refreshData.mockResolvedValue(undefined);
    collection.update.mockResolvedValue({ id: 'p1' });
  });

  it('saves changes to the existing record without flagging its own receipt number as a duplicate', async () => {
    render(<StudentPaymentsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /Edit/i })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(field(dialog, 'total_amount_paid'), { target: { name: 'total_amount_paid', value: '7500' } });
    submit(dialog, /Save Changes/i);

    await waitFor(() => expect(collection.update).toHaveBeenCalledTimes(1));
    const [id, patch] = collection.update.mock.calls[0];
    expect(['p0', 'p1']).toContain(id);
    expect(patch).toEqual(expect.objectContaining({ total_amount_paid: 7500 }));
    expect(appData.recordStudentPayment).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows an update failure inside the dialog', async () => {
    collection.update.mockRejectedValue(new Error('conflict'));
    render(<StudentPaymentsPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /Edit/i })[0]);
    submit(screen.getByRole('dialog'), /Save Changes/i);

    const alert = await within(screen.getByRole('dialog')).findByRole('alert');
    expect(alert).toHaveTextContent(/conflict/);
  });
});
