// ABOUTME: Smoke tests for inventory pages (P0-H01, SO-11/22/23/25): data and CRUD come from the
// ABOUTME: database-backed module hooks, updates use update(id, patch), and string ids are never coerced.

import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import { databaseService } from '@/services/database/databaseService';
import WarehousesPage from '../WarehousesPage';
import ItemCategoriesPage from '../ItemCategoriesPage';
import ItemsPage from '../ItemsPage';
import FixedAssetsPage from '../FixedAssetsPage';
import StockLevelsPage from '../StockLevelsPage';
import { CanonicalRepositoryProvider } from '../../data/canonicalRepository';
import { createFakeRepository, type FakeRepository } from '@/modules/hr/data/__tests__/canonicalRepositoryDouble';
import StockIssuancePage from '../StockIssuancePage';
import StockReceptionPage from '../StockReceptionPage';
import StockReturnsPage from '../StockReturnsPage';
import PurchaseOrdersPage from '../PurchaseOrdersPage';
import RequisitionsPage from '../RequisitionsPage';
import SupplierContractsPage from '../SupplierContractsPage';

vi.mock('@/services/database/databaseService', () => ({
  databaseService: {
    getDatabase: vi.fn(),
    generateId: vi.fn(),
  },
}));

// The app-wide snapshot lacks the inventory mutators (SO-11). Pages may only read staff from it.
vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => ({
    staff: [{ id: 'stf-uuid-1', first_name: 'Jane', last_name: 'Wanjiru', is_active: true }],
    loading: {},
  }),
}));

type Row = { id: string } & Record<string, unknown>;

interface MemoryCollection {
  rows: () => Row[];
  find: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
}

function createMemoryCollection(seed: Row[] = []): MemoryCollection {
  let rows = seed.map((row) => ({ ...row }));
  return {
    rows: () => rows,
    find: vi.fn(async () => rows.map((row) => ({ ...row }))),
    insert: vi.fn(async (doc: Row) => {
      const saved = { ...doc, id: doc.id ?? `ins-${rows.length + 1}` };
      rows = [...rows, saved];
      return { ...saved };
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      if (typeof id !== 'string') throw new Error('Unsupported bind() argument type: object');
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id) ?? null;
    }),
    remove: vi.fn(async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
      return true;
    }),
  };
}

let collections: Record<string, MemoryCollection>;
let nextId = 0;

const collection = (name: string) => {
  if (!collections[name]) collections[name] = createMemoryCollection();
  return collections[name];
};

const renderPage = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ConfirmProvider>
        <CanonicalRepositoryProvider repository={repository}>{ui}</CanonicalRepositoryProvider>
      </ConfirmProvider>
    </MemoryRouter>
  );

const lastButton = (scope: HTMLElement) => {
  const buttons = within(scope).getAllByRole('button');
  return buttons[buttons.length - 1];
};

/** Picks the option with the given label from a ui/Select (native legacy mode or custom listbox). */
const chooseOption = async (combobox: HTMLElement, name: string | RegExp) => {
  if (combobox instanceof HTMLSelectElement) {
    const option = await within(combobox).findByRole('option', { name });
    fireEvent.change(combobox, { target: { value: (option as HTMLOptionElement).value } });
    return;
  }
  fireEvent.click(combobox);
  fireEvent.click(await screen.findByRole('option', { name }));
};

const stamp = { created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' };
const WH = '0d3c7a52-6f1e-4b8a-9a43-1d2e3f4a5b6c';
const CAT = '874b9758-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const ITEM = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e';
const STAFF_UUID = '874b9758-1f2e-4c1a-9d3e-0a1b2c3d4e5f';
let repository: FakeRepository;

beforeEach(() => {
  nextId = 0;
  repository = createFakeRepository({
    staff: [
      {
        id: STAFF_UUID,
        institution_id: '00000000-0000-7000-8000-000000000001',
        given_name: 'Jane',
        family_name: 'Wanjiru',
        name_order: 'given_first',
        gender: 'female',
        employee_number: 'EMP-1',
        employment_type: 'permanent',
        department_ids: [],
        start_date: '2020-01-01',
        homeroom_teacher_ids: [],
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ],
  });
  collections = {
    warehouses: createMemoryCollection([
      { id: WH, name: 'Central Store', ...stamp },
      { id: 'wh-2', name: 'Dining Hall Store', ...stamp },
    ]),
    item_categories_inv: createMemoryCollection([{ id: CAT, name: 'Writing Materials', ...stamp }]),
    items_inv: createMemoryCollection([
      { id: ITEM, name: 'Kasuku Exercise Book', category_id: CAT, unit_of_measure: 'Piece', item_type: 'Consumable', ...stamp },
      { id: 'item-asset', name: 'Projector', unit_of_measure: 'Piece', item_type: 'Fixed Asset', ...stamp },
    ]),
    fixed_assets: createMemoryCollection([
      { id: 'fa-1', item_id: 'item-asset', asset_tag: 'TAG-001', assigned_to_staff_id: 'stf-uuid-1', ...stamp },
    ]),
    stock_levels: createMemoryCollection([
      { id: 'sl-1', item_id: ITEM, warehouse_id: WH, quantity: 40, item_name: 'Kasuku Exercise Book', warehouse_name: 'Central Store' },
      { id: 'sl-2', item_id: 'item-asset', warehouse_id: 'wh-2', quantity: 2, item_name: 'Projector', warehouse_name: 'Dining Hall Store' },
    ]),
    stock_transactions: createMemoryCollection(),
    requisitions: createMemoryCollection([
      { id: 'req-1', requesting_staff_id: 'stf-uuid-1', request_date: '2026-01-05', status: 'Pending Approval', items: [], ...stamp },
    ]),
    purchase_orders: createMemoryCollection([
      { id: 'po-1', supplier_id: 'sup-uuid-1', order_date: '2026-01-05', status: 'Draft', items: [], ...stamp },
    ]),
    suppliers: createMemoryCollection([{ id: 'sup-uuid-1', name: 'Text Book Centre', status: 'Active', ...stamp }]),
    supplier_contracts: createMemoryCollection(),
  };
  vi.mocked(databaseService.getDatabase).mockResolvedValue({
    getCollection: (name: string) => collection(name),
  } as never);
  vi.mocked(databaseService.generateId).mockImplementation(() => `uuid-${++nextId}`);
});

describe('WarehousesPage (P0-H01)', () => {
  it('lists warehouses from the database and edits with update(id, patch)', async () => {
    renderPage(<WarehousesPage />);
    expect(await screen.findByText('Central Store')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getAllByRole('textbox')[0];
    expect(nameInput).toHaveValue('Central Store');
    fireEvent.change(nameInput, { target: { value: 'Central Store (Block A)' } });
    fireEvent.click(lastButton(dialog));

    await waitFor(() =>
      expect(collections.warehouses.update).toHaveBeenCalledWith(WH, expect.objectContaining({ name: 'Central Store (Block A)' }))
    );
  });

  it('deletes a warehouse by its string id', async () => {
    renderPage(<WarehousesPage />);
    await screen.findByText('Central Store');
    fireEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);
    fireEvent.click(lastButton(await screen.findByRole('dialog')));
    await waitFor(() => expect(collections.warehouses.remove).toHaveBeenCalledWith(WH));
  });
});

describe('ItemCategoriesPage (P0-H01)', () => {
  it('lists categories from the database and edits with update(id, patch)', async () => {
    renderPage(<ItemCategoriesPage />);
    expect(await screen.findByText('Writing Materials')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Writing Materials & Books' } });
    fireEvent.click(lastButton(dialog));

    await waitFor(() =>
      expect(collections.item_categories_inv.update).toHaveBeenCalledWith(CAT, expect.objectContaining({ name: 'Writing Materials & Books' }))
    );
  });
});

describe('ItemsPage (P0-H01)', () => {
  it('edits an item with update(id, patch) and keeps the UUID category id', async () => {
    renderPage(<ItemsPage />);
    expect(await screen.findByText('Kasuku Exercise Book')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'Kasuku Exercise Book A4' } });
    fireEvent.click(lastButton(dialog));

    await waitFor(() => expect(collections.items_inv.update).toHaveBeenCalledTimes(1));
    expect(collections.items_inv.update).toHaveBeenCalledWith(
      ITEM,
      expect.objectContaining({ name: 'Kasuku Exercise Book A4', category_id: CAT })
    );
  });
});

describe('FixedAssetsPage (P0-H01)', () => {
  it('lists fixed assets from the database and edits with update(id, patch)', async () => {
    renderPage(<FixedAssetsPage />);
    expect(await screen.findByText('TAG-001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    const tagInput = within(dialog).getAllByRole('textbox')[0];
    expect(tagInput).toHaveValue('TAG-001');
    fireEvent.change(tagInput, { target: { value: 'TAG-001A' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Save Changes/i }));

    await waitFor(() =>
      expect(collections.fixed_assets.update).toHaveBeenCalledWith(
        'fa-1',
        expect.objectContaining({ asset_tag: 'TAG-001A', item_id: 'item-asset', assigned_to_staff_id: 'stf-uuid-1' })
      )
    );
  });

  it('picks the assigned staff from the canonical repository', async () => {
    renderPage(<FixedAssetsPage />);
    await screen.findByText('TAG-001');

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));
    const dialog = await screen.findByRole('dialog');
    const picker = within(dialog).getByTestId('fixed-asset-staff-picker');
    fireEvent.click(picker);
    fireEvent.click(await screen.findByRole('option', { name: /Jane Wanjiru/ }));

    await waitFor(() =>
      expect(within(dialog).getByTestId('fixed-asset-staff-picker')).toHaveTextContent(/Jane Wanjiru/)
    );
  });
});

describe('StockLevelsPage (P0-H01)', () => {
  it('filters stock levels by a UUID warehouse id', async () => {
    renderPage(<StockLevelsPage />);
    expect(await screen.findByText('Kasuku Exercise Book')).toBeInTheDocument();
    expect(screen.getByText('Projector')).toBeInTheDocument();

    const [warehouseFilter] = screen.getAllByRole('combobox');
    await chooseOption(warehouseFilter, 'Central Store');

    await waitFor(() => expect(screen.queryByText('Projector')).not.toBeInTheDocument());
    expect(screen.getByText('Kasuku Exercise Book')).toBeInTheDocument();
  });
});

describe('StockIssuancePage (P0-H01)', () => {
  it('records an issue with string ids and draws down the stock level', async () => {
    renderPage(<StockIssuancePage />);
    fireEvent.click(await screen.findByRole('button', { name: /Issue Stock/i }));
    const dialog = await screen.findByRole('dialog');
    const [itemSelect, warehouseSelect] = within(dialog).getAllByRole('combobox');
    await waitFor(() => expect(collections.items_inv.find).toHaveBeenCalled());
    await chooseOption(itemSelect, /Kasuku Exercise Book/);
    await chooseOption(warehouseSelect, 'Central Store');
    fireEvent.change(within(dialog).getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Issue Item/i }));

    await waitFor(() => expect(collections.stock_transactions.insert).toHaveBeenCalledTimes(1));
    expect(collections.stock_transactions.insert).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: ITEM, warehouse_id: WH, transaction_type: 'Issue', quantity: 5 })
    );
    await waitFor(() => expect(collections.stock_levels.update).toHaveBeenCalledWith('sl-1', { quantity: 35 }));
  });
});

describe('StockReceptionPage (P0-H01)', () => {
  it('offers database items and warehouses and saves a receipt with string ids', async () => {
    renderPage(<StockReceptionPage />);
    fireEvent.click(await screen.findByRole('button', { name: /New Reception/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Item/i }));

    const [itemSelect, warehouseSelect] = within(dialog).getAllByRole('combobox');
    await chooseOption(itemSelect, /Kasuku Exercise Book/);
    await chooseOption(warehouseSelect, 'Central Store');
    fireEvent.change(within(dialog).getAllByRole('spinbutton')[0], { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(collections.stock_transactions.insert).toHaveBeenCalledTimes(1));
    expect(collections.stock_transactions.insert).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: ITEM, warehouse_id: WH, transaction_type: 'Receipt', quantity: 10 })
    );
    await waitFor(() => expect(collections.stock_levels.update).toHaveBeenCalledWith('sl-1', { quantity: 50 }));
  });
});

describe('StockReturnsPage (P0-H01)', () => {
  it('returns database items to store with string ids and adds the stock back', async () => {
    renderPage(<StockReturnsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /New Return/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Add Item/i }));

    // Comboboxes: return type, then per row: item, warehouse, reason, condition
    const [, itemSelect, warehouseSelect, reasonSelect] = within(dialog).getAllByRole('combobox');
    await chooseOption(itemSelect, /Kasuku Exercise Book/);
    await chooseOption(warehouseSelect, 'Central Store');
    await chooseOption(reasonSelect, 'Overstocked');
    fireEvent.change(within(dialog).getAllByRole('spinbutton')[0], { target: { value: '4' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(collections.stock_transactions.insert).toHaveBeenCalledTimes(1));
    expect(collections.stock_transactions.insert).toHaveBeenCalledWith(
      expect.objectContaining({ item_id: ITEM, warehouse_id: WH, transaction_type: 'Return to Store' })
    );
    await waitFor(() => expect(collections.stock_levels.update).toHaveBeenCalledWith('sl-1', { quantity: 44 }));
  });
});

describe('PurchaseOrdersPage (P0-H01)', () => {
  it('lists purchase orders from the database and deletes by string id', async () => {
    renderPage(<PurchaseOrdersPage />);
    expect(await screen.findByText('po-1')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Delete$/i })[0]);
    fireEvent.click(lastButton(await screen.findByRole('dialog')));
    await waitFor(() => expect(collections.purchase_orders.remove).toHaveBeenCalledWith('po-1'));
  });

  it('edits a purchase order with update(id, patch) keeping the supplier UUID', async () => {
    renderPage(<PurchaseOrdersPage />);
    await screen.findByText('po-1');
    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(lastButton(dialog));
    await waitFor(() =>
      expect(collections.purchase_orders.update).toHaveBeenCalledWith(
        'po-1',
        expect.objectContaining({ supplier_id: 'sup-uuid-1', items: [] })
      )
    );
  });
});

describe('RequisitionsPage (P0-H01)', () => {
  it('lists requisitions from the database and edits with update(id, patch)', async () => {
    renderPage(<RequisitionsPage />);
    expect(await screen.findByText('req-1')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /^Edit$/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(lastButton(dialog));
    await waitFor(() =>
      expect(collections.requisitions.update).toHaveBeenCalledWith(
        'req-1',
        expect.objectContaining({ requesting_staff_id: 'stf-uuid-1', items: [] })
      )
    );
  });
});

describe('SupplierContractsPage (P0-H01)', () => {
  it('saves a contract with the supplier UUID and a database-generated id', async () => {
    renderPage(<SupplierContractsPage />);
    await waitFor(() => expect(collections.suppliers.find).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: /add|new|create/i })[0]);
    const dialog = await screen.findByRole('dialog');
    const [numberInput, titleInput] = within(dialog).getAllByRole('textbox');
    fireEvent.change(numberInput, { target: { value: 'CT-2027-01' } });
    fireEvent.change(titleInput, { target: { value: 'Exercise books supply' } });
    await chooseOption(within(dialog).getAllByRole('combobox')[0], 'Text Book Centre');
    fireEvent.click(lastButton(dialog));

    await waitFor(() => expect(collections.supplier_contracts.insert).toHaveBeenCalledTimes(1));
    const saved = collections.supplier_contracts.insert.mock.calls[0][0] as Row;
    expect(saved.supplier_id).toBe('sup-uuid-1');
    expect(saved.supplier_name).toBe('Text Book Centre');
    // The id comes from the database id generator, not Date.now()
    expect(saved.id).toBe('uuid-1');
  });
});
