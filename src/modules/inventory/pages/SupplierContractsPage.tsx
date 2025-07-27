// ABOUTME: Supplier contracts management page for the inventory module.
// ABOUTME: Provides comprehensive contract management with CRUD operations, search, and filtering.

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Description as ContractIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSupplierContractData } from '../data/useSupplierContractData';
import { useSupplierData } from '../data/useSupplierData';
import { InvSupplierContractType, InvContractStatusEnum } from '../data/types';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';
import { format, differenceInDays, parseISO } from 'date-fns';

const SupplierContractsPage: React.FC = () => {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const {
    contracts,
    loading,
    error,
    create,
    update,
    remove,
    findActiveContracts,
    findExpiringContracts,
    findContractsByStatus
  } = useSupplierContractData();
  
  const { suppliers } = useSupplierData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<InvSupplierContractType | null>(null);
  const [formData, setFormData] = useState<Partial<InvSupplierContractType>>({
    supplier_id: 0,
    contract_number: '',
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    contract_value: 0,
    currency: 'USD',
    status: InvContractStatusEnum.DRAFT,
    terms_and_conditions: '',
    payment_terms: '',
    delivery_terms: ''
  });

  const [filteredContracts, setFilteredContracts] = useState<InvSupplierContractType[]>([]);

  useEffect(() => {
    let filtered = contracts || [];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(contract =>
        contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(contract => contract.status === statusFilter);
    }

    // Apply supplier filter
    if (supplierFilter !== 'ALL') {
      filtered = filtered.filter(contract => contract.supplier_id.toString() === supplierFilter);
    }

    setFilteredContracts(filtered);
  }, [contracts, searchTerm, statusFilter, supplierFilter]);

  const handleOpenDialog = (contract?: InvSupplierContractType) => {
    if (contract) {
      setEditingContract(contract);
      setFormData(contract);
    } else {
      setEditingContract(null);
      setFormData({
        supplier_id: 0,
        contract_number: '',
        title: '',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        contract_value: 0,
        currency: 'USD',
        status: InvContractStatusEnum.DRAFT,
        terms_and_conditions: '',
        payment_terms: '',
        delivery_terms: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingContract(null);
  };

  const handleSave = async () => {
    try {
      if (editingContract) {
        await update(editingContract.id, {
          ...formData,
          updated_at: new Date().toISOString()
        } as InvSupplierContractType);
        enqueueSnackbar(t('inventory.contracts.updated'), { variant: 'success' });
      } else {
        const now = new Date().toISOString();
        const supplier = suppliers?.find(s => s.id === formData.supplier_id);
        await create({
          ...formData,
          id: Date.now(), // Simple ID generation for demo
          supplier_name: supplier?.name || '',
          created_at: now,
          updated_at: now
        } as InvSupplierContractType);
        enqueueSnackbar(t('inventory.contracts.created'), { variant: 'success' });
      }
      handleCloseDialog();
    } catch (error) {
      enqueueSnackbar(t('common.error'), { variant: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm(t('common.confirmDelete'))) {
      try {
        await remove(id);
        enqueueSnackbar(t('inventory.contracts.deleted'), { variant: 'success' });
      } catch (error) {
        enqueueSnackbar(t('common.error'), { variant: 'error' });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case InvContractStatusEnum.ACTIVE:
        return 'success';
      case InvContractStatusEnum.DRAFT:
        return 'default';
      case InvContractStatusEnum.EXPIRED:
        return 'error';
      case InvContractStatusEnum.TERMINATED:
        return 'error';
      case InvContractStatusEnum.PENDING_APPROVAL:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    if (!endDate) return null;
    return differenceInDays(parseISO(endDate), new Date());
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const columns: GridColDef[] = [
    {
      field: 'contract_number',
      headerName: t('inventory.contracts.contractNumber'),
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContractIcon color="primary" />
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'title',
      headerName: t('inventory.contracts.title'),
      flex: 1,
      minWidth: 200
    },
    {
      field: 'supplier_name',
      headerName: t('inventory.contracts.supplier'),
      flex: 1,
      minWidth: 150
    },
    {
      field: 'contract_value',
      headerName: t('inventory.contracts.value'),
      width: 120,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {formatCurrency(params.value, params.row.currency)}
          </Typography>
        </Box>
      )
    },
    {
      field: 'start_date',
      headerName: t('inventory.contracts.startDate'),
      width: 120,
      renderCell: (params) => params.value ? format(parseISO(params.value), 'MMM dd, yyyy') : ''
    },
    {
      field: 'end_date',
      headerName: t('inventory.contracts.endDate'),
      width: 120,
      renderCell: (params) => {
        if (!params.value) return '';
        const daysUntilExpiry = getDaysUntilExpiry(params.value);
        const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
        
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isExpiringSoon && (
              <Tooltip title={t('inventory.contracts.expiringSoon')}>
                <WarningIcon fontSize="small" color="warning" />
              </Tooltip>
            )}
            <Typography variant="body2" color={isExpiringSoon ? 'warning.main' : 'inherit'}>
              {format(parseISO(params.value), 'MMM dd, yyyy')}
            </Typography>
          </Box>
        );
      }
    },
    {
      field: 'status',
      headerName: t('inventory.contracts.status'),
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value) as any}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: t('common.actions'),
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label={t('common.edit')}
          onClick={() => handleOpenDialog(params.row)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label={t('common.delete')}
          onClick={() => handleDelete(params.row.id)}
        />
      ]
    }
  ];

  if (error) {
    return (
      <Alert severity="error">
        {t('common.errorLoading')}: {error.message}
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            {t('inventory.contracts.title')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {t('inventory.contracts.add')}
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder={t('inventory.contracts.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>{t('inventory.contracts.status')}</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label={t('inventory.contracts.status')}
                  >
                    <MenuItem value="ALL">{t('common.all')}</MenuItem>
                    {Object.values(InvContractStatusEnum).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>{t('inventory.contracts.supplier')}</InputLabel>
                  <Select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    label={t('inventory.contracts.supplier')}
                  >
                    <MenuItem value="ALL">{t('common.all')}</MenuItem>
                    {suppliers?.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id.toString()}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Data Grid */}
        <Card>
          <DataGrid
            rows={filteredContracts}
            columns={columns}
            loading={loading}
            autoHeight
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } }
            }}
          />
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
          <DialogTitle>
            {editingContract ? t('inventory.contracts.edit') : t('inventory.contracts.add')}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.contractNumber')}
                  value={formData.contract_number || ''}
                  onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>{t('inventory.contracts.supplier')}</InputLabel>
                  <Select
                    value={formData.supplier_id || ''}
                    onChange={(e) => setFormData({ ...formData, supplier_id: Number(e.target.value) })}
                    label={t('inventory.contracts.supplier')}
                  >
                    {suppliers?.map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.title')}
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.description')}
                  multiline
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label={t('inventory.contracts.startDate')}
                  value={formData.start_date ? parseISO(formData.start_date) : null}
                  onChange={(date) => setFormData({ ...formData, start_date: date?.toISOString().split('T')[0] || '' })}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label={t('inventory.contracts.endDate')}
                  value={formData.end_date ? parseISO(formData.end_date) : null}
                  onChange={(date) => setFormData({ ...formData, end_date: date?.toISOString().split('T')[0] || '' })}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>{t('inventory.contracts.status')}</InputLabel>
                  <Select
                    value={formData.status || InvContractStatusEnum.DRAFT}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as InvContractStatusEnum })}
                    label={t('inventory.contracts.status')}
                  >
                    {Object.values(InvContractStatusEnum).map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.value')}
                  type="number"
                  value={formData.contract_value || 0}
                  onChange={(e) => setFormData({ ...formData, contract_value: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.currency')}
                  value={formData.currency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="USD, EUR, GBP"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.paymentTerms')}
                  value={formData.payment_terms || ''}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="e.g., Net 30, COD"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.deliveryTerms')}
                  value={formData.delivery_terms || ''}
                  onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                  placeholder="e.g., FOB, CIF"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('inventory.contracts.termsAndConditions')}
                  multiline
                  rows={4}
                  value={formData.terms_and_conditions || ''}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} variant="contained">
              {editingContract ? t('common.update') : t('common.create')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default SupplierContractsPage;