import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  Modal,
  Input,
  Select,
  Textarea,
  Table,
  Alert,
  Badge,
  Spinner
} from '@/components/ui';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ReceiptRefundIcon
} from '@/components/ui/icons';
import { useItemData, useWarehouseData, useStockTransactionData, useStockLevelData } from '../data';
import { InvStockTransactionType, InvItemType, InvWarehouseType } from '../data/types';

interface StockReturnItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  batch_number?: string;
  expiry_date?: string;
  warehouse_id: number;
  warehouse_name: string;
  return_reason: string;
  condition: 'GOOD' | 'DAMAGED' | 'EXPIRED' | 'DEFECTIVE';
  notes?: string;
}

interface StockReturnForm {
  return_date: string;
  reference_number?: string;
  return_type: 'RETURN_TO_STORE' | 'RETURN_TO_SUPPLIER';
  supplier_reference?: string;
  notes?: string;
  items: StockReturnItem[];
}

const RETURN_REASONS = [
  'Overstocked',
  'Damaged in transit',
  'Wrong item received',
  'Quality issues',
  'Expired product',
  'Customer return',
  'Defective product',
  'Other'
];

const StockReturnsPage: React.FC = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReturn, setEditingReturn] = useState<StockReturnForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data hooks
  const { items, loading: itemsLoading } = useItemData();
  const { warehouses, loading: warehousesLoading } = useWarehouseData();
  const { createStockTransaction, getStockTransactionsByType } = useStockTransactionData();
  const { updateStockLevel } = useStockLevelData();

  useEffect(() => {
    loadReturns();
  }, []);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const returnToStoreTransactions = await getStockTransactionsByType(InvStockTransactionType.RETURN_TO_STORE);
      const returnToSupplierTransactions = await getStockTransactionsByType(InvStockTransactionType.RETURN_TO_SUPPLIER);
      const allReturns = [...returnToStoreTransactions, ...returnToSupplierTransactions];
      
      // Group transactions by reference number or date to show as returns
      const groupedReturns = groupTransactionsByReturn(allReturns);
      setReturns(groupedReturns);
    } catch (err) {
      setError('Failed to load stock returns');
    } finally {
      setLoading(false);
    }
  };

  const groupTransactionsByReturn = (transactions: any[]) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const key = transaction.source_id || transaction.transaction_date;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          return_date: transaction.transaction_date,
          reference_number: transaction.source_id,
          return_type: transaction.transaction_type,
          items: [],
          total_quantity: 0
        };
      }
      acc[key].items.push(transaction);
      acc[key].total_quantity += Math.abs(transaction.quantity);
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const handleOpenDialog = (returnRecord?: any) => {
    if (returnRecord) {
      setEditingReturn({
        return_date: returnRecord.return_date,
        reference_number: returnRecord.reference_number,
        return_type: returnRecord.return_type,
        supplier_reference: '',
        notes: '',
        items: returnRecord.items.map((item: any) => ({
          id: item.id,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: Math.abs(item.quantity),
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          warehouse_id: item.warehouse_id,
          warehouse_name: item.warehouse_name,
          return_reason: 'Other',
          condition: 'GOOD' as const,
          notes: item.notes
        }))
      });
    } else {
      setEditingReturn({
        return_date: new Date().toISOString().split('T')[0],
        reference_number: `RET-${Date.now()}`,
        return_type: 'RETURN_TO_STORE',
        supplier_reference: '',
        notes: '',
        items: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingReturn(null);
    setError(null);
    setSuccess(null);
  };

  const handleAddItem = () => {
    if (!editingReturn) return;
    
    const newItem: StockReturnItem = {
      id: `temp-${Date.now()}`,
      item_id: '',
      item_name: '',
      quantity: 0,
      batch_number: '',
      expiry_date: '',
      warehouse_id: 0,
      warehouse_name: '',
      return_reason: '',
      condition: 'GOOD',
      notes: ''
    };
    
    setEditingReturn({
      ...editingReturn,
      items: [...editingReturn.items, newItem]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editingReturn) return;
    
    const updatedItems = editingReturn.items.filter((_, i) => i !== index);
    setEditingReturn({
      ...editingReturn,
      items: updatedItems
    });
  };

  const handleItemChange = (index: number, field: keyof StockReturnItem, value: any) => {
    if (!editingReturn) return;
    
    const updatedItems = [...editingReturn.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-populate item name when item is selected
    if (field === 'item_id') {
      const selectedItem = items.find(item => item.id === value);
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.name;
      }
    }
    
    // Auto-populate warehouse name when warehouse is selected
    if (field === 'warehouse_id') {
      const selectedWarehouse = warehouses.find(wh => wh.id === value);
      if (selectedWarehouse) {
        updatedItems[index].warehouse_name = selectedWarehouse.name;
      }
    }
    
    setEditingReturn({
      ...editingReturn,
      items: updatedItems
    });
  };

  const handleSaveReturn = async () => {
    if (!editingReturn) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate form
      if (editingReturn.items.length === 0) {
        setError('Please add at least one item to return');
        return;
      }
      
      for (const item of editingReturn.items) {
        if (!item.item_id || !item.warehouse_id || item.quantity <= 0 || !item.return_reason) {
          setError('Please fill in all required fields for each item');
          return;
        }
      }
      
      // Create stock transactions for each item
      for (const item of editingReturn.items) {
        const transactionData = {
          item_id: item.item_id,
          warehouse_id: item.warehouse_id,
          transaction_type: editingReturn.return_type === 'RETURN_TO_STORE' 
            ? InvStockTransactionType.RETURN_TO_STORE 
            : InvStockTransactionType.RETURN_TO_SUPPLIER,
          quantity: -item.quantity, // Negative quantity for returns
          batch_number: item.batch_number || undefined,
          expiry_date: item.expiry_date || undefined,
          source_table: 'stock_return',
          source_id: editingReturn.reference_number,
          transaction_date: editingReturn.return_date,
          notes: `Return Reason: ${item.return_reason}, Condition: ${item.condition}. ${editingReturn.notes || ''} ${item.notes || ''}`.trim()
        };
        
        await createStockTransaction(transactionData);
        
        // Update stock levels (reduce quantity)
        if (editingReturn.return_type === 'RETURN_TO_STORE') {
          const stockLevelId = `${item.item_id}|${item.warehouse_id}${item.batch_number ? `|${item.batch_number}` : ''}`;
          await updateStockLevel(stockLevelId, {
            item_id: item.item_id,
            warehouse_id: item.warehouse_id,
            quantity: -item.quantity, // Reduce stock
            batch_number: item.batch_number,
            expiry_date: item.expiry_date
          });
        }
      }
      
      setSuccess('Stock return recorded successfully');
      await loadReturns();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save stock return');
    } finally {
      setLoading(false);
    }
  };

  const getReturnTypeChip = (returnType: string) => {
    return (
      <Chip
        label={returnType === 'RETURN_TO_STORE' ? 'To Store' : 'To Supplier'}
        color={returnType === 'RETURN_TO_STORE' ? 'primary' : 'secondary'}
        size="small"
      />
    );
  };

  const getConditionChip = (condition: string) => {
    const colorMap = {
      GOOD: 'success',
      DAMAGED: 'warning',
      EXPIRED: 'error',
      DEFECTIVE: 'error'
    } as const;
    
    return (
      <Chip
        label={condition}
        color={colorMap[condition as keyof typeof colorMap] || 'default'}
        size="small"
      />
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <UndoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Stock Returns
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          New Return
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Stock Returns
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Items Count</TableCell>
                  <TableCell>Total Quantity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No stock returns found
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((returnRecord) => (
                    <TableRow key={returnRecord.id}>
                      <TableCell>{returnRecord.reference_number || 'N/A'}</TableCell>
                      <TableCell>{returnRecord.return_date ? new Date(returnRecord.return_date).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>{getReturnTypeChip(returnRecord.return_type)}</TableCell>
                      <TableCell>{returnRecord.items.length}</TableCell>
                      <TableCell>{returnRecord.total_quantity}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleOpenDialog(returnRecord)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingReturn?.reference_number && editingReturn.reference_number.startsWith('RET-') ? 'New Stock Return' : 'View Stock Return'}
        </DialogTitle>
        <DialogContent>
          {editingReturn && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Return Date"
                  type="date"
                  value={editingReturn.return_date}
                  onChange={(e) => setEditingReturn({
                    ...editingReturn,
                    return_date: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={editingReturn.reference_number}
                  onChange={(e) => setEditingReturn({
                    ...editingReturn,
                    reference_number: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Return Type</InputLabel>
                  <Select
                    value={editingReturn.return_type}
                    label="Return Type"
                    onChange={(e) => setEditingReturn({
                      ...editingReturn,
                      return_type: e.target.value as 'RETURN_TO_STORE' | 'RETURN_TO_SUPPLIER'
                    })}
                  >
                    <MenuItem value="RETURN_TO_STORE">Return to Store</MenuItem>
                    <MenuItem value="RETURN_TO_SUPPLIER">Return to Supplier</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {editingReturn.return_type === 'RETURN_TO_SUPPLIER' && (
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Supplier Reference"
                    value={editingReturn.supplier_reference}
                    onChange={(e) => setEditingReturn({
                      ...editingReturn,
                      supplier_reference: e.target.value
                    })}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={editingReturn.notes}
                  onChange={(e) => setEditingReturn({
                    ...editingReturn,
                    notes: e.target.value
                  })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Items to Return</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddItem}
                  >
                    Add Item
                  </Button>
                </Box>
                
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Warehouse</TableCell>
                        <TableCell>Quantity</TableCell>
                        <TableCell>Batch/Lot</TableCell>
                        <TableCell>Reason</TableCell>
                        <TableCell>Condition</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editingReturn.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Autocomplete
                              size="small"
                              options={items}
                              getOptionLabel={(option) => option.name}
                              value={items.find(i => i.id === item.item_id) || null}
                              onChange={(_, newValue) => {
                                handleItemChange(index, 'item_id', newValue?.id || '');
                              }}
                              renderInput={(params) => (
                                <TextField {...params} placeholder="Select item" />
                              )}
                              sx={{ minWidth: 200 }}
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <Select
                                value={item.warehouse_id}
                                onChange={(e) => handleItemChange(index, 'warehouse_id', e.target.value)}
                              >
                                {warehouses.map((warehouse) => (
                                  <MenuItem key={warehouse.id} value={warehouse.id}>
                                    {warehouse.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.batch_number}
                              onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 120 }}>
                              <Select
                                value={item.return_reason}
                                onChange={(e) => handleItemChange(index, 'return_reason', e.target.value)}
                              >
                                {RETURN_REASONS.map((reason) => (
                                  <MenuItem key={reason} value={reason}>
                                    {reason}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 100 }}>
                              <Select
                                value={item.condition}
                                onChange={(e) => handleItemChange(index, 'condition', e.target.value)}
                              >
                                <MenuItem value="GOOD">Good</MenuItem>
                                <MenuItem value="DAMAGED">Damaged</MenuItem>
                                <MenuItem value="EXPIRED">Expired</MenuItem>
                                <MenuItem value="DEFECTIVE">Defective</MenuItem>
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.notes}
                              onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItem(index)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {editingReturn.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            No items added. Click "Add Item" to start.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveReturn}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading || !editingReturn?.items.length}
          >
            {loading ? 'Saving...' : 'Save Return'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockReturnsPage;