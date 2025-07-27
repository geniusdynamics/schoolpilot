import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Alert,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { useItemData, useWarehouseData, useStockTransactionData, useStockLevelData } from '../data';
import { InvStockTransactionType, InvItemType, InvWarehouseType } from '../data/types';

interface StockReceptionItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  batch_number?: string;
  expiry_date?: string;
  warehouse_id: number;
  warehouse_name: string;
  notes?: string;
}

interface StockReceptionForm {
  reception_date: string;
  reference_number?: string;
  supplier_reference?: string;
  notes?: string;
  items: StockReceptionItem[];
}

const StockReceptionPage: React.FC = () => {
  const [receptions, setReceptions] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReception, setEditingReception] = useState<StockReceptionForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data hooks
  const { items, loading: itemsLoading } = useItemData();
  const { warehouses, loading: warehousesLoading } = useWarehouseData();
  const { createStockTransaction, getStockTransactionsByType } = useStockTransactionData();
  const { updateStockLevel } = useStockLevelData();

  useEffect(() => {
    loadReceptions();
  }, []);

  const loadReceptions = async () => {
    try {
      setLoading(true);
      const receiptTransactions = await getStockTransactionsByType(InvStockTransactionType.RECEIPT);
      // Group transactions by reference number or date to show as receptions
      const groupedReceptions = groupTransactionsByReception(receiptTransactions);
      setReceptions(groupedReceptions);
    } catch (err) {
      setError('Failed to load stock receptions');
    } finally {
      setLoading(false);
    }
  };

  const groupTransactionsByReception = (transactions: any[]) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const key = transaction.source_id || transaction.transaction_date;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          reception_date: transaction.transaction_date,
          reference_number: transaction.source_id,
          items: [],
          total_quantity: 0
        };
      }
      acc[key].items.push(transaction);
      acc[key].total_quantity += transaction.quantity;
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const handleOpenDialog = (reception?: any) => {
    if (reception) {
      setEditingReception({
        reception_date: reception.reception_date,
        reference_number: reception.reference_number,
        supplier_reference: '',
        notes: '',
        items: reception.items.map((item: any) => ({
          id: item.id,
          item_id: item.item_id,
          item_name: item.item_name,
          quantity: item.quantity,
          batch_number: item.batch_number,
          expiry_date: item.expiry_date,
          warehouse_id: item.warehouse_id,
          warehouse_name: item.warehouse_name,
          notes: item.notes
        }))
      });
    } else {
      setEditingReception({
        reception_date: new Date().toISOString().split('T')[0],
        reference_number: `REC-${Date.now()}`,
        supplier_reference: '',
        notes: '',
        items: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingReception(null);
    setError(null);
    setSuccess(null);
  };

  const handleAddItem = () => {
    if (!editingReception) return;
    
    const newItem: StockReceptionItem = {
      id: `temp-${Date.now()}`,
      item_id: '',
      item_name: '',
      quantity: 0,
      batch_number: '',
      expiry_date: '',
      warehouse_id: 0,
      warehouse_name: '',
      notes: ''
    };
    
    setEditingReception({
      ...editingReception,
      items: [...editingReception.items, newItem]
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editingReception) return;
    
    const updatedItems = editingReception.items.filter((_, i) => i !== index);
    setEditingReception({
      ...editingReception,
      items: updatedItems
    });
  };

  const handleItemChange = (index: number, field: keyof StockReceptionItem, value: any) => {
    if (!editingReception) return;
    
    const updatedItems = [...editingReception.items];
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
    
    setEditingReception({
      ...editingReception,
      items: updatedItems
    });
  };

  const handleSaveReception = async () => {
    if (!editingReception) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate form
      if (editingReception.items.length === 0) {
        setError('Please add at least one item to receive');
        return;
      }
      
      for (const item of editingReception.items) {
        if (!item.item_id || !item.warehouse_id || item.quantity <= 0) {
          setError('Please fill in all required fields for each item');
          return;
        }
      }
      
      // Create stock transactions for each item
      for (const item of editingReception.items) {
        const transactionData = {
          item_id: item.item_id,
          warehouse_id: item.warehouse_id,
          transaction_type: InvStockTransactionType.RECEIPT,
          quantity: item.quantity,
          batch_number: item.batch_number || undefined,
          expiry_date: item.expiry_date || undefined,
          source_table: 'stock_reception',
          source_id: editingReception.reference_number,
          transaction_date: editingReception.reception_date,
          notes: `${editingReception.notes || ''} ${item.notes || ''}`.trim()
        };
        
        await createStockTransaction(transactionData);
        
        // Update stock levels
        const stockLevelId = `${item.item_id}|${item.warehouse_id}${item.batch_number ? `|${item.batch_number}` : ''}`;
        await updateStockLevel(stockLevelId, {
          item_id: item.item_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity, // This will be added to existing quantity
          batch_number: item.batch_number,
          expiry_date: item.expiry_date
        });
      }
      
      setSuccess('Stock reception recorded successfully');
      await loadReceptions();
      handleCloseDialog();
    } catch (err) {
      setError('Failed to save stock reception');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Stock Reception
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          New Reception
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
            Recent Stock Receptions
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Reference</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Items Count</TableCell>
                  <TableCell>Total Quantity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : receptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No stock receptions found
                    </TableCell>
                  </TableRow>
                ) : (
                  receptions.map((reception) => (
                    <TableRow key={reception.id}>
                      <TableCell>{reception.reference_number || 'N/A'}</TableCell>
                      <TableCell>{new Date(reception.reception_date).toLocaleDateString()}</TableCell>
                      <TableCell>{reception.items.length}</TableCell>
                      <TableCell>{reception.total_quantity}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleOpenDialog(reception)}
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

      {/* Reception Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingReception?.reference_number ? 'View Stock Reception' : 'New Stock Reception'}
        </DialogTitle>
        <DialogContent>
          {editingReception && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reception Date"
                  type="date"
                  value={editingReception.reception_date}
                  onChange={(e) => setEditingReception({
                    ...editingReception,
                    reception_date: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={editingReception.reference_number}
                  onChange={(e) => setEditingReception({
                    ...editingReception,
                    reference_number: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Supplier Reference"
                  value={editingReception.supplier_reference}
                  onChange={(e) => setEditingReception({
                    ...editingReception,
                    supplier_reference: e.target.value
                  })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={2}
                  value={editingReception.notes}
                  onChange={(e) => setEditingReception({
                    ...editingReception,
                    notes: e.target.value
                  })}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Items to Receive</Typography>
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
                        <TableCell>Expiry Date</TableCell>
                        <TableCell>Notes</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {editingReception.items.map((item, index) => (
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
                            <FormControl size="small" sx={{ minWidth: 150 }}>
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
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.batch_number}
                              onChange={(e) => handleItemChange(index, 'batch_number', e.target.value)}
                              sx={{ width: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                              sx={{ width: 140 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.notes}
                              onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                              sx={{ width: 120 }}
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
                      {editingReception.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
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
            onClick={handleSaveReception}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading || !editingReception?.items.length}
          >
            {loading ? 'Saving...' : 'Save Reception'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StockReceptionPage;