// ABOUTME: Suppliers management page for the inventory module.
// ABOUTME: Provides comprehensive supplier management with CRUD operations, search, and filtering.

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
  Rating,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useSupplierData } from '../data/useSupplierData';
import { InvSupplierType, InvSupplierStatusEnum } from '../data/types';
import { useTranslation } from 'react-i18next';
import { useSnackbar } from 'notistack';

export const SuppliersPageContent: React.FC = () => {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const {
    suppliers,
    loading,
    error,
    create,
    update,
    remove,
    findActiveSuppliers,
    findSuppliersByStatus,
    searchSuppliers
  } = useSupplierData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<InvSupplierType | null>(null);
  const [formData, setFormData] = useState<Partial<InvSupplierType>>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    tax_id: '',
    registration_number: '',
    status: InvSupplierStatusEnum.ACTIVE,
    payment_terms: '',
    credit_limit: 0,
    performance_rating: 5
  });

  const [filteredSuppliers, setFilteredSuppliers] = useState<InvSupplierType[]>([]);

  useEffect(() => {
    let filtered = suppliers || [];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }

    setFilteredSuppliers(filtered);
  }, [suppliers, searchTerm, statusFilter]);

  const handleOpenDialog = (supplier?: InvSupplierType) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        contact_person: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        registration_number: '',
        status: InvSupplierStatusEnum.ACTIVE,
        payment_terms: '',
        credit_limit: 0,
        performance_rating: 5
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingSupplier(null);
  };

  const handleSave = async () => {
    try {
      if (editingSupplier) {
        await update(editingSupplier.id, {
          ...formData,
          updated_at: new Date().toISOString()
        } as InvSupplierType);
        enqueueSnackbar(t('inventory.suppliers.updated'), { variant: 'success' });
      } else {
        const now = new Date().toISOString();
        await create({
          ...formData,
          id: Date.now(), // Simple ID generation for demo
          created_at: now,
          updated_at: now
        } as InvSupplierType);
        enqueueSnackbar(t('inventory.suppliers.created'), { variant: 'success' });
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
        enqueueSnackbar(t('inventory.suppliers.deleted'), { variant: 'success' });
      } catch (error) {
        enqueueSnackbar(t('common.error'), { variant: 'error' });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case InvSupplierStatusEnum.ACTIVE:
        return 'success';
      case InvSupplierStatusEnum.INACTIVE:
        return 'default';
      case InvSupplierStatusEnum.BLACKLISTED:
        return 'error';
      case InvSupplierStatusEnum.PENDING_APPROVAL:
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('inventory.suppliers.name'),
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" />
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'contact_person',
      headerName: t('inventory.suppliers.contactPerson'),
      flex: 1,
      minWidth: 150
    },
    {
      field: 'email',
      headerName: t('inventory.suppliers.email'),
      flex: 1,
      minWidth: 200,
      renderCell: (params) => params.value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ) : null
    },
    {
      field: 'phone',
      headerName: t('inventory.suppliers.phone'),
      flex: 1,
      minWidth: 150,
      renderCell: (params) => params.value ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ) : null
    },
    {
      field: 'status',
      headerName: t('inventory.suppliers.status'),
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
      field: 'performance_rating',
      headerName: t('inventory.suppliers.rating'),
      width: 150,
      renderCell: (params) => (
        <Rating value={params.value || 0} readOnly size="small" />
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          {t('inventory.suppliers.title')}
        </Typography>
        <Button
          variant="contained"
          leftIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          {t('inventory.suppliers.add')}
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder={t('inventory.suppliers.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>{t('inventory.suppliers.status')}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label={t('inventory.suppliers.status')}
                >
                  <MenuItem value="ALL">{t('common.all')}</MenuItem>
                  {Object.values(InvSupplierStatusEnum).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
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
          rows={filteredSuppliers}
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSupplier ? t('inventory.suppliers.edit') : t('inventory.suppliers.add')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.name')}
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.contactPerson')}
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.email')}
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.phone')}
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.address')}
                multiline
                rows={2}
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.taxId')}
                value={formData.tax_id || ''}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.registrationNumber')}
                value={formData.registration_number || ''}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>{t('inventory.suppliers.status')}</InputLabel>
                <Select
                  value={formData.status || InvSupplierStatusEnum.ACTIVE}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as InvSupplierStatusEnum })}
                  label={t('inventory.suppliers.status')}
                >
                  {Object.values(InvSupplierStatusEnum).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.paymentTerms')}
                value={formData.payment_terms || ''}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="e.g., Net 30, COD"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('inventory.suppliers.creditLimit')}
                type="number"
                value={formData.credit_limit || 0}
                onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography component="legend">{t('inventory.suppliers.rating')}</Typography>
                <Rating
                  value={formData.performance_rating || 5}
                  onChange={(event, newValue) => {
                    setFormData({ ...formData, performance_rating: newValue || 5 });
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} variant="contained">
            {editingSupplier ? t('common.update') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
const SuppliersPage: React.FC = () => (
  <div className="space-y-6">
    <SuppliersPageContent />
  </div>
);

export default SuppliersPage;
