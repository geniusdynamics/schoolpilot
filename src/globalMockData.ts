// ABOUTME: Provides global/shared mock data entities used across multiple modules.
// ABOUTME: Used for canonical demo data like suppliers and supplierInvoices.

import { Supplier, SupplierInvoice, SupplierInvoiceStatus } from './core/types';

// Canonical suppliers array
export const suppliers: Supplier[] = [
  {id: 1, name: 'Text Book Centre', phone: '0700111222', email: 'sales@textbookcentre.com', address: 'Kijabe Street, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 2, name: 'Savani\'s Bookshop', phone: '0722333444', email: 'info@savanis.co.ke', address: 'Moi Avenue, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 3, name: 'Kenya Literature Bureau', phone: '0733555666', email: 'orders@klb.co.ke', address: 'Bellevue Drive, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 4, name: 'Longhorn Publishers', phone: '0744777888', email: 'sales@longhorn.co.ke', address: 'Funzi Road, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 5, name: 'Office Depot Kenya', phone: '0755999000', email: 'procurement@officedepot.co.ke', address: 'Mombasa Road, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 6, name: 'Nakumatt Supplies', phone: '0766111222', email: 'corporate@nakumatt.co.ke', address: 'Kimathi Street, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 7, name: 'Scientific Equipment Ltd', phone: '0777333444', email: 'lab@scientificequip.co.ke', address: 'Industrial Area, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 8, name: 'Smart Security Systems', phone: '0788555666', email: 'info@smartsecurity.co.ke', address: 'Westlands, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 9, name: 'Kenya Power & Lighting', phone: '0799777888', email: 'billing@kplc.co.ke', address: 'Stima Plaza, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  {id: 10, name: 'Fresh Foods Catering', phone: '0711222333', email: 'catering@freshfoods.co.ke', address: 'Ngong Road, Nairobi', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
];

// Canonical supplierInvoices array
export const supplierInvoices: SupplierInvoice[] = [
  {id: 'SINV001', supplier_id: 1, supplier_name: 'Text Book Centre', invoice_number: 'TBC/2024/1256', invoice_date: '2024-07-10', due_date: '2024-08-10', total_amount: 85000, amount_paid: 85000, status: SupplierInvoiceStatus.PAID, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
  {id: 'SINV002', supplier_id: 3, supplier_name: 'Kenya Literature Bureau', invoice_number: 'KLB/2024/0789', invoice_date: '2024-07-15', due_date: '2024-08-15', total_amount: 45000, amount_paid: 0, status: SupplierInvoiceStatus.UNPAID, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
  {id: 'SINV003', supplier_id: 7, supplier_name: 'Scientific Equipment Ltd', invoice_number: 'SEL/2024/0456', invoice_date: '2024-07-18', due_date: '2024-08-18', total_amount: 120000, amount_paid: 60000, status: SupplierInvoiceStatus.PARTIALLY_PAID, created_at: new Date().toISOString(), updated_at: new Date().toISOString()},
  {id: 'SINV004', supplier_id: 9, supplier_name: 'Kenya Power & Lighting', invoice_number: 'KPLC/2024/789654', invoice_date: '2024-07-25', due_date: '2024-08-25', total_amount: 35000, amount_paid: 35000, status: SupplierInvoiceStatus.PAID, created_at: new Date().toISOString(), updated_at: new Date().toISOString()}
]; 